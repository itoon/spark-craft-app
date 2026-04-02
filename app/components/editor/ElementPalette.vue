<template>
  <aside
    class="editor-palette flex flex-col h-full bg-neutral-50 border-r border-neutral-200 w-auto shrink-0 overflow-hidden"
  >
    <!-- Panel header -->
    <div
      class="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-200 shrink-0"
    >
      <UIcon name="i-lucide-package" class="text-neutral-500 size-4" />
      <span
        class="text-sm font-semibold text-neutral-700 uppercase tracking-widest"
        >Elements</span
      >
    </div>

    <!-- Scrollable palette groups -->
    <div class="flex-1 overflow-y-auto p-3 space-y-4">
      <div v-for="group in paletteGroups" :key="group.label">
        <!-- Group header -->
        <div class="flex items-center gap-2 px-1 mb-2">
          <UIcon :name="group.icon" class="text-neutral-400 size-3.5" />
          <span
            class="text-sm font-semibold text-neutral-500 uppercase tracking-wider"
            >{{ group.label }}</span
          >
        </div>

        <!-- Items grid: 3 columns -->
        <div class="grid grid-cols-5 gap-2">
          <button
            v-for="item in group.items"
            :key="item.type"
            draggable="true"
            class="palette-item group flex flex-col items-center justify-center gap-0 min-h-[88px] p-2 rounded-xl bg-white border-2 border-neutral-200 hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 transition-all duration-100 cursor-grab active:cursor-grabbing"
            :title="`Add ${item.label}`"
            @click="handleAddElement(item)"
            @dragstart="onDragStart($event, item)"
          >
            <UIcon
              :name="item.icon"
              class="text-neutral-500 group-hover:text-indigo-600 size-6 transition-colors duration-100"
            />
            <span
              class="text-xs font-semibold text-neutral-600 group-hover:text-indigo-700 text-center mt-1 leading-tight transition-colors duration-100"
            >
              {{ item.label }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer hint — shows context-aware tip based on selection -->
    <div class="px-3 py-2 border-t border-neutral-200 shrink-0">
      <p class="text-[10px] text-neutral-500 leading-snug">
        <template v-if="selectedElement && isContainerSelected">
          Adding inside
          <span class="text-indigo-500 font-semibold">{{
            selectedElement.type
          }}</span>
        </template>
        <template v-else-if="selectedElement">
          Adding to parent container
        </template>
        <template v-else> Click or drag to add an element </template>
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { usePaletteItems } from "~/composables/usePaletteItems";
import { useEditorStore } from "~/composables/useEditorStore";
import type { PaletteItem } from "~/composables/useEditorStore";

const paletteGroups = usePaletteItems();
const store = useEditorStore();

const selectedElement = store.selectedElement;
const isContainerSelected = computed(
  () =>
    !!selectedElement.value && store.isContainer(selectedElement.value.type),
);

function handleAddElement(item: PaletteItem) {
  store.addElement(item);
}

function onDragStart(event: DragEvent, item: PaletteItem) {
  event.dataTransfer!.setData("application/codecraft-type", item.type);
  event.dataTransfer!.effectAllowed = "copy";
}
</script>
