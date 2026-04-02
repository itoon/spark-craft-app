<template>
  <!-- Redirect handled in setup; this renders only during the brief navigation frame -->
  <div class="h-screen flex items-center justify-center bg-neutral-950">
    <div class="flex items-center gap-3 text-neutral-500">
      <div class="size-7 rounded bg-indigo-600 flex items-center justify-center animate-pulse">
        <UIcon name="i-lucide-code-2" class="size-4 text-white" />
      </div>
      <span class="text-sm font-medium">Loading CodeCraft…</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Redirect immediately to the editor — the index route is just an entry point
await navigateTo('/editor', { replace: true })
</script>
