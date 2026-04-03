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

        <div class="border-b border-neutral-800 bg-neutral-900/70 px-3 py-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-git-commit-horizontal" class="size-3.5 text-neutral-500" />
            <span class="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Execution Trace</span>
          </div>
        </div>

        <div
          ref="traceScrollerRef"
          class="max-h-52 shrink-0 overflow-y-auto border-b border-neutral-800 bg-neutral-950/30 px-3 py-2 font-mono text-[11px] selection:bg-indigo-500/30"
        >
          <div v-if="executionEvents.length === 0" class="text-neutral-700 italic px-1 py-6 text-center">
            Runtime steps will appear here...
          </div>
          <div
            v-for="event in executionEvents"
            :key="`${event.step}-${event.type}-${event.message}`"
            class="flex gap-2 items-start py-1"
          >
            <span class="mt-0.5 inline-flex min-w-5 items-center justify-center rounded bg-neutral-800 px-1 text-[10px] text-neutral-400">
              {{ event.step }}
            </span>
            <span class="break-words leading-relaxed text-neutral-300 select-text">{{ event.message }}</span>
          </div>
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
      <div ref="viewerRef" class="flex-1 flex flex-col items-center justify-center bg-neutral-900/50 p-6 overflow-auto">
        <div class="flex flex-col items-center gap-6 w-full">
          <PreviewDeviceFrame :device="activeDevice" :scale="scale">
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

            <PreviewRuntimePageRenderer
              v-else
              :page-elements="pageElements"
              @run-click="handleRunClick"
              @run-input="handleRunInput"
            />
          </PreviewDeviceFrame>

          <p class="text-[10px] font-mono text-neutral-600 tracking-widest uppercase">
            Preview · {{ activeDevice.label }} · {{ activeDevice.canvasW }} × {{ activeDevice.canvasH }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'
import { executeCode, syncRuntimeElementProps } from '~/composables/useRuntime'
import type { ConsoleEntry, ElementInstance, RuntimeExecutionEvent } from '~/composables/useRuntime'
import type { AppElement } from '~/composables/useEditorStore'
import { PREVIEW_DEVICES } from '~/composables/usePreviewDevices'
import { usePreviewDeviceScale } from '~/composables/usePreviewDeviceScale'

const store = useEditorStore()

// ── Runtime State ─────────────────────────────────────────────────────────
const logs = ref<ConsoleEntry[]>([])
const executionEvents = ref<RuntimeExecutionEvent[]>([])
const pageElements = ref<AppElement[]>([])
const instances = ref<ElementInstance[]>([])
const hasRun = ref(false)
const viewerRef = ref<HTMLElement | null>(null)
const traceScrollerRef = ref<HTMLElement | null>(null)
const activeDevice = computed(
  () => PREVIEW_DEVICES.find((device) => device.id === store.activeDeviceId.value) ?? PREVIEW_DEVICES[0]
)
const { scale } = usePreviewDeviceScale(viewerRef, activeDevice, {
  widthPadding: 48,
  heightPadding: 120,
})

function scrollTraceToBottom() {
  nextTick(() => {
    const el = traceScrollerRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  })
}

// ── Run logic ─────────────────────────────────────────────────────────────
function runCode() {
  const code = store.jsCode.value || ''
  const runtimeLogs: ConsoleEntry[] = []
  const runtimeEvents: RuntimeExecutionEvent[] = []
  executionEvents.value = []
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
      },
      (event) => {
        runtimeEvents.push(event)
        executionEvents.value = [...runtimeEvents]
        scrollTraceToBottom()
      }
    )
    
    logs.value = [...runtimeLogs, ...result.logs]
    executionEvents.value = [...result.events]
    scrollTraceToBottom()
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
  if (instance) {
    executionEvents.value = [
      ...executionEvents.value,
      {
        step: executionEvents.value.length + 1,
        type: 'log',
        message: `Click ${instance.__el.type} ${id}`,
        elementId: id,
        elementType: instance.__el.type,
      },
    ]
    scrollTraceToBottom()
  }
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
  executionEvents.value = []
  
  // Minimal delay to ensure everything is ready
  setTimeout(runCode, 300)
})

// Optional: clean up when leaving run mode
onBeforeUnmount(() => {
  hasRun.value = false
  executionEvents.value = []
})

watch(
  () => executionEvents.value.length,
  (nextLength, prevLength) => {
    if (nextLength > prevLength) {
      scrollTraceToBottom()
    }
  }
)
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
