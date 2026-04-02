<template>
  <div class="run-mode flex-1 flex overflow-hidden bg-neutral-950">

    <!-- ── LEFT: Code editor panel ────────────────────────────────────── -->
    <div class="flex flex-col w-[460px] shrink-0 border-r border-neutral-700">

      <!-- Header bar -->
      <div class="flex items-center gap-2 px-4 h-10 bg-neutral-900 border-b border-neutral-700 shrink-0">
        <UIcon name="i-lucide-code-2" class="size-4 text-indigo-400" />
        <span class="text-xs font-bold text-neutral-200 tracking-wide">JavaScript</span>
        <div class="flex-1" />
        <UButton
          label="Run Code"
          icon="i-lucide-play"
          color="success"
          variant="solid"
          size="xs"
          @click="runCode"
        />
        <UButton
          label="Reset"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="resetCode"
        />
      </div>

      <!-- Available IDs hint bar -->
      <div class="px-4 py-2 bg-neutral-900/60 border-b border-neutral-700/50 shrink-0">
        <p class="text-[10px] text-neutral-500 font-mono leading-relaxed">
          <span class="text-indigo-400 font-semibold">Available IDs: </span>
          <span
            v-for="(el, i) in store.elements.value"
            :key="el.id"
            class="text-amber-400 cursor-pointer hover:text-amber-300"
            :title="`${el.type} — click to insert`"
            @click="insertId(el)"
          >{{ el.id }}<span v-if="i < store.elements.value.length - 1" class="text-neutral-600">,  </span></span>
          <span v-if="store.elements.value.length === 0" class="text-neutral-600 italic">No elements on canvas yet</span>
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
          v-model="code"
          class="flex-1 bg-transparent text-green-300 font-mono text-[12px] leading-[22px] p-4 resize-none outline-none caret-white selection:bg-indigo-500/30 overflow-y-auto"
          spellcheck="false"
          autocorrect="off"
          autocapitalize="off"
          @keydown.tab.prevent="insertTab"
          @scroll="syncScroll"
        />
      </div>

      <!-- Console output -->
      <div class="h-36 border-t border-neutral-700 flex flex-col shrink-0">
        <div class="flex items-center gap-2 px-3 h-7 bg-neutral-900 border-b border-neutral-700/50 shrink-0">
          <UIcon name="i-lucide-terminal" class="size-3 text-neutral-500" />
          <span class="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Console</span>
          <div class="flex-1" />
          <button
            v-if="logs.length"
            class="text-[9px] text-neutral-600 hover:text-neutral-400"
            @click="logs = []"
          >
            Clear
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 font-mono text-[11px]">
          <div v-if="logs.length === 0" class="text-neutral-700 italic">
            Press "Run Code" to execute…
          </div>
          <div
            v-for="(entry, i) in logs"
            :key="i"
            class="flex gap-1.5 items-start"
            :class="{
              'text-red-400': entry.type === 'error',
              'text-amber-400': entry.type === 'warn',
              'text-emerald-400': entry.type === 'success',
              'text-neutral-400': entry.type === 'log',
            }"
          >
            <span class="shrink-0 mt-px">
              {{ entry.type === 'error' ? '✕' : entry.type === 'success' ? '✓' : entry.type === 'warn' ? '⚠' : '›' }}
            </span>
            <span class="break-all leading-snug">{{ entry.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── RIGHT: Phone preview ────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col items-center justify-center bg-neutral-900 gap-4 overflow-auto p-6">

      <!-- Status pill -->
      <div class="flex items-center gap-2">
        <div
          class="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold"
          :class="hasRun
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : 'bg-neutral-800 text-neutral-500 border border-neutral-700'"
        >
          <span
            class="size-1.5 rounded-full"
            :class="hasRun ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'"
          />
          {{ hasRun ? `${pageElements.length} element(s) rendered` : 'Write code and press Run' }}
        </div>
      </div>

      <!-- iPhone 15 frame -->
      <div
        class="relative bg-neutral-800 border-[12px] border-neutral-600 shrink-0"
        style="width: 417px; height: 900px; border-radius: 52px;"
      >
        <!-- Screen -->
        <div
          class="relative bg-white overflow-hidden w-full h-full"
          style="border-radius: 44px;"
        >
          <!-- Dynamic Island -->
          <div class="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[120px] h-[36px] bg-black rounded-full" />

          <!-- Rendered page content -->
          <div class="absolute inset-0 overflow-y-auto overflow-x-hidden">

            <!-- Empty state -->
            <div
              v-if="!hasRun || pageElements.length === 0"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
            >
              <UIcon name="i-lucide-play-circle" class="size-10 text-neutral-300" />
              <p class="text-xs text-neutral-400 text-center leading-relaxed px-8">
                Write JavaScript in the editor<br />and press <strong>Run Code</strong> to see your app
              </p>
              <div v-if="store.elements.value.length === 0" class="mt-2 text-[10px] text-neutral-400 text-center px-8">
                ⚠ No elements on canvas — go to Design mode first
              </div>
            </div>

            <!-- Rendered elements -->
            <div v-else class="flex flex-col w-full">
              <!-- Toolbar is always first and sticky -->
              <div
                v-if="toolbarElement"
                class="sticky top-0 z-10 w-full shrink-0"
                :style="{ height: `${toolbarElement.height}px` }"
              >
                <EditorCanvasElementRenderer
                  :element="toolbarElement"
                  is-run-mode
                  @run-click="handleRunClick"
                />
              </div>

              <!-- Body elements with 14px padding -->
              <div class="flex flex-col w-full" style="padding: 14px;">
                <template v-for="el in bodyElements" :key="el.id">
                  <div class="w-full mb-2" :style="{ height: `${el.height}px` }">
                    <EditorCanvasElementRenderer
                      :element="el"
                      is-run-mode
                      @run-click="handleRunClick"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Home indicator -->
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-neutral-400 rounded-full" />
        </div>
      </div>

      <!-- Device label -->
      <p class="text-[10px] text-neutral-600 font-mono">iPhone 15 · 393 × 852</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'
import { buildScaffold, executeCode, ELEMENT_CLASS_MAP, varNameFromId } from '~/composables/useRuntime'
import type { ConsoleEntry, ElementInstance } from '~/composables/useRuntime'
import type { AppElement } from '~/composables/useEditorStore'

const store = useEditorStore()

// ── Code state ────────────────────────────────────────────────────────────
const code = ref('')
const logs = ref<ConsoleEntry[]>([])
const pageElements = ref<AppElement[]>([])
const instances = ref<ElementInstance[]>([])
const hasRun = ref(false)

const editorRef = ref<HTMLTextAreaElement | null>(null)
const lineNumRef = ref<HTMLDivElement | null>(null)

// Build scaffold when component mounts or elements change (only if user hasn't edited)
const scaffoldGenerated = ref(false)

watch(
  () => store.elements.value.length,
  () => {
    if (!scaffoldGenerated.value) {
      code.value = buildScaffold(store.elements.value)
      scaffoldGenerated.value = true
    }
  },
  { immediate: true }
)

// ── Line numbers ──────────────────────────────────────────────────────────
const lineCount = computed(() => code.value.split('\n').length)

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
  code.value = code.value.substring(0, start) + '  ' + code.value.substring(end)
  nextTick(() => {
    ta.selectionStart = ta.selectionEnd = start + 2
  })
}

// ── Click ID badge → insert snippet ──────────────────────────────────────
function insertId(el: AppElement) {
  const cls = ELEMENT_CLASS_MAP[el.type] ?? el.type
  const varName = varNameFromId(el.id)
  const snippet = `var ${varName} = new ${cls}('${el.id}');\npage.add(${varName});\n`
  const ta = editorRef.value
  if (ta) {
    const pos = ta.selectionStart
    code.value = code.value.substring(0, pos) + snippet + code.value.substring(pos)
  } else {
    code.value += '\n' + snippet
  }
}

// ── Run the student's code ────────────────────────────────────────────────
function runCode() {
  const result = executeCode(code.value, store.elements.value, (id, props) => {
    store.updateElementProps(id, props)
  })
  logs.value = result.logs
  pageElements.value = result.pageElements
  instances.value = result.instances
  hasRun.value = true
}

function handleRunClick(id: string) {
  const instance = instances.value.find(inst => inst.__el.id === id)
  if (instance && instance.__onClick) {
    try {
      instance.__onClick()
    } catch (err: any) {
      logs.value.push({ type: 'error', message: `Click handler error: ${err.message}` })
    }
  }
}

// ── Reset back to scaffold ────────────────────────────────────────────────
function resetCode() {
  code.value = buildScaffold(store.elements.value)
  logs.value = []
  pageElements.value = []
  hasRun.value = false
}

// ── Split rendered elements: toolbar vs body ──────────────────────────────
const toolbarElement = computed(() =>
  pageElements.value.find(el => el.type === 'Toolbar') ?? null
)
const bodyElements = computed(() =>
  pageElements.value.filter(el => el.type !== 'Toolbar')
)

// nextTick helper
function nextTick(fn: () => void) {
  setTimeout(fn, 0)
}
</script>

<style scoped>
textarea {
  tab-size: 2;
}
</style>
