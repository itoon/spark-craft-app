import { computed, ref, watch, type WatchStopHandle } from "vue";

import { useEditorStore } from "~/composables/useEditorStore";
import type { SharedExportPayload } from "~/utils/sharedExport";

/**
 * Editor side of the Live Companion (CodeCraft's version of App Inventor's
 * AI Companion). One session per browser tab; it keeps pushing while the
 * dialog is closed so the phone stays in sync.
 */

export interface LiveClientInfo {
  id: string;
  platform: "android" | "ios" | "other";
  userAgent: string;
  lastSeen: number;
}

export interface LiveLogInfo {
  seq: number;
  clientId: string;
  type: "log" | "warn" | "error" | "success";
  message: string;
  at: number;
}

interface LanAddress {
  name: string;
  address: string;
}

type LiveStatus = "idle" | "starting" | "live" | "error";

const SESSION_STORAGE_KEY = "codecraft-live-code";
const PUSH_DEBOUNCE_MS = 350;
const STATUS_POLL_MS = 2000;
const MAX_LOGS = 150;

// Singleton state (one editor per tab)
const code = ref<string | null>(null);
const status = ref<LiveStatus>("idle");
const errorMessage = ref("");
const clients = ref<LiveClientInfo[]>([]);
const logs = ref<LiveLogInfo[]>([]);
const lanAddresses = ref<LanAddress[]>([]);
const selectedAddress = ref<string>("");
const serverPort = ref<number>(3000);
const version = ref(0);
const lastPushAt = ref<number | null>(null);

let stopWatch: WatchStopHandle | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let statusTimer: ReturnType<typeof setInterval> | null = null;
let lastPushedJson = "";
let lastLogSeq = 0;
const seenClientIds = new Set<string>();

function isLoopbackHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function readSavedCode(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveCode(value: string | null) {
  try {
    if (value) sessionStorage.setItem(SESSION_STORAGE_KEY, value);
    else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage can be blocked; the session still works for this page load.
  }
}

export function useLiveCompanion() {
  const store = useEditorStore();

  const isLoopback = computed(() =>
    import.meta.client ? isLoopbackHost(window.location.hostname) : false,
  );

  /** Base URL a phone on the same Wi-Fi can open. */
  const phoneBaseUrl = computed(() => {
    if (!import.meta.client) return "";
    if (!isLoopback.value) return window.location.origin;
    if (!selectedAddress.value) return "";
    const port = window.location.port || String(serverPort.value);
    return `${window.location.protocol}//${selectedAddress.value}${port ? `:${port}` : ""}`;
  });

  const phoneUrl = computed(() =>
    code.value && phoneBaseUrl.value ? `${phoneBaseUrl.value}/live/${code.value}` : "",
  );

  const connectedCount = computed(() => clients.value.length);

  function buildPayload(): SharedExportPayload {
    return {
      appName: store.projectName.value || "CodeCraft App",
      pages: store.pages.value,
      // While Run mode is active the store holds runtime values (a ticking
      // label, typed input) — always send the design-time version instead.
      elements: store.elementSnapshot.value ?? store.elements.value,
      jsCodeByPage: store.jsCodeByPage.value,
      startPageId: store.currentPageId.value,
      // The phone renders with the same look (iOS / Android) as the design preview
      activeDeviceId: store.activeDeviceId.value,
    };
  }

  async function pushNow(force = false) {
    if (!code.value) return;
    const payload = buildPayload();
    const json = JSON.stringify(payload);
    if (!force && json === lastPushedJson) return;

    try {
      const result = await $fetch<{ version: number }>(`/api/live/${code.value}`, {
        method: "PUT",
        body: payload,
      });
      lastPushedJson = json;
      version.value = result.version;
      lastPushAt.value = Date.now();
      if (status.value !== "live") status.value = "live";
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 404) {
        // Dev server restarted and forgot the session — make a new one.
        await restart();
        return;
      }
      errorMessage.value = "Couldn't send the app to the phone. Is the dev server still running?";
    }
  }

  function schedulePush() {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void pushNow();
    }, PUSH_DEBOUNCE_MS);
  }

  /**
   * When a phone connects, switch the design canvas to the same OS so the
   * editor and the phone look the same. Only reacts to *newly* connected
   * phones, so a manual switch by the learner afterwards is respected.
   */
  function matchPreviewToPhone(list: LiveClientInfo[]) {
    const key = (client: LiveClientInfo) => `${client.id}:${client.platform}`;
    const fresh = list.filter((client) => !seenClientIds.has(key(client)));
    for (const client of list) seenClientIds.add(key(client));
    const platforms = new Set(
      fresh.map((client) => client.platform).filter((platform) => platform !== "other"),
    );
    if (platforms.size !== 1) return;
    const [platform] = [...platforms];
    const deviceId = platform === "android" ? "android" : "iphone15";
    if (store.activeDeviceId.value !== deviceId) store.setActiveDevice(deviceId);
  }

  async function pollStatus() {
    if (!code.value) return;
    try {
      const result = await $fetch<{
        clients: LiveClientInfo[];
        logs: LiveLogInfo[];
      }>(`/api/live/${code.value}/status`, { query: { after: lastLogSeq } });
      clients.value = result.clients;
      matchPreviewToPhone(result.clients);
      if (result.logs.length) {
        lastLogSeq = result.logs[result.logs.length - 1]!.seq;
        logs.value = [...logs.value, ...result.logs].slice(-MAX_LOGS);
      }
    } catch (error: unknown) {
      if ((error as { statusCode?: number })?.statusCode === 404) {
        await restart();
      }
    }
  }

  async function loadNetwork() {
    try {
      const result = await $fetch<{ port: number; addresses: LanAddress[] }>("/api/live/network");
      lanAddresses.value = result.addresses;
      serverPort.value = result.port;
      if (!result.addresses.find((item) => item.address === selectedAddress.value)) {
        selectedAddress.value = result.addresses[0]?.address ?? "";
      }
    } catch {
      lanAddresses.value = [];
    }
  }

  function startLoops() {
    stopLoops();
    stopWatch = watch(
      [store.elements, store.pages, store.jsCodeByPage, store.projectName, store.currentPageId, store.isRunning],
      () => schedulePush(),
      { deep: true },
    );
    statusTimer = setInterval(() => void pollStatus(), STATUS_POLL_MS);
  }

  function stopLoops() {
    stopWatch?.();
    stopWatch = null;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = null;
    if (statusTimer) clearInterval(statusTimer);
    statusTimer = null;
  }

  async function start() {
    if (!import.meta.client) return;
    if (status.value === "live" || status.value === "starting") return;
    status.value = "starting";
    errorMessage.value = "";
    await loadNetwork();

    const saved = readSavedCode();
    try {
      if (saved) {
        // Reuse the code from before a page reload if the server still knows it.
        try {
          await $fetch(`/api/live/${saved}/status`);
          code.value = saved;
        } catch {
          code.value = null;
        }
      }
      if (!code.value) {
        const result = await $fetch<{ code: string }>("/api/live/session", { method: "POST" });
        code.value = result.code;
      }
      saveCode(code.value);
      lastPushedJson = "";
      lastLogSeq = 0;
      logs.value = [];
      startLoops();
      await pushNow(true);
      await pollStatus();
      status.value = "live";
    } catch {
      status.value = "error";
      errorMessage.value = "Couldn't start a live session. Is the dev server running?";
    }
  }

  async function restart() {
    stopLoops();
    saveCode(null);
    code.value = null;
    status.value = "idle";
    await start();
  }

  function stop() {
    stopLoops();
    saveCode(null);
    code.value = null;
    clients.value = [];
    status.value = "idle";
  }

  function clearLogs() {
    logs.value = [];
  }

  return {
    code,
    status,
    errorMessage,
    clients,
    connectedCount,
    logs,
    lanAddresses,
    selectedAddress,
    isLoopback,
    phoneUrl,
    phoneBaseUrl,
    version,
    lastPushAt,
    start,
    stop,
    restart,
    pushNow,
    clearLogs,
    loadNetwork,
  };
}
