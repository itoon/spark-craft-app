<template>
  <div class="border-b border-neutral-700/60">
    <!-- Section header (collapsible) -->
    <button
      class="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-800/50 transition-colors text-left"
      @click="open = !open"
    >
      <UIcon :name="icon" class="text-neutral-500 size-3 shrink-0" />
      <span class="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest flex-1">{{ title }}</span>
      <UIcon
        :name="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="text-neutral-600 size-3 shrink-0 transition-transform duration-150"
      />
    </button>

    <!-- Content -->
    <div v-show="open" class="px-3 pb-3">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
  icon: string
}>()

// Default open so users immediately see content
const open = ref(true)
</script>
