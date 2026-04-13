<template>
  <div class="shrink-0">
    <div
      class="relative bg-neutral-800 border-neutral-600 shadow-2xl shadow-black/50 overflow-hidden"
      :style="frameStyle"
    >
      <div
        class="relative bg-white overflow-hidden w-full h-full"
        :style="screenStyle"
        @click.self="emit('screen-click')"
      >
        <slot />
        <div
          v-if="device.id === 'iphone15'"
          class="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-neutral-400/30 rounded-full"
        />
        <div
          v-else-if="device.id === 'android'"
          class="absolute bottom-2 left-1/2 -translate-x-1/2 w-[140px] h-[4px] bg-neutral-400/30 rounded-full"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { PreviewDeviceDef } from "~/composables/usePreviewDevices";

const props = defineProps<{
  device: PreviewDeviceDef;
}>();

const emit = defineEmits<{
  (e: "screen-click"): void;
}>();

const frameStyle = computed(() => ({
  width: `${props.device.totalW}px`,
  height: `${props.device.totalH}px`,
  borderRadius: `${props.device.cornerRadius}px`,
  borderWidth: `${props.device.borderWidth}px`,
}));

const screenStyle = computed(() => ({
  borderRadius: `${props.device.screenRadius}px`,
}));
</script>
