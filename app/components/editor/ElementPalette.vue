<template>
  <aside class="editor-palette flex flex-col h-full bg-neutral-900 border-r border-neutral-700 w-60 shrink-0 overflow-hidden">
    <!-- Panel header -->
    <div class="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-700 shrink-0">
      <UIcon name="i-lucide-package" class="text-neutral-400 size-3.5" />
      <span class="text-xs font-semibold text-neutral-300 uppercase tracking-widest">Elements</span>
    </div>

    <!-- Scrollable palette groups -->
    <div class="flex-1 overflow-y-auto p-2 space-y-3">
      <div v-for="group in paletteGroups" :key="group.label">
        <!-- Group header -->
        <div class="flex items-center gap-1.5 px-1 mb-1.5">
          <UIcon :name="group.icon" class="text-neutral-500 size-3" />
          <span class="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">{{ group.label }}</span>
        </div>

        <!-- Items grid -->
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="item in group.items"
            :key="item.type"
            class="palette-item group flex flex-col items-center gap-1.5 p-2 rounded bg-neutral-800 border border-neutral-700 hover:border-indigo-500 hover:bg-neutral-750 transition-colors duration-100 cursor-pointer text-left"
            :title="`Add ${item.label}`"
            @click="handleAddElement(item)"
          >
            <UIcon
              :name="item.icon"
              class="text-neutral-400 group-hover:text-indigo-400 size-4 transition-colors duration-100"
            />
            <span class="text-[10px] text-neutral-400 group-hover:text-neutral-200 font-medium leading-none transition-colors duration-100 text-center">
              {{ item.label }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer hint — shows context-aware tip based on selection -->
    <div class="px-3 py-2 border-t border-neutral-700 shrink-0">
      <p class="text-[10px] text-neutral-600 leading-snug">
        <template v-if="selectedElement && isContainerSelected">
          Adding inside <span class="text-indigo-500">{{ selectedElement.type }}</span>
        </template>
        <template v-else-if="selectedElement">
          Adding to parent container
        </template>
        <template v-else>
          Click to add · auto-creates a container
        </template>
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePaletteItems } from '~/composables/usePaletteItems'
import { useEditorStore } from '~/composables/useEditorStore'
import type { PaletteItem } from '~/composables/useEditorStore'

const paletteGroups = usePaletteItems()
const store = useEditorStore()

const selectedElement = store.selectedElement
const isContainerSelected = computed(() =>
  !!selectedElement.value && store.isContainer(selectedElement.value.type)
)

function handleAddElement(item: PaletteItem) {
  // addElement picks the right parent based on current selectedElementId
  store.addElement(item)
}
</script>
