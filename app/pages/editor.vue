<template>
  <div
    class="editor-root h-screen flex flex-col overflow-hidden bg-neutral-950 text-gray-100"
  >
    <!-- ── HEADER ──────────────────────────────────────────────────── -->
    <header
      class="editor-header flex items-center gap-3 px-4 h-11 bg-neutral-900 border-b border-neutral-700 shrink-0 z-10"
    >
      <!-- Logo -->
      <div class="flex items-center gap-2 shrink-0">
        <div
          class="size-6 rounded bg-indigo-600 flex items-center justify-center"
        >
          <UIcon name="i-lucide-code-2" class="size-3.5 text-white" />
        </div>
        <span class="text-sm font-bold text-white tracking-tight"
          >CodeCraft</span
        >
      </div>

      <div class="w-px h-5 bg-neutral-700 mx-1" />

      <!-- Mode tabs -->
      <nav class="flex items-center gap-0.5 bg-neutral-800 rounded-lg p-0.5">
        <button
          v-for="tab in modeTabs"
          :key="tab.key"
          class="mode-tab flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors duration-100"
          :class="
            store.mode.value === tab.key
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          "
          @click="store.setMode(tab.key)"
        >
          <UIcon :name="tab.icon" class="size-3.5" />
          {{ tab.label }}
        </button>
      </nav>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Element count indicator -->
      <div
        v-if="store.elements.value.length > 0"
        class="flex items-center gap-1.5 text-[10px] text-neutral-500"
      >
        <UIcon name="i-lucide-layers" class="size-3" />
        <span
          >{{ store.elements.value.length }} element{{
            store.elements.value.length !== 1 ? "s" : ""
          }}</span
        >
      </div>

      <!-- Run button -->
      <UButton
        :label="store.isRunning.value ? 'Stop' : 'Run'"
        :icon="store.isRunning.value ? 'i-lucide-square' : 'i-lucide-play'"
        :color="store.isRunning.value ? 'error' : 'success'"
        variant="solid"
        size="xs"
        data-testid="run-button"
        @click="handleRun"
      />

      <!-- Export button -->
      <UButton
        label="Export"
        icon="i-lucide-download"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="handleExport"
      />

      <!-- Keyboard shortcut hint -->
      <div
        class="hidden lg:flex items-center gap-1 text-[10px] text-neutral-600 ml-1"
      >
        <kbd
          class="px-1.5 py-0.5 bg-neutral-800 rounded text-[9px] font-mono border border-neutral-700"
          >⌘K</kbd
        >
        <span>command</span>
      </div>
    </header>

    <!-- ── MAIN WORKSPACE ──────────────────────────────────────────── -->
    <div class="editor-workspace flex flex-1 overflow-hidden">
      <!-- ── RUN MODE: replaces entire workspace ── -->
      <EditorRunMode v-if="store.isRunning.value" />

      <!-- ── DESIGN MODE: normal editor columns ── -->
      <template v-else>
        <!-- First: Learning Panel -->
        <EditorLearningPanel />

        <!-- Second: Page Manager -->
        <!-- Removed - now integrated into DesignCanvas -->

        <!-- Third: Element Palette -->
        <EditorElementPalette v-if="store.mode.value === 'design'" />
        <EditorBlockWorkspace v-else-if="store.mode.value === 'block'" />
        <EditorCodeEditor v-else-if="store.mode.value === 'code'" />

        <!-- Center: mode-specific workspace -->
        <main class="editor-center flex-1 flex flex-col overflow-hidden">
          <EditorDesignCanvas />
        </main>

        <!-- Right: Properties Panel -->
        <EditorPropertiesPanel />
      </template>
    </div>

    <!-- ── BOTTOM PREVIEW PANEL (design mode only) ──────────────────── -->
    <EditorPreviewPanel v-if="!store.isRunning.value" />
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from "~/composables/useEditorStore";
import type { EditorMode } from "~/composables/useEditorStore";

useHead({
  title: "Editor — CodeCraft",
});

const store = useEditorStore();

interface ModeTab {
  key: EditorMode;
  label: string;
  icon: string;
}

const modeTabs: ModeTab[] = [
  { key: "design", label: "Design", icon: "i-lucide-pen-tool" },
  { key: "block", label: "Block", icon: "i-lucide-blocks" },
  { key: "code", label: "Code", icon: "i-lucide-code-2" },
];

function handleRun() {
  store.setRunning(!store.isRunning.value);
}

function handleExport() {
  // Export stub — will generate Vue SFC from canvas elements
  alert("Export to Vue SFC — coming soon!");
}
</script>

<style>
/* Ensure the editor truly fills the viewport; these rules apply globally
   since the editor is a full-screen tool, not a document page. */
html,
body {
  height: 100%;
  overflow: hidden;
}
</style>
