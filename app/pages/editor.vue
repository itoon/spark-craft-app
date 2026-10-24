<template>
  <div
    class="editor-root h-screen flex flex-col overflow-hidden bg-neutral-950 text-gray-100"
    :data-app-mode="learning.appMode.value ?? 'create'"
  >
    <!-- ── HEADER ──────────────────────────────────────────────────── -->
    <header
      class="editor-header flex items-center gap-2 px-3 h-12 bg-neutral-900 border-b border-neutral-700 shrink-0 z-10 min-w-0"
    >
      <!-- Logo -->
      <div class="flex items-center gap-2 shrink-0">
        <div
          class="size-7 rounded-md bg-indigo-600 flex items-center justify-center"
        >
          <UIcon name="i-lucide-code-2" class="size-4 text-white" />
        </div>
        <span class="hidden text-sm font-bold text-white tracking-tight lg:inline"
          >CodeCraft</span
        >
      </div>

      <!-- App mode: Learning (lessons) vs Creator (free build) -->
      <nav
        class="flex items-center gap-0.5 rounded-lg bg-neutral-800 p-0.5 shrink-0"
        aria-label="โหมด"
      >
        <button
          v-for="item in appModes"
          :key="item.key"
          type="button"
          class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-100"
          :class="
            learning.appMode.value === item.key
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-100'
          "
          :aria-pressed="learning.appMode.value === item.key"
          :data-testid="`app-mode-${item.key}`"
          @click="learning.setAppMode(item.key)"
        >
          <UIcon :name="item.icon" class="size-3.5" />
          {{ item.label }}
        </button>
      </nav>

      <div class="w-px h-5 bg-neutral-700 mx-0.5 shrink-0" />

      <!-- Design / Code -->
      <nav class="flex items-center gap-0.5 bg-neutral-800 rounded-lg p-0.5 shrink-0" aria-label="Editor view">
        <button
          v-for="tab in modeTabs"
          :key="tab.key"
          type="button"
          class="mode-tab flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-100 disabled:opacity-40"
          :class="
            store.mode.value === tab.key
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          "
          :aria-pressed="store.mode.value === tab.key"
          :disabled="store.isRunning.value"
          @click="store.setMode(tab.key)"
        >
          <UIcon :name="tab.icon" class="size-3.5" />
          {{ tab.label }}
        </button>
      </nav>

      <!-- Spacer -->
      <div class="flex-1 min-w-2" />

      <!-- My app: name + home-screen icon (kid-friendly settings window) -->
      <button
        type="button"
        class="flex min-w-0 shrink items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-neutral-800"
        aria-label="แอปของฉัน — ตั้งชื่อและไอคอน"
        title="แอปของฉัน — ตั้งชื่อและไอคอน"
        data-testid="app-settings-button"
        @click="isAppSettingsOpen = true"
      >
        <EditorAppIconTile :icon="store.appIcon.value" :size="24" />
        <span class="hidden max-w-[180px] truncate text-xs font-medium text-neutral-300 lg:inline">
          {{ store.projectName.value === "Untitled Project" ? "แอปของฉัน" : store.projectName.value }}
        </span>
      </button>

      <div class="flex items-center gap-0.5 shrink-0">
        <UButton
          v-if="learning.appMode.value !== 'learn'"
          icon="i-lucide-file-plus-2"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="New project"
          title="New project"
          @click="handleNewProject"
        >
          <span class="hidden 2xl:inline">New</span>
        </UButton>

        <UButton
          :icon="justSaved ? 'i-lucide-check' : 'i-lucide-save'"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Save project"
          title="Save project (auto-saves too)"
          @click="handleSaveProject"
        >
          <span class="hidden 2xl:inline">{{ justSaved ? "Saved" : "Save" }}</span>
        </UButton>
      </div>

      <div class="w-px h-5 bg-neutral-700 mx-0.5 shrink-0" />

      <!-- Run button -->
      <UButton
        :label="store.isRunning.value ? 'Stop' : 'Run'"
        :icon="store.isRunning.value ? 'i-lucide-square' : 'i-lucide-play'"
        :color="store.isRunning.value ? 'error' : 'success'"
        variant="solid"
        size="sm"
        class="shrink-0"
        data-testid="run-button"
        @click="handleRun"
      />

      <!-- Web edition (GitHub Pages): no server → no Live / Share / Export / APK -->
      <span
        v-if="edition.isWeb.value"
        class="shrink-0 cursor-help rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-400"
        title="เวอร์ชันเว็บ: ออกแบบ เขียนโค้ด และ Run ได้ครบ — ส่วนทดสอบบนมือถือ แชร์ลิงก์ และ Build APK ใช้ได้ในเวอร์ชันลงเครื่อง"
        data-testid="web-edition-badge"
      >เวอร์ชันเว็บ</span>

      <!-- Live Companion: run on a real phone (App Inventor AI Companion style) -->
      <UButton
        v-if="!edition.isWeb.value"
        icon="i-lucide-smartphone"
        :color="live.status.value === 'live' ? 'success' : 'neutral'"
        :variant="live.status.value === 'live' ? 'subtle' : 'outline'"
        size="sm"
        class="shrink-0"
        data-testid="live-button"
        title="ทดสอบบนมือถือจริง"
        @click="isLiveDialogOpen = true"
      >
        <span>มือถือ</span>
        <span
          v-if="live.connectedCount.value > 0"
          class="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white"
        >{{ live.connectedCount.value }}</span>
      </UButton>

      <!-- Share Link button -->
      <UButton
        v-if="!edition.isWeb.value"
        :loading="isCreatingShareLink"
        icon="i-lucide-share-2"
        color="primary"
        variant="subtle"
        size="xs"
        class="shrink-0"
        aria-label="Share link"
        title="Share link"
        @click="handleCreateShareLink"
      >
        <span class="hidden xl:inline">Share</span>
      </UButton>

      <!-- Export local button -->
      <UButton
        v-if="!edition.isWeb.value"
        :loading="isExporting"
        icon="i-lucide-download"
        color="neutral"
        variant="ghost"
        size="xs"
        class="shrink-0"
        aria-label="Export Ionic project"
        title="Export Ionic project"
        @click="handleLocalExport"
      >
        <span class="hidden 2xl:inline">Export</span>
      </UButton>

      <!-- Build APK (App Inventor: Build → Android App) -->
      <UButton
        v-if="!edition.isWeb.value"
        icon="i-lucide-package"
        color="neutral"
        variant="ghost"
        size="xs"
        class="shrink-0"
        aria-label="Build APK"
        title="Build APK — ติดตั้งบนมือถือ Android"
        data-testid="build-apk-button"
        @click="isApkDialogOpen = true"
      >
        <span class="hidden xl:inline">APK</span>
      </UButton>

      <!-- Learner manual -->
      <UButton
        to="/document"
        target="_blank"
        icon="i-lucide-book-open"
        color="neutral"
        variant="ghost"
        size="xs"
        class="shrink-0"
        aria-label="คู่มือการใช้งาน"
        title="คู่มือการใช้งาน"
        data-testid="manual-button"
      >
        <span class="hidden xl:inline">คู่มือ</span>
      </UButton>

      <!-- CodeCraft version → release notes; dot until the newest notes are opened -->
      <NuxtLink
        to="/changelog"
        target="_blank"
        class="relative shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
        :aria-label="changelog.unseen.value ? `CodeCraft v${changelog.latest} — มีอะไรใหม่ (ยังไม่ได้อ่าน)` : `CodeCraft v${changelog.latest} — มีอะไรใหม่`"
        title="มีอะไรใหม่"
        data-testid="version-badge"
        @click="changelog.markSeen()"
      >
        v{{ changelog.latest }}
        <span
          v-if="changelog.unseen.value"
          class="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-lime-400"
          data-testid="version-unseen-dot"
        />
      </NuxtLink>

      <!-- Keyboard shortcut hint -->
      <button
        type="button"
        class="hidden 2xl:flex items-center gap-1 text-[10px] text-neutral-500 ml-1 shrink-0 hover:text-neutral-300"
        @click="isCommandPaletteOpen = true"
      >
        <kbd
          class="px-1.5 py-0.5 bg-neutral-800 rounded text-[9px] font-mono border border-neutral-700"
          >⌘K</kbd
        >
      </button>
    </header>

    <!-- ── MAIN WORKSPACE ──────────────────────────────────────────── -->
    <div class="editor-workspace flex flex-1 min-h-0 overflow-hidden">
      <!-- Learning mode only: lessons + step checks. Creator mode has no lesson column. -->
      <EditorLearningPanel v-if="learning.appMode.value === 'learn'" />

      <!-- ── RUN MODE: replaces the editing columns ── -->
      <EditorRunMode v-if="store.isRunning.value" />

      <!-- ── DESIGN / CODE MODE ── -->
      <template v-else>
        <EditorElementPalette v-if="store.mode.value === 'design'" />
        <div
          v-else-if="store.mode.value === 'code'"
          class="flex min-w-[340px] flex-[3] flex-col overflow-hidden"
        >
          <EditorCodeEditor />
        </div>

        <!-- Center: phone canvas -->
        <main
          class="editor-center flex min-w-[220px] flex-col overflow-hidden"
          :class="store.mode.value === 'code' ? 'flex-[2]' : 'flex-1'"
        >
          <EditorDesignCanvas />
        </main>

        <!-- Right: Properties (also shown in Code view so attr values can be read while coding) -->
        <div class="h-full shrink-0">
          <EditorPropertiesPanel />
        </div>
      </template>
    </div>

    <!-- First visit: choose how to start -->
    <Teleport to="body">
      <div
        v-if="isClientReady && learning.appMode.value === null"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-sm"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="mode-chooser-title"
          class="w-full max-w-[640px] rounded-2xl border border-neutral-700 bg-neutral-900 p-6 text-neutral-100 shadow-2xl"
        >
          <h2 id="mode-chooser-title" class="text-xl font-bold text-white">วันนี้อยากทำอะไร?</h2>
          <p class="mt-1 text-sm text-neutral-400">เปลี่ยนโหมดได้ตลอดจากแถบด้านบน</p>
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              class="group flex flex-col items-start gap-3 rounded-xl border border-neutral-700 bg-neutral-800/60 p-4 text-left transition-colors hover:border-indigo-400 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-indigo-400"
              data-testid="choose-learn"
              @click="learning.setAppMode('learn')"
            >
              <span class="flex size-10 items-center justify-center rounded-xl bg-indigo-600">
                <UIcon name="i-lucide-graduation-cap" class="size-5 text-white" />
              </span>
              <span>
                <span class="block text-base font-semibold text-white">เรียนรู้</span>
                <span class="mt-1 block text-[13px] leading-relaxed text-neutral-400">
                  สร้าง 5 แอปตามบทเรียน จากง่ายไปยาก มีภารกิจเช็กให้ทุกขั้น
                </span>
              </span>
            </button>
            <button
              type="button"
              class="group flex flex-col items-start gap-3 rounded-xl border border-neutral-700 bg-neutral-800/60 p-4 text-left transition-colors hover:border-emerald-400 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-emerald-400"
              data-testid="choose-create"
              @click="learning.setAppMode('create')"
            >
              <span class="flex size-10 items-center justify-center rounded-xl bg-emerald-600">
                <UIcon name="i-lucide-hammer" class="size-5 text-white" />
              </span>
              <span>
                <span class="block text-base font-semibold text-white">สร้างเอง</span>
                <span class="mt-1 block text-[13px] leading-relaxed text-neutral-400">
                  พื้นที่ว่างเต็มจอ ออกแบบและเขียนโค้ดแอปของตัวเอง
                </span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </Teleport>

    <EditorCommandPalette
      :open="isCommandPaletteOpen"
      @close="isCommandPaletteOpen = false"
    />

    <EditorLiveCompanionDialog :open="isLiveDialogOpen" @close="isLiveDialogOpen = false" />
    <EditorBuildApkDialog :open="isApkDialogOpen" @close="isApkDialogOpen = false" @edit-app="isAppSettingsOpen = true" />
    <EditorAppSettingsDialog :open="isAppSettingsOpen" @close="isAppSettingsOpen = false" />

    <!-- Share Link QR overlay -->
    <Teleport to="body">
      <div
        v-if="shareLinkOverlay.visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="shareLinkOverlay.visible = false"
      >
        <div class="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-80 flex flex-col items-center gap-4 shadow-2xl">
          <p class="text-sm font-semibold text-white">Share Link</p>
          <img
            v-if="shareLinkOverlay.qrDataUrl"
            :src="shareLinkOverlay.qrDataUrl"
            alt="QR Code"
            class="size-48 rounded-lg bg-white p-2"
          />
          <p class="text-xs text-neutral-400 text-center break-all select-all font-mono">{{ shareLinkOverlay.url }}</p>
          <!-- Offline install needs a certificate the phone trusts (bun run serve:lan) -->
          <p
            v-if="shareLinkOverlay.url.startsWith('https://')"
            class="text-xs text-neutral-400 text-center"
            data-testid="share-cert-hint"
          >
            มือถือเครื่องใหม่: เปิด
            <span class="font-mono text-neutral-200 select-all">{{ shareCertUrl }}</span>
            ครั้งแรกก่อน แล้วแอปจะติดตั้งลงหน้าจอโฮมและใช้ออฟไลน์ได้
          </p>
          <div class="flex items-center gap-2 w-full">
            <UButton
              :label="shareLinkOverlay.copied ? 'Copied!' : 'Copy URL'"
              :icon="shareLinkOverlay.copied ? 'i-lucide-check' : 'i-lucide-copy'"
              color="primary"
              variant="solid"
              size="sm"
              class="flex-1"
              @click="copyShareUrl"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="shareLinkOverlay.visible = false"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import QRCode from "qrcode";

import { useChangelog } from "~/composables/useChangelog";
import { useEdition } from "~/composables/useEdition";
import { useEditorStore } from "~/composables/useEditorStore";
import type { EditorMode } from "~/composables/useEditorStore";
import { useLiveCompanion } from "~/composables/useLiveCompanion";
import { useLearning, type AppMode } from "~/composables/useLearning";
import { renderAppIconPngs } from "~/utils/renderAppIcon";

useHead({
  title: "Editor — CodeCraft",
});

const store = useEditorStore();
const changelog = useChangelog();
const edition = useEdition();
const live = useLiveCompanion();
const learning = useLearning();
const isLiveDialogOpen = ref(false);
const isApkDialogOpen = ref(false);
const isClientReady = ref(false);
const justSaved = ref(false);

const appModes: { key: AppMode; label: string; icon: string }[] = [
  { key: "learn", label: "เรียนรู้", icon: "i-lucide-graduation-cap" },
  { key: "create", label: "สร้างเอง", icon: "i-lucide-hammer" },
];
const isExporting = ref(false);
const isCreatingShareLink = ref(false);
const isCommandPaletteOpen = ref(false);
const isAppSettingsOpen = ref(false);

// Page that walks a phone through trusting the classroom certificate
const shareCertUrl = computed(() => {
  try {
    return `${new URL(shareLinkOverlay.url).origin}/cert`;
  } catch {
    return "";
  }
});
const shareLinkOverlay = reactive({
  visible: false,
  url: "",
  qrDataUrl: "",
  copied: false,
});

async function copyShareUrl() {
  const copied = await copyToClipboard(shareLinkOverlay.url);
  if (copied) {
    shareLinkOverlay.copied = true;
    setTimeout(() => { shareLinkOverlay.copied = false; }, 2000);
  }
}

interface ModeTab {
  key: EditorMode;
  label: string;
  icon: string;
}

const modeTabs: ModeTab[] = [
  { key: "design", label: "Design", icon: "i-lucide-pen-tool" },
  { key: "code", label: "Code", icon: "i-lucide-code-2" },
];

function onWindowKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    isCommandPaletteOpen.value = true;
  }
}

onMounted(() => {
  if (store.mode.value === "block") {
    store.setMode("design");
  }
  window.addEventListener("keydown", onWindowKeydown);
  // Open the workspace that belongs to the saved mode / lesson
  learning.syncWorkspace();
  isClientReady.value = true;
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
    "Create a new project?\n\nYour current project is auto-saved, but this will clear the editor and start a fresh project.",
  );

  if (!confirmed) return;

  store.newProject();
}

function handleSaveProject() {
  store.saveProject();
  justSaved.value = true;
  setTimeout(() => {
    justSaved.value = false;
  }, 1500);
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
      id: string;
      shareUrl: string;
      filePath: string;
      reused?: boolean;
    }>("/api/export/link", {
      method: "POST",
      body: {
        // Name + icon from "แอปของฉัน" — shown when the app is added to a home screen
        appName:
          !store.projectName.value || store.projectName.value === "Untitled Project"
            ? "แอปของฉัน"
            : store.projectName.value,
        icon: await renderAppIconPngs(store.appIcon.value, 512)
          .then((pngs) => pngs.full)
          .catch(() => null),
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

    copyToClipboard(result.shareUrl);

    shareLinkOverlay.url = result.shareUrl;
    shareLinkOverlay.copied = false;
    shareLinkOverlay.qrDataUrl = "";
    shareLinkOverlay.visible = true;

    if (import.meta.client) {
      shareLinkOverlay.qrDataUrl = await QRCode.toDataURL(result.shareUrl, {
        width: 300,
        margin: 1,
      });
    }
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
