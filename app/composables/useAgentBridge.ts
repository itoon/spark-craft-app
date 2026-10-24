import { nextTick, ref, watch, type WatchStopHandle } from "vue";

import {
  applyPersistedEditorState,
  serializeEditorState,
  useEditorStore,
  type PersistedEditorState,
} from "./useEditorStore";

/**
 * Editor side of the AI bridge. This tab claims itself as the project the AI
 * (via the MCP server) edits, pushes the learner's edits and applies the AI's
 * edits live. One bridge per browser tab, like `useLiveCompanion`.
 *
 * No echo loop: states applied from the server never trigger a push
 * (`applyingRemote` + `lastSyncedJson`), and every version this tab writes
 * becomes `lastKnownVersion`, so the next poll waits beyond it.
 */

/** `state: null` means no tab owns the bridge (server restarted, owner released it). */
interface EditorUpdate {
  version: number;
  state: PersistedEditorState | null;
  active: boolean;
}

interface ConflictData {
  reason: "stale" | "not_active";
  version: number;
  state: PersistedEditorState | null;
}

const PUSH_DEBOUNCE_MS = 350;
const RETRY_MS = 2000;
const RELEASE_URL = "/api/agent/editor/release";
const CONFLICT_TOAST = "AI แก้โปรเจกต์อยู่ — โหลดเวอร์ชันล่าสุดแล้ว";

// Nuxt replaces import.meta.client at build time; plain vitest leaves it
// undefined, so fall back to "is there a window" there.
const isClient = import.meta.client ?? typeof window !== "undefined";

// Singleton state (one editor per tab)
const tabId = isClient ? crypto.randomUUID() : "";
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

  /**
   * Replaces the editor's project with the server's without pushing it back.
   * Keeps the learner's page, selection and preview panel where they were.
   */
  async function applyRemote(state: PersistedEditorState, version: number) {
    cancelPendingPush();
    applyingRemote = true;
    try {
      const pageId = store.currentPageId.value;
      const selectedId = store.selectedElementId.value;
      const previewOpen = store.isPreviewOpen.value;
      applyPersistedEditorState(state);
      if (pageId !== store.currentPageId.value && store.pages.value.some((page) => page.id === pageId)) {
        store.switchPage(pageId);
      }
      if (selectedId && store.elements.value.some((element) => element.id === selectedId)) {
        store.selectElement(selectedId);
      }
      if (store.isPreviewOpen.value !== previewOpen) store.togglePreview();
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
      const gen = generation;
      cancelPendingPush();
      const state = serializeEditorState();
      try {
        const result = await $fetch<{ version: number }>("/api/agent/editor", {
          method: "POST",
          body: { tabId, state },
        });
        if (!running || gen !== generation) return; // stopped meanwhile
        lastKnownVersion = result.version;
        lastSyncedJson = JSON.stringify(state);
        isActive = true;
        connected.value = true;
      } catch (error: unknown) {
        if (!running || gen !== generation) return;
        if (statusOf(error) === 403) stop();
        else connected.value = false;
      }
    });
  }

  function push() {
    return enqueue(async () => {
      if (!running || !isActive) return;
      const gen = generation;
      const state = serializeEditorState();
      const json = JSON.stringify(state);
      if (json === lastSyncedJson) return;
      try {
        const result = await $fetch<{ version: number }>("/api/agent/editor", {
          method: "PUT",
          body: { tabId, baseVersion: lastKnownVersion, state },
        });
        if (!running || gen !== generation) return;
        lastKnownVersion = result.version;
        lastSyncedJson = json;
      } catch (error: unknown) {
        if (!running || gen !== generation) return; // stopped meanwhile
        const status = statusOf(error);
        if (status === 403) {
          stop();
          return;
        }
        if (status !== 409) return; // network hiccup: the next edit pushes again
        const data = (error as { data?: { data?: ConflictData } }).data?.data;
        if (data?.reason === "stale" && data.state) {
          await applyRemote(data.state, data.version);
          if (!running || gen !== generation) return;
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
        if (update && update.state === null) {
          // No tab owns the bridge (server restarted, or the owner closed):
          // nothing to overwrite there, so hand it this tab's project.
          isActive = false;
          connected.value = false;
          await claim();
          if (!running || gen !== generation) return;
          if (!isActive) await wait(RETRY_MS);
          continue;
        }
        if (update?.state && update.version > lastKnownVersion) {
          const droppedLocalEdit = pushTimer !== null;
          await applyRemote(update.state, update.version);
          if (!running || gen !== generation) return;
          isActive = update.active;
          // AI wins, but say so when the learner's last edit was not sent yet
          if (droppedLocalEdit) toast?.add({ title: CONFLICT_TOAST, color: "warning" });
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

  /** Back to a tab the learner left: take the bridge back, unless it is ours. */
  function onFocus() {
    if (!isActive) void claim();
  }

  /** Tab closed, reloaded or navigated: the AI must not edit an unseen copy. */
  function onPageHide() {
    isActive = false;
    connected.value = false;
    cancelPendingPush();
    const body = new Blob([JSON.stringify({ tabId })], { type: "application/json" });
    if (!navigator.sendBeacon?.(RELEASE_URL, body)) {
      void $fetch(RELEASE_URL, { method: "POST", body: { tabId }, keepalive: true }).catch(() => {});
    }
  }

  function start() {
    if (!isClient || running) return;
    running = true;
    generation += 1;
    lastKnownVersion = -1;
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);
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
    if (running) {
      // Queued after any claim in flight, so that claim cannot win afterwards
      void enqueue(async () => {
        await $fetch(RELEASE_URL, { method: "POST", body: { tabId } }).catch(() => {});
      });
    }
    running = false;
    generation += 1;
    isActive = false;
    connected.value = false;
    cancelPendingPush();
    pollAbort?.abort();
    pollAbort = null;
    for (const stopWatch of stopWatches) stopWatch();
    stopWatches = [];
    if (isClient) {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
    }
  }

  return { connected, start, stop };
}
