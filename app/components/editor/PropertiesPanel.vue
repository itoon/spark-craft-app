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

      <!-- ── ID / Identification ── -->
      <div class="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-100 bg-neutral-50 shrink-0">
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <span class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">ID / Identification</span>
          <span class="text-[11px] font-mono text-neutral-700 truncate">{{ selectedElement.id }}</span>
        </div>
        <button
          class="text-[10px] px-2 py-1 rounded bg-neutral-200 hover:bg-indigo-100 hover:text-indigo-700 text-neutral-600 font-medium transition-colors shrink-0"
          :class="copied ? 'bg-green-100 text-green-700' : ''"
          @click="copyId"
        >
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>

      <!-- ── Container layout section (only for Container) ── -->
      <EditorPropertiesSection
        v-if="isContainerType"
        title="Layout"
        icon="i-lucide-layout-dashboard"
      >
        <div class="space-y-3">
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
            v-if="hasProp('borderRadius') && selectedElement.type !== 'FloatingActionButton'"
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
            v-if="hasProp('fontSize') && selectedElement.type !== 'TextBox' && selectedElement.type !== 'Toggle' && selectedElement.type !== 'Label'"
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

          <EditorPropField
            v-if="selectedElement.type === 'Button'"
            label="Fill"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in BUTTON_FILL_OPTIONS"
                :key="option"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.fill as string) ?? 'solid') === option
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ fill: option })"
              >
                {{ option }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'TextBox'"
            label="Font size"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in FONT_SIZE_OPTIONS"
                :key="option.value"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.fontSize as number) ?? 14) === option.value
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ fontSize: option.value })"
              >
                {{ option.value }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Label'"
            label="Size"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in FONT_SIZE_OPTIONS"
                :key="option.value"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.fontSize as number) ?? 14) === option.value
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ fontSize: option.value })"
              >
                {{ option.value }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Chip'"
            label="Outline"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in BOOLEAN_OPTIONS"
                :key="String(option)"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.outline as boolean) ?? false) === option
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ outline: option })"
              >
                {{ String(option) }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'FloatingActionButton'"
            label="Horizontal Alignment"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in FAB_HORIZONTAL_OPTIONS"
                :key="option"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100 capitalize"
                :class="(selectedElement.props.horizontalAlignment as string ?? 'end') === option
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ horizontalAlignment: option })"
              >
                {{ option }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'FloatingActionButton'"
            label="Vertical Alignment"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in FAB_VERTICAL_OPTIONS"
                :key="option"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100 capitalize"
                :class="(selectedElement.props.verticalAlignment as string ?? 'bottom') === option
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ verticalAlignment: option })"
              >
                {{ option }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'FloatingActionButton'"
            label="Edge"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in FAB_EDGE_OPTIONS"
                :key="String(option)"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.edge as boolean) ?? false) === option
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ edge: option })"
              >
                {{ String(option) }}
              </button>
            </div>
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

          <EditorPropField v-if="selectedElement.type === 'Searchbar'" label="Placeholder">
            <UInput
              :model-value="(selectedElement.props.placeholder as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ placeholder: String(v) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Searchbar'" label="Value">
            <UInput
              :model-value="(selectedElement.props.value as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ value: String(v) })"
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

          <EditorPropField v-if="selectedElement.type === 'Input' || selectedElement.type === 'LabelledInput'" label="Value">
            <UInput
              :model-value="(selectedElement.props.value as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ value: String(v) })"
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

          <EditorPropField v-if="selectedElement.type === 'TextBox'" label="Placeholder">
            <UInput
              :model-value="(selectedElement.props.placeholder as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ placeholder: String(v) })"
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

          <EditorPropField v-if="selectedElement.type === 'Label'" label="Content">
            <UInput
              :model-value="(selectedElement.props.content as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ content: String(v) })"
            />
          </EditorPropField>

          <!-- Heading level -->
          <EditorPropField v-if="selectedElement.type === 'Heading'" label="Size">
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in HEADING_LEVEL_OPTIONS"
                :key="option.label"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.level as number) ?? 2) === option.value
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ level: option.value })"
              >
                {{ option.label }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'TextBox'" label="Text align">
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in TEXTAREA_ALIGN_OPTIONS"
                :key="option"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100 capitalize"
                :class="(
                  option === 'wrap' || option === 'unwrap'
                    ? ((selectedElement.props.wrap as string) ?? 'wrap') === option
                    : ((selectedElement.props.textAlign as string) ?? 'left') === option
                )
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps(
                  option === 'wrap' || option === 'unwrap'
                    ? { wrap: option }
                    : { textAlign: option }
                )"
              >
                {{ option }}
              </button>
            </div>
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

          <!-- Toggle content -->
          <EditorPropField v-if="selectedElement.type === 'Toggle'" label="Content">
            <UInput
              :model-value="(selectedElement.props.content as string) || (selectedElement.props.label as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ content: String(v), label: String(v) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Toggle'" label="Font size">
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in FONT_SIZE_OPTIONS"
                :key="option.value"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.fontSize as number) ?? 16) === option.value
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ fontSize: option.value })"
              >
                {{ option.value }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Toggle'" label="Value">
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in BOOLEAN_OPTIONS"
                :key="String(option)"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.on as boolean) ?? false) === option
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ on: option })"
              >
                {{ String(option) }}
              </button>
            </div>
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

          <EditorPropField v-if="selectedElement.type === 'Link'" label="Content">
            <UInput
              :model-value="(selectedElement.props.content as string) || (selectedElement.props.text as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ content: String(v), text: String(v) })"
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

          <EditorPropField v-if="selectedElement.type === 'Toolbar'" label="Back Button">
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in BOOLEAN_OPTIONS"
                :key="String(option)"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.showBack as boolean) ?? false) === option
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ showBack: option })"
              >
                {{ String(option) }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Card'" label="Title">
            <UInput
              :model-value="(selectedElement.props.title as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ title: String(v) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Card'" label="Subtitle">
            <UInput
              :model-value="(selectedElement.props.subtitle as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ subtitle: String(v) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'List'" label="Items">
            <UInput
              :model-value="joinOptions(selectedElement.props.items)"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ items: parseOptions(String(v)) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Segment'" label="Options">
            <UInput
              :model-value="joinOptions(selectedElement.props.options)"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ options: parseOptions(String(v)) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Segment'" label="Selected">
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="(option, idx) in parseOptions(joinOptions(selectedElement.props.options))"
                :key="`${option}-${idx}`"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.selected as number) ?? 0) === idx
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ selected: idx })"
              >
                {{ option }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Select'" label="Placeholder">
            <UInput
              :model-value="(selectedElement.props.placeholder as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ placeholder: String(v) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Select'" label="Options">
            <UInput
              :model-value="joinOptions(selectedElement.props.options)"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ options: parseOptions(String(v)) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Select'" label="Value">
            <UInput
              :model-value="(selectedElement.props.value as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ value: String(v) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Badge'" label="Text">
            <UInput
              :model-value="(selectedElement.props.text as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ text: String(v) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Chip'" label="Label">
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <template v-if="selectedElement.type === 'Separator'">
            <div class="grid grid-cols-2 gap-1">
              <EditorPropField label="Padding top">
                <UInput
                  :model-value="(selectedElement.props.paddingTop as number) ?? 8"
                  type="number"
                  size="xs"
                  class="prop-input"
                  @update:model-value="(v) => patchProps({ paddingTop: Number(v) })"
                />
              </EditorPropField>
              <EditorPropField label="Padding bottom">
                <UInput
                  :model-value="(selectedElement.props.paddingBottom as number) ?? 8"
                  type="number"
                  size="xs"
                  class="prop-input"
                  @update:model-value="(v) => patchProps({ paddingBottom: Number(v) })"
                />
              </EditorPropField>
            </div>
          </template>

          <EditorPropField v-if="selectedElement.type === 'Spacer'" label="Height">
            <UInput
              :model-value="selectedElement.height"
              type="number"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchElement({ height: Number(v) })"
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
import { ref, computed } from 'vue'
import { useEditorStore } from '~/composables/useEditorStore'
import type { AppElement } from '~/composables/useEditorStore'

const store = useEditorStore()
const selectedElement = store.selectedElement

// Copy ID to clipboard
const copied = ref(false)
function copyId() {
  if (!selectedElement.value) return
  navigator.clipboard.writeText(selectedElement.value.id)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

const CONTAINER_TYPES = new Set(['Container'])
const CONTENT_TYPES = new Set([
  'Button', 'Searchbar', 'Input', 'LabelledInput',
  'Checkbox', 'RadioButton', 'Toggle', 'Image',
  'Toolbar', 'RangeInput', 'Card', 'List', 'Segment',
  'Select', 'Badge', 'Chip', 'Heading', 'TextBox',
  'Label', 'Link', 'Separator', 'Spacer',
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

const HEADING_LEVEL_OPTIONS = [
  { label: 'h1', value: 1 },
  { label: 'h2', value: 2 },
  { label: 'h3', value: 3 },
  { label: 'h4', value: 4 },
  { label: 'h5', value: 5 },
  { label: 'h6', value: 6 },
]

const TEXTAREA_ALIGN_OPTIONS = ['left', 'center', 'right', 'justify', 'wrap', 'unwrap'] as const

const FAB_HORIZONTAL_OPTIONS = ['start', 'center', 'end'] as const
const FAB_VERTICAL_OPTIONS = ['top', 'center', 'bottom'] as const
const FAB_EDGE_OPTIONS = [true, false] as const
const BUTTON_FILL_OPTIONS = ['solid', 'outline', 'clear'] as const
const BOOLEAN_OPTIONS = [true, false] as const

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

function parseOptions(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function joinOptions(value: unknown): string {
  return Array.isArray(value) ? value.join(', ') : ''
}

// Direction toggle removed — Container is always vertical.

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
