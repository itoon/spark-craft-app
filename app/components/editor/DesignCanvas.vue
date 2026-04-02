<template>
  <!-- Outer workspace — dark background, scrollable when device is larger than available space -->
  <div
    ref="workspaceRef"
    class="design-canvas-workspace flex-1 flex flex-col items-center overflow-auto bg-neutral-950 p-4 gap-4"
    @click.self="store.selectElement(null)"
  >

    <!-- ─── Device selector ────────────────────────────────────────────── -->
    <div class="flex items-center gap-1 shrink-0 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5">
      <button
        v-for="d in DEVICES"
        :key="d.id"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-100"
        :class="activeDevice.id === d.id
          ? 'bg-indigo-600 text-white'
          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'"
        @click="activeDeviceId = d.id"
      >
        <UIcon :name="d.icon" class="size-3.5" />
        {{ d.label }}
      </button>
    </div>

    <!-- ─── Scale wrapper — keeps the frame inside the viewport ───────── -->
    <div
      class="shrink-0"
      :style="{
        width: `${activeDevice.totalW}px`,
        height: `${activeDevice.totalH}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        // Counteract the space the scaled element would still occupy
        marginBottom: `${(activeDevice.totalH * scale) - activeDevice.totalH}px`,
      }"
    >

      <!-- ─── iPhone 15 frame ──────────────────────────────────────────── -->
      <div
        v-if="activeDevice.id === 'iphone15'"
        class="relative bg-neutral-800 border-[12px] border-neutral-600"
        :style="{
          width: `${activeDevice.totalW}px`,
          height: `${activeDevice.totalH}px`,
          borderRadius: `${activeDevice.cornerRadius}px`,
        }"
      >
        <!-- Screen -->
        <div
          class="relative bg-white overflow-hidden w-full h-full"
          style="border-radius: 44px;"
          @click.self="store.selectElement(null)"
        >
          <!-- Dynamic Island -->
          <div class="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[120px] h-[36px] bg-black rounded-full" />

          <!-- Canvas content — Toolbar is sticky at top; Dynamic Island floats above -->
          <div class="absolute inset-0 overflow-y-auto overflow-x-hidden" @click.self="store.selectElement(null)">
            <EditorCanvasContent />
          </div>

          <!-- Home indicator -->
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-neutral-400 rounded-full" />
        </div>
      </div>

      <!-- ─── iPhone SE frame ──────────────────────────────────────────── -->
      <div
        v-else-if="activeDevice.id === 'iphonese'"
        class="relative bg-neutral-800 border-[10px] border-neutral-600 flex flex-col"
        :style="{
          width: `${activeDevice.totalW}px`,
          height: `${activeDevice.totalH}px`,
          borderRadius: `${activeDevice.cornerRadius}px`,
        }"
      >
        <!-- Top bar: speaker + camera -->
        <div class="shrink-0 h-[60px] flex flex-col items-center justify-center gap-2">
          <div class="w-12 h-1.5 bg-neutral-600 rounded-full" />
          <div class="size-3 bg-neutral-600 rounded-full" />
        </div>

        <!-- Screen -->
        <div
          class="relative flex-1 bg-white overflow-hidden"
          style="border-radius: 4px;"
          @click.self="store.selectElement(null)"
        >
          <div class="absolute inset-0 overflow-y-auto overflow-x-hidden" @click.self="store.selectElement(null)">
            <EditorCanvasContent />
          </div>
        </div>

        <!-- Bottom bar: home button -->
        <div class="shrink-0 h-[60px] flex items-center justify-center">
          <div class="size-10 border-2 border-neutral-600 rounded-full" />
        </div>
      </div>

      <!-- ─── Android (Pixel) frame ────────────────────────────────────── -->
      <div
        v-else-if="activeDevice.id === 'android'"
        class="relative bg-neutral-900 border-[8px] border-neutral-700"
        :style="{
          width: `${activeDevice.totalW}px`,
          height: `${activeDevice.totalH}px`,
          borderRadius: `${activeDevice.cornerRadius}px`,
        }"
      >
        <!-- Screen -->
        <div
          class="relative bg-white overflow-hidden w-full h-full"
          style="border-radius: 36px;"
          @click.self="store.selectElement(null)"
        >
          <!-- Punch-hole camera -->
          <div class="absolute top-3 left-1/2 -translate-x-1/2 z-20 size-3 bg-neutral-900 rounded-full" />

          <!-- Canvas content — Toolbar is sticky at top; punch-hole floats above -->
          <div class="absolute inset-0 overflow-y-auto overflow-x-hidden" @click.self="store.selectElement(null)">
            <EditorCanvasContent />
          </div>

          <!-- Home indicator -->
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-[140px] h-[4px] bg-neutral-400 rounded-full" />
        </div>
      </div>

      <!-- ─── Custom (no frame) ────────────────────────────────────────── -->
      <div
        v-else
        class="relative bg-white border border-neutral-300 overflow-hidden"
        :style="{
          width: `${activeDevice.canvasW}px`,
          height: `${activeDevice.canvasH}px`,
        }"
        @click.self="store.selectElement(null)"
      >
        <div class="absolute inset-0 overflow-y-auto overflow-x-hidden" @click.self="store.selectElement(null)">
          <EditorCanvasContent />
        </div>
      </div>

    </div><!-- end scale wrapper -->

    <!-- Canvas size label -->
    <div
      class="text-[10px] text-neutral-600 font-mono shrink-0"
      :style="{ marginTop: `${(activeDevice.totalH * scale) - activeDevice.totalH + 8}px` }"
    >
      {{ activeDevice.canvasW }} × {{ activeDevice.canvasH }} · {{ activeDevice.label }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'

const store = useEditorStore()

// ─── Device definitions ───────────────────────────────────────────────────

interface DeviceDef {
  id: string
  label: string
  icon: string
  canvasW: number
  canvasH: number
  totalW: number   // shell outer width (canvas + border*2 + insets)
  totalH: number   // shell outer height
  cornerRadius: number
}

const DEVICES: DeviceDef[] = [
  {
    id: 'iphone15',
    label: 'iPhone 15',
    icon: 'i-lucide-smartphone',
    canvasW: 393,
    canvasH: 852,
    // 12px border on each side → +24; same height
    totalW: 393 + 24,
    totalH: 852 + 24,
    cornerRadius: 52,
  },
  {
    id: 'iphonese',
    label: 'iPhone SE',
    icon: 'i-lucide-smartphone',
    canvasW: 375,
    canvasH: 667,
    // 10px border + 60px top bar + 60px bottom bar → +20 width, +140 height
    totalW: 375 + 20,
    totalH: 667 + 20 + 120, // 10px border × 2 + 60px top + 60px bottom
    cornerRadius: 38,
  },
  {
    id: 'android',
    label: 'Android',
    icon: 'i-lucide-tablet-smartphone',
    canvasW: 412,
    canvasH: 915,
    totalW: 412 + 16,
    totalH: 915 + 16,
    cornerRadius: 44,
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: 'i-lucide-monitor',
    canvasW: 375,
    canvasH: 667,
    totalW: 375,
    totalH: 667,
    cornerRadius: 0,
  },
]

const activeDeviceId = ref<string>('iphone15')
const activeDevice = computed(() => DEVICES.find(d => d.id === activeDeviceId.value) ?? DEVICES[0])

// ─── Scale to fit ─────────────────────────────────────────────────────────

const workspaceRef = ref<HTMLElement | null>(null)
const workspaceW = ref(800)
const workspaceH = ref(700)

const scale = computed(() => {
  // Leave room for the device selector row (~56px) + label (~24px) + padding
  const availH = workspaceH.value - 80 - 40
  const availW = workspaceW.value - 48
  const frameH = activeDevice.value.totalH
  const frameW = activeDevice.value.totalW
  return Math.min(1, Math.min(availW / frameW, availH / frameH))
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!workspaceRef.value) return
  // Plain ResizeObserver — VueUse is not installed
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (entry) {
      workspaceW.value = entry.contentRect.width
      workspaceH.value = entry.contentRect.height
    }
  })
  resizeObserver.observe(workspaceRef.value)
  // Seed with initial size
  workspaceW.value = workspaceRef.value.clientWidth
  workspaceH.value = workspaceRef.value.clientHeight
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>
