<template>
  <div class="min-h-screen bg-neutral-950 text-white flex flex-col">
    <header class="h-12 shrink-0 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur px-4 flex items-center gap-3">
      <div class="size-6 rounded bg-emerald-600 flex items-center justify-center">
        <UIcon name="i-lucide-smartphone" class="size-3.5 text-white" />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-semibold truncate">{{ payload.appName }}</p>
        <p class="text-[10px] uppercase tracking-widest text-neutral-500">Shared Preview</p>
      </div>
    </header>

    <main class="flex-1 flex items-center justify-center p-6 overflow-auto">
      <div class="flex flex-col items-center gap-5">
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
                    :runtime-element-ids="Array.from(runModeElementIds)"
                    @run-click="handleRunClick"
                    @run-input="handleRunInput"
                  />
                </div>

                <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-[14px] pt-[14px] pb-[14px]">
                  <template v-for="element in bodyElements" :key="element.id">
                    <div class="w-full shrink-0" :style="{ height: `${bodyElementHeight(element)}px` }">
                      <EditorCanvasElementRenderer
                        :element="element"
                        is-run-mode
                        :forced-height="bodyElementHeight(element)"
                        :runtime-element-ids="Array.from(runModeElementIds)"
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
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import { executeCode, syncRuntimeElementProps } from "~/composables/useRuntime";
import { useEditorStore } from "~/composables/useEditorStore";
import type { AppElement } from "~/composables/useEditorStore";
import type { ElementInstance } from "~/composables/useRuntime";
import type { SharedExportPayload } from "~/utils/sharedExport";

const props = defineProps<{
  payload: SharedExportPayload;
}>();
const store = useEditorStore();

function cloneElements(elements: AppElement[]): AppElement[] {
  return JSON.parse(JSON.stringify(elements)) as AppElement[];
}

const currentPageId = ref(props.payload.startPageId);
const elementState = ref<AppElement[]>(cloneElements(props.payload.elements));
const pageElements = ref<AppElement[]>([]);
const instances = ref<ElementInstance[]>([]);
const runtimeError = ref("");

const toolbarElement = computed(() =>
  pageElements.value.find((element) => element.type === "Toolbar") ?? null,
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

watch(
  [elementState, currentPageId],
  () => {
    store.elements.value = cloneElements(elementState.value);
    store.currentPageId.value = currentPageId.value;
    store.selectElement(null);
  },
  { deep: true, immediate: true },
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

function bodyElementHeight(element: AppElement) {
  if (element.type !== "Container" || element.parentId !== null) return element.height;
  const toolbarHeight = toolbarElement.value?.height ?? 56;
  return Math.max(element.height - toolbarHeight - 28, 0);
}
</script>
