import { nextTick, ref, watch, type WatchStopHandle } from "vue";

import {
  applyPersistedEditorState,
  serializeEditorState,
  useEditorStore,
  type PersistedEditorState,
} from "~/composables/useEditorStore";

/**
 * Editor side of the AI bridge. This tab claims itself as the project the AI
 * (via the MCP server) edits, pushes the learner's edits and applies the AI's
 * edits live. One bridge per browser tab, like `useLiveCompanion`.
 *
 * No echo loop: states applied from the server never trigger a push
 * (`applyingRemote` + `lastSyncedJson`), and every version this tab writes
 * becomes `lastKnownVersion`, so the next poll waits beyond it.
 */

interface EditorUpdate {
  version: number;
  state: PersistedEditorState;
  active: boolean;
}

interface ConflictData {
  reason: "stale" | "not_active";
  version: number;
  state: PersistedEditorState | null;
}

const PUSH_DEBOUNCE_MS = 350;
const RETRY_MS = 2000;
const CONFLICT_TOAST = "AI แก้โปรเจกต์อยู่ — โหลดเวอร์ชันล่าสุดแล้ว";

// Singleton state (one editor per tab)
const tabId = import.meta.client ? crypto.randomUUID() : "";
const connected = ref(false);

let running = false;
let generation = 0;
let isActive = false;
let lastKnownVersion = -1;
let lastSyncedJson = "";
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pollAbort: AbortController | null = null;
let stopWatches: WatchStopHandle[] = [];
/** Claims and pushes run one at a time so each uses the newest version. */
let syncQueue: Promise<void> = Promise.resolve();
let toast: ReturnType<typeof useToast> | null = null;

function statusOf(error: unknown): number | undefined {
  return (error as { statusCode?: number; status?: number })?.statusCode
    ?? (error as { status?: number })?.status;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cancelPendingPush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
}

function enqueue(task: () => Promise<void>) {
  syncQueue = syncQueue.then(task, task);
  return syncQueue;
}

export function useAgentBridge() {
  const store = useEditorStore();
  if (!toast) toast = useToast();

  /** Replaces the editor's project with the server's without pushing it back. */
  async function applyRemote(state: PersistedEditorState, version: number) {
    cancelPendingPush();
    applyingRemote = true;
    try {
      const pageId = store.currentPageId.value;
      applyPersistedEditorState(state);
      if (pageId !== store.currentPageId.value && store.pages.value.some((page) => page.id === pageId)) {
        store.switchPage(pageId);
      }
      // Let the persisted-field watchers run while the guard is still up.
      await nextTick();
    } finally {
      applyingRemote = false;
    }
    lastKnownVersion = version;
    lastSyncedJson = JSON.stringify(serializeEditorState());
  }

  function claim() {
    return enqueue(async () => {
      if (!running) return;
      cancelPendingPush();
      const state = serializeEditorState();
      try {
        const result = await $fetch<{ version: number }>("/api/agent/editor", {
          method: "POST",
          body: { tabId, state },
        });
        lastKnownVersion = result.version;
        lastSyncedJson = JSON.stringify(state);
        isActive = true;
        connected.value = true;
      } catch (error: unknown) {
        if (statusOf(error) === 403) stop();
        else connected.value = false;
      }
    });
  }

  function push() {
    return enqueue(async () => {
      if (!running || !isActive) return;
      const state = serializeEditorState();
      const json = JSON.stringify(state);
      if (json === lastSyncedJson) return;
      try {
        const result = await $fetch<{ version: number }>("/api/agent/editor", {
          method: "PUT",
          body: { tabId, baseVersion: lastKnownVersion, state },
        });
        lastKnownVersion = result.version;
        lastSyncedJson = json;
      } catch (error: unknown) {
        const status = statusOf(error);
        if (status === 403) {
          stop();
          return;
        }
        if (status !== 409) return; // network hiccup: the next edit pushes again
        const data = (error as { data?: { data?: ConflictData } }).data?.data;
        if (data?.reason === "stale" && data.state) {
          await applyRemote(data.state, data.version);
          toast?.add({ title: CONFLICT_TOAST, color: "warning" });
        } else {
          // Another tab took over (or the server restarted): the learner is
          // editing here, so take the bridge back with this tab's project.
          isActive = false;
          connected.value = false;
          void claim();
        }
      }
    });
  }

  function schedulePush() {
    if (applyingRemote) return;
    cancelPendingPush();
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void push();
    }, PUSH_DEBOUNCE_MS);
  }

  async function pollLoop(gen: number) {
    while (running && gen === generation) {
      if (lastKnownVersion < 0) {
        // Not claimed yet (server unreachable at load): keep trying.
        await claim();
        if (lastKnownVersion < 0) {
          await wait(RETRY_MS);
          continue;
        }
      }
      pollAbort = new AbortController();
      try {
        const response = await $fetch.raw<EditorUpdate | null>("/api/agent/editor", {
          query: { tabId, since: lastKnownVersion },
          signal: pollAbort.signal,
        });
        if (!running || gen !== generation) return;
        const update = response.status === 204 ? null : response._data;
        if (update && update.version > lastKnownVersion) {
          await applyRemote(update.state, update.version);
          isActive = update.active;
        }
        connected.value = isActive;
      } catch (error: unknown) {
        if (!running || gen !== generation) return;
        if (statusOf(error) === 403) {
          stop();
          return;
        }
        connected.value = false;
        await wait(RETRY_MS);
      }
    }
  }

  function onFocus() {
    void claim();
  }

  function start() {
    if (!import.meta.client || running) return;
    running = true;
    generation += 1;
    lastKnownVersion = -1;
    window.addEventListener("focus", onFocus);
    stopWatches = [
      // Same fields as initializePersistence
      watch(
        [
          store.projectId,
          store.projectName,
          store.appIcon,
          store.shareLinkId,
          store.elements,
          store.pages,
          store.currentPageId,
          store.activeDeviceId,
          store.jsCodeByPage,
        ],
        () => schedulePush(),
        { deep: true },
      ),
      // Learning mode switched workspace: hand the AI the new project
      watch(store.projectId, () => {
        if (!applyingRemote) void claim();
      }),
    ];
    void pollLoop(generation);
  }

  function stop() {
    running = false;
    generation += 1;
    isActive = false;
    connected.value = false;
    cancelPendingPush();
    pollAbort?.abort();
    pollAbort = null;
    for (const stopWatch of stopWatches) stopWatch();
    stopWatches = [];
    if (import.meta.client) window.removeEventListener("focus", onFocus);
  }

  return { connected, start, stop };
}
