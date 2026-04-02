<template>
  <!-- Renders the flat list of root-level containers onto the canvas surface.
       Non-container elements cannot exist at root level; the store enforces this. -->
  <div
    class="relative w-full min-h-full"
    @click.self="store.selectElement(null)"
  >
    <!-- Empty state -->
    <div
      v-if="store.rootContainers.value.length === 0"
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
    >
      <div class="border-2 border-dashed border-gray-300 rounded-xl w-48 h-32 flex flex-col items-center justify-center gap-2 opacity-50">
        <UIcon name="i-lucide-plus-circle" class="size-6 text-gray-400" />
        <p class="text-xs text-gray-400 font-medium text-center leading-snug px-2">
          Click a palette item<br />to start building
        </p>
      </div>
    </div>

    <!-- Root-level containers stacked vertically (document flow) -->
    <div class="flex flex-col w-full">
      <div
        v-for="container in store.rootContainers.value"
        :key="container.id"
        class="relative cursor-pointer"
        :class="{
          'ring-2 ring-indigo-500 ring-offset-0': store.selectedElementId.value === container.id,
        }"
        :style="rootContainerStyle(container)"
        @click.stop="store.selectElement(container.id)"
      >
        <!-- Selection label badge above the container -->
        <template v-if="store.selectedElementId.value === container.id">
          <div class="absolute -top-5 left-0 z-10 flex items-center gap-1 pointer-events-none">
            <span class="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-mono leading-none">
              {{ container.type }}
            </span>
          </div>
          <!-- Resize handle (visual only) -->
          <div class="absolute -bottom-1 -right-1 size-2.5 bg-indigo-500 rounded-sm border border-white cursor-se-resize z-10" />
        </template>

        <EditorCanvasElementRenderer :element="container" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '~/composables/useEditorStore'
import type { AppElement } from '~/composables/useEditorStore'

const store = useEditorStore()

// Root containers get their x/y position from the store, but in this document-flow
// layout we only apply width. Height comes from the element's height prop.
function rootContainerStyle(el: AppElement): Record<string, string> {
  return {
    // Root containers always span the full canvas width
    width: '100%',
    // Height is auto — the container grows to fit its children
    // (no fixed height set here)
  }
}
</script>
