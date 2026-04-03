<template>
  <!-- Renders the flat list of root-level containers onto the canvas surface.
       Non-container elements cannot exist at root level; the store enforces this. -->
  <div
    class="relative w-full min-h-full transition-shadow duration-150"
    :class="{ 'ring-2 ring-indigo-400 ring-offset-2': isDragOver }"
    @click.self="store.selectElement(null)"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- ── Toolbar — pinned sticky at the top of the canvas ──────────────── -->
    <div
      v-if="toolbarElement"
      class="sticky top-0 z-20 w-full cursor-pointer shrink-0"
      :class="{
        'ring-2 ring-inset ring-indigo-500':
          store.selectedElementId.value === toolbarElement.id,
      }"
      :style="{ height: `${toolbarElement.height}px` }"
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
      <EditorCanvasElementRenderer :element="toolbarElement" />
    </div>

    <!-- Empty state (only when no elements at all) -->
    <div
      v-if="bodyContainers.length === 0"
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

    <!-- Body containers stacked vertically — 14px base padding on sides/bottom -->
    <div class="flex flex-col w-full" style="padding: 14px 14px 14px 14px">
      <div
        v-for="container in bodyContainers"
        :key="container.id"
        class="relative cursor-pointer"
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

        <EditorCanvasElementRenderer :element="container" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useEditorStore } from "~/composables/useEditorStore";
import { usePaletteItems } from "~/composables/usePaletteItems";
import type { AppElement } from "~/composables/useEditorStore";

const store = useEditorStore();
const paletteGroups = usePaletteItems();

// Toolbar is pinned at the top — separate from the scrollable body
const toolbarElement = computed(() => {
  const root = store.rootContainer.value;
  if (!root) return null;
  // We used to have multiple root containers, one might be a Toolbar. Now the Toolbar will be nested,
  // or it might still be added at root? Looking at useEditorStore, Toolbar is kept at root level in addElement:
  // "Toolbar is always a singleton at root level per page" -> Wait, addElement changed to place everything
  // under the new rootContainer, EXCEPT Toolbar. Let's fix that too.
  // Actually, wait, useEditorStore places Toolbar with `_addAtRoot`, so it has `parentId = null`.
  // This means there might be MULTIPLE elements with parentId = null: the main Container, and the Toolbar.
  // Let's get ALL root-level items (parentId === null) to be safe.
  const roots = store.elements.value.filter(
    (el) => el.parentId === null && el.pageId === store.currentPageId.value,
  );
  return roots.find((el) => el.type === "Toolbar") ?? null;
});

const bodyContainers = computed(() => {
  const roots = store.elements.value.filter(
    (el) => el.parentId === null && el.pageId === store.currentPageId.value,
  );
  return roots.filter((el) => el.type !== "Toolbar");
});

// Root containers get their x/y position from the store, but in this document-flow
// layout we only apply width. Height comes from the element's height prop.
function rootContainerStyle(el: AppElement): Record<string, string> {
  return {
    width: "100%",
    height: `${el.height}px`,
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
