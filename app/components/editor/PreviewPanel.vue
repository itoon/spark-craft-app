<template>
  <div
    class="preview-panel flex flex-col bg-neutral-900 border-t border-neutral-700 shrink-0 transition-all duration-200"
    :style="{ height: store.isPreviewOpen.value ? '220px' : '36px' }"
  >
    <!-- Panel header / toggle bar -->
    <div class="flex items-center gap-2 px-3 border-b border-neutral-700 h-9 shrink-0">
      <button
        class="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200 transition-colors"
        @click="store.togglePreview()"
      >
        <UIcon
          :name="store.isPreviewOpen.value ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
          class="size-3.5 transition-transform duration-150"
        />
        <span class="text-xs font-medium">Preview</span>
      </button>

      <!-- Tabs — only visible when open -->
      <template v-if="store.isPreviewOpen.value">
        <div class="ml-3 flex items-center gap-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="preview-tab px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors"
            :class="activeTab === tab.key
              ? 'bg-neutral-700 text-neutral-200'
              : 'text-neutral-500 hover:text-neutral-300'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Error count badge -->
        <UBadge
          v-if="activeTab !== 'errors' && errorCount > 0"
          :label="String(errorCount)"
          color="error"
          variant="solid"
          size="xs"
          class="ml-1"
        />
      </template>

      <div class="ml-auto flex items-center gap-2">
        <span v-if="store.isRunning.value" class="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
          <span class="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Running
        </span>
      </div>
    </div>

    <!-- Panel body — only shown when open -->
    <div v-if="store.isPreviewOpen.value" class="flex-1 overflow-hidden">

      <!-- Device Preview tab -->
      <div v-if="activeTab === 'device'" class="h-full flex items-center justify-center gap-8 p-4">
        <!-- Phone frame -->
        <div class="phone-frame relative border-2 border-neutral-600 rounded-2xl overflow-hidden bg-white shadow-lg"
          style="width: 160px; height: 160px;"
        >
          <!-- Notch -->
          <div class="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-neutral-800 rounded-full z-10" />
          <div class="absolute inset-0 flex items-center justify-center bg-neutral-100">
            <div class="text-center space-y-1">
              <UIcon name="i-lucide-play-circle" class="size-6 text-neutral-400 mx-auto" />
              <p class="text-[9px] text-neutral-400 font-medium">Press Run to preview</p>
            </div>
          </div>
        </div>

        <div class="space-y-2 text-xs text-neutral-500">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-smartphone" class="size-3.5" />
            <span>iPhone SE · 375 × 667</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-tablet" class="size-3.5" />
            <span>iPad Mini · 768 × 1024</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-monitor" class="size-3.5" />
            <span>Desktop · 1280 × 800</span>
          </div>
        </div>
      </div>

      <!-- Console tab -->
      <div v-else-if="activeTab === 'console'" class="h-full flex flex-col">
        <div class="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-0.5">
          <div v-if="consoleLogs.length === 0" class="text-neutral-600 italic">
            Console output will appear here when the app is running.
          </div>
          <div v-for="(log, i) in consoleLogs" :key="i" class="flex gap-2">
            <span class="text-neutral-600">›</span>
            <span :class="log.level === 'error' ? 'text-red-400' : 'text-neutral-300'">{{ log.message }}</span>
          </div>
        </div>
        <div class="border-t border-neutral-700 px-3 py-1 flex items-center gap-1.5">
          <span class="text-[10px] text-neutral-600 font-mono">›</span>
          <span class="text-[10px] text-neutral-700 italic">Type commands here (coming soon)</span>
        </div>
      </div>

      <!-- Errors tab -->
      <div v-else-if="activeTab === 'errors'" class="h-full flex items-center justify-center">
        <div class="text-center space-y-1">
          <UIcon name="i-lucide-check-circle-2" class="size-6 text-emerald-500/50 mx-auto" />
          <p class="text-[10px] text-neutral-600">No errors detected</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'

const store = useEditorStore()

type TabKey = 'device' | 'console' | 'errors'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'device', label: 'Device Preview' },
  { key: 'console', label: 'Console' },
  { key: 'errors', label: 'Errors' },
]

const activeTab = ref<TabKey>('device')
const errorCount = ref(0)

// Stub console log entries — real integration would hook into the run runtime
const consoleLogs = ref<Array<{ level: 'log' | 'error'; message: string }>>([])
</script>
