<template>
  <aside class="flex flex-col h-full bg-white border-l border-neutral-200 w-80 shrink-0 overflow-hidden">
    <!-- Panel header -->
    <div class="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-200 shrink-0">
      <UIcon name="i-lucide-sliders-horizontal" class="text-neutral-400 size-3.5" />
      <span class="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Properties</span>
      <template v-if="selectedElement">
        <div class="ml-auto">
          <UBadge
            :label="selectedElement.type"
            color="primary"
            variant="subtle"
            size="xs"
          />
        </div>
      </template>
    </div>

    <!-- Empty state: nothing selected -->
    <div
      v-if="!selectedElement"
      class="flex-1 flex flex-col items-center justify-center gap-3 p-6"
    >
      <div class="size-10 rounded-full bg-neutral-100 flex items-center justify-center">
        <UIcon name="i-lucide-mouse-pointer" class="text-neutral-400 size-5" />
      </div>
      <p class="text-xs text-neutral-400 text-center leading-relaxed">Select an element<br />to edit properties</p>
    </div>

    <!-- Properties form when element is selected -->
    <div v-else class="flex-1 overflow-y-auto">

      <!-- ── Container layout section (only for RowContainer / ColContainer) ── -->
      <EditorPropertiesSection
        v-if="isContainerType"
        title="Layout"
        icon="i-lucide-layout-dashboard"
      >
        <div class="space-y-3">
          <!-- Direction toggle -->
          <EditorPropField label="Direction">
            <div class="flex gap-1">
              <button
                class="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors duration-100"
                :class="selectedElement.direction === 'row'
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:border-indigo-300'"
                @click="setDirection('row')"
              >
                <UIcon name="i-lucide-arrow-right" class="size-3" />
                Row
              </button>
              <button
                class="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors duration-100"
                :class="selectedElement.direction === 'col'
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:border-indigo-300'"
                @click="setDirection('col')"
              >
                <UIcon name="i-lucide-arrow-down" class="size-3" />
                Col
              </button>
            </div>
          </EditorPropField>

          <!-- Gap -->
          <EditorPropField label="Gap">
            <UInput
              :model-value="(selectedElement.props.gap as number) ?? 8"
              type="number"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ gap: Number(v) })"
            />
          </EditorPropField>

          <!-- Padding -->
          <EditorPropField label="Padding">
            <UInput
              :model-value="(selectedElement.props.padding as number) ?? 8"
              type="number"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ padding: Number(v) })"
            />
          </EditorPropField>

          <!-- Container background color swatches -->
          <EditorPropField label="Background">
            <div class="grid grid-cols-7 gap-1 mt-1">
              <button
                v-for="color in PRESET_COLORS"
                :key="color.value"
                class="size-7 rounded-lg border-2 transition-all duration-100 shrink-0"
                :class="[
                  color.value === 'transparent'
                    ? 'bg-white checkerboard'
                    : '',
                  (selectedElement.props.backgroundColor as string) === color.value
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-300'
                    : 'border-neutral-200 hover:border-indigo-300',
                ]"
                :style="color.value !== 'transparent' ? { backgroundColor: color.value } : {}"
                :title="color.label"
                @click="patchProps({ backgroundColor: color.value })"
              />
            </div>
          </EditorPropField>
        </div>
      </EditorPropertiesSection>

      <!-- ── Style section (non-container elements) ── -->
      <EditorPropertiesSection
        v-if="!isContainerType"
        title="Style"
        icon="i-lucide-palette"
      >
        <div class="space-y-3">
          <!-- Background color swatches -->
          <EditorPropField
            v-if="hasProp('backgroundColor')"
            label="Background"
          >
            <div class="grid grid-cols-7 gap-1 mt-1">
              <button
                v-for="color in PRESET_COLORS"
                :key="color.value"
                class="size-7 rounded-lg border-2 transition-all duration-100 shrink-0"
                :class="[
                  color.value === 'transparent'
                    ? 'bg-white checkerboard'
                    : '',
                  (selectedElement.props.backgroundColor as string) === color.value
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-300'
                    : 'border-neutral-200 hover:border-indigo-300',
                ]"
                :style="color.value !== 'transparent' ? { backgroundColor: color.value } : {}"
                :title="color.label"
                @click="patchProps({ backgroundColor: color.value })"
              />
            </div>
          </EditorPropField>

          <!-- Border Radius button group -->
          <EditorPropField
            v-if="hasProp('borderRadius')"
            label="Radius"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="r in RADIUS_OPTIONS"
                :key="r.label"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="(selectedElement.props.borderRadius as number) === r.value
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ borderRadius: r.value })"
              >
                {{ r.label }}
              </button>
            </div>
          </EditorPropField>

          <!-- Text color swatches -->
          <EditorPropField
            v-if="hasProp('color')"
            label="Text Color"
          >
            <div class="grid grid-cols-7 gap-1 mt-1">
              <button
                v-for="color in PRESET_COLORS"
                :key="color.value"
                class="size-7 rounded-lg border-2 transition-all duration-100 shrink-0"
                :class="[
                  color.value === 'transparent'
                    ? 'bg-white checkerboard'
                    : '',
                  (selectedElement.props.color as string) === color.value
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-300'
                    : 'border-neutral-200 hover:border-indigo-300',
                ]"
                :style="color.value !== 'transparent' ? { backgroundColor: color.value } : {}"
                :title="color.label"
                @click="patchProps({ color: color.value })"
              />
            </div>
          </EditorPropField>

          <!-- Font size dropdown -->
          <EditorPropField
            v-if="hasProp('fontSize')"
            label="Font size"
          >
            <select
              class="w-full text-xs rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              :value="(selectedElement.props.fontSize as number) ?? 14"
              @change="(e) => patchProps({ fontSize: Number((e.target as HTMLSelectElement).value) })"
            >
              <option v-for="opt in FONT_SIZE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </EditorPropField>
        </div>
      </EditorPropertiesSection>

      <!-- ── Content section — type-specific editable props ── -->
      <EditorPropertiesSection
        v-if="hasContentProps"
        title="Content"
        icon="i-lucide-file-text"
      >
        <div class="space-y-2">
          <!-- Button label -->
          <EditorPropField v-if="selectedElement.type === 'Button'" label="Label">
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <!-- Input / LabelledInput placeholder -->
          <EditorPropField v-if="selectedElement.type === 'Input' || selectedElement.type === 'LabelledInput'" label="Placeholder">
            <UInput
              :model-value="(selectedElement.props.placeholder as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ placeholder: String(v) })"
            />
          </EditorPropField>

          <!-- LabelledInput label text -->
          <EditorPropField v-if="selectedElement.type === 'LabelledInput'" label="Label text">
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <!-- TextBox content -->
          <EditorPropField v-if="selectedElement.type === 'TextBox'" label="Content">
            <UInput
              :model-value="(selectedElement.props.content as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ content: String(v) })"
            />
          </EditorPropField>

          <!-- Heading text -->
          <EditorPropField v-if="selectedElement.type === 'Heading'" label="Text">
            <UInput
              :model-value="(selectedElement.props.text as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ text: String(v) })"
            />
          </EditorPropField>

          <!-- Heading level -->
          <EditorPropField v-if="selectedElement.type === 'Heading'" label="Level (1–6)">
            <UInput
              :model-value="(selectedElement.props.level as number) ?? 1"
              type="number"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ level: Math.min(6, Math.max(1, Number(v))) })"
            />
          </EditorPropField>

          <!-- Checkbox / RadioButton label -->
          <EditorPropField v-if="selectedElement.type === 'Checkbox' || selectedElement.type === 'RadioButton'" label="Label">
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <!-- Toggle label -->
          <EditorPropField v-if="selectedElement.type === 'Toggle'" label="Label">
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <!-- Image src -->
          <EditorPropField v-if="selectedElement.type === 'Image'" label="Src">
            <UInput
              :model-value="(selectedElement.props.src as string) || ''"
              size="xs"
              class="prop-input font-mono"
              @update:model-value="(v) => patchProps({ src: String(v) })"
            />
          </EditorPropField>

          <!-- Link text -->
          <EditorPropField v-if="selectedElement.type === 'Link'" label="Text">
            <UInput
              :model-value="(selectedElement.props.text as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ text: String(v) })"
            />
          </EditorPropField>

          <!-- Link href -->
          <EditorPropField v-if="selectedElement.type === 'Link'" label="Href">
            <UInput
              :model-value="(selectedElement.props.href as string) || '#'"
              size="xs"
              class="prop-input font-mono"
              @update:model-value="(v) => patchProps({ href: String(v) })"
            />
          </EditorPropField>

          <!-- Toolbar title -->
          <EditorPropField v-if="selectedElement.type === 'Toolbar'" label="Title">
            <UInput
              :model-value="(selectedElement.props.title as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ title: String(v) })"
            />
          </EditorPropField>

          <!-- Range min/max/value -->
          <template v-if="selectedElement.type === 'RangeInput'">
            <div class="grid grid-cols-3 gap-1">
              <EditorPropField label="Min">
                <UInput
                  :model-value="(selectedElement.props.min as number) ?? 0"
                  type="number"
                  size="xs"
                  class="prop-input"
                  @update:model-value="(v) => patchProps({ min: Number(v) })"
                />
              </EditorPropField>
              <EditorPropField label="Value">
                <UInput
                  :model-value="(selectedElement.props.value as number) ?? 50"
                  type="number"
                  size="xs"
                  class="prop-input"
                  @update:model-value="(v) => patchProps({ value: Number(v) })"
                />
              </EditorPropField>
              <EditorPropField label="Max">
                <UInput
                  :model-value="(selectedElement.props.max as number) ?? 100"
                  type="number"
                  size="xs"
                  class="prop-input"
                  @update:model-value="(v) => patchProps({ max: Number(v) })"
                />
              </EditorPropField>
            </div>
          </template>
        </div>
      </EditorPropertiesSection>

      <!-- ── Events section ── -->
      <EditorPropertiesSection title="Events" icon="i-lucide-zap">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 border border-neutral-200">
            <UIcon name="i-lucide-zap" class="text-amber-400 size-3.5 shrink-0" />
            <span class="text-[10px] text-neutral-500 font-mono flex-1">onClick</span>
            <span class="text-[9px] text-neutral-400 italic">unassigned</span>
          </div>
          <p class="text-[10px] text-neutral-400 px-1">Logic binding via Block mode — coming soon.</p>
        </div>
      </EditorPropertiesSection>

    </div>

    <!-- Delete button — only when element selected -->
    <div v-if="selectedElement" class="p-3 border-t border-neutral-200 shrink-0">
      <UButton
        label="Delete element"
        icon="i-lucide-trash-2"
        color="error"
        variant="soft"
        size="xs"
        block
        @click="handleDelete"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'
import type { AppElement } from '~/composables/useEditorStore'

const store = useEditorStore()
const selectedElement = store.selectedElement

const CONTAINER_TYPES = new Set(['RowContainer', 'ColContainer'])
const CONTENT_TYPES = new Set([
  'Button', 'Input', 'LabelledInput', 'TextBox', 'Heading',
  'Checkbox', 'RadioButton', 'Toggle', 'Image', 'Link',
  'Toolbar', 'RangeInput',
])

// Kid-friendly preset color palette for swatches
const PRESET_COLORS = [
  { label: 'White',       value: '#ffffff' },
  { label: 'Light Gray',  value: '#f1f5f9' },
  { label: 'Sky Blue',    value: '#38bdf8' },
  { label: 'Indigo',      value: '#6366f1' },
  { label: 'Purple',      value: '#a855f7' },
  { label: 'Pink',        value: '#ec4899' },
  { label: 'Red',         value: '#ef4444' },
  { label: 'Orange',      value: '#f97316' },
  { label: 'Yellow',      value: '#eab308' },
  { label: 'Green',       value: '#22c55e' },
  { label: 'Teal',        value: '#14b8a6' },
  { label: 'Dark',        value: '#1e293b' },
  { label: 'Transparent', value: 'transparent' },
]

// Named border-radius steps — replaces raw number input
const RADIUS_OPTIONS = [
  { label: 'None',   value: 0 },
  { label: 'Small',  value: 6 },
  { label: 'Medium', value: 12 },
  { label: 'Large',  value: 20 },
  { label: 'Full',   value: 9999 },
]

// Named font size steps — replaces raw number input
const FONT_SIZE_OPTIONS = [
  { label: 'Tiny (10px)',   value: 10 },
  { label: 'Small (12px)',  value: 12 },
  { label: 'Normal (14px)', value: 14 },
  { label: 'Large (18px)',  value: 18 },
  { label: 'XL (24px)',     value: 24 },
  { label: 'XXL (32px)',    value: 32 },
]

const isContainerType = computed(() =>
  !!selectedElement.value && CONTAINER_TYPES.has(selectedElement.value.type)
)

const hasContentProps = computed(() =>
  !!selectedElement.value && CONTENT_TYPES.has(selectedElement.value.type)
)

function hasProp(key: string): boolean {
  return !!selectedElement.value && key in selectedElement.value.props
}

function patchElement(patch: Partial<AppElement>) {
  if (selectedElement.value) {
    store.updateElement(selectedElement.value.id, patch)
  }
}

function patchProps(patch: Record<string, unknown>) {
  if (selectedElement.value) {
    store.updateElementProps(selectedElement.value.id, patch)
  }
}

// Direction toggle — also changes the element type to match (RowContainer ↔ ColContainer)
function setDirection(dir: 'row' | 'col') {
  if (!selectedElement.value) return
  const newType = dir === 'row' ? 'RowContainer' : 'ColContainer'
  store.updateElement(selectedElement.value.id, {
    type: newType,
    direction: dir,
  })
  patchProps({ direction: dir })
}

function handleDelete() {
  if (selectedElement.value) {
    store.deleteElement(selectedElement.value.id)
  }
}
</script>

<style scoped>
/* Checkered pattern for the "transparent" swatch */
.checkerboard {
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}
</style>
