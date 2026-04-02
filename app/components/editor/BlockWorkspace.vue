<template>
  <div class="flex-1 flex flex-col items-center justify-center bg-neutral-950 gap-6 p-8">
    <!-- Icon cluster suggesting a visual dataflow graph -->
    <div class="flex items-center gap-3 opacity-50">
      <div class="node bg-emerald-900 border border-emerald-700 rounded-lg px-3 py-2 flex items-center gap-1.5">
        <UIcon name="i-lucide-circle-play" class="text-emerald-400 size-4" />
        <span class="text-[10px] text-emerald-300 font-mono">on Click</span>
      </div>
      <div class="flex items-center gap-0.5">
        <div class="w-6 h-px bg-neutral-600" />
        <div class="size-1.5 rounded-full bg-neutral-600" />
      </div>
      <div class="node bg-indigo-900 border border-indigo-700 rounded-lg px-3 py-2 flex items-center gap-1.5">
        <UIcon name="i-lucide-cpu" class="text-indigo-400 size-4" />
        <span class="text-[10px] text-indigo-300 font-mono">set State</span>
      </div>
      <div class="flex items-center gap-0.5">
        <div class="w-6 h-px bg-neutral-600" />
        <div class="size-1.5 rounded-full bg-neutral-600" />
      </div>
      <div class="node bg-amber-900 border border-amber-700 rounded-lg px-3 py-2 flex items-center gap-1.5">
        <UIcon name="i-lucide-monitor" class="text-amber-400 size-4" />
        <span class="text-[10px] text-amber-300 font-mono">update UI</span>
      </div>
    </div>

    <div class="text-center space-y-2 max-w-xs">
      <h2 class="text-base font-semibold text-neutral-300">Block Mode</h2>
      <p class="text-sm text-neutral-500 leading-relaxed">
        Visual block-based logic editor (Blockly workspace) coming in the next milestone.
      </p>
      <p class="text-xs text-neutral-600">
        Connect events, conditions, and actions without writing code.
      </p>
    </div>

    <UBadge color="warning" variant="subtle" size="sm" label="Coming soon" />
  </div>
</template>

<script setup lang="ts">
// Placeholder — Blockly integration in a future milestone
</script>
