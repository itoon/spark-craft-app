<template>
  <div class="flex items-start gap-2">
    <span class="text-[10px] text-neutral-500 w-16 shrink-0 font-medium pt-1">{{ label }}</span>
    <div class="flex-1 min-w-0">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>()
</script>
