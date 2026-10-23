import { networkInterfaces } from "node:os";

import { createError, type H3Event } from "h3";

function ownAddresses(): Set<string> {
  const set = new Set(["127.0.0.1", "::1"]);
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) set.add(entry.address);
  }
  return set;
}

/**
 * The connecting address. In `nuxt dev` the socket is the internal proxy's
 * (empty), so use the stamp the outer server adds (nuxt.config.ts `listen`
 * hook) — only when it carries this process's secret, never x-forwarded-for.
 */
function clientAddress(event: H3Event): string {
  const raw = event.node.req.socket.remoteAddress ?? "";
  if (raw) return raw.replace(/^::ffff:/, "");
  const token = process.env.CODECRAFT_CLIENT_STAMP;
  const stamp = String(event.node.req.headers["x-codecraft-client"] ?? "");
  if (!token || !stamp.startsWith(`${token} `)) return "";
  return stamp.slice(token.length + 1).replace(/^::ffff:/, "");
}

/**
 * True when the request comes from this computer — via localhost or via one of
 * its own LAN addresses (editor opened at http://192.168.x.x:3000) — and not
 * from another device on the Wi-Fi.
 */
export function isLocalRequest(event: H3Event): boolean {
  const address = clientAddress(event);
  return address !== "" && ownAddresses().has(address);
}

/** Endpoints that run programs on this computer (build, adb) stay local-only. */
export function assertLocalRequest(event: H3Event) {
  if (isLocalRequest(event)) return;
  throw createError({
    statusCode: 403,
    statusMessage: clientAddress(event)
      ? "ใช้ได้จากคอมพิวเตอร์เครื่องนี้เท่านั้น"
      : "เช็กไม่ได้ว่าเป็นคอมเครื่องนี้ — ปิดแล้วเปิด bun run dev ใหม่",
  });
}
