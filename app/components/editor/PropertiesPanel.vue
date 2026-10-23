<template>
  <aside
    class="editor-properties flex flex-col h-full bg-white border-l border-neutral-200 w-(--cc-props-w) shrink-0 overflow-hidden"
  >
    <!-- Panel header -->
    <div
      class="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-200 shrink-0"
    >
      <UIcon
        name="i-lucide-sliders-horizontal"
        class="text-neutral-400 size-3.5"
      />
      <span
        class="text-xs font-semibold text-neutral-500 uppercase tracking-widest"
        >Properties</span
      >
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
      <div
        class="size-10 rounded-full bg-neutral-100 flex items-center justify-center"
      >
        <UIcon name="i-lucide-mouse-pointer" class="text-neutral-400 size-5" />
      </div>
      <p class="text-xs text-neutral-400 text-center leading-relaxed">
        Select an element<br />to edit properties
      </p>
    </div>

    <!-- Properties form when element is selected -->
    <div v-else class="flex-1 overflow-y-auto">
      <!-- ── ID / Identification ── -->
      <div
        class="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-100 bg-neutral-50 shrink-0"
      >
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            class="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider"
            >ID / Identification</span
          >
          <span class="text-[11px] font-mono text-neutral-700 truncate">{{
            selectedElement.id
          }}</span>
        </div>
        <button
          class="text-[10px] px-2 py-1 rounded bg-neutral-200 hover:bg-indigo-100 hover:text-indigo-700 text-neutral-600 font-medium transition-colors shrink-0"
          :class="copied ? 'bg-green-100 text-green-700' : ''"
          @click="copyId"
        >
          {{ copied ? "Copied!" : "Copy" }}
        </button>
      </div>

      <!-- ── Not passed to page.add() in the code ── -->
      <div
        v-if="pageAdd.isNotAdded(selectedElement)"
        class="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2.5"
        role="status"
        data-testid="not-added-banner"
      >
        <p class="flex gap-2 text-[11px] leading-snug text-amber-900">
          <UIcon name="i-lucide-eye-off" class="mt-0.5 size-3.5 shrink-0 text-amber-600" />
          <span>
            ยังไม่ได้ <code class="font-mono">page.add()</code> ในโค้ด
            ชิ้นนี้จึงยังไม่โผล่ตอน Run / มือถือ / APK
          </span>
        </p>
        <UButton
          size="xs"
          color="warning"
          variant="solid"
          icon="i-lucide-plus"
          class="self-start"
          data-testid="add-to-page-button"
          @click="pageAdd.addToCode(selectedElement)"
        >
          เพิ่มเข้า page ในโค้ดให้
        </UButton>
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
                  color.value === 'transparent' ? 'bg-white checkerboard' : '',
                  (selectedElement.props.backgroundColor as string) ===
                  color.value
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-300'
                    : 'border-neutral-200 hover:border-indigo-300',
                ]"
                :style="
                  color.value !== 'transparent'
                    ? { backgroundColor: color.value }
                    : {}
                "
                :title="color.label"
                @click="patchProps({ backgroundColor: color.value })"
              />
            </div>
          </EditorPropField>
        </div>
      </EditorPropertiesSection>

      <!-- ── Style section (non-container elements) ── -->
      <EditorPropertiesSection
        v-if="
          !isContainerType &&
          selectedElement.type !== 'List' &&
          selectedElement.type !== 'Input' &&
          selectedElement.type !== 'LabelledInput' &&
          selectedElement.type !== 'RangeInput' &&
          selectedElement.type !== 'Checkbox' &&
          selectedElement.type !== 'RadioButton' &&
          selectedElement.type !== 'Camera' &&
          selectedElement.type !== 'Image' &&
          selectedElement.type !== 'Toggle' &&
          selectedElement.type !== 'Select'
        "
        title="Style"
        icon="i-lucide-palette"
      >
        <div class="space-y-3">
          <!-- Ionic color picker for Button / Toolbar / Chart -->
          <EditorPropField
            v-if="
              selectedElement.type === 'Button' ||
              selectedElement.type === 'Toolbar' ||
              selectedElement.type === 'Chart'
            "
            label="Color"
          >
            <div class="flex flex-wrap gap-1 mt-1">
              <button
                v-for="c in IONIC_COLORS"
                :key="c.hex"
                class="size-7 rounded-lg border-2 transition-all duration-100 shrink-0 relative group"
                :class="
                  ((selectedElement.props.ionicColorHex as string) ?? '#3880ff') === c.hex
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-300'
                    : 'border-neutral-200 hover:border-indigo-300'
                "
                :style="{ backgroundColor: c.hex }"
                :title="c.label"
                @click="() => {
                  if (selectedElement.type === 'Chart') {
                    const ds = JSON.parse(JSON.stringify(selectedElement.props.datasets || [{ label: 'Series 1', data: [], color: c.hex }]));
                    (ds[0] as { color: string }).color = c.hex;
                    patchProps({ ionicColor: c.name, ionicColorHex: c.hex, ionicColorContrast: c.contrast, datasets: ds });
                  } else {
                    patchProps({ ionicColor: c.name, ionicColorHex: c.hex, ionicColorContrast: c.contrast });
                  }
                }"
              >
                <span
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity"
                >
                  {{ c.label }}
                </span>
              </button>
            </div>
          </EditorPropField>

          <!-- Chart type picker -->
          <EditorPropField v-if="selectedElement.type === 'Chart'" label="Chart type">
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="t in ['bar', 'line', 'pie', 'doughnut']"
                :key="t"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="((selectedElement.props.chartType as string) || 'bar') === t
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
                @click="patchProps({ chartType: t })"
              >{{ t }}</button>
            </div>
          </EditorPropField>

          <!-- Background color swatches -->
          <EditorPropField
            v-if="
              hasProp('backgroundColor') &&
              selectedElement.type !== 'Button' &&
              selectedElement.type !== 'Toolbar' &&
              selectedElement.type !== 'List'
            "
            label="Background"
          >
            <div class="grid grid-cols-7 gap-1 mt-1">
              <button
                v-for="color in PRESET_COLORS"
                :key="color.value"
                class="size-7 rounded-lg border-2 transition-all duration-100 shrink-0"
                :class="[
                  color.value === 'transparent' ? 'bg-white checkerboard' : '',
                  (selectedElement.props.backgroundColor as string) ===
                  color.value
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-300'
                    : 'border-neutral-200 hover:border-indigo-300',
                ]"
                :style="
                  color.value !== 'transparent'
                    ? { backgroundColor: color.value }
                    : {}
                "
                :title="color.label"
                @click="patchProps({ backgroundColor: color.value })"
              />
            </div>
          </EditorPropField>

          <!-- Border Radius button group -->
          <EditorPropField
            v-if="
              hasProp('borderRadius') &&
              selectedElement.type !== 'FloatingActionButton' &&
              selectedElement.type !== 'Button' &&
              selectedElement.type !== 'Image' &&
              selectedElement.type !== 'Input' &&
              selectedElement.type !== 'LabelledInput'
            "
            label="Radius"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="r in RADIUS_OPTIONS"
                :key="r.label"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  (selectedElement.props.borderRadius as number) === r.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ borderRadius: r.value })"
              >
                {{ r.label }}
              </button>
            </div>
          </EditorPropField>

          <!-- Text color swatches -->
          <EditorPropField v-if="hasProp('color')" label="Text Color">
            <div class="grid grid-cols-7 gap-1 mt-1">
              <button
                v-for="color in PRESET_COLORS"
                :key="color.value"
                class="size-7 rounded-lg border-2 transition-all duration-100 shrink-0"
                :class="[
                  color.value === 'transparent' ? 'bg-white checkerboard' : '',
                  (selectedElement.props.color as string) === color.value
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-300'
                    : 'border-neutral-200 hover:border-indigo-300',
                ]"
                :style="
                  color.value !== 'transparent'
                    ? { backgroundColor: color.value }
                    : {}
                "
                :title="color.label"
                @click="patchProps({ color: color.value })"
              />
            </div>
          </EditorPropField>

          <!-- Font size dropdown -->
          <EditorPropField
            v-if="
              hasProp('fontSize') &&
              selectedElement.type !== 'TextBox' &&
              selectedElement.type !== 'Toggle' &&
              selectedElement.type !== 'Label'
            "
            label="Font size"
          >
            <select
              class="w-full text-xs rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              :value="(selectedElement.props.fontSize as number) ?? 14"
              @change="
                (e) =>
                  patchProps({
                    fontSize: Number((e.target as HTMLSelectElement).value),
                  })
              "
            >
              <option
                v-for="opt in FONT_SIZE_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
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
                :class="
                  ((selectedElement.props.fill as string) ?? 'solid') === option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ fill: option })"
              >
                {{ option }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Button'"
            label="Size"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in BUTTON_SIZE_OPTIONS"
                :key="option"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.size as string) ?? 'default') ===
                  option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="changeButtonSize(option)"
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
                :class="
                  ((selectedElement.props.fontSize as number) ?? 14) ===
                  option.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ fontSize: option.value })"
              >
                {{ option.value }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Label'" label="Size">
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in FONT_SIZE_OPTIONS"
                :key="option.value"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.fontSize as number) ?? 14) ===
                  option.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
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
                :class="
                  ((selectedElement.props.outline as boolean) ?? false) ===
                  option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
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
                :class="
                  ((selectedElement.props.horizontalAlignment as string) ??
                    'end') === option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
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
                :class="
                  ((selectedElement.props.verticalAlignment as string) ??
                    'bottom') === option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
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
                :class="
                  ((selectedElement.props.edge as boolean) ?? false) === option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
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
          <!-- Button content -->
          <EditorPropField
            v-if="selectedElement.type === 'Button'"
            label="Content"
          >
            <UInput
              :model-value="(selectedElement.props.content as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ content: String(v) })"
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Searchbar'"
            label="Placeholder"
          >
            <UInput
              :model-value="(selectedElement.props.placeholder as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="
                (v) => patchProps({ placeholder: String(v) })
              "
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Searchbar'"
            label="Value"
          >
            <UInput
              :model-value="(selectedElement.props.value as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ value: String(v) })"
            />
          </EditorPropField>

          <!-- Input / LabelledInput placeholder -->
          <EditorPropField
            v-if="
              selectedElement.type === 'Input' ||
              selectedElement.type === 'LabelledInput'
            "
            label="Placeholder"
          >
            <UInput
              :model-value="(selectedElement.props.placeholder as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="
                (v) => patchProps({ placeholder: String(v) })
              "
            />
          </EditorPropField>

          <EditorPropField
            v-if="
              selectedElement.type === 'Input' ||
              selectedElement.type === 'LabelledInput'
            "
            label="Value"
          >
            <UInput
              :model-value="(selectedElement.props.value as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ value: String(v) })"
            />
          </EditorPropField>

          <!-- Input / LabelledInput label -->
          <EditorPropField
            v-if="
              selectedElement.type === 'Input' ||
              selectedElement.type === 'LabelledInput'
            "
            label="Label"
          >
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <!-- TextBox content -->
          <EditorPropField
            v-if="selectedElement.type === 'TextBox'"
            label="Content"
          >
            <UInput
              :model-value="(selectedElement.props.content as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ content: String(v) })"
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'TextBox'"
            label="Placeholder"
          >
            <UInput
              :model-value="(selectedElement.props.placeholder as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="
                (v) => patchProps({ placeholder: String(v) })
              "
            />
          </EditorPropField>

          <!-- Heading content -->
          <EditorPropField
            v-if="selectedElement.type === 'Heading'"
            label="Content"
          >
            <UInput
              :model-value="
                (selectedElement.props.content as string) ||
                (selectedElement.props.text as string) ||
                ''
              "
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ content: String(v) })"
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Label'"
            label="Content"
          >
            <UInput
              :model-value="(selectedElement.props.content as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ content: String(v) })"
            />
          </EditorPropField>

          <!-- Heading level -->
          <EditorPropField
            v-if="selectedElement.type === 'Heading'"
            label="Size"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in HEADING_LEVEL_OPTIONS"
                :key="option.label"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.level as number) ?? 2) ===
                  option.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ level: option.value })"
              >
                {{ option.label }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'TextBox'"
            label="Text align"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in TEXTAREA_ALIGN_OPTIONS"
                :key="option"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100 capitalize"
                :class="
                  (
                    option === 'wrap' || option === 'unwrap'
                      ? ((selectedElement.props.wrap as string) ?? 'wrap') ===
                        option
                      : ((selectedElement.props.textAlign as string) ??
                          'left') === option
                  )
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="
                  patchProps(
                    option === 'wrap' || option === 'unwrap'
                      ? { wrap: option }
                      : { textAlign: option },
                  )
                "
              >
                {{ option }}
              </button>
            </div>
          </EditorPropField>

          <!-- Checkbox / RadioButton label -->
          <EditorPropField
            v-if="
              selectedElement.type === 'Checkbox' ||
              selectedElement.type === 'RadioButton'
            "
            label="Label"
          >
            <UInput
              :model-value="(selectedElement.props.label as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ label: String(v) })"
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Checkbox'"
            label="Label placement"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in CHECKBOX_LABEL_PLACEMENT_OPTIONS"
                :key="option"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100 capitalize"
                :class="
                  ((selectedElement.props.labelPlacement as string) ??
                    'end') === option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ labelPlacement: option })"
              >
                {{ option }}
              </button>
            </div>
          </EditorPropField>

          <!-- Toggle content -->
          <EditorPropField
            v-if="selectedElement.type === 'Toggle'"
            label="Content"
          >
            <UInput
              :model-value="
                (selectedElement.props.content as string) ||
                (selectedElement.props.label as string) ||
                ''
              "
              size="xs"
              class="prop-input"
              @update:model-value="
                (v) => patchProps({ content: String(v), label: String(v) })
              "
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Toggle'"
            label="Font size"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in FONT_SIZE_OPTIONS"
                :key="option.value"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.fontSize as number) ?? 16) ===
                  option.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ fontSize: option.value })"
              >
                {{ option.value }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Toggle'"
            label="Value"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in BOOLEAN_OPTIONS"
                :key="String(option)"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.on as boolean) ?? false) === option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ on: option })"
              >
                {{ String(option) }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Camera'"
            label="Title"
          >
            <UInput
              :model-value="(selectedElement.props.title as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ title: String(v) })"
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Camera'"
            label="Default open"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in BOOLEAN_OPTIONS"
                :key="String(option)"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.open as boolean) ?? false) === option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ open: option })"
              >
                {{ String(option) }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Camera'"
            label="Height"
          >
            <UInput
              :model-value="selectedElement.height"
              type="number"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchElement({ height: Number(v) })"
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Camera'"
            label="Filter"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="f in [
                  'none',
                  'grayscale',
                  'sepia',
                  'vintage',
                  'warm',
                  'cool',
                  'invert',
                  'blur',
                  'brightness',
                  'contrast',
                  'saturate',
                ]"
                :key="f"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.filter as string) || 'none') === f
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ filter: f })"
              >
                {{ f }}
              </button>
            </div>
          </EditorPropField>

          <!-- ── Chart ── -->

          <EditorPropField v-if="selectedElement.type === 'Chart'" label="Title">
            <UInput
              :model-value="(selectedElement.props.title as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ title: String(v) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Chart'" label="Labels (comma)">
            <UInput
              :model-value="((selectedElement.props.labels as string[]) || []).join(', ')"
              size="xs"
              class="prop-input"
              placeholder="Jan, Feb, Mar"
              @update:model-value="(v) => patchProps({ labels: String(v).split(',').map(s => s.trim()).filter(Boolean) })"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Chart'" label="Data (comma)">
            <UInput
              :model-value="(((selectedElement.props.datasets as {data:number[]}[])?.[0]?.data) || []).join(', ')"
              size="xs"
              class="prop-input"
              placeholder="40, 65, 28, 80, 52"
              @update:model-value="(v) => {
                const nums = String(v).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
                const ds = JSON.parse(JSON.stringify((selectedElement.props.datasets as object[]) || [{label:'Series 1',data:[],color:'#3880ff'}]));
                (ds[0] as {data:number[]}).data = nums;
                patchProps({ datasets: ds });
              }"
            />
          </EditorPropField>

          <EditorPropField v-if="selectedElement.type === 'Chart'" label="Height">
            <UInput
              :model-value="selectedElement.height"
              type="number"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchElement({ height: Number(v) })"
            />
          </EditorPropField>

          <!-- ── Spinner ── -->
          <EditorPropField
            v-if="selectedElement.type === 'Spinner'"
            label="Show"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in BOOLEAN_OPTIONS"
                :key="String(option)"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.show as boolean) ?? true) === option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ show: option })"
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

          <EditorPropField
            v-if="selectedElement.type === 'Image'"
            label="Width"
          >
            <UInput
              :model-value="selectedElement.width"
              type="number"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchElement({ width: Number(v) })"
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Image'"
            label="Height"
          >
            <UInput
              :model-value="selectedElement.height"
              type="number"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchElement({ height: Number(v) })"
            />
            <p class="mt-1 text-[10px] leading-relaxed text-neutral-500">
              Use <code>0</code> for auto height.
            </p>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Link'"
            label="Content"
          >
            <UInput
              :model-value="
                (selectedElement.props.content as string) ||
                (selectedElement.props.text as string) ||
                ''
              "
              size="xs"
              class="prop-input"
              @update:model-value="
                (v) => patchProps({ content: String(v), text: String(v) })
              "
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

          <!-- Link target -->
          <EditorPropField
            v-if="selectedElement.type === 'Link'"
            label="Target"
          >
            <div class="flex gap-1">
              <button
                v-for="t in ['_self', '_blank']"
                :key="t"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.target as string) || '_blank') === t
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ target: t })"
              >
                {{ t }}
              </button>
            </div>
          </EditorPropField>

          <!-- Toolbar title -->
          <EditorPropField
            v-if="selectedElement.type === 'Toolbar'"
            label="Title"
          >
            <UInput
              :model-value="(selectedElement.props.title as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ title: String(v) })"
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Toolbar'"
            label="Back Button"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in BOOLEAN_OPTIONS"
                :key="String(option)"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.showBack as boolean) ?? false) ===
                  option
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ showBack: option })"
              >
                {{ String(option) }}
              </button>
            </div>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Toolbar'"
            label="Position"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="option in TOOLBAR_POSITION_OPTIONS"
                :key="option.value"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.position as string) ?? 'fixed') ===
                  option.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                :title="option.hint"
                @click="patchProps({ position: option.value })"
              >
                {{ option.label }}
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

          <EditorPropField
            v-if="selectedElement.type === 'Card'"
            label="Subtitle"
          >
            <UInput
              :model-value="(selectedElement.props.subtitle as string) || ''"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ subtitle: String(v) })"
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'List'"
            label="Content"
          >
            <p class="text-[10px] leading-relaxed text-neutral-500">
              Please use code mode to bind list content.
            </p>
            <p class="mt-1 text-[10px] leading-relaxed text-neutral-500">
              Use JSON array: <code>["Item1", "Item2"]</code> or<br />
              <code>[{ "key": "Item 1", "value": "abc" }]</code>
            </p>
          </EditorPropField>
          <EditorPropField
            v-if="selectedElement.type === 'Select'"
            label="Content"
          >
            <p class="text-[10px] leading-relaxed text-neutral-500">
              Please use code mode to bind list content.
            </p>
            <p class="mt-1 text-[10px] leading-relaxed text-neutral-500">
              Use JSON array: <code>["Item1", "Item2"]</code> or<br />
              <code>[{ "key": "Item 1", "value": "abc" }]</code>
            </p>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'RadioButton'"
            label="Content"
          >
            <p class="text-[10px] leading-relaxed text-neutral-500">
              Please use code mode to bind list content.
            </p>
            <p class="mt-1 text-[10px] leading-relaxed text-neutral-500">
              Use JSON array: <code>["Item1", "Item2"]</code> or<br />
              <code>[{ "key": "Item 1", "value": "abc" }]</code>
            </p>
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Segment'"
            label="Options"
          >
            <UInput
              :model-value="joinOptions(selectedElement.props.options)"
              size="xs"
              class="prop-input"
              @update:model-value="
                (v) => patchProps({ options: parseOptions(String(v)) })
              "
            />
          </EditorPropField>

          <EditorPropField
            v-if="selectedElement.type === 'Segment'"
            label="Selected"
          >
            <div class="flex gap-1 flex-wrap">
              <button
                v-for="(option, idx) in parseOptions(
                  joinOptions(selectedElement.props.options),
                )"
                :key="`${option}-${idx}`"
                class="px-2 py-1 rounded text-xs font-medium transition-colors duration-100"
                :class="
                  ((selectedElement.props.selected as number) ?? 0) === idx
                    ? 'bg-indigo-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                "
                @click="patchProps({ selected: idx })"
              >
                {{ option }}
              </button>
            </div>
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
                  :model-value="
                    (selectedElement.props.paddingTop as number) ?? 8
                  "
                  type="number"
                  size="xs"
                  class="prop-input"
                  @update:model-value="
                    (v) => patchProps({ paddingTop: Number(v) })
                  "
                />
              </EditorPropField>
              <EditorPropField label="Padding bottom">
                <UInput
                  :model-value="
                    (selectedElement.props.paddingBottom as number) ?? 8
                  "
                  type="number"
                  size="xs"
                  class="prop-input"
                  @update:model-value="
                    (v) => patchProps({ paddingBottom: Number(v) })
                  "
                />
              </EditorPropField>
            </div>
          </template>

          <EditorPropField
            v-if="selectedElement.type === 'Spacer'"
            label="Height"
          >
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
          </template>
        </div>
      </EditorPropertiesSection>

      <!-- ── Map section ── -->
      <EditorPropertiesSection
        v-if="selectedElement.type === 'Map'"
        title="Map"
        icon="i-lucide-map"
      >
        <div class="space-y-2">
          <EditorPropField label="Lat">
            <UInput
              :model-value="(selectedElement.props.lat as number) ?? 13.7563"
              type="number"
              step="0.0001"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ lat: Number(v) })"
            />
          </EditorPropField>
          <EditorPropField label="Lng">
            <UInput
              :model-value="(selectedElement.props.lng as number) ?? 100.5018"
              type="number"
              step="0.0001"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ lng: Number(v) })"
            />
          </EditorPropField>
          <EditorPropField label="Zoom">
            <UInput
              :model-value="(selectedElement.props.zoom as number) ?? 13"
              type="number"
              min="2"
              max="19"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchProps({ zoom: Math.min(19, Math.max(2, Number(v))) })"
            />
          </EditorPropField>
          <EditorPropField label="Height">
            <UInput
              :model-value="selectedElement.height"
              type="number"
              min="120"
              size="xs"
              class="prop-input"
              @update:model-value="(v) => patchElement({ height: Math.max(120, Number(v)) })"
            />
          </EditorPropField>
          <p class="px-1 text-[10px] leading-snug text-neutral-400">
            ใส่หมุดจากโค้ด: map1.addMarker(lat, lng, 'ข้อความ')
          </p>
        </div>
      </EditorPropertiesSection>

      <!-- ── Events section ── -->
      <EditorPropertiesSection title="Events" icon="i-lucide-zap">
        <div class="space-y-1.5">
          <div
            class="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 border border-neutral-200"
          >
            <UIcon
              name="i-lucide-zap"
              class="size-3.5 shrink-0"
              :class="hasClickHandler ? 'text-amber-500' : 'text-neutral-300'"
            />
            <span class="text-[11px] text-neutral-600 font-mono flex-1"
              >{{ varName }}.onClick</span
            >
            <span
              class="text-[10px] font-medium"
              :class="hasClickHandler ? 'text-emerald-600' : 'text-neutral-400'"
              >{{ hasClickHandler ? "used in code" : "not used yet" }}</span
            >
          </div>
          <button
            v-if="!hasClickHandler && selectedElement.type !== 'Container'"
            type="button"
            class="w-full rounded-md px-1 py-1 text-left text-[11px] text-indigo-600 hover:bg-indigo-50"
            @click="addClickHandler"
          >
            + Add onClick in Code
          </button>
        </div>
      </EditorPropertiesSection>
    </div>

    <!-- Delete button — only when element selected -->
    <div
      v-if="selectedElement"
      class="p-3 border-t border-neutral-200 shrink-0"
    >
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
import { ref, computed } from "vue";
import { useEditorStore } from "~/composables/useEditorStore";
import { usePageAddStatus } from "~/composables/usePageAddStatus";
import { findElementVariables } from "~/utils/pageAdds";
import type { AppElement } from "~/composables/useEditorStore";
import { ELEMENT_CLASS_MAP, buildScaffold } from "~/composables/useRuntime";

const store = useEditorStore();
const pageAdd = usePageAddStatus();

// ── Events: show whether the selected element's onClick is used in code ──
// The variable the code already uses for this element (e.g. `var button = new Button('page1_button1')`),
// else the default name the scaffold would give it.
const varName = computed(() => {
  const el = store.selectedElement.value;
  const id = el?.id ?? "";
  const code = el ? store.jsCodeByPage.value[el.pageId] ?? "" : "";
  const existing = [...findElementVariables(code).entries()].find(([, elementId]) => elementId === id)?.[0];
  if (existing) return existing;
  const parts = id.split("_");
  return parts[parts.length - 1] || id;
});

const hasClickHandler = computed(() => {
  const el = store.selectedElement.value;
  if (!el) return false;
  const code = store.jsCodeByPage.value[el.pageId] ?? "";
  const escaped = varName.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\.onClick\\s*\\(`).test(code);
});

function addClickHandler() {
  const el = store.selectedElement.value;
  if (!el) return;
  const name = varName.value;
  let current = store.jsCodeByPage.value[el.pageId] ?? "";
  if (!current.trim()) {
    current = buildScaffold(store.elements.value.filter((item) => item.pageId === el.pageId))
      // drop the sample handler; we add the real one below
      .replace(/\/\/ --- Add interactions ---[\s\S]*$/, "");
  }
  const declared = new RegExp(`\\b(?:var|let|const)\\s+${name}\\b`).test(current);
  const cls = ELEMENT_CLASS_MAP[el.type] ?? el.type;
  const declaration = declared ? "" : `\nvar ${name} = new ${cls}('${el.id}');\npage.add(${name});\n`;
  const snippet = `\n${name}.onClick(() => {\n  // what should happen when ${name} is clicked?\n});\n`;
  store.jsCodeByPage.value[el.pageId] = `${current.replace(/\s*$/, "")}\n${declaration}${snippet}`;
  store.markJsCodeInitialized();
  store.setMode("code");
}
const selectedElement = store.selectedElement;

// Copy ID to clipboard
const copied = ref(false);
function copyId() {
  if (!selectedElement.value) return;
  navigator.clipboard.writeText(selectedElement.value.id);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1500);
}

const CONTAINER_TYPES = new Set(["Container"]);
const CONTENT_TYPES = new Set([
  "Button",
  "Searchbar",
  "Input",
  "LabelledInput",
  "Checkbox",
  "RadioButton",
  "Toggle",
  "Image",
  "Toolbar",
  "RangeInput",
  "Card",
  "List",
  "Segment",
  "Select",
  "Badge",
  "Chip",
  "Heading",
  "TextBox",
  "Label",
  "Link",
  "Spinner",
  "Separator",
  "Spacer",
  "Camera",
  "Chart",
]);

// Ionic-themed color palette — matches Ionic's named color tokens
const PRESET_COLORS = [
  { label: "White",     value: "#ffffff"   },
  { label: "Light",     value: "#f4f5f8"   },  // ion-color-light
  { label: "Secondary", value: "#3dc2ff"   },  // ion-color-secondary
  { label: "Primary",   value: "#3880ff"   },  // ion-color-primary
  { label: "Tertiary",  value: "#b180f0"   },  // ion-color-tertiary
  { label: "Pink",      value: "#f0748e"   },  // ion-color-danger tint
  { label: "Danger",    value: "#ff4961"   },  // ion-color-danger
  { label: "Orange",    value: "#ff6d00"   },  // ion-color-warning shade
  { label: "Warning",   value: "#ffd534"   },  // ion-color-warning
  { label: "Success",   value: "#2dd36f"   },  // ion-color-success
  { label: "Teal",      value: "#0cd1e8"   },  // ion-color-secondary shade
  { label: "Dark",      value: "#222428"   },  // ion-color-dark
  { label: "Transparent", value: "transparent" },
];

// Named border-radius steps — replaces raw number input
const RADIUS_OPTIONS = [
  { label: "None", value: 0 },
  { label: "Small", value: 6 },
  { label: "Medium", value: 12 },
  { label: "Large", value: 20 },
  { label: "Full", value: 9999 },
];

// Named font size steps — replaces raw number input
const FONT_SIZE_OPTIONS = [
  { label: "Tiny (10px)", value: 10 },
  { label: "Small (12px)", value: 12 },
  { label: "Normal (14px)", value: 14 },
  { label: "Large (18px)", value: 18 },
  { label: "XL (24px)", value: 24 },
  { label: "XXL (32px)", value: 32 },
];

const HEADING_LEVEL_OPTIONS = [
  { label: "h1", value: 1 },
  { label: "h2", value: 2 },
  { label: "h3", value: 3 },
  { label: "h4", value: 4 },
  { label: "h5", value: 5 },
  { label: "h6", value: 6 },
];

const TEXTAREA_ALIGN_OPTIONS = [
  "left",
  "center",
  "right",
  "justify",
  "wrap",
  "unwrap",
] as const;

const CHECKBOX_LABEL_PLACEMENT_OPTIONS = ["start", "end"] as const;

const FAB_HORIZONTAL_OPTIONS = ["start", "center", "end"] as const;
const FAB_VERTICAL_OPTIONS = ["top", "center", "bottom"] as const;
const FAB_EDGE_OPTIONS = [true, false] as const;
const BUTTON_FILL_OPTIONS = ["solid", "outline", "clear"] as const;
const BUTTON_SIZE_OPTIONS = ["small", "default", "large"] as const;
const TOOLBAR_POSITION_OPTIONS = [
  { value: "fixed", label: "fixed top", hint: "ติดอยู่ด้านบนตลอด แม้เลื่อนหน้าจอ" },
  { value: "scroll", label: "scrolling", hint: "เลื่อนขึ้นไปพร้อมเนื้อหา" },
] as const;
// Keep in sync with BUTTON_SIZE_SPEC in CanvasElementRenderer.vue
const BUTTON_SIZE_HEIGHT: Record<string, number> = {
  small: 32,
  default: 44,
  large: 52,
};
// Ionic named colors with explicit hex so swatches render reliably in the editor
const IONIC_COLORS = [
  { name: "primary",   hex: "#3880ff", contrast: "#ffffff", label: "Primary"   },
  { name: "secondary", hex: "#3dc2ff", contrast: "#000000", label: "Secondary" },
  { name: "tertiary",  hex: "#b180f0", contrast: "#ffffff", label: "Tertiary"  },
  { name: "success",   hex: "#2dd36f", contrast: "#ffffff", label: "Success"   },
  { name: "warning",   hex: "#ffd534", contrast: "#000000", label: "Warning"   },
  { name: "danger",    hex: "#ff4961", contrast: "#ffffff", label: "Danger"    },
  { name: "light",     hex: "#f4f5f8", contrast: "#000000", label: "Light"     },
  { name: "medium",    hex: "#92949c", contrast: "#ffffff", label: "Medium"    },
  { name: "dark",      hex: "#222428", contrast: "#ffffff", label: "Dark"      },
];
const BOOLEAN_OPTIONS = [true, false] as const;

const isContainerType = computed(
  () =>
    !!selectedElement.value && CONTAINER_TYPES.has(selectedElement.value.type),
);

const hasContentProps = computed(
  () =>
    !!selectedElement.value && CONTENT_TYPES.has(selectedElement.value.type),
);

function hasProp(key: string): boolean {
  return !!selectedElement.value && key in selectedElement.value.props;
}

function patchElement(patch: Partial<AppElement>) {
  if (selectedElement.value) {
    store.updateElement(selectedElement.value.id, patch);
  }
}

function patchProps(patch: Record<string, unknown>) {
  if (selectedElement.value) {
    store.updateElementProps(selectedElement.value.id, patch);
  }
}

function changeButtonSize(size: string) {
  patchProps({ size });
  patchElement({ height: BUTTON_SIZE_HEIGHT[size] ?? 44 });
}

function parseOptions(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinOptions(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

// Direction toggle removed — Container is always vertical.

function handleDelete() {
  if (selectedElement.value) {
    store.deleteElement(selectedElement.value.id);
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
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0px;
}
</style>
