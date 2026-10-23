<template>
  <!-- Player used inside the APK: shows the bundled app full screen. -->
  <ExportSharedAppViewer
    v-if="payload"
    :payload="payload"
    :storage-namespace="`apk-${payload.appName}`"
    fullscreen
  />
  <div
    v-else
    class="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white p-8 text-center text-neutral-600"
  >
    <UIcon
      :name="error ? 'i-lucide-circle-alert' : 'i-lucide-loader-circle'"
      class="size-8"
      :class="error ? 'text-red-500' : 'animate-spin text-neutral-400 motion-reduce:animate-none'"
    />
    <p class="text-sm">{{ error || "กำลังเปิดแอป…" }}</p>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { SharedExportPayload } from "~/utils/sharedExport";

const payload = ref<SharedExportPayload | null>(null);
const error = ref("");

useHead({ title: "CodeCraft" });
watch(payload, (value) => {
  if (value?.appName) document.title = value.appName;
});

onMounted(async () => {
  try {
    const response = await fetch("/codecraft-app.json", { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    payload.value = (await response.json()) as SharedExportPayload;
  } catch {
    error.value = "ไม่พบไฟล์แอป (codecraft-app.json) — build APK ใหม่อีกครั้ง";
    return;
  }
  await nextTick();
  setTimeout(() => void matchSystemBars(), 150);
  // Re-check when the screen changes (page.goTo, code changing the toolbar colour…)
  if (nativeCapacitor()) {
    barsObserver = new MutationObserver(() => {
      if (barsTimer) clearTimeout(barsTimer);
      barsTimer = setTimeout(() => void matchSystemBars(), 120);
    });
    barsObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
  }
});

let barsObserver: MutationObserver | null = null;
let barsTimer: ReturnType<typeof setTimeout> | null = null;
let lastBarColor = "";
onBeforeUnmount(() => {
  barsObserver?.disconnect();
  if (barsTimer) clearTimeout(barsTimer);
});

// ── Android system bars ────────────────────────────────────────────────────
// Inside the APK the EdgeToEdge plugin keeps the app between the system bars;
// here we paint the status bar in the toolbar colour (white when there is no
// toolbar) and the navigation bar in the page's own background colour, with
// light/dark icons so both stay readable.
interface NativePlugins {
  /** apk-template/native: separate top / bottom colours (also sets icon contrast) */
  SystemBars?: { setColors?: (o: { top: string; bottom: string }) => Promise<void> };
  EdgeToEdge?: {
    setStatusBarColor?: (o: { color: string }) => Promise<void>;
    setNavigationBarColor?: (o: { color: string }) => Promise<void>;
    setBackgroundColor?: (o: { color: string }) => Promise<void>;
  };
  StatusBar?: { setStyle?: (o: { style: "DARK" | "LIGHT" }) => Promise<void> };
}

function toHex(color: string): string | null {
  const value = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) return `#${[...value.slice(1)].map((c) => c + c).join("")}`;
  const rgb = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!rgb) return null;
  return `#${rgb.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}

function isDark(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! < 0.6;
}

function nativeCapacitor() {
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: NativePlugins };
  }).Capacitor;
  return cap?.isNativePlatform?.() ? cap : null;
}

/** Background colour at the bottom edge of the page (first non-transparent one). */
function bottomPageColor(): string {
  let el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 2) as HTMLElement | null;
  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && !/rgba\([^)]*,\s*0\)|transparent/i.test(bg)) return toHex(bg) ?? "#ffffff";
    el = el.parentElement;
  }
  return "#ffffff";
}

async function matchSystemBars() {
  const cap = nativeCapacitor();
  if (!cap) return;
  const toolbar = document.querySelector<HTMLElement>('[style*="--ion-toolbar-background"]');
  const color = toHex(toolbar?.style.getPropertyValue("--ion-toolbar-background") ?? "") ?? "#ffffff";
  const bottom = bottomPageColor();
  if (`${color} ${bottom}` === lastBarColor) return;
  lastBarColor = `${color} ${bottom}`;
  const { SystemBars, EdgeToEdge, StatusBar } = cap.Plugins ?? {};
  try {
    if (SystemBars?.setColors) {
      await SystemBars.setColors({ top: color, bottom });
      return;
    }
    if (EdgeToEdge?.setStatusBarColor) {
      await EdgeToEdge.setStatusBarColor({ color });
      await EdgeToEdge.setNavigationBarColor?.({ color: "#ffffff" });
    } else {
      // plugin 7.x (Capacitor 7) only has one colour for both bars
      await EdgeToEdge?.setBackgroundColor?.({ color });
    }
    // StatusBar "DARK" = light icons (for dark backgrounds)
    await StatusBar?.setStyle?.({ style: isDark(color) ? "DARK" : "LIGHT" });
  } catch {
    // Older Android / plugin missing: the app still works, only the bar colour differs
  }
}
</script>
