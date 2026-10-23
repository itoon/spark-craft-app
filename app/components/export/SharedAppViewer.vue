<template>
  <div
    :class="fullscreen
      ? 'min-h-dvh bg-white text-neutral-900'
      : 'min-h-screen bg-white text-neutral-900 lg:flex lg:flex-col lg:bg-neutral-950 lg:text-white'"
  >
    <header v-if="!fullscreen" class="hidden h-12 shrink-0 items-center gap-3 border-b border-neutral-800 bg-neutral-900/90 px-4 backdrop-blur lg:flex">
      <div class="size-6 rounded bg-emerald-600 flex items-center justify-center">
        <UIcon name="i-lucide-smartphone" class="size-3.5 text-white" />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-semibold truncate">{{ payload.appName }}</p>
        <p class="text-[10px] uppercase tracking-widest text-neutral-500">Shared Preview</p>
      </div>
    </header>

    <main
      ref="desktopPreviewRef"
      :class="fullscreen
        ? 'min-h-dvh bg-white'
        : 'min-h-screen bg-white lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-auto lg:bg-neutral-950/90 lg:p-6'"
    >
      <!-- Only one tree is mounted: Ionic appends overlays (select alerts…) to the
           first ion-app, so a CSS-hidden desktop frame would swallow them on phones. -->
      <div v-if="showDesktopFrame" class="m-auto flex flex-col items-center gap-5">
        <PreviewDeviceFrame :device="activeDevice" :scale="desktopScale">
          <div
            v-if="runtimeError"
            class="absolute inset-0 flex items-center justify-center p-6 text-center text-red-500 bg-white z-20"
          >
            {{ runtimeError }}
          </div>
          <PreviewRuntimePageRenderer
            v-else
            :page-elements="pageElements"
            :platform-override="desktopPlatform"
            :viewport-height="activeDevice.canvasH"
            @run-click="handleRunClick"
            @run-input="handleRunInput"
            @run-event="handleRunEvent"
          />
          <template #overlay>
            <PreviewRuntimeNotifications :items="notifications.items.value" @dismiss="notifications.dismiss" />
          </template>
        </PreviewDeviceFrame>

        <p class="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">
          Preview · {{ activeDevice.label }} · {{ activeDevice.canvasW }} × {{ activeDevice.canvasH }}
        </p>
      </div>

      <div v-else :class="fullscreen ? 'min-h-dvh w-full bg-white' : 'min-h-screen w-full bg-white'">
        <div class="relative min-h-screen w-full overflow-x-hidden bg-white">
          <div
            v-if="runtimeError"
            class="absolute inset-0 z-20 flex items-center justify-center bg-white p-6 text-center text-red-500"
          >
            {{ runtimeError }}
          </div>

          <!-- IonApp hosts Ionic overlays: select popovers/modals render nothing without it -->
          <IonApp v-else>
            <PreviewRuntimePageRenderer
              :page-elements="pageElements"
              :platform-override="mobilePlatform"
              :viewport-height="mobileViewportHeight || activeDevice.canvasH"
              @run-click="handleRunClick"
              @run-input="handleRunInput"
              @run-event="handleRunEvent"
            />
          </IonApp>
          <PreviewRuntimeNotifications
            class="!fixed"
            :items="notifications.items.value"
            @dismiss="notifications.dismiss"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import {
  buildScaffold,
  executeCode,
  getRuntimeChangeValue,
  getRuntimeEventHandler,
  getToolbarIdFromBackButtonClickId,
  isToolbarBackButtonClickId,
  syncRuntimeElementProps,
} from "~/composables/useRuntime";
import type { AppElement } from "~/composables/useEditorStore";
import type { ElementInstance } from "~/composables/useRuntime";
import type { SharedExportPayload } from "~/utils/sharedExport";
import { getPreviewDevice } from "~/composables/usePreviewDevices";
import { usePreviewDeviceScale } from "~/composables/usePreviewDeviceScale";
import { useRuntimeNotifications } from "~/composables/useRuntimeNotifications";
import { detectPhonePlatform } from "~/utils/platformDetect";
import type { ConsoleEntry } from "~/composables/useRuntime";
import type { RuntimeServices } from "~/utils/runtimeServices";

const props = defineProps<{
  payload: SharedExportPayload;
  /** Keeps storage.set/get of this app separate from other apps. */
  storageNamespace?: string;
  /**
   * Live Companion: render with the designer's chosen look (iPhone / Android)
   * instead of the phone's own OS, so the phone matches the design canvas.
   */
  followDesignPlatform?: boolean;
  /** Phone-style full screen at every width (APK player) — no device frame. */
  fullscreen?: boolean;
}>();

const emit = defineEmits<{
  /** Runtime console output (used by the Live Companion to report back). */
  (e: "log", entry: ConsoleEntry): void;
}>();

const notifications = useRuntimeNotifications();
let activeServices: RuntimeServices | null = null;

function disposeServices() {
  activeServices?.dispose();
  activeServices = null;
}

function cloneElements(elements: AppElement[]): AppElement[] {
  return JSON.parse(JSON.stringify(elements)) as AppElement[];
}

const currentPageId = ref(props.payload.startPageId);
const elementState = ref<AppElement[]>(cloneElements(props.payload.elements));
const pageElements = ref<AppElement[]>([]);
const instances = ref<ElementInstance[]>([]);
const runtimeError = ref("");
const mobileViewportHeight = ref(0);
const detectedMobilePlatform = ref<"ios" | "android" | null>(null);
const desktopPreviewRef = ref<HTMLElement | null>(null)
const activeDevice = computed(() => getPreviewDevice(props.payload.activeDeviceId))
// Same breakpoint as Tailwind's `lg`, which styles the desktop layout above
const desktopQuery = import.meta.client ? window.matchMedia("(min-width: 1024px)") : null;
const isDesktop = ref(desktopQuery?.matches ?? false);
const showDesktopFrame = computed(() => !props.fullscreen && isDesktop.value);
function onDesktopQueryChange(event: MediaQueryListEvent) {
  isDesktop.value = event.matches;
}

// Desktop: always use creator's design intent (activeDeviceId)
const desktopPlatform = computed<"ios" | "android">(() =>
  props.payload.activeDeviceId === "android" ? "android" : "ios"
);

// Mobile: auto-detect from device OS; fall back to creator's design intent
const mobilePlatform = computed<"ios" | "android">(() =>
  (props.followDesignPlatform ? null : detectedMobilePlatform.value) ??
  (props.payload.activeDeviceId === "android" ? "android" : "ios")
);
const { scale: desktopScale } = usePreviewDeviceScale(desktopPreviewRef, activeDevice, {
  widthPadding: 48,
  heightPadding: 96,
})

watch(
  () => [props.payload.startPageId, props.payload.elements, props.payload.jsCodeByPage],
  () => {
    elementState.value = cloneElements(props.payload.elements);
    currentPageId.value = props.payload.startPageId;
    runCode();
  },
  { deep: true, immediate: true },
);

function runCode() {
  disposeServices();
  notifications.clear();
  runtimeError.value = "";
  const allElements = elementState.value.filter((element) => element.pageId === currentPageId.value);
  // Page without code (Code tab never opened): same scaffold the editor's Run uses
  const savedCode = props.payload.jsCodeByPage[currentPageId.value] || "";
  const code = savedCode.trim() ? savedCode : buildScaffold(allElements);

  try {
    const result = executeCode(
      code,
      allElements,
      (id, patch) => {
        const { __height, ...propsPatch } = patch as Record<string, unknown>;
        elementState.value = elementState.value.map((element) =>
          element.id === id
            ? {
                ...element,
                ...(__height !== undefined ? { height: Number(__height) } : {}),
                props: { ...element.props, ...propsPatch },
              }
            : element,
        );
      },
      (pageRef) => navigateToPage(pageRef),
      (entry) => emit("log", entry),
      undefined,
      {
        services: {
          storageNamespace: props.storageNamespace || props.payload.shareId || props.payload.appName,
          onNotify: notifications.push,
        },
      },
    );
    activeServices = result.services;

    pageElements.value = result.pageElements;
    instances.value = result.instances;

    const firstError = result.logs.find((entry) => entry.type === "error");
    if (firstError && result.pageElements.length === 0) {
      runtimeError.value = firstError.message;
    } else if (firstError) {
      notifications.push({ id: Date.now(), kind: "toast", message: `⚠️ ${firstError.message}` });
    }
  } catch (error) {
    runtimeError.value = error instanceof Error ? error.message : "Unable to run shared app";
  }
}

function navigateToPage(pageRef: string) {
  const normalized = pageRef.trim().toLowerCase();
  const targetPage = props.payload.pages.find(
    (page) =>
      page.id.toLowerCase() === normalized || page.name.toLowerCase() === normalized,
  );

  if (!targetPage) {
    runtimeError.value = `Navigation failed: page "${pageRef}" not found`;
    return;
  }

  currentPageId.value = targetPage.id;
  nextTick(runCode);
}

function invokeRuntimeHandler(handler?: () => unknown) {
  if (!handler) return;
  const report = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Event handler error";
    emit("log", { type: "error", message: `Event handler error: ${message}` });
    // Keep the app on screen; show the problem as a toast instead of wiping the UI.
    notifications.push({ id: Date.now(), kind: "toast", message: `⚠️ ${message}` });
  };
  try {
    Promise.resolve(handler()).catch(report);
  } catch (error) {
    report(error);
  }
}

function handleRunClick(id: string) {
  const targetId = getToolbarIdFromBackButtonClickId(id);
  const instance = instances.value.find((candidate) => candidate.__el.id === targetId);
  if (isToolbarBackButtonClickId(id)) {
    invokeRuntimeHandler(instance?.__onBackClick ?? undefined);
    return;
  }
  invokeRuntimeHandler(instance?.__onClick ?? undefined);
}

function handleRunInput(id: string, propsPatch: Record<string, unknown>) {
  const nextRuntime = syncRuntimeElementProps(
    {
      pageElements: pageElements.value,
      instances: instances.value,
    },
    id,
    propsPatch,
  );

  pageElements.value = nextRuntime.pageElements;
  instances.value = nextRuntime.instances;

  // Only user input arrives here (code assignments go through onUpdate), so onChange can't loop
  const instance = instances.value.find((candidate) => candidate.__el.id === id);
  const onChange = instance?.__onChange;
  if (!instance || !onChange) return;
  const value = getRuntimeChangeValue(instance.__el.type, propsPatch);
  if (value === undefined) return;
  invokeRuntimeHandler(() => onChange(value));
}

function handleRunEvent(id: string, name: string, payload?: unknown) {
  const instance = instances.value.find((candidate) => candidate.__el.id === id);
  const handler = instance ? getRuntimeEventHandler(instance, name) : null;
  if (handler) invokeRuntimeHandler(() => handler(payload));
}

onBeforeUnmount(() => {
  disposeServices();
  notifications.clear();
  desktopQuery?.removeEventListener("change", onDesktopQueryChange);
});

onMounted(() => {
  if (!import.meta.client) return;
  desktopQuery?.addEventListener("change", onDesktopQueryChange);
  mobileViewportHeight.value = window.innerHeight;
  detectedMobilePlatform.value = detectPhonePlatform(
    navigator.userAgent || "",
    navigator.maxTouchPoints || 0,
  );
});
</script>
