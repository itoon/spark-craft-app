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

      <div class="hidden lg:flex items-center gap-2 text-[10px] text-neutral-500 mr-2">
        <UIcon name="i-lucide-folder-open" class="size-3" />
        <span class="font-mono truncate max-w-[180px]">{{ store.projectName.value }}</span>
      </div>

      <UButton
        label="New"
        icon="i-lucide-file-plus-2"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="handleNewProject"
      />

      <UButton
        label="Save"
        icon="i-lucide-save"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="handleSaveProject"
      />

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

      <!-- PWA Link button -->
      <UButton
        :loading="isCreatingShareLink"
        label="PWA Link"
        icon="i-lucide-link"
        color="primary"
        variant="subtle"
        size="xs"
        @click="handleCreateShareLink"
      />

      <!-- Export local button -->
      <UButton
        :loading="isExporting"
        label="Export Local"
        icon="i-lucide-download"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="handleLocalExport"
      />

      <!-- Keyboard shortcut hint -->
      <div
        class="hidden lg:flex items-center gap-1 text-[10px] text-neutral-600 ml-1 cursor-pointer"
        @click="isCommandPaletteOpen = true"
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

    <EditorCommandPalette
      :open="isCommandPaletteOpen"
      @close="isCommandPaletteOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

import { useEditorStore } from "~/composables/useEditorStore";
import type { EditorMode } from "~/composables/useEditorStore";

useHead({
  title: "Editor — CodeCraft",
});

const store = useEditorStore();
const isExporting = ref(false);
const isCreatingShareLink = ref(false);
const isCommandPaletteOpen = ref(false);

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

function onWindowKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    isCommandPaletteOpen.value = true;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onWindowKeydown);
});

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to execCommand below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

function handleRun() {
  store.setRunning(!store.isRunning.value);
}

function handleNewProject() {
  const confirmed = window.confirm(
    "Create a new project?\n\nYour current project is auto-saved, but this will clear the editor and start a fresh project."
  );

  if (!confirmed) return;

  store.newProject();
}

function handleSaveProject() {
  store.saveProject();
  window.alert("Project saved.");
}

async function handleLocalExport() {
  if (isExporting.value) return;

  isExporting.value = true;

  try {
    const result = await $fetch<{
      outputDir: string;
      fileCount: number;
    }>("/api/export/ionic", {
      method: "POST",
      body: {
        appName: "CodeCraft Ionic App",
        pages: store.pages.value,
        elements: store.elements.value,
        jsCodeByPage: store.jsCodeByPage.value,
        startPageId: store.currentPageId.value,
      },
    });

    window.alert(
      [
        `Ionic project created successfully.`,
        ``,
        `Path: ${result.outputDir}`,
        `Files: ${result.fileCount}`,
        ``,
        `Next steps:`,
        `1. cd ${result.outputDir}`,
        `2. npm install`,
        `3. npm run dev`,
      ].join("\n"),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to export Ionic project.";
    window.alert(message);
  } finally {
    isExporting.value = false;
  }
}

async function handleCreateShareLink() {
  if (isCreatingShareLink.value) return;

  isCreatingShareLink.value = true;

  try {
    const result = await $fetch<{
      shareUrl: string;
      filePath: string;
    }>("/api/export/link", {
      method: "POST",
      body: {
        appName: store.projectName.value || "CodeCraft Shared App",
        pages: store.pages.value,
        elements: store.elements.value,
        jsCodeByPage: store.jsCodeByPage.value,
        startPageId: store.currentPageId.value,
        activeDeviceId: store.activeDeviceId.value,
        shareId: store.shareLinkId.value,
      },
    });

    store.setShareLinkId(result.id);
    store.saveProject();

    const copied = await copyToClipboard(result.shareUrl);

    window.alert(
      [
        result.reused
          ? `Shared link updated successfully.`
          : `Shared link created successfully.`,
        ``,
        `URL: ${result.shareUrl}`,
        `Saved snapshot: ${result.filePath}`,
        ``,
        copied
          ? `The URL has been copied to your clipboard.`
          : `Clipboard copy was blocked, so please copy the URL manually.`,
      ].join("\n"),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create shared link.";
    window.alert(message);
  } finally {
    isCreatingShareLink.value = false;
  }
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
