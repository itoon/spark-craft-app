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
      <div ref="viewerRef" class="flex-1 min-w-0 flex flex-col bg-neutral-900/50 p-6 overflow-auto">
        <!-- m-auto (not justify-center) so a tall phone never gets clipped at the top -->
        <div class="m-auto flex flex-col items-center gap-4">
          <PreviewDeviceFrame :device="activeDevice" :scale="scale">
            <div
              v-if="!hasRun || pageElements.length === 0"
              class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-10 pointer-events-none"
            >
              <div class="size-16 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                <UIcon name="i-lucide-activity" class="size-8 text-neutral-300" :class="{ 'animate-pulse': !hasRun }" />
              </div>
              <template v-if="!hasRun">
                <p class="text-sm font-medium text-neutral-600">Starting your app…</p>
                <p class="text-xs text-neutral-400 leading-relaxed">
                  Connecting design elements and running your code.
                </p>
              </template>
              <template v-else>
                <p class="text-sm font-medium text-neutral-600">Nothing on screen yet</p>
                <p class="text-xs text-neutral-500 leading-relaxed">
                  Your code ran, but no element was added. Use
                  <code class="rounded bg-neutral-100 px-1 font-mono text-[11px] text-indigo-600">page.add(button1)</code>
                  in Code mode.
                </p>
              </template>
            </div>

            <PreviewRuntimePageRenderer
              v-else
              :page-elements="pageElements"
              :platform-override="store.activePlatform.value"
              :viewport-height="activeDevice.canvasH"
              @run-click="handleRunClick"
              @run-input="handleRunInput"
            />
            <template #overlay>
              <PreviewRuntimeNotifications :items="notifications.items.value" @dismiss="notifications.dismiss" />
            </template>
          </PreviewDeviceFrame>

          <p class="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">
            Preview · {{ activeDevice.label }} · {{ activeDevice.canvasW }} × {{ activeDevice.canvasH }}
          </p>
        </div>
      </div>

      <!-- ── Phone simulator: only when the code uses GPS / motion / Bluetooth ── -->
      <EditorSensorSimulatorPanel v-if="hardwareUse.any" :uses="hardwareUse" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'
import {
  buildScaffold,
  executeCode,
  getRuntimeChangeValue,
  getToolbarIdFromBackButtonClickId,
  isToolbarBackButtonClickId,
  syncRuntimeElementProps,
} from '~/composables/useRuntime'
import type { ConsoleEntry, ElementInstance, RuntimeExecutionEvent } from '~/composables/useRuntime'
import type { AppElement } from '~/composables/useEditorStore'
import { PREVIEW_DEVICES } from '~/composables/usePreviewDevices'
import { usePreviewDeviceScale } from '~/composables/usePreviewDeviceScale'
import { useRuntimeNotifications } from '~/composables/useRuntimeNotifications'
import { useSensorSimulator } from '~/composables/useSensorSimulator'
import type { RuntimeServices } from '~/utils/runtimeServices'

const store = useEditorStore()

// ── Runtime State ─────────────────────────────────────────────────────────
const logs = ref<ConsoleEntry[]>([])
const executionEvents = ref<RuntimeExecutionEvent[]>([])
const pageElements = ref<AppElement[]>([])
const instances = ref<ElementInstance[]>([])
const hasRun = ref(false)
const notifications = useRuntimeNotifications()
const sensorSim = useSensorSimulator()

// Which phone hardware the current page's code talks to
const hardwareUse = computed(() => {
  const code = store.jsCode.value || ''
  const location = /\blocation\.(get|watch)\s*\(/.test(code)
  const motion = /\bmotion\.(onShake|onTilt)\s*\(/.test(code)
  const ble = /\bble\.\w+\s*\(/.test(code)
  return { location, motion, ble, any: location || motion || ble }
})
let activeServices: RuntimeServices | null = null

function disposeServices() {
  activeServices?.dispose()
  activeServices = null
}
const viewerRef = ref<HTMLElement | null>(null)
const traceScrollerRef = ref<HTMLElement | null>(null)
const activeDevice = computed(
  () => PREVIEW_DEVICES.find((device) => device.id === store.activeDeviceId.value) ?? PREVIEW_DEVICES[0]
)
const { scale } = usePreviewDeviceScale(viewerRef, activeDevice, {
  widthPadding: 48,
  heightPadding: 80,
  maxScale: 1.3,
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
  // Stop timers / speech from the previous run before starting again
  disposeServices()
  notifications.clear()
  const runtimeLogs: ConsoleEntry[] = []
  executionEvents.value = []
  // No code yet (Code tab never opened): run the scaffold, which adds every element
  let code = store.jsCode.value || ''
  if (!code.trim()) {
    code = buildScaffold(store.elements.value.filter((el) => el.pageId === store.currentPageId.value))
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
        // Append (not replace) so Click / Change lines added by the UI stay in the trace
        executionEvents.value = [
          ...executionEvents.value,
          { ...event, step: executionEvents.value.length + 1 },
        ]
        scrollTraceToBottom()
      },
      {
        services: {
          storageNamespace: store.projectId.value,
          onNotify: notifications.push,
        },
        simulator: sensorSim.simulator,
      }
    )
    activeServices = result.services
    
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

function invokeRuntimeHandler(handler?: () => unknown) {
  if (!handler) return
  const report = (err: any) => {
    logs.value = [...logs.value, { type: 'error', message: `Event handler error: ${err?.message || String(err)}` }]
  }
  try {
    // Sync errors (e.g. a typo inside onClick) must not escape as uncaught exceptions
    Promise.resolve(handler()).catch(report)
  } catch (err) {
    report(err)
  }
}

function handleRunClick(id: string) {
  const targetId = getToolbarIdFromBackButtonClickId(id)
  const instance = instances.value.find(inst => inst.__el.id === targetId)
  if (instance) {
    executionEvents.value = [
      ...executionEvents.value,
      {
        step: executionEvents.value.length + 1,
        type: 'log',
        message: isToolbarBackButtonClickId(id)
          ? `Click Toolbar back button ${targetId}`
          : `Click ${instance.__el.type} ${targetId}`,
        elementId: targetId,
        elementType: instance.__el.type,
      },
    ]
    scrollTraceToBottom()
  }
  if (instance && isToolbarBackButtonClickId(id) && instance.__onBackClick) {
    invokeRuntimeHandler(instance.__onBackClick)
    return
  }
  if (instance && instance.__onClick) {
    invokeRuntimeHandler(instance.__onClick)
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

  // Only user input arrives here (code assignments go through onUpdate), so onChange can't loop
  const instance = instances.value.find(inst => inst.__el.id === id)
  const onChange = instance?.__onChange
  if (!instance || !onChange) return
  const value = getRuntimeChangeValue(instance.__el.type, propsPatch)
  if (value === undefined) return
  executionEvents.value = [
    ...executionEvents.value,
    {
      step: executionEvents.value.length + 1,
      type: 'log',
      message: `Change ${instance.__el.type} ${id} → ${String(value)}`,
      elementId: id,
      elementType: instance.__el.type,
    },
  ]
  scrollTraceToBottom()
  invokeRuntimeHandler(() => onChange(value))
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
  disposeServices()
  notifications.clear()
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
