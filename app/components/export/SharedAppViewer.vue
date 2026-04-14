<template>
  <div class="min-h-screen bg-white text-neutral-900 lg:flex lg:flex-col lg:bg-neutral-950 lg:text-white">
    <header class="hidden h-12 shrink-0 items-center gap-3 border-b border-neutral-800 bg-neutral-900/90 px-4 backdrop-blur lg:flex">
      <div class="size-6 rounded bg-emerald-600 flex items-center justify-center">
        <UIcon name="i-lucide-smartphone" class="size-3.5 text-white" />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-semibold truncate">{{ payload.appName }}</p>
        <p class="text-[10px] uppercase tracking-widest text-neutral-500">Shared Preview</p>
      </div>
    </header>

    <main ref="desktopPreviewRef" class="min-h-screen bg-white lg:flex lg:flex-1 lg:items-center lg:justify-center lg:overflow-auto lg:bg-neutral-950/90 lg:p-6">
      <div class="hidden flex-col items-center gap-5 lg:flex">
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
          />
        </PreviewDeviceFrame>

        <p class="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">
          Preview · {{ activeDevice.label }} · {{ activeDevice.canvasW }} × {{ activeDevice.canvasH }}
        </p>
      </div>

      <div class="min-h-screen w-full bg-white lg:hidden">
        <div class="relative min-h-screen w-full overflow-x-hidden bg-white">
          <div
            v-if="runtimeError"
            class="absolute inset-0 z-20 flex items-center justify-center bg-white p-6 text-center text-red-500"
          >
            {{ runtimeError }}
          </div>

          <template v-else>
            <PreviewRuntimePageRenderer
              :page-elements="pageElements"
              :platform-override="mobilePlatform"
              :viewport-height="mobileViewportHeight || activeDevice.canvasH"
              @run-click="handleRunClick"
              @run-input="handleRunInput"
            />
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

import {
  executeCode,
  getToolbarIdFromBackButtonClickId,
  isToolbarBackButtonClickId,
  syncRuntimeElementProps,
} from "~/composables/useRuntime";
import type { AppElement } from "~/composables/useEditorStore";
import type { ElementInstance } from "~/composables/useRuntime";
import type { SharedExportPayload } from "~/utils/sharedExport";
import { getPreviewDevice } from "~/composables/usePreviewDevices";
import { usePreviewDeviceScale } from "~/composables/usePreviewDeviceScale";

const props = defineProps<{
  payload: SharedExportPayload;
}>();

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

// Desktop: always use creator's design intent (activeDeviceId)
const desktopPlatform = computed<"ios" | "android">(() =>
  props.payload.activeDeviceId === "android" ? "android" : "ios"
);

// Mobile: auto-detect from device OS; fall back to creator's design intent
const mobilePlatform = computed<"ios" | "android">(() =>
  detectedMobilePlatform.value ??
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
  runtimeError.value = "";
  const code = props.payload.jsCodeByPage[currentPageId.value] || "";
  const allElements = elementState.value.filter((element) => element.pageId === currentPageId.value);

  try {
    const result = executeCode(
      code,
      allElements,
      (id, patch) => {
        elementState.value = elementState.value.map((element) =>
          element.id === id
            ? { ...element, props: { ...element.props, ...patch } }
            : element,
        );
      },
      (pageRef) => navigateToPage(pageRef),
    );

    pageElements.value = result.pageElements;
    instances.value = result.instances;
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
  Promise.resolve(handler()).catch((error) => {
    runtimeError.value = error instanceof Error ? error.message : "Event handler error";
  });
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
}

onMounted(() => {
  if (!import.meta.client) return;
  mobileViewportHeight.value = window.innerHeight;
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) detectedMobilePlatform.value = "android";
  else if (/iPhone|iPad|iPod/i.test(ua)) detectedMobilePlatform.value = "ios";
});
</script>
