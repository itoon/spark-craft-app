<template>
  <div class="run-mode flex-1 flex flex-col bg-neutral-950 overflow-hidden">
    <!-- ── TOP: Run Mode Header ─────────────────────────────────────── -->
    <div class="flex items-center gap-3 px-4 h-12 bg-neutral-900 border-b border-neutral-700 shrink-0 z-20">
      <div class="flex items-center gap-2">
        <div class="size-6 rounded bg-emerald-600 flex items-center justify-center">
          <UIcon name="i-lucide-play" class="size-3.5 text-white" />
        </div>
        <span class="text-sm font-bold text-white tracking-tight">Run Mode</span>
      </div>

      <div class="w-px h-5 bg-neutral-700 mx-1" />

      <div class="flex items-center gap-1.5">
        <UButton
          label="Restart Session"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="subtle"
          size="xs"
          @click="runCode"
        />
        <UButton
          label="Back to Design"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="store.setRunning(false)"
        />
      </div>

      <div class="flex-1" />

      <!-- Status indicator -->
      <div
        class="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold transition-colors duration-300"
        :class="hasRun
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          : 'bg-neutral-800 text-neutral-500 border border-neutral-700'"
      >
        <span
          class="size-1.5 rounded-full"
          :class="hasRun ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'"
        />
        {{ hasRun ? 'Runtime Active' : 'Initializing...' }}
      </div>
    </div>

    <!-- ── MAIN CONTENT ── -->
    <div class="flex-1 flex overflow-hidden">
      
      <!-- ── LEFT: Console (Collapsible ideally, but here fixed for now or bottom) ── -->
      <div class="w-80 shrink-0 border-r border-neutral-800 bg-neutral-900/30 flex flex-col overflow-hidden">
        <div class="flex items-center gap-2 px-3 h-9 bg-neutral-900 border-b border-neutral-700 shrink-0">
          <UIcon name="i-lucide-terminal" class="size-3.5 text-neutral-500" />
          <span class="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Debug Console</span>
          <div class="flex-1" />
          <button
            v-if="logs.length"
            class="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
            @click="logs = []"
          >
            Clear
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[11px] selection:bg-indigo-500/30">
          <div v-if="logs.length === 0" class="text-neutral-700 italic px-1 py-10 text-center">
            Log messages will appear here...
          </div>
          <div
            v-for="(entry, i) in logs"
            :key="i"
            class="flex gap-2 items-start py-0.5"
            :class="{
              'text-red-400': entry.type === 'error',
              'text-amber-400': entry.type === 'warn',
              'text-emerald-400': entry.type === 'success',
              'text-neutral-400': entry.type === 'log',
            }"
          >
            <span class="shrink-0 opacity-50 mt-0.5">
              {{ entry.type === 'error' ? '✕' : entry.type === 'success' ? '✓' : entry.type === 'warn' ? '⚠' : '›' }}
            </span>
            <span class="break-words leading-relaxed select-text">{{ entry.message }}</span>
          </div>
        </div>
      </div>

      <!-- ── RIGHT: Device Viewer ── -->
      <div class="flex-1 flex flex-col items-center justify-center bg-neutral-900/50 p-6 overflow-auto">
        <!-- Scale to fit roughly -->
        <div class="flex flex-col items-center gap-6" style="transform: scale(0.9); transform-origin: center center;">
          
          <!-- iPhone 15 frame -->
          <div
            class="relative bg-neutral-800 border-[12px] border-neutral-600 shadow-2xl shadow-black/50"
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
              <div class="absolute inset-0 flex flex-col overflow-hidden">
                <!-- Empty state -->
                <div
                  v-if="!hasRun || pageElements.length === 0"
                  class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-10 pointer-events-none"
                >
                  <div class="size-16 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                    <UIcon name="i-lucide-activity" class="size-8 text-neutral-300 animate-pulse" />
                  </div>
                  <p class="text-sm font-medium text-neutral-600">Initializing Runtime...</p>
                  <p class="text-xs text-neutral-400 leading-relaxed">
                    Connecting to design elements and applying your logic.
                  </p>
                </div>

                <!-- Rendered elements -->
                <div v-else class="flex flex-col w-full h-full">
                  <!-- Toolbar is sticky at top -->
                  <div
                    v-if="toolbarElement"
                    class="sticky top-0 z-10 w-full shrink-0"
                    :style="{ height: `${toolbarElement.height}px` }"
                  >
                    <EditorCanvasElementRenderer
                      :element="toolbarElement"
                      is-run-mode
                      @run-click="handleRunClick"
                      @run-input="handleRunInput"
                    />
                  </div>

                  <!-- Body elements -->
                  <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-[14px] pt-[14px] pb-[14px]">
                    <template v-for="el in bodyElements" :key="el.id">
                      <div class="w-full shrink-0" :style="{ height: `${bodyElementHeight(el)}px` }">
                        <EditorCanvasElementRenderer
                          :element="el"
                          is-run-mode
                          :forced-height="bodyElementHeight(el)"
                          @run-click="handleRunClick"
                          @run-input="handleRunInput"
                        />
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Home indicator -->
              <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-neutral-400/30 rounded-full" />
            </div>
          </div>

          <p class="text-[10px] font-mono text-neutral-600 tracking-widest uppercase">
            Preview · iPhone 15 · 393 × 852
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'
import { executeCode, syncRuntimeElementProps } from '~/composables/useRuntime'
import type { ConsoleEntry, ElementInstance } from '~/composables/useRuntime'
import type { AppElement } from '~/composables/useEditorStore'

const store = useEditorStore()

// ── Runtime State ─────────────────────────────────────────────────────────
const logs = ref<ConsoleEntry[]>([])
const pageElements = ref<AppElement[]>([])
const instances = ref<ElementInstance[]>([])
const hasRun = ref(false)

// ── Run logic ─────────────────────────────────────────────────────────────
function runCode() {
  const code = store.jsCode.value || ''
  const runtimeLogs: ConsoleEntry[] = []
  if (!code.trim()) {
    runtimeLogs.push({ type: 'warn', message: 'No code to run. Using default scaffold.' })
  }

  try {
    const result = executeCode(
      code, 
      store.elements.value, 
      (id, props) => {
        store.updateElementProps(id, props)
      },
      (pageRef) => {
        navigateToPage(pageRef)
      },
      (entry) => {
        logs.value = [...logs.value, entry]
      }
    )
    
    logs.value = runtimeLogs.length ? [...runtimeLogs, ...result.logs] : result.logs
    pageElements.value = result.pageElements
    instances.value = result.instances
    hasRun.value = true
  } catch (err: any) {
    logs.value.push({ type: 'error', message: `Runtime initialization failed: ${err.message}` })
  }
}

function navigateToPage(pageRef: string) {
  const normalizedRef = pageRef.trim().toLowerCase()
  const targetPage = store.pages.value.find((page) =>
    page.id.toLowerCase() === normalizedRef || page.name.toLowerCase() === normalizedRef
  )

  if (!targetPage) {
    logs.value.push({ type: 'error', message: `Navigation failed: page "${pageRef}" not found` })
    return
  }

  if (store.currentPageId.value === targetPage.id) {
    logs.value.push({ type: 'warn', message: `Already on ${targetPage.name}` })
    return
  }

  store.switchPage(targetPage.id)
  logs.value.push({ type: 'success', message: `Navigated to ${targetPage.name}` })

  nextTick(() => {
    runCode()
  })
}

function handleRunClick(id: string) {
  const instance = instances.value.find(inst => inst.__el.id === id)
  if (instance && instance.__onClick) {
    try {
      instance.__onClick()
    } catch (err: any) {
      logs.value.push({ type: 'error', message: `Event handler error: ${err.message}` })
    }
  }
}

function handleRunInput(id: string, propsPatch: Record<string, unknown>) {
  store.updateElementProps(id, propsPatch)
  const nextRuntime = syncRuntimeElementProps(
    {
      pageElements: pageElements.value,
      instances: instances.value,
    },
    id,
    propsPatch
  )
  pageElements.value = nextRuntime.pageElements
  instances.value = nextRuntime.instances
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(() => {
  // Clear selection when entering run mode to emphasize the preview
  store.selectElement(null)
  
  // Minimal delay to ensure everything is ready
  setTimeout(runCode, 300)
})

// Optional: clean up when leaving run mode
onBeforeUnmount(() => {
  hasRun.value = false
})

// ── Computed Helpers ──────────────────────────────────────────────────────
const runModeElementIds = computed(() => new Set(pageElements.value.map(e => e.id)))

const toolbarElement = computed(() =>
  pageElements.value.find(el => el.type === 'Toolbar') ?? null
)

const DEFAULT_TOOLBAR_HEIGHT = 56
const BODY_VERTICAL_PADDING = 28

const bodyElements = computed(() => {
  return pageElements.value.filter(el => {
    if (el.type === 'Toolbar') return false
    
    // An element should be rendered directly by RunMode (at root level) IF:
    // 1. It structurally has no parent.
    // OR
    // 2. Its structural parent was NOT added to the page by the user code.
    // If the parent IS present on the page, the parent will render this child recursively.
    const parentIsPresent = el.parentId && runModeElementIds.value.has(el.parentId)
    
    return !parentIsPresent
  })
})

function bodyElementHeight(el: AppElement) {
  if (el.type !== 'Container' || el.parentId !== null) return el.height
  const detachedToolbarHeight = toolbarElement.value?.height ?? DEFAULT_TOOLBAR_HEIGHT
  return Math.max(el.height - detachedToolbarHeight - BODY_VERTICAL_PADDING, 0)
}
</script>

<style scoped>
.run-mode {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
