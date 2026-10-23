<template>
  <!-- Renders the flat list of root-level containers onto the canvas surface.
         Non-container elements cannot exist at root level; the store enforces this. -->
  <div
    class="relative flex h-full min-h-full w-full flex-col transition-shadow duration-150"
    :class="{ 'ring-2 ring-indigo-400 ring-offset-2': isDragOver }"
    @click.self="store.selectElement(null)"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Empty state (only when no elements at all) -->
    <!-- Body containers stacked vertically -->
    <div class="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden phone-scroll">
      <!-- ── Toolbar — "fixed" sticks to the top, "scroll" moves with the page ── -->
      <div
        v-if="toolbarElement"
        :key="`toolbar-${toolbarElement.id}-${store.activePlatform.value}`"
        class="z-20 w-full cursor-pointer shrink-0"
        :class="{
          'sticky top-0': toolbarFixed,
          relative: !toolbarFixed,
          'ring-2 ring-inset ring-indigo-500':
            store.selectedElementId.value === toolbarElement.id,
          'cc-not-added': pageAdd.isNotAdded(toolbarElement),
        }"
        :style="{ height: `${toolbarHeight}px` }"
        @click.stop="store.selectElement(toolbarElement.id)"
      >
        <!-- Selection badge -->
        <div
          v-if="store.selectedElementId.value === toolbarElement.id"
          class="absolute -top-5 left-0 z-30 flex items-center gap-1 pointer-events-none"
        >
          <span
            class="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-mono leading-none"
          >
            Toolbar
          </span>
        </div>
        <span
          v-if="pageAdd.isNotAdded(toolbarElement)"
          class="cc-not-added-badge"
          :title="`${toolbarElement.id} ยังไม่ได้ page.add() ในโค้ด — จะไม่โผล่ตอน Run`"
        >
          ยังไม่ add
        </span>
        <EditorCanvasElementRenderer :element="toolbarElement" />
      </div>

      <div
        v-if="bodyElements.length === 0"
        class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      >
        <div
          class="border-2 border-dashed border-indigo-300 rounded-xl w-56 h-36 flex flex-col items-center justify-center gap-2 opacity-60"
        >
          <UIcon name="i-lucide-plus-circle" class="size-7 text-indigo-400" />
          <p
            class="text-xs text-indigo-400 font-medium text-center leading-snug px-2"
          >
            Click a palette item or<br />drag it here to start
          </p>
        </div>
      </div>

      <div class="flex min-h-full flex-col w-full">
        <div
          v-for="container in visibleBodyElements"
          :key="`${container.id}-${store.activePlatform.value}`"
          class="relative cursor-pointer shrink-0"
          :class="{
            'ring-2 ring-indigo-500 ring-offset-0':
              store.selectedElementId.value === container.id,
          }"
          :style="rootContainerStyle(container)"
          @click.stop="store.selectElement(container.id)"
        >
          <!-- Selection label badge above the container -->
          <template v-if="store.selectedElementId.value === container.id">
            <div
              class="absolute -top-5 left-0 z-10 flex items-center gap-1 pointer-events-none"
            >
              <span
                class="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-mono leading-none"
              >
                {{ container.type }}
              </span>
            </div>
            <!-- Resize handle (visual only) -->
            <div
              class="absolute -bottom-1 -right-1 size-2.5 bg-indigo-500 rounded-sm border border-white cursor-se-resize z-10"
            />
          </template>
          <EditorCanvasElementRenderer
            :element="container"
            :forced-height="bodyElementHeight(container)"
          />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useEditorStore } from "~/composables/useEditorStore";
import { usePageAddStatus } from "~/composables/usePageAddStatus";
import { usePaletteItems } from "~/composables/usePaletteItems";
import { getPreviewDevice } from "~/composables/usePreviewDevices";
import type { AppElement } from "~/composables/useEditorStore";
import {
  BODY_BOTTOM_PADDING,
  usePreviewPageLayout,
} from "~/composables/usePreviewPageLayout";

const store = useEditorStore();
const pageAdd = usePageAddStatus();
const paletteGroups = usePaletteItems();

const currentPageElements = computed(() =>
  store.elements.value.filter((el) => el.pageId === store.currentPageId.value),
);
const activeDevice = computed(() => getPreviewDevice(store.activeDeviceId.value));

const { toolbarElement, toolbarHeight, bodyTopPadding, bodyElements, bodyElementHeight } =
  usePreviewPageLayout(
    currentPageElements,
    store.activePlatform,
    computed(() => activeDevice.value.canvasH),
  );

const toolbarFixed = computed(
  () => (toolbarElement.value?.props.position as string | undefined) !== "scroll",
);

function isVisibleSpinner(element: AppElement) {
  return element.type !== "Spinner" || element.props.show !== false;
}

const visibleBodyElements = computed(() =>
  bodyElements.value.filter((element) => isVisibleSpinner(element)),
);

// Root containers get their x/y position from the store, but in this document-flow
// layout we only apply width. Height comes from the element's height prop.
function rootContainerStyle(el: AppElement): Record<string, string> {
  return {
    width: "100%",
    minHeight: `${bodyElementHeight(el)}px`,
  };
}

// ── Drag-and-drop from palette ─────────────────────────────────────────────

const isDragOver = ref(false);

function onDragOver(e: DragEvent) {
  isDragOver.value = true;
  e.dataTransfer!.dropEffect = "copy";
}

function onDragLeave() {
  isDragOver.value = false;
}

function onDrop(e: DragEvent) {
  isDragOver.value = false;
  const type = e.dataTransfer?.getData("application/codecraft-type");
  if (!type) return;
  const item = findPaletteItemByType(type);
  if (item) store.addElement(item);
}

// Walk the palette groups to find the item definition by type string
function findPaletteItemByType(type: string) {
  for (const group of paletteGroups) {
    const item = group.items.find((i) => i.type === type);
    if (item) return item;
  }
  return null;
}
</script>
