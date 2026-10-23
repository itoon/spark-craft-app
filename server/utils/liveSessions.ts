/**
 * Live Companion sessions — the CodeCraft take on App Inventor's AI Companion.
 *
 * The editor creates a session (6-character code), then PUTs every project
 * change. Phones long-poll for newer versions and post runtime logs back.
 * Everything lives in memory: a session is a dev-time convenience, not data.
 */
import type { SharedExportPayload } from "../../app/utils/sharedExport";

export const LIVE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export const LIVE_CODE_LENGTH = 6;
export const LIVE_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
export const LIVE_CLIENT_TIMEOUT_MS = 35_000;
export const LIVE_MAX_LOGS = 200;
export const LIVE_LONG_POLL_MS = 25_000;

export interface LiveClient {
  id: string;
  userAgent: string;
  platform: "android" | "ios" | "other";
  firstSeen: number;
  lastSeen: number;
}

export interface LiveLogEntry {
  seq: number;
  clientId: string;
  type: "log" | "warn" | "error" | "success";
  message: string;
  at: number;
}

export interface LiveSession {
  code: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  payload: SharedExportPayload | null;
  clients: Map<string, LiveClient>;
  logs: LiveLogEntry[];
  logSeq: number;
  waiters: Set<() => void>;
}

type Store = Map<string, LiveSession>;

const globalKey = "__codecraftLiveSessions";

/** Survives Nitro hot reloads in dev. */
export function getLiveStore(): Store {
  const g = globalThis as unknown as Record<string, Store | undefined>;
  if (!g[globalKey]) g[globalKey] = new Map();
  return g[globalKey]!;
}

export function normalizeLiveCode(raw: unknown): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, LIVE_CODE_LENGTH);
}

export function isValidLiveCode(code: string): boolean {
  if (code.length !== LIVE_CODE_LENGTH) return false;
  return [...code].every((char) => LIVE_CODE_ALPHABET.includes(char));
}

export function generateLiveCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < LIVE_CODE_LENGTH; i++) {
    code += LIVE_CODE_ALPHABET[Math.floor(random() * LIVE_CODE_ALPHABET.length)];
  }
  return code;
}

export function pruneLiveSessions(store: Store = getLiveStore(), now = Date.now()) {
  for (const [code, session] of store) {
    if (now - session.updatedAt > LIVE_SESSION_TTL_MS) {
      for (const wake of session.waiters) wake();
      store.delete(code);
    }
  }
}

export function createLiveSession(
  store: Store = getLiveStore(),
  now = Date.now(),
  random: () => number = Math.random,
): LiveSession {
  pruneLiveSessions(store, now);
  let code = generateLiveCode(random);
  let attempts = 0;
  while (store.has(code) && attempts < 50) {
    code = generateLiveCode(random);
    attempts++;
  }
  const session: LiveSession = {
    code,
    createdAt: now,
    updatedAt: now,
    version: 0,
    payload: null,
    clients: new Map(),
    logs: [],
    logSeq: 0,
    waiters: new Set(),
  };
  store.set(code, session);
  return session;
}

export function getLiveSession(code: string, store: Store = getLiveStore()) {
  return store.get(normalizeLiveCode(code)) ?? null;
}

export function publishLivePayload(
  session: LiveSession,
  payload: SharedExportPayload,
  now = Date.now(),
): number {
  session.payload = payload;
  session.version += 1;
  session.updatedAt = now;
  const waiters = [...session.waiters];
  session.waiters.clear();
  for (const wake of waiters) wake();
  return session.version;
}

export function detectPlatform(userAgent: string): LiveClient["platform"] {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  return "other";
}

export function touchLiveClient(
  session: LiveSession,
  clientId: string,
  userAgent: string,
  now = Date.now(),
): LiveClient | null {
  const id = String(clientId || "").slice(0, 64);
  if (!id) return null;
  const existing = session.clients.get(id);
  const client: LiveClient = existing
    ? {
        ...existing,
        lastSeen: now,
        userAgent: userAgent || existing.userAgent,
        platform: detectPlatform(userAgent || existing.userAgent),
      }
    : {
        id,
        userAgent,
        platform: detectPlatform(userAgent),
        firstSeen: now,
        lastSeen: now,
      };
  session.clients.set(id, client);
  return client;
}

export function activeLiveClients(session: LiveSession, now = Date.now()): LiveClient[] {
  return [...session.clients.values()].filter(
    (client) => now - client.lastSeen <= LIVE_CLIENT_TIMEOUT_MS,
  );
}

export function addLiveLog(
  session: LiveSession,
  entry: { clientId: string; type?: string; message?: unknown },
  now = Date.now(),
): LiveLogEntry {
  const allowed = new Set(["log", "warn", "error", "success"]);
  const type = (allowed.has(String(entry.type)) ? entry.type : "log") as LiveLogEntry["type"];
  const log: LiveLogEntry = {
    seq: ++session.logSeq,
    clientId: String(entry.clientId || "").slice(0, 64),
    type,
    message: String(entry.message ?? "").slice(0, 2000),
    at: now,
  };
  session.logs.push(log);
  if (session.logs.length > LIVE_MAX_LOGS) {
    session.logs.splice(0, session.logs.length - LIVE_MAX_LOGS);
  }
  return log;
}

/**
 * Resolves as soon as the session has a version newer than `since`,
 * or after `timeoutMs` (the caller then answers "no change").
 */
export function waitForLiveVersion(
  session: LiveSession,
  since: number,
  timeoutMs = LIVE_LONG_POLL_MS,
  signal?: { onAbort(cb: () => void): void },
): Promise<void> {
  if (session.version > since) return Promise.resolve();
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const wake = () => {
      if (timer) clearTimeout(timer);
      session.waiters.delete(wake);
      resolve();
    };
    session.waiters.add(wake);
    timer = setTimeout(wake, timeoutMs);
    signal?.onAbort(wake);
  });
}
