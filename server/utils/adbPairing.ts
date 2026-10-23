/**
 * One QR pairing attempt from the Build APK dialog. The dialog polls; each
 * poll advances the attempt one step:
 *   waiting    → phone hasn't scanned yet (look for our pairing service)
 *   connecting → paired; connect to the phone's `_adb-tls-connect` service
 *   connected / failed / expired
 */
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";

import { type PairingCredentials, parseMdnsServices } from "./adbMdns";
import { wirelessResultOk } from "./adbWireless";

export type PairingStatus = "waiting" | "connecting" | "connected" | "failed" | "expired";

export interface PairingSession extends PairingCredentials {
  id: string;
  status: PairingStatus;
  message: string;
  host: string | null;
  createdAt: number;
  pairedAt: number | null;
  busy: boolean;
}

/** Runs adb with the given args and returns stdout + stderr. */
export type AdbRunner = (args: string[]) => Promise<string>;

const QR_LIFETIME_MS = 3 * 60_000;
const CONNECT_TIMEOUT_MS = 30_000;

export function createPairingSession(credentials: PairingCredentials, now = Date.now()): PairingSession {
  return {
    ...credentials,
    id: randomUUID(),
    status: "waiting",
    message: "",
    host: null,
    createdAt: now,
    pairedAt: null,
    busy: false,
  };
}

export async function advancePairing(session: PairingSession, run: AdbRunner, now = Date.now()) {
  if (session.busy) return;
  if (session.status === "waiting" && now - session.createdAt > QR_LIFETIME_MS) {
    session.status = "expired";
    session.message = "QR หมดอายุแล้ว — กดสร้าง QR ใหม่";
    return;
  }
  if (session.status !== "waiting" && session.status !== "connecting") return;

  session.busy = true;
  try {
    const services = parseMdnsServices(await run(["mdns", "services"]));

    if (session.status === "waiting") {
      const pairing = services.find((s) => s.type === "pairing" && s.name === session.name);
      if (!pairing) return;
      const output = await run(["pair", `${pairing.host}:${pairing.port}`, session.password]);
      if (!wirelessResultOk("pair", output)) {
        session.status = "failed";
        session.message = output || "จับคู่ไม่สำเร็จ";
        return;
      }
      session.status = "connecting";
      session.host = pairing.host;
      session.pairedAt = now;
      session.message = "จับคู่แล้ว กำลังเชื่อมต่อ…";
      return;
    }

    // connecting: only the phone we just paired, not other phones on the Wi-Fi
    const connect = services.find((s) => s.type === "connect" && s.host === session.host);
    if (connect) {
      const output = await run(["connect", `${connect.host}:${connect.port}`]);
      if (wirelessResultOk("connect", output)) {
        session.status = "connected";
        session.message = "เชื่อมต่อมือถือแล้ว";
        return;
      }
    }
    if (now - (session.pairedAt ?? now) > CONNECT_TIMEOUT_MS) {
      session.status = "failed";
      session.message =
        "จับคู่แล้วแต่ยังเชื่อมต่อไม่ได้ — ปิดแล้วเปิด “การแก้ไขข้อบกพร่องแบบไร้สาย” ใหม่ แล้วกดตรวจใหม่";
    }
  } finally {
    session.busy = false;
  }
}

export function adbRunner(adb: string): AdbRunner {
  return (args) =>
    new Promise((resolve) => {
      execFile(adb, args, { timeout: 20_000 }, (error, stdout, stderr) =>
        resolve(`${stdout ?? ""}${stderr ?? ""}${error && !stdout ? error.message : ""}`.trim()),
      );
    });
}

// ── In-memory sessions (survive HMR like the APK build jobs) ──────────────
const globalKey = "__codecraftAdbPairing";

function sessions(): Map<string, PairingSession> {
  const g = globalThis as unknown as Record<string, Map<string, PairingSession> | undefined>;
  if (!g[globalKey]) g[globalKey] = new Map();
  return g[globalKey]!;
}

export function storePairingSession(session: PairingSession) {
  const all = sessions();
  for (const [id, old] of all) {
    if (Date.now() - old.createdAt > QR_LIFETIME_MS * 2) all.delete(id);
  }
  all.set(session.id, session);
}

export function getPairingSession(id: string) {
  return sessions().get(id) ?? null;
}
