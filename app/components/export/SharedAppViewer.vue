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

    <main class="min-h-screen bg-white lg:flex lg:flex-1 lg:items-center lg:justify-center lg:overflow-auto lg:bg-neutral-950/90 lg:p-6">
      <div class="hidden flex-col items-center gap-5 lg:flex">
        <div
          class="relative bg-neutral-800 border-[12px] border-neutral-600 shadow-2xl shadow-black/50"
          style="width: 417px; height: 900px; border-radius: 52px;"
        >
          <div class="relative bg-white overflow-hidden w-full h-full" style="border-radius: 44px;">
            <div class="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[120px] h-[36px] bg-black rounded-full" />

            <div class="absolute inset-0 flex flex-col overflow-hidden">
              <div
                v-if="runtimeError"
                class="absolute inset-0 flex items-center justify-center p-6 text-center text-red-500 bg-white z-20"
              >
                {{ runtimeError }}
              </div>

              <template v-else>
                <div
                  v-if="toolbarElement"
                  class="sticky top-0 z-10 w-full shrink-0"
                  :style="{ height: `${toolbarElement.height}px` }"
                >
                  <EditorCanvasElementRenderer
                    :element="toolbarElement"
                    is-run-mode
                    :platform-override="runtimePlatform"
                    :runtime-element-ids="Array.from(runModeElementIds)"
                    :runtime-elements="pageElements"
                    @run-click="handleRunClick"
                    @run-input="handleRunInput"
                  />
                </div>

                <div
                  class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-[14px]"
                  :style="{
                    paddingTop: `${bodyTopPadding}px`,
                    paddingBottom: `${BODY_BOTTOM_PADDING}px`,
                  }"
                >
                  <template v-for="element in bodyElements" :key="element.id">
                    <div class="w-full shrink-0" :style="{ height: `${bodyElementHeight(element)}px` }">
                      <EditorCanvasElementRenderer
                        :element="element"
                        is-run-mode
                        :platform-override="runtimePlatform"
                        :forced-height="bodyElementHeight(element)"
                        :runtime-element-ids="Array.from(runModeElementIds)"
                        :runtime-elements="pageElements"
                        @run-click="handleRunClick"
                        @run-input="handleRunInput"
                      />
                    </div>
                  </template>
                </div>
              </template>
            </div>

            <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-neutral-400/30 rounded-full" />
          </div>
        </div>

        <p class="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">
          Preview · {{ deviceLabel }}
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
            <div
              v-if="toolbarElement"
              class="sticky top-0 z-10 w-full shrink-0"
              :style="{ height: `${toolbarElement.height}px` }"
            >
              <EditorCanvasElementRenderer
                :element="toolbarElement"
                is-run-mode
                :platform-override="runtimePlatform"
                :runtime-element-ids="Array.from(runModeElementIds)"
                :runtime-elements="pageElements"
                @run-click="handleRunClick"
                @run-input="handleRunInput"
              />
            </div>

            <div
              class="min-h-screen overflow-y-auto overflow-x-hidden px-[14px]"
              :style="{
                paddingTop: `${bodyTopPadding}px`,
                paddingBottom: `${BODY_BOTTOM_PADDING}px`,
              }"
            >
              <template v-for="element in bodyElements" :key="`mobile-${element.id}`">
                <div class="w-full shrink-0" :style="{ height: `${bodyElementHeight(element)}px` }">
                  <EditorCanvasElementRenderer
                    :element="element"
                    is-run-mode
                    :platform-override="runtimePlatform"
                    :forced-height="bodyElementHeight(element)"
                    :runtime-element-ids="Array.from(runModeElementIds)"
                    :runtime-elements="pageElements"
                    @run-click="handleRunClick"
                    @run-input="handleRunInput"
                  />
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

import { executeCode, syncRuntimeElementProps } from "~/composables/useRuntime";
import type { AppElement } from "~/composables/useEditorStore";
import type { ElementInstance } from "~/composables/useRuntime";
import type { SharedExportPayload } from "~/utils/sharedExport";

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
const detectedMobilePlatform = ref<"ios" | "android" | null>(null);

const toolbarElement = computed(() =>
  pageElements.value.find((element) => element.type === "Toolbar") ?? null,
);
const DEFAULT_TOOLBAR_HEIGHT = 56;
const BODY_TOP_PADDING = 14;
const BODY_BOTTOM_PADDING = 14;
const bodyTopPadding = computed(() =>
  toolbarElement.value ? BODY_TOP_PADDING : DEFAULT_TOOLBAR_HEIGHT + BODY_TOP_PADDING,
);

const runModeElementIds = computed(() => new Set(pageElements.value.map((element) => element.id)));

const bodyElements = computed(() =>
  pageElements.value.filter((element) => {
    if (element.type === "Toolbar") return false;
    const parentIsPresent = element.parentId && runModeElementIds.value.has(element.parentId);
    return !parentIsPresent;
  }),
);

const deviceLabel = computed(() =>
  props.payload.activeDeviceId === "android" ? "Android" : "iPhone 15",
);
const runtimePlatform = computed<"ios" | "android">(() =>
  detectedMobilePlatform.value ??
  (props.payload.activeDeviceId === "android" ? "android" : "ios"),
);

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

function handleRunClick(id: string) {
  const instance = instances.value.find((candidate) => candidate.__el.id === id);
  try {
    instance?.__onClick?.();
  } catch (error) {
    runtimeError.value = error instanceof Error ? error.message : "Event handler error";
  }
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

function detectMobilePlatformFromBrowser(): "ios" | "android" | null {
  if (!import.meta.client) return null;

  const userAgent = navigator.userAgent || "";

  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";

  return null;
}

onMounted(() => {
  detectedMobilePlatform.value = detectMobilePlatformFromBrowser();
});

function bodyElementHeight(element: AppElement) {
  if (element.type === "Camera" && !element.props.open) return 0;
  if (element.type !== "Container" || element.parentId !== null) return element.height;
  const toolbarHeight = toolbarElement.value?.height ?? DEFAULT_TOOLBAR_HEIGHT;
  return Math.max(
    element.height - toolbarHeight - BODY_TOP_PADDING - BODY_BOTTOM_PADDING,
    0,
  );
}
</script>
