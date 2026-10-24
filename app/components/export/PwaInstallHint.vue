<template>
  <!-- iPhone in Safari: how to put the app on the home screen -->
  <div
    v-if="showInstall"
    class="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(12px,env(safe-area-inset-bottom))]"
    data-testid="pwa-install-hint"
  >
    <div class="mx-auto max-w-md rounded-2xl bg-neutral-900/95 p-4 text-white shadow-2xl backdrop-blur">
      <div class="flex items-start gap-3">
        <img v-if="iconUrl" :src="iconUrl" alt="" class="size-11 shrink-0 rounded-xl" @error="iconUrl = ''">
        <div class="min-w-0 flex-1">
          <p class="font-semibold">ติดตั้ง “{{ appName }}” ลง iPhone</p>
          <ol class="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-neutral-300">
            <li>แตะ <UIcon name="i-lucide-share" class="inline-block size-4 align-[-2px]" /> <b class="text-white">แชร์</b> ที่แถบล่างของ Safari</li>
            <li>เลือก <b class="text-white">เพิ่มไปยังหน้าจอโฮม</b></li>
            <li>เปิดจาก icon ครั้งแรกตอนยังต่อ Wi‑Fi ห้องเรียน แล้วจะใช้ออฟไลน์ได้</li>
          </ol>
        </div>
        <button
          type="button"
          class="-m-1 rounded-lg p-1 text-neutral-400 hover:text-white"
          aria-label="ปิด"
          @click="dismiss"
        >
          <UIcon name="i-lucide-x" class="size-5" />
        </button>
      </div>
    </div>
  </div>

  <!-- Opened from the home screen (or any browser): offline status -->
  <div
    v-else-if="statusText"
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))]"
    data-testid="pwa-offline-status"
  >
    <a
      :href="state === 'insecure' ? '/cert' : undefined"
      class="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg"
      :class="statusClass"
    >
      <UIcon :name="statusIcon" class="size-4" :class="state === 'preparing' ? 'animate-spin' : ''" />
      {{ statusText }}
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import { isIos, isStandalone, type PwaOfflineState } from "~/composables/usePwaOffline";

const props = defineProps<{ shareId: string; appName: string; state: PwaOfflineState }>();

const iconUrl = ref(`/api/pwa/${props.shareId}/icon.png`);
const ios = ref(false);
const standalone = ref(false);
const dismissed = ref(false);
const readyShown = ref(true);
const dismissKey = `codecraft-pwa-hint-${props.shareId}`;

onMounted(() => {
  ios.value = isIos();
  standalone.value = isStandalone();
  try {
    dismissed.value = localStorage.getItem(dismissKey) === "1";
  } catch {
    // private mode — just show it again next time
  }
});

// "Ready" only needs a moment on screen; the app itself is what matters
watch(
  () => props.state,
  (state) => {
    if (state === "ready") setTimeout(() => (readyShown.value = false), 2500);
  },
);

const showInstall = computed(
  () => ios.value && !standalone.value && !dismissed.value && props.state !== "insecure",
);

const statusText = computed(() => {
  switch (props.state) {
    case "insecure":
      return ios.value || standalone.value ? "ติดตั้งใบรับรองห้องเรียนก่อน เพื่อใช้ออฟไลน์ — แตะที่นี่" : "";
    case "preparing":
      return standalone.value ? "กำลังเตรียมให้ใช้ออฟไลน์…" : "";
    case "ready":
      return standalone.value && readyShown.value ? "พร้อมใช้ออฟไลน์แล้ว" : "";
    case "error":
      return standalone.value ? "ยังใช้ออฟไลน์ไม่ได้ — ต่อ Wi‑Fi ห้องเรียนแล้วเปิดใหม่" : "";
    default:
      return "";
  }
});

const statusIcon = computed(() =>
  ({
    insecure: "i-lucide-shield-alert",
    preparing: "i-lucide-loader-circle",
    ready: "i-lucide-circle-check",
    error: "i-lucide-wifi-off",
    unsupported: "i-lucide-info",
  })[props.state],
);

const statusClass = computed(() =>
  props.state === "ready"
    ? "bg-emerald-600 text-white"
    : props.state === "preparing"
      ? "bg-neutral-900/90 text-white"
      : "bg-amber-500 text-neutral-950",
);

function dismiss() {
  dismissed.value = true;
  try {
    localStorage.setItem(dismissKey, "1");
  } catch {
    // ignore
  }
}
</script>
