<template>
  <div class="flex flex-col h-full bg-neutral-900 border-r border-neutral-700 w-56 shrink-0 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 h-10 border-b border-neutral-700 shrink-0">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-files" class="text-neutral-400 size-3.5" />
        <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pages</span>
      </div>
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        @click="store.addPage"
        title="Add Page"
      />
    </div>

    <!-- Page List -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div
        v-for="page in store.pages.value"
        :key="page.id"
        class="group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-100"
        :class="store.currentPageId.value === page.id
          ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-inset ring-indigo-500/50'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'"
        @click="store.switchPage(page.id)"
      >
        <UIcon
          :name="store.currentPageId.value === page.id ? 'i-lucide-file-text' : 'i-lucide-file'"
          class="size-3.5 shrink-0"
        />
        
        <div class="flex-1 min-w-0">
          <input
            v-if="editingPageId === page.id"
            ref="editInput"
            v-model="editName"
            class="w-full bg-neutral-800 text-white text-xs outline-none rounded border border-indigo-500 px-1 py-0.5"
            @blur="saveRename"
            @keydown.enter="saveRename"
            @keydown.esc="editingPageId = null"
            @click.stop
          />
          <span v-else class="text-xs font-medium truncate block">{{ page.name }}</span>
        </div>

        <!-- Actions (visible on hover or if active) -->
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="p-1 hover:text-white transition-colors"
            @click.stop="startRename(page)"
          >
            <UIcon name="i-lucide-edit-3" class="size-3" />
          </button>
          <button
            v-if="store.pages.value.length > 1"
            class="p-1 hover:text-red-400 transition-colors"
            @click.stop="store.deletePage(page.id)"
          >
            <UIcon name="i-lucide-trash-2" class="size-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Footer hint -->
    <div class="p-3 border-t border-neutral-700 bg-neutral-900/50">
      <p class="text-[9px] text-neutral-500 leading-tight">
        Elements are scoped to each page.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'
import type { Page } from '~/composables/useEditorStore'

const store = useEditorStore()

const editingPageId = ref<string | null>(null)
const editName = ref('')
const editInput = ref<HTMLInputElement | null>(null)

function startRename(page: Page) {
  editingPageId.value = page.id
  editName.value = page.name
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
  })
}

function saveRename() {
  if (editingPageId.value && editName.value.trim()) {
    store.renamePage(editingPageId.value, editName.value.trim())
  }
  editingPageId.value = null
}
</script>
