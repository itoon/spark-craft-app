<template>
  <div
    v-if="element.type === 'Container'"
    class="codecraft-container"
    :style="containerStyle"
  >
    <CodeCraftRenderer
      v-for="child in childElements"
      :key="child.id"
      :element="child"
      :elements-map="elementsMap"
      :click-handlers="clickHandlers"
      @run-click="$emit('run-click', $event)"
      @run-input="(id, patch) => $emit('run-input', id, patch)"
    />
  </div>

  <ion-card v-else-if="element.type === 'Card'">
    <ion-card-header>
      <ion-card-title>{{ element.props.title || 'Card Title' }}</ion-card-title>
      <ion-card-subtitle>{{ element.props.subtitle || 'Subtitle' }}</ion-card-subtitle>
    </ion-card-header>
  </ion-card>

  <ion-list v-else-if="element.type === 'List'" inset>
    <ion-item v-for="item in listItems" :key="item">{{ item }}</ion-item>
  </ion-list>

  <ion-segment
    v-else-if="element.type === 'Segment'"
    :value="String(selectedSegment)"
    @ionChange="handleSegmentChange"
  >
    <ion-segment-button
      v-for="(option, index) in segmentOptions"
      :key="option"
      :value="String(index)"
    >
      <ion-label>{{ option }}</ion-label>
    </ion-segment-button>
  </ion-segment>

  <ion-button
    v-else-if="element.type === 'Button'"
    expand="block"
    :fill="buttonFill"
    :style="buttonStyle"
    @click="$emit('run-click', element.id)"
  >
    {{ element.props.label || 'Button' }}
  </ion-button>

  <ion-searchbar
    v-else-if="element.type === 'Searchbar'"
    :value="String(element.props.value || '')"
    :placeholder="String(element.props.placeholder || 'Search')"
    @ionInput="handleTextInput($event)"
  />

  <ion-item v-else-if="element.type === 'LabelledInput'">
    <ion-label position="stacked">{{ element.props.label || 'Label' }}</ion-label>
    <ion-input
      :value="String(element.props.value || '')"
      :placeholder="String(element.props.placeholder || '')"
      @ionInput="handleTextInput($event)"
    />
  </ion-item>

  <ion-input
    v-else-if="element.type === 'Input'"
    fill="outline"
    :value="String(element.props.value || '')"
    :placeholder="String(element.props.placeholder || '')"
    @ionInput="handleTextInput($event)"
  />

  <ion-select
    v-else-if="element.type === 'Select'"
    :value="element.props.value"
    :placeholder="String(element.props.placeholder || 'Select')"
    @ionChange="handleValueChange($event.detail.value)"
  >
    <ion-select-option
      v-for="option in selectOptions"
      :key="option"
      :value="option"
    >
      {{ option }}
    </ion-select-option>
  </ion-select>

  <ion-range
    v-else-if="element.type === 'RangeInput'"
    :min="Number(element.props.min || 0)"
    :max="Number(element.props.max || 100)"
    :value="Number(element.props.value || 0)"
    @ionChange="handleValueChange(Number($event.detail.value || 0))"
  />

  <ion-input
    v-else-if="element.type === 'DateTimePicker'"
    type="date"
    fill="outline"
    :value="String(element.props.value || '')"
    @ionInput="handleTextInput($event)"
  />

  <ion-item
    v-else-if="element.type === 'Checkbox'"
    button
    lines="none"
    @click="$emit('run-input', element.id, { checked: !Boolean(element.props.checked) })"
  >
    <ion-checkbox slot="start" :checked="Boolean(element.props.checked)" />
    <ion-label>{{ element.props.label || 'Checkbox' }}</ion-label>
  </ion-item>

  <ion-item
    v-else-if="element.type === 'RadioButton'"
    button
    lines="none"
    @click="$emit('run-input', element.id, { selected: !Boolean(element.props.selected) })"
  >
    <ion-radio slot="start" :checked="Boolean(element.props.selected)" />
    <ion-label>{{ element.props.label || 'Option' }}</ion-label>
  </ion-item>

  <ion-item v-else-if="element.type === 'Toggle'" lines="none">
    <ion-label>{{ element.props.label || 'Toggle' }}</ion-label>
    <ion-toggle
      slot="end"
      :checked="Boolean(element.props.on)"
      @ionChange="$emit('run-input', element.id, { on: $event.detail.checked })"
    />
  </ion-item>

  <ion-badge v-else-if="element.type === 'Badge'" :style="colorStyle">
    {{ element.props.text || 'Badge' }}
  </ion-badge>

  <ion-chip v-else-if="element.type === 'Chip'" :outline="Boolean(element.props.outline)" :style="colorStyle">
    <ion-label>{{ element.props.label || 'Chip' }}</ion-label>
  </ion-chip>

  <ion-spinner v-else-if="element.type === 'Spinner'" name="crescent" :style="colorStyle" />

  <ion-img
    v-else-if="element.type === 'Image'"
    :src="String(element.props.src || '')"
    :alt="String(element.props.alt || '')"
  />

  <div v-else-if="element.type === 'Icon'" class="icon-wrapper" :style="colorStyle">
    <ion-icon :icon="resolvedIcon" />
  </div>

  <div v-else class="unsupported">
    {{ element.type }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonChip,
  IonIcon,
  IonImg,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRadio,
  IonRange,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToggle,
} from '@ionic/vue';
import { add, calendar, search, star } from 'ionicons/icons';
import type { CodeCraftElement } from '../data/codecraft-app';

const props = defineProps<{
  element: CodeCraftElement;
  elementsMap: Map<string, CodeCraftElement>;
  clickHandlers: Record<string, () => void>;
}>();

const emit = defineEmits<{
  (event: 'run-click', id: string): void;
  (event: 'run-input', id: string, patch: Record<string, unknown>): void;
}>();

const childElements = computed(() =>
  props.element.children
    .map((childId) => props.elementsMap.get(childId))
    .filter((value): value is CodeCraftElement => Boolean(value)),
);

const listItems = computed(() =>
  Array.isArray(props.element.props.items) ? props.element.props.items as string[] : [],
);

const segmentOptions = computed(() =>
  Array.isArray(props.element.props.options) ? props.element.props.options as string[] : [],
);

const selectOptions = computed(() =>
  Array.isArray(props.element.props.options) ? props.element.props.options as string[] : [],
);

const selectedSegment = computed(() => Number(props.element.props.selected || 0));
const buttonFill = computed(() => String(props.element.props.fill || 'solid'));

const containerStyle = computed(() => ({
  display: 'flex',
  flexDirection: String(props.element.props.direction || 'col') === 'row' ? 'row' : 'column',
  gap: `${Number(props.element.props.gap || 16)}px`,
  padding: `${Number(props.element.props.padding || 16)}px`,
  width: '100%',
  boxSizing: 'border-box',
}));

const buttonStyle = computed(() => ({
  '--background': String(props.element.props.backgroundColor || '#3880ff'),
}));

const colorStyle = computed(() => ({
  '--color': String(props.element.props.color || '#3880ff'),
  color: String(props.element.props.color || '#3880ff'),
}));

const resolvedIcon = computed(() => {
  const iconName = String(props.element.props.name || props.element.props.icon || '');
  if (iconName.includes('calendar')) return calendar;
  if (iconName.includes('search')) return search;
  if (iconName.includes('star')) return star;
  return add;
});

function handleTextInput(event: CustomEvent) {
  const nextValue = String(event.detail.value || '');
  emitInput({ value: nextValue });
}

function handleValueChange(value: unknown) {
  emitInput({ value });
}

function handleSegmentChange(event: CustomEvent) {
  const rawValue = Number(event.detail.value || 0);
  emitInput({ selected: rawValue });
}

function emitInput(patch: Record<string, unknown>) {
  emit('run-input', props.element.id, patch);
}
</script>

<style scoped>
.codecraft-container {
  width: 100%;
}

.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.unsupported {
  padding: 12px;
  border: 1px dashed rgba(56, 128, 255, 0.3);
  border-radius: 12px;
  color: #6b7280;
  font-size: 12px;
}
</style>
