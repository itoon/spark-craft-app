<template>
  <div class="w-full h-full">

    <!-- ─── Container ──────────────────────────────────── -->
    <div
      v-if="element.type === 'Container'"
      class="relative w-full transition-colors duration-100 select-none"
      :class="[
        element.parentId && !props.isRunMode
          ? 'border-2 border-dashed rounded-sm' 
          : '',
        isSelected && !props.isRunMode
          ? 'border-indigo-500 bg-indigo-500/5'
          : element.parentId && !props.isRunMode ? 'border-slate-400/30 hover:border-indigo-400/50' : '',
      ]"
      :style="containerStyle"
      @click.stop="handleElementClick"
    >
      <div v-if="isSelected && !props.isRunMode" class="absolute -top-5 left-0 z-10 flex items-center gap-1 pointer-events-none">
        <span class="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-mono leading-none">{{ element.type }}</span>
      </div>
      <div
        class="flex w-full flex-col"
        :style="innerFlexStyle"
      >
        <div
          v-for="childId in element.children"
          :key="childId"
          :draggable="!props.isRunMode"
          class="canvas-element relative transition-shadow duration-100"
          :class="{
            'ring-2 ring-indigo-400 ring-offset-0': store.selectedElementId.value === childId,
            'ring-2 ring-indigo-300': dragOverChildId === childId && draggingChildId !== childId,
            'opacity-40': draggingChildId === childId,
            'cursor-pointer': !props.isRunMode,
          }"
          :style="childStyle(childId)"
          @click.stop="handleElementClick"
          @dragstart="onChildDragStart($event, childId)"
          @dragover.prevent="onChildDragOver($event, childId)"
          @drop.prevent="onChildDrop($event, childId)"
          @dragend="onChildDragEnd"
        >
          <template v-if="store.selectedElementId.value === childId && !props.isRunMode">
            <div class="absolute -top-5 left-0 z-10 flex items-center gap-1 pointer-events-none">
              <span class="text-[9px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-mono leading-none">{{ getElement(childId)?.type }}</span>
            </div>
          </template>
          <EditorCanvasElementRenderer
            v-if="getElement(childId)"
            :element="getElement(childId)!"
            :is-run-mode="props.isRunMode"
            @run-click="emit('run-click', $event)"
            @run-input="(id, patch) => emit('run-input', id, patch)"
          />
        </div>
        <div
          v-if="!props.isRunMode && element.parentId && (element.children.length === 0 || isSelected)"
          class="flex items-center justify-center shrink-0 opacity-40 w-full h-6"
        >
          <UIcon name="i-lucide-plus" class="size-3 text-slate-400" />
        </div>
      </div>
    </div>

    <!-- ─── Toolbar (ion-header / ion-toolbar) ────────────────────────────
         iOS  : white bg, bold centered title, thin 1px bottom border
         Android: primary color bg, left title, bottom shadow              -->
    <div
      v-else-if="element.type === 'Toolbar'"
      class="w-full h-full flex items-center px-4 gap-2 select-none"
      :style="toolbarStyle"
      @click.stop="handleElementClick"
    >
      <!-- iOS back chevron -->
      <UIcon
        v-if="element.props.showBack && platform === 'ios'"
        name="i-lucide-chevron-left"
        class="size-5 shrink-0"
        :style="{ color: iosToolbarTint }"
      />
      <!-- Android hamburger / back arrow -->
      <UIcon
        v-if="element.props.showBack && platform === 'android'"
        name="i-lucide-arrow-left"
        class="size-5 text-white shrink-0"
      />
      <span
        class="truncate"
        :style="toolbarTitleStyle"
      >
        {{ (element.props.title as string) || 'My App' }}
      </span>
    </div>

    <!-- ─── Card (ion-card) ───────────────────────────────────────────────
         iOS  : rounded-2xl, white, subtle shadow
         Android: rounded-lg, white, md elevation shadow                   -->
    <div
      v-else-if="element.type === 'Card'"
      class="w-full h-full flex flex-col overflow-hidden select-none"
      :style="cardStyle"
      @click.stop="handleElementClick"
    >
      <div class="px-4 pt-3 pb-1">
        <p class="font-semibold text-[13px] text-gray-800 leading-tight">
          {{ (element.props.title as string) || 'Card Title' }}
        </p>
        <p class="text-[11px] text-gray-500 mt-0.5">
          {{ (element.props.subtitle as string) || 'Subtitle' }}
        </p>
      </div>
      <div class="flex-1 bg-gray-50 mx-3 mb-3 rounded" />
    </div>

    <!-- ─── Segment (ion-segment) ─────────────────────────────────────────
         iOS  : pill container, sliding white indicator
         Android: flat tab underline indicator                              -->
    <div
      v-else-if="element.type === 'Segment'"
      class="w-full h-full flex items-center select-none overflow-hidden"
      :style="segmentWrapStyle"
      @click.stop="handleElementClick"
    >
      <div class="flex w-full h-full" :style="segmentInnerStyle">
        <div
          v-for="(opt, idx) in segmentOptions"
          :key="idx"
          class="flex-1 flex items-center justify-center text-[11px] font-semibold relative transition-colors duration-150"
          :style="segmentItemStyle(idx)"
          @click.stop="props.isRunMode ? updateRunProps({ selected: idx }) : handleElementClick()"
        >
          {{ opt }}
          <!-- Android underline indicator -->
          <div
            v-if="platform === 'android' && idx === (element.props.selected as number ?? 0)"
            class="absolute bottom-0 left-1 right-1 h-[2px] rounded-full"
            :style="{ backgroundColor: (element.props.color as string) || '#3880ff' }"
          />
        </div>
      </div>
    </div>

    <!-- ─── Button (ion-button) ───────────────────────────────────────────
         iOS  : rounded-full, ghost/solid, colored text or filled
         Android: rounded-md, contained Material button                    -->
    <div
      v-else-if="element.type === 'Button'"
      class="w-full h-full flex items-center justify-center text-[13px] font-semibold select-none"
      :style="buttonStyle"
      @click.stop="handleElementClick"
      :role="props.isRunMode ? 'button' : undefined"
      :tabindex="props.isRunMode ? 0 : undefined"
    >
      {{ (element.props.label as string) || 'Button' }}
    </div>

    <!-- ─── FloatingActionButton (ion-fab) ───────────────────────────────
         iOS  : circle, primary color, soft shadow
         Android: circle, primary color, Material elevation                -->
    <div
      v-else-if="element.type === 'FloatingActionButton'"
      class="w-full h-full flex items-center justify-center select-none"
      :style="fabStyle"
      @click.stop="handleElementClick"
    >
      <UIcon :name="(element.props.icon as string) || 'i-lucide-plus'" class="size-5 text-white" />
    </div>

    <!-- ─── Searchbar (ion-searchbar) ────────────────────────────────────
         iOS  : rounded-xl bg, no border, magnifier inside
         Android: rounded-sm, subtle bg, magnifier + mic icon              -->
    <div
      v-else-if="element.type === 'Searchbar'"
      class="w-full h-full flex items-center gap-2 px-3"
      :style="searchbarStyle"
      @click.stop="handleElementClick"
    >
      <UIcon name="i-lucide-search" class="size-3.5 text-gray-400 shrink-0" />
      <input
        v-if="props.isRunMode"
        class="flex-1 bg-transparent text-[12px] text-gray-700 outline-none"
        type="search"
        :value="(element.props.value as string) || ''"
        :placeholder="(element.props.placeholder as string) || 'Search'"
        @click.stop
        @input="handleTextInput($event)"
      />
      <span v-else class="text-[12px] text-gray-400 flex-1 truncate">
        {{ (element.props.placeholder as string) || 'Search' }}
      </span>
      <UIcon v-if="platform === 'android'" name="i-lucide-mic" class="size-3.5 text-gray-400 shrink-0" />
    </div>

    <!-- ─── LabelledInput ────────────────────────────────────────────────
         iOS  : rounded outline border, floating label
         Android: underline + floating label (Material)                    -->
    <div
      v-else-if="element.type === 'LabelledInput'"
      class="w-full h-full flex flex-col justify-center"
      :style="labelledInputWrapStyle"
      @click.stop="handleElementClick"
    >
      <span class="text-[10px] font-medium leading-none mb-1" :style="{ color: ionColor }">
        {{ (element.props.label as string) || 'Label' }}
      </span>
      <div class="flex-1 flex items-center px-2" :style="labelledInputFieldStyle">
        <input
          v-if="props.isRunMode"
          class="w-full bg-transparent text-[12px] text-gray-700 outline-none"
          type="text"
          :value="(element.props.value as string) || ''"
          :placeholder="(element.props.placeholder as string) || 'Enter value'"
          @click.stop
          @input="handleTextInput($event)"
        />
        <span v-else class="text-[12px] text-gray-400 truncate">
          {{ inputDisplayValue((element.props.value as string) || '', (element.props.placeholder as string) || 'Enter value') }}
        </span>
      </div>
    </div>

    <!-- ─── Input (ion-input) ─────────────────────────────────────────────
         iOS  : rounded rect border
         Android: bottom-border only (Material underline)                  -->
    <div
      v-else-if="element.type === 'Input'"
      class="w-full h-full flex items-center px-3"
      :style="inputStyle"
      @click.stop="handleElementClick"
    >
      <input
        v-if="props.isRunMode"
        class="w-full bg-transparent text-[12px] text-gray-700 outline-none"
        type="text"
        :value="(element.props.value as string) || ''"
        :placeholder="(element.props.placeholder as string) || 'Enter text...'"
        @click.stop
        @input="handleTextInput($event)"
      />
      <span v-else class="text-[12px] text-gray-400 truncate">
        {{ inputDisplayValue((element.props.value as string) || '', (element.props.placeholder as string) || 'Enter text...') }}
      </span>
    </div>

    <!-- ─── RangeInput (ion-range) ────────────────────────────────────────
         iOS  : rounded track, iOS pill thumb
         Android: rectangular track ends, Material thumb                   -->
    <div
      v-else-if="element.type === 'RangeInput'"
      class="w-full h-full flex flex-col justify-center gap-1 px-2"
      @click.stop="handleElementClick"
    >
      <input
        v-if="props.isRunMode"
        class="w-full"
        type="range"
        :min="element.props.min ?? 0"
        :max="element.props.max ?? 100"
        :value="element.props.value ?? 50"
        @click.stop
        @input="handleRangeInput($event)"
      />
      <div class="relative h-1.5 rounded-full" :style="{ backgroundColor: '#e5e7eb' }">
        <div class="absolute left-0 top-0 h-full rounded-full" :style="{ width: `${rangePercent}%`, backgroundColor: ionColor }" />
        <div
          class="absolute top-1/2 -translate-y-1/2 shadow"
          :style="rangeThumbStyle"
        />
      </div>
      <div class="flex justify-between text-[9px] font-mono" :style="{ color: ionColor }">
        <span>{{ element.props.min ?? 0 }}</span>
        <span>{{ element.props.max ?? 100 }}</span>
      </div>
    </div>

    <!-- ─── DateTimePicker (ion-datetime) ────────────────────────────────
         iOS  : wheel-style hint, rounded rect
         Android: text field style                                         -->
    <div
      v-else-if="element.type === 'DateTimePicker'"
      class="w-full h-full flex items-center px-3 gap-2"
      :style="inputStyle"
      @click.stop="handleElementClick"
    >
      <input
        v-if="props.isRunMode"
        class="flex-1 bg-transparent text-[12px] text-gray-700 outline-none"
        type="date"
        :value="(element.props.value as string) || ''"
        @click.stop
        @input="handleTextInput($event)"
      />
      <span v-else class="text-[12px] text-gray-400 flex-1 truncate">
        {{ (element.props.placeholder as string) || 'Select date' }}
      </span>
      <UIcon
        :name="platform === 'ios' ? 'i-lucide-chevrons-up-down' : 'i-lucide-calendar'"
        class="size-3.5 text-gray-400 shrink-0"
      />
    </div>

    <!-- ─── Checkbox (ion-checkbox) ───────────────────────────────────────
         iOS  : rounded-sm with checkmark, indigo fill
         Android: rounded-sm, Material style                               -->
    <div
      v-else-if="element.type === 'Checkbox'"
      class="w-full h-full flex items-center gap-2"
      @click.stop="props.isRunMode ? toggleBooleanProp('checked') : handleElementClick()"
    >
      <div
        class="shrink-0 flex items-center justify-center"
        :style="checkboxBoxStyle"
      >
        <UIcon v-if="element.props.checked" name="i-lucide-check" class="size-3 text-white" />
      </div>
      <span class="text-[12px] text-gray-700 truncate">{{ (element.props.label as string) || 'Checkbox' }}</span>
    </div>

    <!-- ─── RadioButton (ion-radio) ───────────────────────────────────────
         iOS  : checkmark style (filled circle with inner check)
         Android: outer ring + filled inner circle                         -->
    <div
      v-else-if="element.type === 'RadioButton'"
      class="w-full h-full flex items-center gap-2"
      @click.stop="props.isRunMode ? updateRunProps({ selected: true }) : handleElementClick()"
    >
      <!-- iOS: checkmark inside circle -->
      <div
        v-if="platform === 'ios'"
        class="size-4 rounded-full border-2 flex items-center justify-center shrink-0"
        :style="radioIosStyle"
      >
        <UIcon v-if="element.props.selected" name="i-lucide-check" class="size-2.5" :style="{ color: ionColor }" />
      </div>
      <!-- Android: outer ring + inner dot -->
      <div v-else class="size-4 rounded-full border-2 flex items-center justify-center shrink-0" :style="radioAndroidOuterStyle">
        <div v-if="element.props.selected" class="size-2 rounded-full" :style="{ backgroundColor: ionColor }" />
      </div>
      <span class="text-[12px] text-gray-700 truncate">{{ (element.props.label as string) || 'Option' }}</span>
    </div>

    <!-- ─── Toggle (ion-toggle) ───────────────────────────────────────────
         iOS  : wide pill, green when on
         Android: narrower track, colored when on                          -->
    <div
      v-else-if="element.type === 'Toggle'"
      class="w-full h-full flex items-center gap-2"
      @click.stop="props.isRunMode ? toggleBooleanProp('on') : handleElementClick()"
    >
      <div class="relative shrink-0 rounded-full transition-colors duration-150" :style="toggleTrackStyle">
        <div class="absolute top-1/2 -translate-y-1/2 bg-white rounded-full shadow transition-transform duration-150" :style="toggleThumbStyle" />
      </div>
      <span class="text-[12px] text-gray-700 truncate">{{ (element.props.label as string) || 'Toggle' }}</span>
    </div>

    <!-- ─── Select (ion-select) ───────────────────────────────────────────
         iOS  : right-aligned value + chevrons
         Android: underline field + dropdown arrow                         -->
    <div
      v-else-if="element.type === 'Select'"
      class="w-full h-full flex items-center px-3 gap-1"
      :style="inputStyle"
      @click.stop="handleElementClick"
    >
      <select
        v-if="props.isRunMode"
        class="flex-1 bg-transparent text-[12px] text-gray-700 outline-none"
        :value="(element.props.value as string) || ''"
        @click.stop
        @change="handleTextInput($event)"
      >
        <option value="" disabled>{{ (element.props.placeholder as string) || 'Select...' }}</option>
        <option
          v-for="(opt, idx) in ((element.props.options as string[]) || ['Option 1', 'Option 2'])"
          :key="idx"
          :value="opt"
        >
          {{ opt }}
        </option>
      </select>
      <span v-else class="text-[12px] text-gray-400 flex-1 truncate">{{ (element.props.placeholder as string) || 'Select...' }}</span>
      <UIcon
        :name="platform === 'ios' ? 'i-lucide-chevrons-up-down' : 'i-lucide-chevron-down'"
        class="size-3.5 text-gray-400 shrink-0"
      />
    </div>

    <!-- ─── Badge (ion-badge) ─────────────────────────────────────────────
         iOS  : pill shape, bold text
         Android: pill, slightly smaller padding                           -->
    <div
      v-else-if="element.type === 'Badge'"
      class="w-full h-full flex items-center justify-center select-none"
      @click.stop="handleElementClick"
    >
      <span
        class="text-white text-[10px] font-bold px-2 py-0.5"
        :style="badgeStyle"
      >
        {{ (element.props.text as string) || 'New' }}
      </span>
    </div>

    <!-- ─── Chip (ion-chip) ───────────────────────────────────────────────
         iOS  : rounded-full pill, colored border/fill
         Android: rounded-lg, outlined or filled                           -->
    <div
      v-else-if="element.type === 'Chip'"
      class="w-full h-full flex items-center justify-center select-none"
      @click.stop="handleElementClick"
    >
      <span
        class="text-[11px] font-medium px-3 py-1"
        :style="chipStyle"
      >
        {{ (element.props.label as string) || 'Chip' }}
      </span>
    </div>

    <!-- ─── Spinner (ion-spinner) ─────────────────────────────────────────
         iOS  : iOS activity spinner (lines)
         Android: Material circular progress                                -->
    <div
      v-else-if="element.type === 'Spinner'"
      class="w-full h-full flex items-center justify-center select-none"
      @click.stop="handleElementClick"
    >
      <UIcon
        :name="platform === 'ios' ? 'i-lucide-loader' : 'i-lucide-refresh-cw'"
        class="size-6 animate-spin"
        :style="{ color: ionColor }"
      />
    </div>

    <!-- ─── Heading ──────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Heading'"
      class="w-full h-full flex items-center overflow-hidden select-none"
      @click.stop="handleElementClick"
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
      @click.stop="handleElementClick"
      :style="{
        fontSize: `${element.props.fontSize ?? 14}px`,
        color: (element.props.color as string) || '#334155',
        lineHeight: '1.4',
      }"
    >
      {{ (element.props.content as string) || 'Text block' }}
    </div>

    <!-- ─── List (ion-list / ion-item) ───────────────────────────────────
         iOS  : inset rounded card, inner separators
         Android: flat full-width list, dividers                           -->
    <div
      v-else-if="element.type === 'List'"
      class="w-full h-full overflow-hidden select-none"
      :style="listWrapStyle"
      @click.stop="handleElementClick"
    >
      <div
        v-for="(item, i) in ((element.props.items as string[]) || ['Item 1', 'Item 2', 'Item 3'])"
        :key="i"
        class="flex items-center gap-2 px-4"
        :style="listItemStyle(i)"
        @click.stop="handleElementClick"
      >
        <div class="size-1.5 rounded-full shrink-0" :style="{ backgroundColor: ionColor }" />
        <span class="text-[12px] text-gray-700 flex-1 truncate">{{ item }}</span>
        <UIcon name="i-lucide-chevron-right" class="size-3 text-gray-400 shrink-0" />
      </div>
    </div>

    <!-- ─── Image ────────────────────────────────────────────────────────── -->
    <img
      v-else-if="element.type === 'Image'"
      :src="(element.props.src as string) || 'https://picsum.photos/160/120'"
      alt="image"
      class="w-full h-full object-cover select-none cursor-pointer"
      :style="{ borderRadius: `${element.props.borderRadius ?? 4}px` }"
      loading="lazy"
      @click.stop="handleElementClick"
    />

    <!-- ─── Link ─────────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Link'"
      class="w-full h-full flex items-center overflow-hidden select-none"
      @click.stop="handleElementClick"
    >
      <span class="text-[12px] underline truncate" :style="{ color: (element.props.color as string) || ionColor }">
        {{ (element.props.text as string) || 'Click here' }}
      </span>
    </div>

    <!-- ─── Video ────────────────────────────────────────────────────────── -->
    <div
      v-else-if="element.type === 'Video'"
      class="w-full h-full flex items-center justify-center bg-gray-900 select-none"
      :style="{ borderRadius: `${element.props.borderRadius ?? 4}px` }"
      @click.stop="handleElementClick"
    >
      <div class="flex flex-col items-center gap-1.5">
        <div class="size-8 rounded-full bg-white/20 flex items-center justify-center">
          <UIcon name="i-lucide-play" class="size-4 text-white ml-0.5" />
        </div>
        <span class="text-[9px] text-white/40 font-mono">video</span>
      </div>
    </div>

    <!-- ─── Separator ────────────────────────────────────────────────────── -->
    <div v-else-if="element.type === 'Separator'" class="w-full h-full flex items-center select-none">
      <div class="w-full" :style="{ height: `${element.props.thickness ?? 1}px`, backgroundColor: (element.props.color as string) || '#e2e8f0' }" />
    </div>

    <!-- ─── Spacer ───────────────────────────────────────────────────────── -->
    <div v-else-if="element.type === 'Spacer'" class="w-full h-full border border-dashed border-gray-300 flex items-center justify-center select-none">
      <UIcon name="i-lucide-move-vertical" class="size-3 text-gray-300" />
    </div>

    <!-- ─── Icon ─────────────────────────────────────────────────────────── -->
    <div v-else-if="element.type === 'Icon'" class="w-full h-full flex items-center justify-center select-none">
      <UIcon
        :name="(element.props.name as string) || 'i-lucide-star'"
        :style="{ color: (element.props.color as string) || ionColor, fontSize: `${element.props.size ?? 24}px` }"
        class="size-6"
      />
    </div>

    <!-- ─── Fallback ─────────────────────────────────────────────────────── -->
    <div v-else class="w-full h-full bg-neutral-200 border border-neutral-300 rounded flex items-center justify-center">
      <span class="text-[10px] text-neutral-500 font-mono">{{ element.type }}</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AppElement } from '~/composables/useEditorStore'
import { useEditorStore } from '~/composables/useEditorStore'

const props = defineProps<{ 
  element: AppElement,
  isRunMode?: boolean
}>()
const emit = defineEmits<{
  (e: 'run-click', id: string): void
  (e: 'run-input', id: string, propsPatch: Record<string, unknown>): void
}>()
const store = useEditorStore()

const isSelected = computed(() => store.selectedElementId.value === props.element.id)
const platform = computed(() => store.activePlatform.value)

// ── Run Mode Click Handling ──────────────────────────────────────────────

function handleElementClick() {
  if (props.isRunMode) {
    emit('run-click', props.element.id)
  } else {
    store.selectElement(props.element.id)
  }
}

function updateRunProps(propsPatch: Record<string, unknown>) {
  if (!props.isRunMode) return
  emit('run-input', props.element.id, propsPatch)
}

function handleTextInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement
  updateRunProps({ value: target.value })
}

function handleRangeInput(event: Event) {
  const target = event.target as HTMLInputElement
  updateRunProps({ value: Number(target.value) })
}

function toggleBooleanProp(propName: string) {
  updateRunProps({ [propName]: !props.element.props[propName] })
}

function inputDisplayValue(value: string, placeholder: string) {
  return value.trim() ? value : placeholder
}

// Ionic primary color
const ionColor = computed(() => (props.element.props.color as string) || '#3880ff')

// ── Toolbar ───────────────────────────────────────────────────────────────
const iosToolbarTint = '#3880ff'

const toolbarStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || '#3880ff'
  if (platform.value === 'ios') {
    return {
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
      justifyContent: 'center',
    }
  }
  return {
    backgroundColor: bg,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  }
})

const toolbarTitleStyle = computed(() => {
  if (platform.value === 'ios') {
    return { fontWeight: '700', fontSize: '17px', color: '#000000', flex: '1', textAlign: 'center' as const }
  }
  return { fontWeight: '500', fontSize: '20px', color: '#ffffff', flex: '1', textAlign: 'left' as const }
})

// ── Card ──────────────────────────────────────────────────────────────────
const cardStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || '#ffffff'
  if (platform.value === 'ios') {
    return { backgroundColor: bg, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }
  }
  return { backgroundColor: bg, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
})

// ── Segment ───────────────────────────────────────────────────────────────
const segmentOptions = computed(() =>
  (props.element.props.options as string[]) || ['Tab 1', 'Tab 2', 'Tab 3']
)

const segmentWrapStyle = computed(() => {
  const color = (props.element.props.color as string) || '#3880ff'
  if (platform.value === 'ios') {
    return { backgroundColor: '#f0f0f0', borderRadius: '10px', padding: '2px' }
  }
  return { backgroundColor: '#ffffff', borderBottom: `2px solid #e5e7eb` }
})

const segmentInnerStyle = computed(() => {
  if (platform.value === 'ios') return {}
  return {}
})

function segmentItemStyle(idx: number) {
  const color = (props.element.props.color as string) || '#3880ff'
  const selected = (props.element.props.selected as number) ?? 0
  if (platform.value === 'ios') {
    return idx === selected
      ? { backgroundColor: '#ffffff', borderRadius: '8px', color: '#000000', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', height: '100%' }
      : { color: '#888888' }
  }
  // Android: colored text for active tab, gray for inactive
  return idx === selected
    ? { color: color, borderBottom: `2px solid ${color}`, marginBottom: '-2px' }
    : { color: '#888888' }
}

// ── Button ────────────────────────────────────────────────────────────────
const buttonStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || '#3880ff'
  if (platform.value === 'ios') {
    return {
      backgroundColor: bg,
      borderRadius: '12px',
      color: '#ffffff',
      letterSpacing: '0.01em',
    }
  }
  // Android: Material contained
  return {
    backgroundColor: bg,
    borderRadius: '6px',
    color: '#ffffff',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  }
})

// ── FAB ───────────────────────────────────────────────────────────────────
const fabStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || '#3880ff'
  return {
    backgroundColor: bg,
    borderRadius: '50%',
    boxShadow: platform.value === 'ios'
      ? '0 4px 14px rgba(0,0,0,0.15)'
      : '0 6px 10px rgba(0,0,0,0.25)',
  }
})

// ── Searchbar ─────────────────────────────────────────────────────────────
const searchbarStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || '#f4f5f8'
  if (platform.value === 'ios') {
    return { backgroundColor: bg, borderRadius: '12px' }
  }
  return { backgroundColor: bg, borderRadius: '4px' }
})

// ── Input / LabelledInput ─────────────────────────────────────────────────
const inputStyle = computed(() => {
  if (platform.value === 'ios') {
    return {
      backgroundColor: '#ffffff',
      border: '1px solid #d1d5db',
      borderRadius: '10px',
    }
  }
  // Android: only bottom border
  return {
    backgroundColor: 'transparent',
    borderBottom: `2px solid #9ca3af`,
  }
})

const labelledInputWrapStyle = computed(() => {
  if (platform.value === 'ios') {
    return { padding: '0 8px' }
  }
  return { padding: '0 8px' }
})

const labelledInputFieldStyle = computed(() => {
  if (platform.value === 'ios') {
    return { border: '1px solid #d1d5db', borderRadius: '10px', backgroundColor: '#ffffff' }
  }
  return { borderBottom: `2px solid ${ionColor.value}`, backgroundColor: 'transparent' }
})

// ── Range ─────────────────────────────────────────────────────────────────
const rangePercent = computed(() => {
  const p = props.element.props
  const min = (p.min as number) ?? 0
  const max = (p.max as number) ?? 100
  const val = (p.value as number) ?? 50
  return Math.round(((val - min) / (max - min)) * 100)
})

const rangeThumbStyle = computed(() => {
  const color = ionColor.value
  const base = {
    left: `calc(${rangePercent.value}% - 10px)`,
    backgroundColor: '#ffffff',
    border: `2px solid ${color}`,
  }
  if (platform.value === 'ios') {
    return { ...base, width: '20px', height: '20px', borderRadius: '50%', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }
  }
  return { ...base, width: '16px', height: '16px', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
})

// ── Checkbox ──────────────────────────────────────────────────────────────
const checkboxBoxStyle = computed(() => {
  const color = ionColor.value
  if (platform.value === 'ios') {
    return {
      width: '20px', height: '20px',
      borderRadius: '6px',
      border: `2px solid ${props.element.props.checked ? color : '#9ca3af'}`,
      backgroundColor: props.element.props.checked ? color : '#ffffff',
    }
  }
  return {
    width: '18px', height: '18px',
    borderRadius: '3px',
    border: `2px solid ${props.element.props.checked ? color : '#9ca3af'}`,
    backgroundColor: props.element.props.checked ? color : '#ffffff',
  }
})

// ── Radio ─────────────────────────────────────────────────────────────────
const radioIosStyle = computed(() => {
  const color = ionColor.value
  return {
    borderColor: props.element.props.selected ? color : '#9ca3af',
    backgroundColor: '#ffffff',
  }
})

const radioAndroidOuterStyle = computed(() => {
  const color = ionColor.value
  return { borderColor: props.element.props.selected ? color : '#9ca3af' }
})

// ── Toggle ────────────────────────────────────────────────────────────────
const toggleTrackStyle = computed(() => {
  const color = ionColor.value
  if (platform.value === 'ios') {
    return {
      width: '51px', height: '31px',
      backgroundColor: props.element.props.on ? '#34c759' : '#e5e7eb',
      transition: 'background-color 0.2s',
    }
  }
  return {
    width: '36px', height: '20px',
    backgroundColor: props.element.props.on ? color + '80' : '#9ca3af',
    transition: 'background-color 0.2s',
  }
})

const toggleThumbStyle = computed(() => {
  if (platform.value === 'ios') {
    return {
      width: '27px', height: '27px',
      left: '2px',
      transform: props.element.props.on ? 'translateX(20px) translateY(-50%)' : 'translateX(0) translateY(-50%)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      transition: 'transform 0.2s',
    }
  }
  const color = ionColor.value
  return {
    width: '18px', height: '18px',
    left: '1px',
    backgroundColor: props.element.props.on ? color : '#f3f4f6',
    transform: props.element.props.on ? 'translateX(16px) translateY(-50%)' : 'translateX(0) translateY(-50%)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s, background-color 0.2s',
  }
})

// ── Badge ─────────────────────────────────────────────────────────────────
const badgeStyle = computed(() => {
  const color = (props.element.props.color as string) || '#3880ff'
  return {
    backgroundColor: color,
    borderRadius: platform.value === 'ios' ? '20px' : '12px',
  }
})

// ── Chip ──────────────────────────────────────────────────────────────────
const chipStyle = computed(() => {
  const color = (props.element.props.color as string) || '#3880ff'
  const outline = props.element.props.outline as boolean
  if (platform.value === 'ios') {
    return {
      borderRadius: '16px',
      backgroundColor: outline ? 'transparent' : color + '20',
      border: `1.5px solid ${color}`,
      color: color,
    }
  }
  return {
    borderRadius: '8px',
    backgroundColor: outline ? 'transparent' : color + '15',
    border: `1.5px solid ${color}`,
    color: color,
  }
})

// ── List ──────────────────────────────────────────────────────────────────
const listWrapStyle = computed(() => {
  if (platform.value === 'ios') {
    return { backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }
  }
  return { backgroundColor: '#ffffff' }
})

function listItemStyle(idx: number) {
  const items = (props.element.props.items as string[]) || []
  const isLast = idx === items.length - 1
  const base = {
    height: '44px',
    borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
  }
  if (platform.value === 'ios') {
    return { ...base, paddingLeft: '16px' }
  }
  return base
}

// ── Heading font size ─────────────────────────────────────────────────────
const headingFontSize = computed(() => {
  const level = (props.element.props.level as number) ?? 1
  const sizes: Record<number, string> = { 1: '22px', 2: '18px', 3: '15px', 4: '13px', 5: '12px', 6: '11px' }
  return sizes[level] ?? '22px'
})

// ── Container helpers ─────────────────────────────────────────────────────
const containerStyle = computed(() => {
  const p = props.element.props
  return {
    padding: `${p.padding ?? 8}px`,
    backgroundColor: (p.backgroundColor as string) || 'transparent',
  }
})
const innerFlexStyle = computed(() => {
  const p = props.element.props
  return { gap: `${p.gap ?? 8}px` }
})

function childStyle(childId: string): Record<string, string> {
  const child = getElement(childId)
  if (!child) return {}
  const type = props.element.type
  const isCol = type === 'Container' || type === 'ColContainer'
  return {
    ...(isCol ? { width: '100%' } : { flex: '1', minWidth: '0' }),
    height: `${child.height}px`,
  }
}

function getElement(id: string): AppElement | undefined {
  return store.elements.value.find(e => e.id === id)
}

// ── Drag-to-reorder children ──────────────────────────────────────────────
const draggingChildId = ref<string | null>(null)
const dragOverChildId = ref<string | null>(null)

function onChildDragStart(e: DragEvent, childId: string) {
  if (props.isRunMode) return
  draggingChildId.value = childId
  e.dataTransfer!.setData('application/codecraft-child', childId)
  e.dataTransfer!.effectAllowed = 'move'
  e.stopPropagation()
}
function onChildDragOver(e: DragEvent, childId: string) {
  if (props.isRunMode) return
  if (draggingChildId.value === childId) return
  dragOverChildId.value = childId
  e.stopPropagation()
}
function onChildDrop(e: DragEvent, targetChildId: string) {
  if (props.isRunMode) return
  const sourceId = draggingChildId.value
  if (!sourceId || sourceId === targetChildId) { onChildDragEnd(); return }
  const parent = props.element
  const from = parent.children.indexOf(sourceId)
  const to = parent.children.indexOf(targetChildId)
  if (from !== -1 && to !== -1) store.reorderChildren(parent.id, from, to)
  onChildDragEnd()
  e.stopPropagation()
}
function onChildDragEnd() {
  draggingChildId.value = null
  dragOverChildId.value = null
}
</script>
