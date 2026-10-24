/**
 * Agent bridge — server-side state of the single active editor tab, so an AI
 * (via the MCP server) can edit the project the user has open.
 *
 * The active editor tab claims the bridge, pushes its state on every change and
 * long-polls for edits made by the agent. Everything lives in memory.
 */
import type { PersistedEditorState } from "../../app/composables/useEditorStore";
import { ProjectOpError, applyProjectOp, type ProjectOp } from "../../app/utils/projectOps";
import { LIVE_CLIENT_TIMEOUT_MS, LIVE_LONG_POLL_MS } from "./liveSessions";

export interface AgentBridge {
  tabId: string | null;
  version: number;
  lastWriter: "editor" | "agent";
  lastWriterTab: string | null;
  state: PersistedEditorState | null;
  lastSeen: number;
  waiters: Set<() => void>;
}

export const NO_EDITOR_MESSAGE = "ยังไม่มี editor เปิดอยู่ — เปิด http://localhost:3000 ในเบราว์เซอร์ก่อน";

const globalKey = "__codecraftAgentBridge";

function createBridge(): AgentBridge {
  return {
    tabId: null,
    version: 0,
    lastWriter: "editor",
    lastWriterTab: null,
    state: null,
    lastSeen: 0,
    waiters: new Set(),
  };
}

/** Survives Nitro hot reloads in dev. */
export function getAgentBridge(): AgentBridge {
  const g = globalThis as unknown as Record<string, AgentBridge | undefined>;
  if (!g[globalKey]) g[globalKey] = createBridge();
  return g[globalKey]!;
}

export function resetAgentBridgeForTests(): void {
  const bridge = getAgentBridge();
  wakeAll(bridge);
  (globalThis as unknown as Record<string, AgentBridge>)[globalKey] = createBridge();
}

function wakeAll(bridge: AgentBridge) {
  const waiters = [...bridge.waiters];
  bridge.waiters.clear();
  for (const wake of waiters) wake();
}

function bump(
  bridge: AgentBridge,
  state: PersistedEditorState,
  writer: "editor" | "agent",
  writerTab: string | null,
  now: number,
): number {
  bridge.state = state;
  bridge.version += 1;
  bridge.lastWriter = writer;
  bridge.lastWriterTab = writerTab;
  bridge.lastSeen = now;
  wakeAll(bridge);
  return bridge.version;
}

/** Makes `tabId` the active editor; its state replaces the server's. */
export function claimEditor(
  tabId: string,
  state: PersistedEditorState,
  now = Date.now(),
): { version: number } {
  const bridge = getAgentBridge();
  bridge.tabId = tabId;
  return { version: bump(bridge, state, "editor", tabId, now) };
}

export function pushEditorState(
  tabId: string,
  baseVersion: number,
  state: PersistedEditorState,
  now = Date.now(),
):
  | { ok: true; version: number }
  | { ok: false; reason: "not_active" | "stale"; version: number; state: PersistedEditorState | null } {
  const bridge = getAgentBridge();
  if (bridge.tabId !== tabId) {
    return { ok: false, reason: "not_active", version: bridge.version, state: bridge.state };
  }
  bridge.lastSeen = now;
  if (baseVersion !== bridge.version) {
    return { ok: false, reason: "stale", version: bridge.version, state: bridge.state };
  }
  return { ok: true, version: bump(bridge, state, "editor", tabId, now) };
}

export function touchEditor(tabId: string, now = Date.now()): void {
  const bridge = getAgentBridge();
  if (bridge.tabId === tabId) bridge.lastSeen = now;
}

export function isEditorConnected(now = Date.now()): boolean {
  const bridge = getAgentBridge();
  return bridge.tabId !== null && bridge.state !== null && now - bridge.lastSeen < LIVE_CLIENT_TIMEOUT_MS;
}

export function applyAgentOp(
  op: ProjectOp,
  now = Date.now(),
): { version: number; result: Record<string, unknown> } {
  const bridge = getAgentBridge();
  if (!isEditorConnected(now) || !bridge.state) throw new ProjectOpError(NO_EDITOR_MESSAGE);
  const { state, result } = applyProjectOp(bridge.state, op); // throws before any mutation
  return { version: bump(bridge, state, "agent", null, bridge.lastSeen), result };
}

/**
 * Resolves with the newest state once a version newer than `since` was written
 * by someone other than `tabId` (the agent, or another tab claiming). `active`
 * tells the tab whether it still owns the bridge. Resolves null on timeout.
 */
export function waitForEditorUpdate(
  tabId: string,
  since: number,
  timeoutMs = LIVE_LONG_POLL_MS,
): Promise<{ version: number; state: PersistedEditorState; active: boolean } | null> {
  const bridge = getAgentBridge();
  const snapshot = () =>
    bridge.state && bridge.version > since && bridge.lastWriterTab !== tabId
      ? { version: bridge.version, state: bridge.state, active: bridge.tabId === tabId }
      : null;

  const immediate = snapshot();
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (value: ReturnType<typeof snapshot>) => {
      if (timer) clearTimeout(timer);
      bridge.waiters.delete(wake);
      resolve(value);
    };
    const wake = () => {
      const update = snapshot();
      if (update) finish(update);
      else bridge.waiters.add(wake); // woken by an irrelevant bump; keep waiting
    };
    bridge.waiters.add(wake);
    timer = setTimeout(() => finish(null), timeoutMs);
  });
}
