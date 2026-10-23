<template>
  <!-- Rounded-square app icon as it looks on an Android home screen -->
  <span
    class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] select-none"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: icon.image ? undefined : icon.color,
      fontSize: `${Math.round(size * 0.6)}px`,
      lineHeight: 1,
    }"
    aria-hidden="true"
  >
    <img v-if="icon.image" :src="icon.image" alt="" class="size-full object-cover" >
    <template v-else>{{ icon.emoji }}</template>
  </span>
</template>

<script setup lang="ts">
import type { AppIcon } from "~/utils/appIcon";

withDefaults(defineProps<{ icon: AppIcon; size?: number }>(), { size: 48 });
</script>
