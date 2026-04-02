<template>
  <aside class="flex flex-col h-full bg-neutral-900 border-l border-neutral-700 w-75 shrink-0 overflow-hidden">
    <!-- Panel header -->
    <div class="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-700 shrink-0">
      <UIcon name="i-lucide-sliders-horizontal" class="text-neutral-400 size-3.5" />
      <span class="text-xs font-semibold text-neutral-300 uppercase tracking-widest">Properties</span>
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
      <div class="size-10 rounded-full bg-neutral-800 flex items-center justify-center">
        <UIcon name="i-lucide-mouse-pointer" class="text-neutral-600 size-5" />
      </div>
      <p class="text-xs text-neutral-500 text-center leading-relaxed">Select an element<br />to edit properties</p>
    </div>

    <!-- Properties form when element is selected -->
    <div v-else class="flex-1 overflow-y-auto">

      <!-- ── Container layout section (only for RowContainer / ColContainer) ── -->
      <EditorPropertiesSection
        v-if="isContainerType"
        title="Layout"
        icon="i-lucide-layout-dashboard"
      >
        <div class="space-y-2">
          <!-- Direction toggle -->
          <EditorPropField label="Direction">
            <div class="flex gap-1">
              <button
                class="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium border transition-colors duration-100"
                :class="selectedElement.direction === 'row'
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-neutral-800 border-neutral-600 text-neutral-400 hover:border-indigo-500 hover:text-indigo-400'"
                @click="setDirection('row')"
              >
                <UIcon name="i-lucide-arrow-right" class="size-3" />
                Row
              </button>
              <button
                class="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium border transition-colors duration-100"
                :class="selectedElement.direction === 'col'
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-neutral-800 border-neutral-600 text-neutral-400 hover:border-indigo-500 hover:text-indigo-400'"
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
              variant="none"
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
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ padding: Number(v) })"
            />
          </EditorPropField>

          <!-- Background color -->
          <EditorPropField label="Background">
            <div class="flex items-center gap-2">
              <input
                type="color"
                :value="(selectedElement.props.backgroundColor as string) || '#ffffff'"
                class="color-swatch"
                @input="(e) => patchProps({ backgroundColor: (e.target as HTMLInputElement).value })"
              />
              <UInput
                :model-value="(selectedElement.props.backgroundColor as string) || ''"
                size="xs"
                variant="none"
                class="prop-input flex-1 font-mono"
                placeholder="transparent"
                @update:model-value="(v) => patchProps({ backgroundColor: String(v) })"
              />
            </div>
          </EditorPropField>
        </div>
      </EditorPropertiesSection>

      <!-- ── Position section (only for root containers; children use flex) ── -->
      <EditorPropertiesSection
        v-if="isContainerType"
        title="Position"
        icon="i-lucide-move"
      >
        <div class="grid grid-cols-2 gap-2">
          <EditorPropField label="X">
            <UInput
              :model-value="selectedElement.x"
              type="number"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchElement({ x: Number(v) })"
            />
          </EditorPropField>
          <EditorPropField label="Y">
            <UInput
              :model-value="selectedElement.y"
              type="number"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchElement({ y: Number(v) })"
            />
          </EditorPropField>
          <EditorPropField label="W">
            <UInput
              :model-value="selectedElement.width"
              type="number"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchElement({ width: Number(v) })"
            />
          </EditorPropField>
          <EditorPropField label="H">
            <UInput
              :model-value="selectedElement.height"
              type="number"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchElement({ height: Number(v) })"
            />
          </EditorPropField>
        </div>
      </EditorPropertiesSection>

      <!-- ── Size for non-container elements ── -->
      <EditorPropertiesSection
        v-if="!isContainerType"
        title="Size"
        icon="i-lucide-move"
      >
        <div class="grid grid-cols-2 gap-2">
          <EditorPropField label="W">
            <UInput
              :model-value="selectedElement.width"
              type="number"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchElement({ width: Number(v) })"
            />
          </EditorPropField>
          <EditorPropField label="H">
            <UInput
              :model-value="selectedElement.height"
              type="number"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchElement({ height: Number(v) })"
            />
          </EditorPropField>
        </div>
      </EditorPropertiesSection>

      <!-- ── Style section (non-container elements) ── -->
      <EditorPropertiesSection
        v-if="!isContainerType"
        title="Style"
        icon="i-lucide-palette"
      >
        <div class="space-y-2">
          <EditorPropField
            v-if="hasProp('backgroundColor')"
            label="Background"
          >
            <div class="flex items-center gap-2">
              <input
                type="color"
                :value="(selectedElement.props.backgroundColor as string) || '#ffffff'"
                class="color-swatch"
                @input="(e) => patchProps({ backgroundColor: (e.target as HTMLInputElement).value })"
              />
              <UInput
                :model-value="(selectedElement.props.backgroundColor as string) || ''"
                size="xs"
                variant="none"
                class="prop-input flex-1 font-mono"
                placeholder="#ffffff"
                @update:model-value="(v) => patchProps({ backgroundColor: String(v) })"
              />
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="hasProp('borderRadius')"
            label="Radius"
          >
            <UInput
              :model-value="(selectedElement.props.borderRadius as number) ?? 0"
              type="number"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ borderRadius: Number(v) })"
            />
          </EditorPropField>

          <!-- Text color -->
          <EditorPropField
            v-if="hasProp('color')"
            label="Color"
          >
            <div class="flex items-center gap-2">
              <input
                type="color"
                :value="(selectedElement.props.color as string) || '#000000'"
                class="color-swatch"
                @input="(e) => patchProps({ color: (e.target as HTMLInputElement).value })"
              />
              <UInput
                :model-value="(selectedElement.props.color as string) || ''"
                size="xs"
                variant="none"
                class="prop-input flex-1 font-mono"
                placeholder="#000000"
                @update:model-value="(v) => patchProps({ color: String(v) })"
              />
            </div>
          </EditorPropField>

          <!-- Font size -->
          <EditorPropField
            v-if="hasProp('fontSize')"
            label="Font size"
          >
            <UInput
              :model-value="(selectedElement.props.fontSize as number) ?? 14"
              type="number"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ fontSize: Number(v) })"
            />
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
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <!-- Input / LabelledInput placeholder -->
          <EditorPropField v-if="selectedElement.type === 'Input' || selectedElement.type === 'LabelledInput'" label="Placeholder">
            <UInput
              :model-value="(selectedElement.props.placeholder as string) || ''"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ placeholder: String(v) })"
            />
          </EditorPropField>

          <!-- LabelledInput label text -->
          <EditorPropField v-if="selectedElement.type === 'LabelledInput'" label="Label text">
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <!-- TextBox content -->
          <EditorPropField v-if="selectedElement.type === 'TextBox'" label="Content">
            <UInput
              :model-value="(selectedElement.props.content as string) || ''"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ content: String(v) })"
            />
          </EditorPropField>

          <!-- Heading text -->
          <EditorPropField v-if="selectedElement.type === 'Heading'" label="Text">
            <UInput
              :model-value="(selectedElement.props.text as string) || ''"
              size="xs"
              variant="none"
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
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ level: Math.min(6, Math.max(1, Number(v))) })"
            />
          </EditorPropField>

          <!-- Checkbox / RadioButton label -->
          <EditorPropField v-if="selectedElement.type === 'Checkbox' || selectedElement.type === 'RadioButton'" label="Label">
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <!-- Toggle label -->
          <EditorPropField v-if="selectedElement.type === 'Toggle'" label="Label">
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <!-- Image src -->
          <EditorPropField v-if="selectedElement.type === 'Image'" label="Src">
            <UInput
              :model-value="(selectedElement.props.src as string) || ''"
              size="xs"
              variant="none"
              class="prop-input font-mono"
              @update:model-value="(v) => patchProps({ src: String(v) })"
            />
          </EditorPropField>

          <!-- Link text -->
          <EditorPropField v-if="selectedElement.type === 'Link'" label="Text">
            <UInput
              :model-value="(selectedElement.props.text as string) || ''"
              size="xs"
              variant="none"
              class="prop-input"
              @update:model-value="(v) => patchProps({ text: String(v) })"
            />
          </EditorPropField>

          <!-- Link href -->
          <EditorPropField v-if="selectedElement.type === 'Link'" label="Href">
            <UInput
              :model-value="(selectedElement.props.href as string) || '#'"
              size="xs"
              variant="none"
              class="prop-input font-mono"
              @update:model-value="(v) => patchProps({ href: String(v) })"
            />
          </EditorPropField>

          <!-- Toolbar title -->
          <EditorPropField v-if="selectedElement.type === 'Toolbar'" label="Title">
            <UInput
              :model-value="(selectedElement.props.title as string) || ''"
              size="xs"
              variant="none"
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
                  variant="none"
                  class="prop-input"
                  @update:model-value="(v) => patchProps({ min: Number(v) })"
                />
              </EditorPropField>
              <EditorPropField label="Value">
                <UInput
                  :model-value="(selectedElement.props.value as number) ?? 50"
                  type="number"
                  size="xs"
                  variant="none"
                  class="prop-input"
                  @update:model-value="(v) => patchProps({ value: Number(v) })"
                />
              </EditorPropField>
              <EditorPropField label="Max">
                <UInput
                  :model-value="(selectedElement.props.max as number) ?? 100"
                  type="number"
                  size="xs"
                  variant="none"
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
          <div class="flex items-center gap-2 p-2 rounded bg-neutral-800 border border-neutral-700">
            <UIcon name="i-lucide-zap" class="text-amber-400 size-3.5 shrink-0" />
            <span class="text-[10px] text-neutral-400 font-mono flex-1">onClick</span>
            <span class="text-[9px] text-neutral-600 italic">unassigned</span>
          </div>
          <p class="text-[10px] text-neutral-600 px-1">Logic binding via Block mode — coming soon.</p>
        </div>
      </EditorPropertiesSection>

    </div>

    <!-- Delete button — only when element selected -->
    <div v-if="selectedElement" class="p-3 border-t border-neutral-700 shrink-0">
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

const isContainerType = computed(() =>
  !!selectedElement.value && CONTAINER_TYPES.has(selectedElement.value.type)
)

const hasContentProps = computed(() =>
  !!selectedElement.value && CONTENT_TYPES.has(selectedElement.value.type)
)

// Check whether the currently selected element has a particular prop key
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
.color-swatch {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  padding: 0;
  cursor: pointer;
  background: none;
  flex-shrink: 0;
}

.color-swatch::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-swatch::-webkit-color-swatch {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}
</style>
