<template>
  <div class="js-editor flex-1 flex flex-col overflow-hidden bg-neutral-950">
    <!-- macOS-style toolbar bar -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-700 shrink-0">
      <div class="flex items-center gap-2">
        <div class="size-2.5 rounded-full bg-red-500" />
        <div class="size-2.5 rounded-full bg-yellow-500" />
        <div class="size-2.5 rounded-full bg-green-500" />
        <span class="ml-3 text-xs text-neutral-500 font-mono">logic.js</span>
      </div>
      <div class="flex items-center gap-2">
        <UBadge color="info" variant="subtle" size="xs" label="Auto-saving" />
      </div>
    </div>

    <!-- Available IDs hint bar -->
    <div class="px-4 py-2 bg-neutral-900/60 border-b border-neutral-700/50 shrink-0 overflow-x-auto whitespace-nowrap">
      <p class="text-[10px] text-neutral-500 font-mono flex items-center gap-2">
        <span class="text-indigo-400 font-semibold shrink-0">Available IDs: </span>
        <span
          v-for="(el, i) in currentElements"
          :key="el.id"
          class="text-amber-400 cursor-pointer hover:text-amber-300 shrink-0"
          :title="`${el.type} — click to insert`"
          @click="insertIdSnippet(el)"
        >
          {{ el.id }}<span v-if="i < currentElements.length - 1" class="text-neutral-600">, </span>
        </span>
        <span v-if="currentElements.length === 0" class="text-neutral-600 italic">No elements on current page</span>
      </p>
    </div>

    <!-- Code textarea with line numbers -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Line numbers -->
      <div
        ref="lineNumRef"
        class="select-none text-right pr-3 pt-4 pb-4 bg-neutral-900/40 border-r border-neutral-700/50 font-mono text-[12px] leading-[22px] text-neutral-600 min-w-[40px] overflow-hidden"
        aria-hidden="true"
      >
        <div v-for="n in lineCount" :key="n">{{ n }}</div>
      </div>

      <!-- Editor textarea -->
      <textarea
        ref="editorRef"
        v-model="store.jsCode.value"
        class="flex-1 bg-transparent text-green-300 font-mono text-[12px] leading-[22px] p-4 resize-none outline-none caret-white selection:bg-indigo-500/30 overflow-y-auto"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        placeholder="Write your logic here..."
        @keydown.tab.prevent="insertTab"
        @scroll="syncScroll"
      />
    </div>

    <!-- Footer / Status -->
    <div class="flex items-center justify-between px-3 py-1 bg-neutral-900 border-t border-neutral-700 shrink-0">
      <div class="flex items-center gap-3 text-[10px] text-neutral-500 font-mono">
        <span>Javascript</span>
        <span>UTF-8</span>
        <span>{{ lineCount }} lines</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'
import { ELEMENT_CLASS_MAP, varNameFromId, buildScaffold } from '~/composables/useRuntime'
import type { AppElement } from '~/composables/useEditorStore'

const store = useEditorStore()

// ── State ─────────────────────────────────────────────────────────────────
const editorRef = ref<HTMLTextAreaElement | null>(null)
const lineNumRef = ref<HTMLDivElement | null>(null)

// Only show elements for the current page
const currentElements = computed(() => 
  store.elements.value.filter((el: AppElement) => el.pageId === store.currentPageId.value)
)

// Ensure code is initialized if empty
onMounted(() => {
  if (!store.jsCode.value || store.jsCode.value.trim() === '') {
    store.setJsCode(buildScaffold(store.elements.value))
  }
})

// ── Line numbers ──────────────────────────────────────────────────────────
const lineCount = computed(() => (store.jsCode.value || '').split('\n').length)

function syncScroll() {
  if (editorRef.value && lineNumRef.value) {
    lineNumRef.value.scrollTop = editorRef.value.scrollTop
  }
}

// ── Tab key support ───────────────────────────────────────────────────────
function insertTab() {
  const ta = editorRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const code = store.jsCode.value
  store.setJsCode(code.substring(0, start) + '  ' + code.substring(end))
  nextTick(() => {
    ta.selectionStart = ta.selectionEnd = start + 2
  })
}

// ── Insert snippet ────────────────────────────────────────────────────────
function insertIdSnippet(el: AppElement) {
  const cls = ELEMENT_CLASS_MAP[el.type] ?? el.type
  const varName = varNameFromId(el.id)
  const snippet = `var ${varName} = new ${cls}('${el.id}');\npage.add(${varName});\n`
  
  const ta = editorRef.value
  if (ta) {
    const pos = ta.selectionStart
    const code = store.jsCode.value
    store.setJsCode(code.substring(0, pos) + snippet + code.substring(pos))
    nextTick(() => {
      ta.selectionStart = ta.selectionEnd = pos + snippet.length
      ta.focus()
    })
  } else {
    store.setJsCode((store.jsCode.value || '') + '\n' + snippet)
  }
}
</script>

<style scoped>
textarea {
  tab-size: 2;
}
textarea::-webkit-scrollbar {
  width: 10px;
}
textarea::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
}
textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
