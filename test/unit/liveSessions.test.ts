import { describe, expect, it } from "vitest";

import {
  LIVE_CODE_ALPHABET,
  LIVE_CLIENT_TIMEOUT_MS,
  LIVE_SESSION_TTL_MS,
  activeLiveClients,
  addLiveLog,
  createLiveSession,
  detectPlatform,
  generateLiveCode,
  getLiveSession,
  isValidLiveCode,
  normalizeLiveCode,
  publishLivePayload,
  pruneLiveSessions,
  touchLiveClient,
  waitForLiveVersion,
  type LiveSession,
} from "../../server/utils/liveSessions";

const payload = {
  appName: "Test",
  pages: [{ id: "page1", name: "Page 1" }],
  elements: [],
  jsCodeByPage: {},
  startPageId: "page1",
};

describe("live companion sessions", () => {
  it("generates readable 6-character codes without 0/O/1/I", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateLiveCode();
      expect(isValidLiveCode(code)).toBe(true);
      expect(/[01OI]/.test(code)).toBe(false);
    }
    expect(LIVE_CODE_ALPHABET.includes("O")).toBe(false);
  });

  it("normalises what a learner types", () => {
    expect(normalizeLiveCode(" ab-c 234 ")).toBe("ABC234");
    expect(normalizeLiveCode("abcdefgh")).toBe("ABCDEF");
  });

  it("creates, finds and publishes to a session", () => {
    const store = new Map<string, LiveSession>();
    const session = createLiveSession(store);
    expect(getLiveSession(session.code.toLowerCase(), store)).toBe(session);
    expect(publishLivePayload(session, payload)).toBe(1);
    expect(publishLivePayload(session, payload)).toBe(2);
    expect(session.payload?.appName).toBe("Test");
  });

  it("wakes long-poll waiters when a new version is published", async () => {
    const store = new Map<string, LiveSession>();
    const session = createLiveSession(store);
    let woke = false;
    const waiting = waitForLiveVersion(session, 0, 5000).then(() => {
      woke = true;
    });
    expect(woke).toBe(false);
    publishLivePayload(session, payload);
    await waiting;
    expect(woke).toBe(true);
    expect(session.waiters.size).toBe(0);
  });

  it("times out a long poll with no change", async () => {
    const store = new Map<string, LiveSession>();
    const session = createLiveSession(store);
    const started = Date.now();
    await waitForLiveVersion(session, 0, 30);
    expect(Date.now() - started).toBeGreaterThanOrEqual(25);
    expect(session.waiters.size).toBe(0);
  });

  it("tracks connected phones and drops silent ones", () => {
    const store = new Map<string, LiveSession>();
    const session = createLiveSession(store, 1000);
    touchLiveClient(session, "phone-a", "Mozilla/5.0 (Linux; Android 14)", 1000);
    touchLiveClient(session, "phone-b", "Mozilla/5.0 (iPhone)", 1000);
    expect(activeLiveClients(session, 2000).map((client) => client.platform)).toEqual(["android", "ios"]);
    touchLiveClient(session, "phone-a", "", 1000 + LIVE_CLIENT_TIMEOUT_MS);
    expect(activeLiveClients(session, 1000 + LIVE_CLIENT_TIMEOUT_MS + 1).map((client) => client.id)).toEqual(["phone-a"]);
    expect(detectPlatform("Windows NT")).toBe("other");
  });

  it("keeps a bounded log buffer with increasing sequence numbers", () => {
    const store = new Map<string, LiveSession>();
    const session = createLiveSession(store);
    for (let i = 0; i < 250; i++) addLiveLog(session, { clientId: "p", type: "log", message: `m${i}` });
    addLiveLog(session, { clientId: "p", type: "nonsense", message: "x" });
    expect(session.logs.length).toBe(200);
    expect(session.logs[session.logs.length - 1]!.type).toBe("log");
    expect(session.logs[session.logs.length - 1]!.seq).toBe(251);
  });

  it("expires idle sessions", () => {
    const store = new Map<string, LiveSession>();
    const session = createLiveSession(store, 0);
    pruneLiveSessions(store, LIVE_SESSION_TTL_MS + 1);
    expect(store.has(session.code)).toBe(false);
  });
});
