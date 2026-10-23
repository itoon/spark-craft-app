<template>
  <!--
    The outer box takes the *scaled* size so surrounding layout (centering,
    scrolling) sees the real footprint. The frame inside is drawn at native
    size and shrunk with a transform, which keeps the app pixel-accurate.
  -->
  <div
    class="device-frame-outer shrink-0"
    :style="outerStyle"
  >
    <div
      class="relative bg-neutral-800 border-neutral-600 shadow-2xl shadow-black/50 overflow-hidden"
      :style="frameStyle"
    >
      <div
        class="relative bg-white overflow-hidden w-full h-full"
        :style="screenStyle"
        @click.self="emit('screen-click')"
      >
        <IonApp>
          <slot />
        </IonApp>
        <slot name="overlay" />
        <div
          v-if="device.id === 'iphone15'"
          class="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-neutral-400/30 rounded-full"
        />
        <div
          v-else-if="device.id === 'android'"
          class="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 w-[140px] h-[4px] bg-neutral-400/30 rounded-full"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { PreviewDeviceDef } from "~/composables/usePreviewDevices";

const props = withDefaults(
  defineProps<{
    device: PreviewDeviceDef;
    /** 1 = native size. Below 1 shrinks to fit; up to 1.5 enlarges on big screens. */
    scale?: number;
  }>(),
  { scale: 1 },
);

const emit = defineEmits<{
  (e: "screen-click"): void;
}>();

const safeScale = computed(() => {
  const value = Number(props.scale);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(1.5, value);
});

const outerStyle = computed(() => ({
  width: `${Math.round(props.device.totalW * safeScale.value)}px`,
  height: `${Math.round(props.device.totalH * safeScale.value)}px`,
}));

const frameStyle = computed(() => ({
  width: `${props.device.totalW}px`,
  height: `${props.device.totalH}px`,
  borderRadius: `${props.device.cornerRadius}px`,
  borderWidth: `${props.device.borderWidth}px`,
  transform: safeScale.value === 1 ? undefined : `scale(${safeScale.value})`,
  transformOrigin: "top left",
}));

const screenStyle = computed(() => ({
  borderRadius: `${props.device.screenRadius}px`,
}));
</script>
