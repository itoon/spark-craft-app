<template>
  <!-- height:auto on outer wrapper — non-container elements fill their parent
       wrapper which has an explicit height set by childStyle() in the parent -->
  <div class="w-full h-full">

    <!-- ─── RowContainer / ColContainer ──────────────────────────────────── -->
    <div
      v-if="element.type === 'RowContainer' || element.type === 'ColContainer'"
      class="relative w-full border-2 border-dashed rounded-sm transition-colors duration-100 select-none"
      :class="[
        isSelected
          ? 'border-indigo-500 bg-indigo-500/5'
          : 'border-slate-400/30 hover:border-indigo-400/50',
      ]"
      :style="containerStyle"
      @click.stop="store.selectElement(element.id)"
    >
      <!-- Type badge — visible only when selected -->
      <div
        v-if="isSelected"
        class="absolute -top-5 left-0 z-10 flex items-center gap-1 pointer-events-none"
      >
        <span class="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-mono leading-none">
          {{ element.type }}
        </span>
      </div>

      <!-- Children rendered recursively inside the flex container -->
      <div
        class="flex w-full"
        :class="element.type === 'ColContainer' ? 'flex-col' : 'flex-row items-center'"
        :style="innerFlexStyle"
      >
        <div
          v-for="childId in element.children"
          :key="childId"
          draggable="true"
          class="canvas-element cursor-pointer relative transition-shadow duration-100"
          :class="{
            'ring-2 ring-indigo-400 ring-offset-0': store.selectedElementId.value === childId,
            'ring-2 ring-indigo-300': dragOverChildId === childId && draggingChildId !== childId,
            'opacity-40': draggingChildId === childId,
          }"
          :style="childStyle(childId)"
          @click.stop="store.selectElement(childId)"
          @dragstart="onChildDragStart($event, childId)"
          @dragover.prevent="onChildDragOver($event, childId)"
          @drop.prevent="onChildDrop($event, childId)"
          @dragend="onChildDragEnd"
        >
          <!-- Child type badge when selected -->
          <template v-if="store.selectedElementId.value === childId">
            <div class="absolute -top-5 left-0 z-10 flex items-center gap-1 pointer-events-none">
              <span class="text-[9px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-mono leading-none">
                {{ getElement(childId)?.type }}
              </span>
            </div>
          </template>

          <EditorCanvasElementRenderer
            v-if="getElement(childId)"
            :element="getElement(childId)!"
          />
        </div>

        <!-- Drop hint shown at the end of an empty or selected container -->
        <div
          v-if="element.children.length === 0 || isSelected"
          class="flex items-center justify-center shrink-0 opacity-40"
          :class="element.type === 'ColContainer' ? 'w-full h-6' : 'h-full w-8'"
        >
          <UIcon name="i-lucide-plus" class="size-3 text-slate-400" />
        </div>
      </div>
    </div>

    <!-- ─── Toolbar ──────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Toolbar'"
      class="w-full h-full flex items-center px-3 gap-2 select-none"
      :style="{ backgroundColor: (element.props.backgroundColor as string) || '#6366f1' }"
    >
      <UIcon
        v-if="element.props.showBack"
        name="i-lucide-chevron-left"
        class="size-4 text-white/80 shrink-0"
      />
      <span class="text-white text-xs font-semibold truncate flex-1">
        {{ (element.props.title as string) || 'My App' }}
      </span>
    </div>

    <!-- ─── Button ───────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Button'"
      class="w-full h-full flex items-center justify-center text-white text-xs font-semibold select-none"
      :style="{
        backgroundColor: (element.props.backgroundColor as string) || '#6366f1',
        borderRadius: `${element.props.borderRadius ?? 6}px`,
      }"
    >
      {{ (element.props.label as string) || 'Button' }}
    </div>

    <!-- ─── FloatingActionButton ─────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'FloatingActionButton'"
      class="w-full h-full flex items-center justify-center select-none shadow-lg"
      :style="{
        backgroundColor: (element.props.backgroundColor as string) || '#6366f1',
        borderRadius: `${element.props.borderRadius ?? 28}px`,
      }"
    >
      <UIcon
        :name="(element.props.icon as string) || 'i-lucide-plus'"
        class="size-5 text-white"
      />
    </div>

    <!-- ─── LabelledInput ────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'LabelledInput'"
      class="w-full h-full flex flex-col justify-center gap-1 select-none"
    >
      <span class="text-[10px] font-medium text-gray-600 leading-none px-0.5">
        {{ (element.props.label as string) || 'Label' }}
      </span>
      <div class="flex-1 border border-gray-300 bg-white rounded px-2 flex items-center">
        <span class="text-[11px] text-gray-400 truncate">
          {{ (element.props.placeholder as string) || 'Enter value' }}
        </span>
      </div>
    </div>

    <!-- ─── Input ────────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Input'"
      class="w-full h-full flex items-center px-2 border border-gray-300 bg-white select-none"
      :style="{ borderRadius: `${element.props.borderRadius ?? 4}px` }"
    >
      <span class="text-[11px] text-gray-400 truncate">
        {{ (element.props.placeholder as string) || 'Enter text…' }}
      </span>
    </div>

    <!-- ─── RangeInput ───────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'RangeInput'"
      class="w-full h-full flex flex-col justify-center gap-1 px-1 select-none"
    >
      <div class="relative h-2 bg-gray-200 rounded-full">
        <div
          class="absolute left-0 top-0 h-full bg-indigo-500 rounded-full"
          :style="{ width: `${rangePercent}%` }"
        />
        <div
          class="absolute top-1/2 -translate-y-1/2 size-3.5 bg-white border-2 border-indigo-500 rounded-full shadow"
          :style="{ left: `calc(${rangePercent}% - 7px)` }"
        />
      </div>
      <div class="flex justify-between text-[9px] text-gray-400 font-mono">
        <span>{{ element.props.min ?? 0 }}</span>
        <span>{{ element.props.value ?? 50 }}</span>
        <span>{{ element.props.max ?? 100 }}</span>
      </div>
    </div>

    <!-- ─── DateTimePicker ───────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'DateTimePicker'"
      class="w-full h-full flex items-center px-2 gap-2 border border-gray-300 bg-white rounded select-none"
    >
      <span class="text-[11px] text-gray-400 flex-1 truncate">
        {{ (element.props.placeholder as string) || 'Select date' }}
      </span>
      <UIcon name="i-lucide-calendar" class="size-3.5 text-gray-400 shrink-0" />
    </div>

    <!-- ─── Checkbox ─────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Checkbox'"
      class="w-full h-full flex items-center gap-2 select-none"
    >
      <div
        class="size-4 border-2 rounded flex items-center justify-center shrink-0"
        :class="element.props.checked ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-400'"
      >
        <UIcon v-if="element.props.checked" name="i-lucide-check" class="size-3 text-white" />
      </div>
      <span class="text-xs text-gray-700 truncate">
        {{ (element.props.label as string) || 'Checkbox' }}
      </span>
    </div>

    <!-- ─── RadioButton ──────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'RadioButton'"
      class="w-full h-full flex items-center gap-2 select-none"
    >
      <div
        class="size-4 border-2 rounded-full flex items-center justify-center shrink-0"
        :class="element.props.selected ? 'border-indigo-500' : 'border-gray-400'"
      >
        <div v-if="element.props.selected" class="size-2 bg-indigo-500 rounded-full" />
      </div>
      <span class="text-xs text-gray-700 truncate">
        {{ (element.props.label as string) || 'Option' }}
      </span>
    </div>

    <!-- ─── Toggle ───────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Toggle'"
      class="w-full h-full flex items-center gap-2 select-none"
    >
      <div
        class="relative w-9 h-5 rounded-full transition-colors duration-150 shrink-0"
        :class="element.props.on ? 'bg-indigo-500' : 'bg-gray-300'"
      >
        <div
          class="absolute top-0.5 size-4 bg-white rounded-full shadow transition-transform duration-150"
          :class="element.props.on ? 'translate-x-4' : 'translate-x-0.5'"
        />
      </div>
      <span class="text-xs text-gray-700 truncate">
        {{ (element.props.label as string) || 'Toggle' }}
      </span>
    </div>

    <!-- ─── Select ───────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Select'"
      class="w-full h-full flex items-center px-2 gap-1 border border-gray-300 bg-white rounded select-none"
    >
      <span class="text-[11px] text-gray-400 flex-1 truncate">
        {{ (element.props.placeholder as string) || 'Select…' }}
      </span>
      <UIcon name="i-lucide-chevrons-up-down" class="size-3 text-gray-400 shrink-0" />
    </div>

    <!-- ─── Heading ──────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Heading'"
      class="w-full h-full flex items-center overflow-hidden select-none"
      :style="{
        color: (element.props.color as string) || '#0f172a',
        fontSize: headingFontSize,
        fontWeight: '700',
        lineHeight: '1.1',
      }"
    >
      {{ (element.props.text as string) || 'Heading' }}
    </div>

    <!-- ─── TextBox ──────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'TextBox'"
      class="w-full h-full flex items-center overflow-hidden select-none"
      :style="{
        fontSize: `${element.props.fontSize ?? 14}px`,
        color: (element.props.color as string) || '#334155',
        lineHeight: '1.4',
      }"
    >
      {{ (element.props.content as string) || 'Text block' }}
    </div>

    <!-- ─── Image ────────────────────────────────────────────────────────── -->
    <img
      v-else-if="element.type === 'Image'"
      :src="(element.props.src as string) || 'https://picsum.photos/160/120'"
      :alt="(element.props.alt as string) || 'image'"
      class="w-full h-full object-cover select-none pointer-events-none"
      :style="{ borderRadius: `${element.props.borderRadius ?? 4}px` }"
      loading="lazy"
    />

    <!-- ─── Link ─────────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Link'"
      class="w-full h-full flex items-center overflow-hidden select-none"
    >
      <span
        class="text-xs underline truncate"
        :style="{ color: (element.props.color as string) || '#6366f1' }"
      >
        {{ (element.props.text as string) || 'Click here' }}
      </span>
    </div>

    <!-- ─── Video ────────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Video'"
      class="w-full h-full flex items-center justify-center bg-gray-900 select-none"
      :style="{ borderRadius: `${element.props.borderRadius ?? 4}px` }"
    >
      <div class="flex flex-col items-center gap-1.5">
        <div class="size-8 rounded-full bg-white/20 flex items-center justify-center">
          <UIcon name="i-lucide-play" class="size-4 text-white ml-0.5" />
        </div>
        <span class="text-[9px] text-white/40 font-mono">video</span>
      </div>
    </div>

    <!-- ─── List ─────────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'List'"
      class="w-full h-full bg-white border border-gray-200 rounded overflow-hidden select-none"
      :style="{ backgroundColor: (element.props.backgroundColor as string) || '#ffffff' }"
    >
      <div
        v-for="(item, i) in ((element.props.items as string[]) || ['Item 1', 'Item 2', 'Item 3'])"
        :key="i"
        class="px-2 py-1.5 text-[10px] text-gray-700 border-b border-gray-100 last:border-b-0 flex items-center gap-1.5"
      >
        <div class="size-1.5 rounded-full bg-indigo-400 shrink-0" />
        {{ item }}
      </div>
    </div>

    <!-- ─── Separator ────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Separator'"
      class="w-full h-full flex items-center select-none"
    >
      <div
        class="w-full"
        :style="{
          height: `${element.props.thickness ?? 1}px`,
          backgroundColor: (element.props.color as string) || '#e2e8f0',
        }"
      />
    </div>

    <!-- ─── Spacer ───────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Spacer'"
      class="w-full h-full border border-dashed border-gray-300 flex items-center justify-center select-none"
    >
      <UIcon name="i-lucide-move-vertical" class="size-3 text-gray-300" />
    </div>

    <!-- ─── Icon ─────────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Icon'"
      class="w-full h-full flex items-center justify-center select-none"
    >
      <UIcon
        :name="(element.props.name as string) || 'i-lucide-star'"
        :style="{
          color: (element.props.color as string) || '#6366f1',
          fontSize: `${element.props.size ?? 24}px`,
        }"
        class="size-6"
      />
    </div>

    <!-- ─── Fallback ─────────────────────────────────────────────────────── -->
    <div
      v-else
      class="w-full h-full bg-neutral-200 border border-neutral-300 rounded flex items-center justify-center"
    >
      <span class="text-[10px] text-neutral-500 font-mono">{{ element.type }}</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AppElement } from '~/composables/useEditorStore'
import { useEditorStore } from '~/composables/useEditorStore'

const props = defineProps<{ element: AppElement }>()
const store = useEditorStore()

const isSelected = computed(() => store.selectedElementId.value === props.element.id)

// Look up any child element from the flat store array
function getElement(id: string): AppElement | undefined {
  return store.elements.value.find(e => e.id === id)
}

// Flex container style — applies padding and gap from props
const containerStyle = computed(() => {
  const p = props.element.props
  return {
    padding: `${p.padding ?? 8}px`,
    backgroundColor: (p.backgroundColor as string) || 'transparent',
  }
})

// Inner flex style (gap between children)
const innerFlexStyle = computed(() => {
  const p = props.element.props
  return { gap: `${p.gap ?? 8}px` }
})

// Children always fill the container's cross-axis:
// • ColContainer (flex-col) → each child is full width, explicit height
// • RowContainer (flex-row) → each child stretches equally (flex:1), explicit height
function childStyle(childId: string): Record<string, string> {
  const child = getElement(childId)
  if (!child) return {}
  const isCol = props.element.type === 'ColContainer'
  return {
    ...(isCol ? { width: '100%' } : { flex: '1', minWidth: '0' }),
    height: `${child.height}px`,
  }
}

// Range slider fill percentage
const rangePercent = computed(() => {
  const p = props.element.props
  const min = (p.min as number) ?? 0
  const max = (p.max as number) ?? 100
  const val = (p.value as number) ?? 50
  return Math.round(((val - min) / (max - min)) * 100)
})

// Heading font size scales with the heading level
const headingFontSize = computed(() => {
  const level = (props.element.props.level as number) ?? 1
  const sizes: Record<number, string> = { 1: '22px', 2: '18px', 3: '15px', 4: '13px', 5: '12px', 6: '11px' }
  return sizes[level] ?? '22px'
})

// ── Drag-to-reorder children ──────────────────────────────────────────────

const draggingChildId = ref<string | null>(null)
const dragOverChildId = ref<string | null>(null)

function onChildDragStart(e: DragEvent, childId: string) {
  draggingChildId.value = childId
  e.dataTransfer!.setData('application/codecraft-child', childId)
  e.dataTransfer!.effectAllowed = 'move'
  // Stop the event from bubbling to parent containers so only one drag fires
  e.stopPropagation()
}

function onChildDragOver(e: DragEvent, childId: string) {
  if (draggingChildId.value === childId) return
  dragOverChildId.value = childId
  e.stopPropagation()
}

function onChildDrop(e: DragEvent, targetChildId: string) {
  const sourceId = draggingChildId.value
  if (!sourceId || sourceId === targetChildId) {
    onChildDragEnd()
    return
  }

  const parent = props.element
  const from = parent.children.indexOf(sourceId)
  const to = parent.children.indexOf(targetChildId)
  if (from !== -1 && to !== -1) {
    store.reorderChildren(parent.id, from, to)
  }
  onChildDragEnd()
  e.stopPropagation()
}

function onChildDragEnd() {
  draggingChildId.value = null
  dragOverChildId.value = null
}
</script>
