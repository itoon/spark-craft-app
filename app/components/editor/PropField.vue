<template>
  <div class="flex items-center gap-2">
    <span class="text-[10px] text-neutral-500 w-14 shrink-0 font-mono">{{ label }}</span>
    <div class="flex-1 min-w-0">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>()
</script>
