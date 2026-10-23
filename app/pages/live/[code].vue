<template>
  <div class="relative min-h-dvh bg-white">
    <!-- The running app -->
    <ExportSharedAppViewer
      v-if="payload"
      :key="viewerKey"
      :payload="payload"
      :storage-namespace="`live-${code}`"
      @log="queueLog"
    />

    <!-- Waiting for the first push -->
    <div
      v-else-if="!notFound"
      class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-neutral-950 p-8 text-center text-white"
    >
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-emerald-400 motion-reduce:animate-none" />
      <p class="text-base font-semibold">กำลังเชื่อมต่อกับคอมพิวเตอร์…</p>
      <p class="font-mono text-sm tracking-[0.3em] text-neutral-400">{{ code }}</p>
    </div>

    <!-- Unknown / expired code -->
    <div
      v-else
      class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-neutral-950 p-8 text-center text-white"
    >
      <UIcon name="i-lucide-unplug" class="size-10 text-neutral-500" />
      <p class="text-lg font-semibold">ไม่พบการเชื่อมต่อ {{ code }}</p>
      <p class="max-w-xs text-sm leading-relaxed text-neutral-400">
        บนคอมอาจกด “หยุดเชื่อมต่อ” ไปแล้ว หรือ dev server เพิ่งรีสตาร์ท ให้เปิดหน้าต่าง “ทดสอบบนมือถือ” แล้วสแกนใหม่
      </p>
      <NuxtLink
        to="/live"
        class="mt-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
      >
        กรอกรหัสใหม่
      </NuxtLink>
    </div>

    <!-- LIVE indicator: shows briefly after connect / each update, then fades -->
    <div
      v-if="payload"
      class="pointer-events-none fixed left-1/2 top-2 z-[100] -translate-x-1/2 transition-opacity duration-500"
      :class="showPill || !connected ? 'opacity-100' : 'opacity-0'"
      aria-live="polite"
    >
      <div
        class="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur"
        :class="connected ? 'bg-emerald-600/90' : 'bg-amber-600/90'"
      >
        <span class="size-1.5 rounded-full bg-white" :class="{ 'animate-pulse motion-reduce:animate-none': !connected }" />
        {{ connected ? (justUpdated ? "อัปเดตแล้ว" : "LIVE") : "กำลังเชื่อมต่อใหม่…" }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

import type { ConsoleEntry } from "~/composables/useRuntime";
import type { SharedExportPayload } from "~/utils/sharedExport";

const route = useRoute();
const code = String(route.params.code || "")
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, "")
  .slice(0, 6);

useHead({ title: `CodeCraft Live · ${code}` });

const payload = ref<SharedExportPayload | null>(null);
const viewerKey = ref(0);
const connected = ref(false);
const notFound = ref(false);
const showPill = ref(true);
const justUpdated = ref(false);

let version = -1;
let active = true;
let failures = 0;
let pillTimer: ReturnType<typeof setTimeout> | null = null;
let logTimer: ReturnType<typeof setInterval> | null = null;
let wakeLock: { release(): Promise<void> } | null = null;
const pendingLogs: { type: string; message: string }[] = [];

function getClientId() {
  const key = "codecraft-live-client";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = `c${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `c${Math.random().toString(36).slice(2, 10)}`;
  }
}
const clientId = import.meta.client ? getClientId() : "server";

function flashPill(updated: boolean) {
  showPill.value = true;
  justUpdated.value = updated;
  if (pillTimer) clearTimeout(pillTimer);
  pillTimer = setTimeout(() => {
    showPill.value = false;
    justUpdated.value = false;
  }, 2200);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollLoop() {
  while (active) {
    try {
      const result = await $fetch<{
        version: number;
        changed: boolean;
        payload: SharedExportPayload | null;
      }>(`/api/live/${code}`, {
        query: { since: version, client: clientId },
        timeout: 40_000,
      });
      failures = 0;
      if (!connected.value) {
        connected.value = true;
        flashPill(false);
      }
      if (result.changed && result.payload) {
        const isFirst = payload.value === null;
        payload.value = result.payload;
        version = result.version;
        // Fresh viewer per update = a clean run, like App Inventor's Companion reload.
        viewerKey.value += 1;
        flashPill(!isFirst);
      }
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 404) {
        notFound.value = true;
        active = false;
        return;
      }
      connected.value = false;
      failures += 1;
      await sleep(Math.min(5000, 800 * failures));
    }
  }
}

function queueLog(entry: ConsoleEntry) {
  pendingLogs.push({ type: entry.type, message: entry.message });
  if (pendingLogs.length > 100) pendingLogs.splice(0, pendingLogs.length - 100);
}

async function flushLogs() {
  if (!pendingLogs.length || notFound.value) return;
  const entries = pendingLogs.splice(0, 50);
  try {
    await $fetch(`/api/live/${code}/log`, {
      method: "POST",
      body: { clientId, entries },
    });
  } catch {
    // Logs are best effort; never break the app over them.
  }
}

async function keepScreenOn() {
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> };
    };
    wakeLock = (await nav.wakeLock?.request("screen")) ?? null;
  } catch {
    wakeLock = null;
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") void keepScreenOn();
}

onMounted(() => {
  void pollLoop();
  logTimer = setInterval(() => void flushLogs(), 1000);
  void keepScreenOn();
  document.addEventListener("visibilitychange", onVisibilityChange);
});

onBeforeUnmount(() => {
  active = false;
  if (pillTimer) clearTimeout(pillTimer);
  if (logTimer) clearInterval(logTimer);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  void wakeLock?.release().catch(() => undefined);
});
</script>
