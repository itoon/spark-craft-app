<template>
  <div
    v-if="element.type === 'Container'"
    class="relative w-full transition-colors duration-100 select-none"
    :class="[
      element.parentId && !props.isRunMode
        ? 'border-2 border-dashed rounded-sm'
        : '',
      isSelected && !props.isRunMode
        ? 'border-indigo-500 bg-indigo-500/5'
        : element.parentId && !props.isRunMode
          ? 'border-slate-400/30 hover:border-indigo-400/50'
          : '',
    ]"
    :style="containerStyle"
    @click.stop="handleElementClick"
  >
    <div
      v-if="isSelected && !props.isRunMode"
      class="absolute -top-5 left-0 z-10 flex items-center gap-1 pointer-events-none"
    >
      <span
        class="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-mono leading-none"
        >{{ element.type }}</span
      >
    </div>
    <div class="flex w-full flex-col" :style="innerFlexStyle">
      <div
        v-for="childId in visibleChildIds"
        :key="childId"
        :draggable="!props.isRunMode"
        class="relative transition-shadow duration-100 w-full"
        :class="{
          'canvas-element': !props.isRunMode,
          'ring-2 ring-indigo-400 ring-offset-0':
            !props.isRunMode && store.selectedElementId.value === childId,
          'ring-2 ring-indigo-300':
            !props.isRunMode &&
            dragOverChildId === childId &&
            draggingChildId !== childId,
          'opacity-40': !props.isRunMode && draggingChildId === childId,
          'cursor-pointer': !props.isRunMode,
          'cc-not-added': !props.isRunMode && pageAdd.isNotAddedId(childId),
        }"
        :style="childStyle(childId)"
        @click.stop="onChildWrapperClick(childId)"
        @dragstart="onChildDragStart($event, childId)"
        @dragover.prevent="onChildDragOver($event, childId)"
        @drop.prevent="onChildDrop($event, childId)"
        @dragend="onChildDragEnd"
      >
        <template
          v-if="store.selectedElementId.value === childId && !props.isRunMode"
        >
          <div
            class="absolute -top-5 left-0 z-10 flex items-center gap-1 pointer-events-none"
          >
            <span
              class="text-[9px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-mono leading-none"
              >{{ getElement(childId)?.type }}</span
            >
          </div>
        </template>
        <!-- Not in page.add() → won't appear in Run / Live / APK -->
        <span
          v-if="!props.isRunMode && pageAdd.isNotAddedId(childId)"
          class="cc-not-added-badge"
          :title="`${getElement(childId)?.id} ยังไม่ได้ page.add() ในโค้ด — จะไม่โผล่ตอน Run`"
        >
          ยังไม่ add
        </span>
        <EditorCanvasElementRenderer
          v-if="getElement(childId)"
          :element="getElement(childId)!"
          :is-run-mode="props.isRunMode"
          :platform-override="props.platformOverride"
          :runtime-element-ids="props.runtimeElementIds"
          :runtime-elements="props.runtimeElements"
          @run-click="emit('run-click', $event)"
          @run-input="(id, patch) => emit('run-input', id, patch)"
          @run-event="(id, name, payload) => emit('run-event', id, name, payload)"
        />
      </div>
      <div
        v-if="
          !props.isRunMode &&
          element.parentId &&
          (element.children.length === 0 || isSelected)
        "
        class="flex items-center justify-center shrink-0 opacity-40 w-full h-6"
      >
        <UIcon name="i-lucide-plus" class="size-3 text-slate-400" />
      </div>
    </div>
  </div>
  <IonHeader
    v-else-if="element.type === 'Toolbar'"
    :mode="isRunMode ? (platform == 'ios' ? 'ios' : 'md') : ionicMode"
    style="height: 100%"
  >
    <IonToolbar
      class="toolbar-canvas w-full select-none"
      :mode="isRunMode ? (platform == 'ios' ? 'ios' : 'md') : ionicMode"
      :style="toolbarStyle"
      @click.stop="handleElementClick"
    >
      <IonButtons v-if="element.props.showBack" slot="start">
        <button
          type="button"
          class="inline-flex shrink-0 items-center justify-center px-2 h-full"
          @click.stop.prevent="handleToolbarBackClick"
        >
          <UIcon
            :name="
              platform === 'ios'
                ? 'i-lucide-chevron-left'
                : 'i-lucide-arrow-left'
            "
            class="size-5 shrink-0"
            :style="{
              color:
                (element.props.ionicColorContrast as string) ||
                resolveIonicColor(toolbarIonicColor).contrast,
            }"
          />
        </button>
      </IonButtons>
      <div
        class="flex items-center h-full overflow-hidden"
        :class="platform == 'ios' ? 'justify-center' : 'justify-start'"
        :style="toolbarTitleStyle"
      >
        {{ (element.props.title as string) || "My App" }}
      </div>
    </IonToolbar>
  </IonHeader>
  <!-- ─── Button (ion-button) ────────────────────────────
       iOS  : rounded-full, ghost/solid, colored text or filled
       Android: rounded-md, contained Material button -->
  <IonButton
    v-else-if="element.type === 'Button'"
    :mode="isRunMode ? (platform == 'ios' ? 'ios' : 'md') : ionicMode"
    expand="block"
    :fill="buttonFill"
    :disabled="Boolean(element.props.disabled)"
    :class="[
      'canvas-button select-none',
      buttonRuntimeClass,
      designInteractiveClass,
    ]"
    :style="buttonStyle"
    @click.stop="handleButtonClick"
    @pointerdown="startLongPress"
    @pointerup="cancelLongPress"
    @pointerleave="cancelLongPress"
    @pointercancel="cancelLongPress"
    @contextmenu="onButtonContextMenu"
  >
    {{ (element.props.content as string) || "Button" }}
  </IonButton>
  <!-- ─── Separator ─────────────────────────────────── -->
  <div
    v-else-if="element.type === 'Separator'"
    class="w-full h-full flex items-center select-none box-border"
    :style="{
      paddingTop: `${element.props.paddingTop ?? 8}px`,
      paddingBottom: `${element.props.paddingBottom ?? 8}px`,
    }"
    @click.stop="handleElementClick"
  >
    <div
      class="w-full"
      :style="{
        height: `${element.props.thickness ?? 1}px`,
        backgroundColor: (element.props.color as string) || '#e2e8f0',
      }"
    />
  </div>
  <!-- ─── Spacer ────────────────────────────────────── -->
  <div
    v-else-if="element.type === 'Spacer'"
    class="w-full h-full border border-dashed border-gray-300 flex items-center justify-center select-none"
  >
    <UIcon name="i-lucide-move-vertical" class="size-3 text-gray-300" />
  </div>

  <!-- ─── List (ion-list / ion-item) ─────────────────────
       iOS  : inset rounded card, inner separators
       Android: flat full-width list, dividers -->
  <IonList
    v-else-if="element.type === 'List'"
    class="w-full h-full overflow-hidden select-none"
    :mode="ionicMode"
    :style="listWrapStyle"
    @click.stop="handleElementClick"
  >
    <IonItem
      v-for="(item, i) in listContent"
      :key="i"
      :mode="ionicMode"
      lines="full"
      :style="listItemStyle(i)"
      @click.stop="handleListItemClick(item, i)"
    >
      <IonLabel class="text-[12px] text-gray-700">
        {{ getListItemLabel(item) }}
      </IonLabel>
      <UIcon
        name="i-lucide-chevron-right"
        class="size-3 text-gray-400 shrink-0"
      />
    </IonItem>
  </IonList>
  <!-- ─── FloatingActionButton (ion-fab-button) ──────────
       iOS  : circle, primary color, soft shadow
       Android: circle, primary color, Material elevation -->
  <IonFabButton
    v-else-if="element.type === 'FloatingActionButton'"
    :mode="ionicMode"
    :class="['w-full h-full select-none canvas-fab', designInteractiveClass]"
    :style="fabStyle"
    @click.stop="handleElementClick"
  >
    <UIcon
      :name="(element.props.icon as string) || 'i-lucide-plus'"
      class="size-5"
      :style="{ color: fabIconColor }"
    />
  </IonFabButton>

  <!-- ─── LabelledInput (ion-input with stacked label) ───
       iOS  : rounded outline border, floating label
       Android: underline + floating label (Material) -->
  <IonList
    v-else-if="element.type === 'LabelledInput'"
    class="p-0! w-full min-w-0"
  >
    <IonItem :style="formItemStyle">
      <IonInput
        label-placement="floating"
        :mode="ionicMode"
        :placeholder="(element.props.placeholder as string) || ''"
        :value="(element.props.value as string) || ''"
        :label="(element.props.label as string) || 'Label'"
        @click.stop="handleElementClick"
        @ionInput="handleIonInput"
        @keydown.enter="handleInputEnter"
      ></IonInput>
    </IonItem>
  </IonList>

  <!-- ─── Input (ion-input) ──────────────────────────────
       iOS  : rounded rect border
       Android: bottom-border only (Material underline) -->
  <IonList v-else-if="element.type === 'Input'" class="p-0! w-full">
    <IonItem :style="formItemStyle">
      <IonInput
        label-placement="stacked"
        :mode="ionicMode"
        :placeholder="(element.props.placeholder as string) || ''"
        :value="(element.props.value as string) || ''"
        :label="(element.props.label as string) || 'Label'"
        @click.stop="handleElementClick"
        @ionInput="handleIonInput"
        @keydown.enter="handleInputEnter"
      />
    </IonItem>
  </IonList>

  <!-- ─── Heading ──────────────────────────────────────── -->
  <IonLabel
    v-else-if="element.type === 'Heading'"
    class="w-full h-full flex items-center overflow-hidden select-none"
    :style="{
      color: (element.props.color as string) || '#0f172a',
      fontSize: headingFontSize,
      fontWeight: '700',
      lineHeight: '1.1',
    }"
    @click.stop="handleElementClick"
  >
    {{
      (element.props.content as string) ||
      (element.props.text as string) ||
      "Heading"
    }}
  </IonLabel>

  <!-- ─── Select (ion-select) ───────────────────────────────────────────
           iOS  : right-aligned value + chevrons
           Android: underline field + dropdown arrow
           interface="alert": a popover is placed from viewport coords and
           lands off-target inside the CSS-scaled device frame.              -->
  <IonList
    v-else-if="element.type === 'Select'"
    class="p-0! w-full"
    :mode="ionicMode"
  >
    <IonItem :style="formItemStyle">
      <IonSelect
        class="w-full"
        :mode="ionicMode"
        interface="alert"
        :style="selectStyle"
        :value="(element.props.value as string) || ''"
        :placeholder="(element.props.placeholder as string) || 'Select...'"
        @click.stop="handleElementClick"
        @ionChange="handleSelectChange"
      >
        <IonSelectOption
          v-for="(item, idx) in selectContent"
          :key="idx"
          :value="getListItemValue(item)"
        >
          {{ getListItemLabel(item) }}
        </IonSelectOption>
      </IonSelect>
    </IonItem>
  </IonList>

  <!-- ─── RangeInput (ion-range) ────────────────────────────────────────
           iOS  : rounded track, iOS pill thumb
           Android: rectangular track ends, Material thumb                   -->
  <IonRange
    v-else-if="element.type === 'RangeInput'"
    class="w-full h-full"
    :mode="ionicMode"
    :min="Number(element.props.min ?? 0)"
    :max="Number(element.props.max ?? 100)"
    :value="Number(element.props.value ?? 50)"
    :pin="true"
    @click.stop="handleElementClick"
    @ionInput="handleIonRangeInput"
  />

  <!-- ─── DateTimePicker (ion-datetime) ────────────────────────────────
           iOS  : wheel-style hint, rounded rect
           Android: text field style                                         -->
  <IonList
    v-else-if="element.type === 'DateTimePicker'"
    class="p-0! w-full"
    :mode="ionicMode"
  >
    <IonItem :style="formItemStyle" @click.stop="handleElementClick">
      <!-- host centres its buttons by default; pin left like the other rows -->
      <ion-datetime-button
        class="justify-start"
        :mode="ionicMode"
        :datetime="datetimeId"
      ></ion-datetime-button>
    </IonItem>

    <ion-modal :mode="ionicMode" :keep-contents-mounted="true">
      <ion-datetime
        :id="datetimeId"
        :mode="ionicMode"
        :value="(element.props.value as string) || undefined"
        @ionChange="handleDatetimeChange"
      ></ion-datetime>
    </ion-modal>
  </IonList>

  <!-- ─── Checkbox (ion-checkbox) ───────────────────────────────────────
           iOS  : rounded-sm with checkmark, indigo fill
           Android: rounded-sm, Material style                               -->
  <IonList
    v-else-if="element.type === 'Checkbox'"
    class="p-0! w-full"
    :mode="ionicMode"
  >
    <IonItem :style="formItemStyle" @click.stop="handleElementClick">
      <IonCheckbox
        :mode="ionicMode"
        justify="start"
        :label-placement="
          (element.props.labelPlacement as string) === 'start' ? 'start' : 'end'
        "
        :checked="Boolean(element.props.checked)"
        @ionChange="handleCheckboxChange"
        class="text-gray-700"
        >{{ (element.props.label as string) || "Checkbox" }}</IonCheckbox
      >
    </IonItem>
  </IonList>

  <!-- ─── RadioButton (ion-radio) ───────────────────────────────────────
           iOS  : checkmark style (filled circle with inner check)
           Android: outer ring + filled inner circle                         -->
  <IonList
    v-else-if="element.type === 'RadioButton'"
    class="p-0! w-full"
    :mode="ionicMode"
    @click.stop="handleElementClick"
  >
    <IonRadioGroup
      :mode="ionicMode"
      :value="radioGroupValue"
      @ionChange="handleRadioChange"
    >
      <IonItem
        v-for="(item, idx) in radioContent"
        :key="idx"
        :style="formItemStyle"
      >
        <!-- iOS: label left + checkmark right (no circle when unchecked);
             Android: circle left + label -->
        <IonRadio
          class="w-full"
          :mode="ionicMode"
          :justify="platform === 'ios' ? 'space-between' : 'start'"
          :label-placement="platform === 'ios' ? 'start' : 'end'"
          :value="getListItemValue(item)"
          >{{ getListItemLabel(item) }}</IonRadio
        >
      </IonItem>
    </IonRadioGroup>
  </IonList>

  <!-- ─── Toggle (ion-toggle) ───────────────────────────────────────────
           iOS  : wide pill, green when on
           Android: narrower track, colored when on                          -->
  <IonList
    v-else-if="element.type === 'Toggle'"
    class="p-0! w-full"
    :mode="ionicMode"
  >
    <IonItem :style="formItemStyle" @click.stop="handleElementClick">
      <IonToggle
        class="w-full text-gray-700"
        :mode="ionicMode"
        justify="space-between"
        label-placement="start"
        :checked="Boolean(element.props.on)"
        :style="toggleStyle"
        @ionChange="handleToggleChange"
        >{{
          (element.props.content as string) ||
          (element.props.label as string) ||
          "Label"
        }}</IonToggle
      >
    </IonItem>
  </IonList>
  <!-- ─── Spinner (ion-spinner) ──────────────────────────
       iOS  : iOS activity spinner (lines)
       Android: Material circular progress -->
  <div
    v-else-if="element.type === 'Spinner' && spinnerVisible"
    class="w-full h-full flex items-center justify-center select-none"
    @click.stop="handleElementClick"
  >
    <IonSpinner
      :name="platform === 'ios' ? 'lines' : 'crescent'"
      :style="{ color: ionColor }"
    />
  </div>
  <!-- ─── Label ────────────────────────────────────────── -->
  <IonLabel
    v-else-if="element.type === 'Label'"
    class="w-full h-full flex items-center overflow-hidden select-none"
    :style="{
      color: (element.props.color as string) || '#334155',
      fontSize: `${element.props.fontSize ?? 14}px`,
      lineHeight: '1.3',
    }"
    @click.stop="handleElementClick"
  >
    {{ (element.props.content as string) || "Label" }}
  </IonLabel>

  <IonTextarea
    v-else-if="element.type === 'TextBox'"
    :class="[
      'canvas-textarea w-full h-full overflow-hidden select-none',
      designInteractiveClass,
    ]"
    :mode="ionicMode"
    fill="outline"
    :auto-grow="false"
    :value="(element.props.content as string) || ''"
    :placeholder="(element.props.placeholder as string) || 'Write something...'"
    :style="{
      '--color': (element.props.color as string) || '#334155',
      fontSize: `${element.props.fontSize ?? 14}px`,
      lineHeight: '1.4',
      textAlign: (element.props.textAlign as string) || 'left',
      whiteSpace:
        (element.props.wrap as string) === 'unwrap' ? 'nowrap' : 'normal',
      wordBreak:
        (element.props.wrap as string) === 'unwrap' ? 'normal' : 'break-word',
    }"
    @click.stop="handleElementClick"
    @ionInput="handleTextareaInput"
  />

  <!-- ─── Image (ion-img) ────────────────────────────── -->
  <IonImg
    v-else-if="element.type === 'Image'"
    :src="(element.props.src as string) || 'https://picsum.photos/800/480'"
    class="w-full select-none cursor-pointer"
    :style="imageStyle"
    @click.stop="handleElementClick"
  />

  <!-- ─── Link ──────────────────────────────────────── -->
  <div
    v-else-if="element.type === 'Link'"
    class="w-full h-full flex items-center overflow-hidden select-none"
    @click.stop="handleElementClick"
  >
    <a
      v-if="isRunMode"
      :href="(element.props.href as string) || '#'"
      :target="(element.props.target as string) || '_blank'"
      class="text-[12px] underline truncate"
      :style="{ color: (element.props.color as string) || ionColor }"
      @click.stop
    >
      {{
        (element.props.content as string) ||
        (element.props.text as string) ||
        "Click here"
      }}
    </a>
    <span
      v-else
      class="text-[12px] underline truncate"
      :style="{ color: (element.props.color as string) || ionColor }"
    >
      {{
        (element.props.content as string) ||
        (element.props.text as string) ||
        "Click here"
      }}
    </span>
  </div>

  <!-- ─── Camera: phone-style viewfinder ─────────────────────────────── -->
  <EditorElementsCameraViewfinder
    v-else-if="element.type === 'Camera'"
    :status="cameraViewStatus"
    :platform="platform"
    :height="cameraHeight"
    :filter-name="cameraFilterName"
    :frozen-frame="(element.props.frozenFrame as string | null) ?? null"
    :error="cameraError"
    @click.stop="handleElementClick"
  >
    <video
      v-if="shouldUseLiveCamera && !cameraError"
      ref="cameraVideoRef"
      :data-codecraft-camera-video-id="element.id"
      :style="{ filter: cameraFilterCss }"
      autoplay
      muted
      playsinline
      @playing="cameraLive = true"
    />
  </EditorElementsCameraViewfinder>

  <!-- ─── Map (Leaflet + OpenStreetMap) ─────────────────────────────── -->
  <div
    v-else-if="element.type === 'Map'"
    class="isolate w-full overflow-hidden rounded-xl border border-neutral-200 bg-white select-none"
    :style="{ height: `${Math.max(Number(element.height) || 0, 120)}px` }"
    @click.stop="!isRunMode && handleElementClick()"
  >
    <ClientOnly>
      <EditorElementsMapRenderer
        :lat="Number(element.props.lat ?? 13.7563)"
        :lng="Number(element.props.lng ?? 100.5018)"
        :zoom="Number(element.props.zoom ?? 13)"
        :markers="(element.props.markers as MapMarker[]) || []"
        :interactive="isRunMode"
        @map-click="handleMapClick"
      />
    </ClientOnly>
  </div>

  <!-- ─── Chart ─────────────────────────────────────────────────────── -->
  <div
    v-else-if="element.type === 'Chart'"
    class="w-full h-full overflow-hidden rounded-xl border border-neutral-200 bg-white select-none"
    @click.stop="handleElementClick"
  >
    <ClientOnly>
      <EditorElementsChartRenderer
        :chart-type="
          (element.props.chartType as 'bar' | 'line' | 'pie' | 'doughnut') ||
          'bar'
        "
        :labels="
          (element.props.labels as string[]) || ['A', 'B', 'C', 'D', 'E']
        "
        :datasets="chartDatasets"
        :title="(element.props.title as string) || ''"
      />
      <template #fallback>
        <div
          class="w-full h-full flex items-center justify-center text-neutral-400 text-xs"
        >
          <UIcon name="i-lucide-chart-bar" class="size-8" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { buildToolbarBackButtonClickId, describeCameraError } from "~/composables/useRuntime";
import type { CameraViewStatus } from "~/components/editor/elements/CameraViewfinder.vue";
import type { AppElement } from "~/composables/useEditorStore";
import { useEditorStore } from "~/composables/useEditorStore";
import { usePageAddStatus } from "~/composables/usePageAddStatus";
import {
  getListItemLabel,
  getListItemValue,
  resolveListContent,
  type ListContentValue,
} from "~/utils/listContent";
import { getVisibleRuntimeChildIds } from "~/utils/runtimeVisibility";

interface MapMarker {
  lat: number;
  lng: number;
  text?: string;
}

const props = defineProps<{
  element: AppElement;
  isRunMode?: boolean;
  forcedHeight?: number;
  runtimeElementIds?: string[];
  runtimeElements?: AppElement[];
  platformOverride?: "ios" | "android";
}>();
const emit = defineEmits<{
  (e: "run-click", id: string): void;
  (e: "run-input", id: string, propsPatch: Record<string, unknown>): void;
  /** Element events that are not a prop change, e.g. Camera ready / error */
  (e: "run-event", id: string, name: string, payload?: unknown): void;
}>();

const store = useEditorStore();
const pageAdd = usePageAddStatus();
const cameraVideoRef = ref<HTMLVideoElement | null>(null);
const cameraError = ref("");
let cameraStream: MediaStream | null = null;

const isSelected = computed(
  () => store.selectedElementId.value === props.element.id,
);
const platform = computed(
  () => props.platformOverride ?? store.activePlatform.value,
);
const ionicMode = computed(() => (platform.value === "android" ? "md" : "ios"));
const visibleChildIds = computed(() =>
  getVisibleRuntimeChildIds(
    props.element.children,
    props.runtimeElementIds,
    props.isRunMode,
  ),
);
const shouldUseLiveCamera = computed(
  () =>
    props.isRunMode &&
    props.element.type === "Camera" &&
    !!props.element.props.open,
);

// ── Run Mode Click Handling ──────────────────────────────────────────────
function handleElementClick() {
  if (props.isRunMode) {
    emit("run-click", props.element.id);
  } else {
    store.selectElement(props.element.id);
  }
}

// Map taps: store where the user tapped, then fire onClick (handler reads lastClick)
function handleMapClick(lat: number, lng: number) {
  if (!props.isRunMode) return;
  emit("run-input", props.element.id, { lastClick: { lat, lng } });
  emit("run-click", props.element.id);
}

function handleButtonClick() {
  if (props.isRunMode && props.element.props.disabled) return;
  // The press already ran onLongPress — don't also count it as a tap
  if (longPressFired) {
    longPressFired = false;
    return;
  }
  handleElementClick();
}

// ── Button long press: hold ≥ LONG_PRESS_MS → run-event 'longpress' ─────
const LONG_PRESS_MS = 600;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let longPressFired = false;

function startLongPress() {
  if (!props.isRunMode || props.element.props.disabled) return;
  cancelLongPress();
  longPressFired = false;
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    longPressFired = true;
    emit("run-event", props.element.id, "longpress");
  }, LONG_PRESS_MS);
}

function cancelLongPress() {
  if (longPressTimer) clearTimeout(longPressTimer);
  longPressTimer = null;
}

function onButtonContextMenu(event: Event) {
  // Holding a button on a phone opens the browser menu; it's a long press here
  if (props.isRunMode) event.preventDefault();
}

// ── List row tap: onItemClick(item, index), then the list's onClick ──────
function handleListItemClick(item: ListContentValue, index: number) {
  if (props.isRunMode) {
    emit("run-event", props.element.id, "itemclick", { item: getListItemLabel(item), index });
  }
  handleElementClick();
}

// ── Input Enter: onEnter(text) ──────────────────────────────────────────
function handleInputEnter(event: KeyboardEvent) {
  if (!props.isRunMode || event.isComposing) return;
  const target = event.target as HTMLInputElement | null;
  const text = target?.value ?? String(props.element.props.value ?? "");
  emit("run-event", props.element.id, "enter", text);
}

function handleToolbarBackClick() {
  if (props.isRunMode) {
    emit("run-click", buildToolbarBackButtonClickId(props.element.id));
  } else {
    store.selectElement(props.element.id);
  }
}

const spinnerVisible = computed(
  () => props.element.type !== "Spinner" || props.element.props.show !== false,
);

const imageStyle = computed(() => ({
  width: "100%",
  height: props.element.height > 0 ? `${props.element.height}px` : "auto",
  objectFit: "contain",
  borderRadius: `${props.element.props.borderRadius ?? 4}px`,
}));

const cameraHeight = computed(() => Math.max(Number(props.element.height) || 0, 120));
// True once the first video frame plays (between open() and that: "starting")
const cameraLive = ref(false);
const cameraViewStatus = computed<CameraViewStatus>(() => {
  if (!props.isRunMode) return "design";
  if (cameraError.value) return "error";
  if (props.element.props.frozenFrame) return "frozen";
  if (!props.element.props.open) return "closed";
  return cameraLive.value ? "live" : "starting";
});
const cameraFilterName = computed(() => {
  const f = props.element.props.filter as string | undefined;
  return f && f !== "none" ? f : "";
});

// Clicks that reach the container's child wrapper in design mode — fired
// because the inner interactive element has `pointer-events: none` and lets
// the click fall through. Use it to select the child instead of the parent.
function onChildWrapperClick(childId: string) {
  if (props.isRunMode) {
    emit("run-click", childId);
  } else {
    store.selectElement(childId);
  }
}

// Applied to every interactive Ionic element so that, in design mode, the
// element cannot receive clicks, focus, typing, or ripple effects. The click
// falls through to the surrounding wrapper which handles selection.
const designInteractiveClass = computed(() =>
  props.isRunMode ? "" : "pointer-events-none",
);

// ── Camera lifecycle ─────────────────────────────────────────────────────
function reportCameraError(message: string) {
  cameraError.value = message;
  emit("run-event", props.element.id, "error", message);
}

async function startCameraPreview() {
  if (!import.meta.client || !shouldUseLiveCamera.value) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    reportCameraError(describeCameraError(null));
    return;
  }

  stopCameraPreview();
  cameraError.value = "";

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    await nextTick();

    if (!cameraVideoRef.value) return;

    cameraVideoRef.value.srcObject = cameraStream;
    await cameraVideoRef.value.play().catch(() => undefined);
    emit("run-event", props.element.id, "ready");
  } catch (error) {
    reportCameraError(describeCameraError(error));
    stopCameraPreview();
  }
}

function stopCameraPreview() {
  cameraLive.value = false;
  if (cameraVideoRef.value) {
    cameraVideoRef.value.pause();
    cameraVideoRef.value.srcObject = null;
  }

  if (cameraStream) {
    for (const track of cameraStream.getTracks()) {
      track.stop();
    }
    cameraStream = null;
  }
}

watch(
  shouldUseLiveCamera,
  (enabled) => {
    if (enabled) {
      void startCameraPreview();
      return;
    }
    stopCameraPreview();
    cameraError.value = "";
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  cancelLongPress();
  stopCameraPreview();
});

// ── Run-mode input handlers ──────────────────────────────────────────────
function updateRunProps(propsPatch: Record<string, unknown>) {
  if (!props.isRunMode) return;
  emit("run-input", props.element.id, propsPatch);
}

function handleIonInput(event: CustomEvent) {
  updateRunProps({ value: String(event.detail.value ?? "") });
}

function handleSearchbarInput(event: CustomEvent) {
  updateRunProps({ value: String(event.detail.value ?? "") });
}

function handleTextareaInput(event: CustomEvent) {
  updateRunProps({ content: String(event.detail.value ?? "") });
}

function handleIonRangeInput(event: CustomEvent) {
  updateRunProps({ value: Number(event.detail.value ?? 0) });
}

function handleCheckboxChange(event: CustomEvent) {
  updateRunProps({ checked: Boolean(event.detail.checked) });
}

function handleToggleChange(event: CustomEvent) {
  updateRunProps({ on: Boolean(event.detail.checked) });
}

function handleRadioChange(event: CustomEvent) {
  const v = event.detail?.value;
  if (typeof v === "boolean") {
    updateRunProps({ selected: Boolean(v) });
    return;
  }
  updateRunProps({ value: String(v ?? "") });
}

function handleSelectChange(event: CustomEvent) {
  updateRunProps({ value: String(event.detail.value ?? "") });
}

function handleSegmentChange(event: CustomEvent) {
  updateRunProps({ selected: Number(event.detail.value ?? 0) });
}

function handleDatetimeChange(event: CustomEvent) {
  updateRunProps({ value: String(event.detail.value ?? "") });
}

// ── Ionic color map — explicit hex values for reliable canvas rendering ───
const IONIC_COLOR_MAP: Record<string, { bg: string; contrast: string }> = {
  primary: { bg: "#3880ff", contrast: "#ffffff" },
  secondary: { bg: "#3dc2ff", contrast: "#000000" },
  tertiary: { bg: "#b180f0", contrast: "#ffffff" },
  success: { bg: "#2dd36f", contrast: "#ffffff" },
  warning: { bg: "#ffd534", contrast: "#000000" },
  danger: { bg: "#ff4961", contrast: "#ffffff" },
  light: { bg: "#f4f5f8", contrast: "#000000" },
  medium: { bg: "#92949c", contrast: "#ffffff" },
  dark: { bg: "#222428", contrast: "#ffffff" },
};

function resolveIonicColor(name: string): { bg: string; contrast: string } {
  return IONIC_COLOR_MAP[name] ?? { bg: "#3880ff", contrast: "#ffffff" };
}

// ── Styling helpers ──────────────────────────────────────────────────────
const ionColor = computed(
  () => (props.element.props.color as string) || "#3880ff",
);
const selectOptions = computed(
  () => (props.element.props.options as string[]) || ["Option 1", "Option 2"],
);
const buttonFill = computed(
  () =>
    ((props.element.props.fill as string) || "solid") as
      | "solid"
      | "outline"
      | "clear",
);

const buttonSize = computed(
  () =>
    ((props.element.props.size as string) || "default") as
      | "small"
      | "default"
      | "large",
);

/**
 * One size scale for buttons (we size them ourselves instead of using
 * Ionic's size="small|large", which only changed the font and made text
 * look cramped or tiny next to our fixed heights).
 *  - small   32px: secondary actions inside a row / card
 *  - default 44px: the minimum comfortable touch target on phones (iOS HIG)
 *  - large   52px: the main call-to-action of a screen
 */
const BUTTON_SIZE_SPEC: Record<
  "small" | "default" | "large",
  { height: number; font: number; padX: number; radius: number }
> = {
  small: { height: 32, font: 13, padX: 12, radius: 8 },
  default: { height: 44, font: 16, padX: 16, radius: 10 },
  large: { height: 52, font: 18, padX: 20, radius: 12 },
};

const buttonIonicColor = computed(
  () => (props.element.props.ionicColor as string) || "primary",
);

// ── Toolbar ───────────────────────────────────────────────────────────────
const toolbarIonicColor = computed(
  () => (props.element.props.ionicColor as string) || "primary",
);

const toolbarStyle = computed(() => {
  const ionicHex =
    (props.element.props.ionicColorHex as string) ||
    resolveIonicColor(toolbarIonicColor.value).bg;
  const ionicContrast =
    (props.element.props.ionicColorContrast as string) ||
    resolveIonicColor(toolbarIonicColor.value).contrast;
  return {
    "--background": ionicHex,
    "--color": ionicContrast,
    "--ion-toolbar-color": ionicContrast,
    "--ion-toolbar-background": ionicHex,
    "--min-height": "100%",
    height: "100%",
  };
});

const toolbarTitleStyle = computed(() => {
  const contrast =
    (props.element.props.ionicColorContrast as string) ||
    resolveIonicColor(toolbarIonicColor.value).contrast;
  if (platform.value === "ios") {
    return {
      fontWeight: "700",
      fontSize: "17px",
      flex: "1",
      textAlign: "center" as const,
      color: contrast,
      paddingLeft: "16px",
      paddingRight: "16px",
    };
  }
  // Material: title starts 16px from the edge, or 8px after the back arrow
  return {
    fontWeight: "500",
    fontSize: "20px",
    flex: "1",
    textAlign: "left" as const,
    color: contrast,
    paddingLeft: props.element.props.showBack ? "8px" : "16px",
    paddingRight: "16px",
  };
});

// ── Card ──────────────────────────────────────────────────────────────────
const cardStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || "#ffffff";
  if (platform.value === "ios") {
    return {
      "--background": bg,
      borderRadius: "16px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    };
  }
  return {
    "--background": bg,
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  };
});

// ── Segment ───────────────────────────────────────────────────────────────
const segmentOptions = computed(
  () =>
    (props.element.props.options as string[]) || ["Tab 1", "Tab 2", "Tab 3"],
);

const segmentWrapStyle = computed(() => {
  if (platform.value === "ios") {
    return { backgroundColor: "#f0f0f0", borderRadius: "10px", padding: "2px" };
  }
  return { backgroundColor: "#ffffff", borderBottom: `2px solid #e5e7eb` };
});

function segmentItemStyle(idx: number) {
  const color = (props.element.props.color as string) || "#3880ff";
  const selected = (props.element.props.selected as number) ?? 0;
  if (platform.value === "ios") {
    return idx === selected
      ? {
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          color: "#000000",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          height: "100%",
        }
      : { color: "#888888" };
  }
  return idx === selected
    ? { color: color, borderBottom: `2px solid ${color}`, marginBottom: "-2px" }
    : { color: "#888888" };
}

// ── Button ────────────────────────────────────────────────────────────────
const buttonStyle = computed(() => {
  const fill = (props.element.props.fill as string) || "solid";
  const isDisabled = Boolean(props.element.props.disabled);
  const spec = BUTTON_SIZE_SPEC[buttonSize.value] ?? BUTTON_SIZE_SPEC.default;
  const h = `${spec.height}px`;
  const ionicHex =
    (props.element.props.ionicColorHex as string) ||
    resolveIonicColor(buttonIonicColor.value).bg;
  const ionicContrast =
    (props.element.props.ionicColorContrast as string) ||
    resolveIonicColor(buttonIonicColor.value).contrast;

  const isMd = platform.value === "android";

  // Material's 0.06em letter-spacing spreads Thai glyphs apart — keep it for Latin only
  const hasThai = /[\u0E00-\u0E7F]/.test(String(props.element.props.content ?? props.element.props.text ?? ""));

  const sharedStyle = {
    height: h,
    minHeight: h,
    fontSize: `${spec.font}px`,
    fontWeight: "600",
    "--padding-start": `${spec.padX}px`,
    "--padding-end": `${spec.padX}px`,
    "--padding-top": "0px",
    "--padding-bottom": "0px",
    // Material buttons stay a little squarer than iOS ones
    "--border-radius": `${isMd ? Math.max(4, spec.radius - 4) : spec.radius}px`,
    opacity: isDisabled ? "0.58" : "1",
    cursor: props.isRunMode && !isDisabled ? "pointer" : "default",
    "--background": fill === "solid" ? ionicHex : "transparent",
    // iOS: dark overlay gives visible tap feedback (no ripple in ios mode)
    // MD : zero out the activated overlay so Ionic's ripple is unobstructed
    "--background-activated": isMd ? ionicHex : "rgba(0,0,0,1)",
    "--background-activated-opacity": isMd ? "0" : "0.15",
    "--background-hover": fill === "solid" ? ionicHex : "transparent",
    "--color": fill === "solid" ? ionicContrast : ionicHex,
    "--color-activated": fill === "solid" ? ionicContrast : ionicHex,
    "--border-color": ionicHex,
    "--border-width": fill === "outline" ? "1px" : "0px",
    // MD ripple wave — light semi-transparent so it shows on any button colour
    "--ripple-color": isMd ? "rgba(255,255,255,0.25)" : "transparent",
  };

  if (fill === "clear" || fill === "outline") {
    return {
      ...sharedStyle,
      textTransform:
        platform.value === "android" ? ("uppercase" as const) : "none",
      letterSpacing: hasThai ? "normal" : platform.value === "android" ? "0.06em" : "-0.01em",
      boxShadow: "none",
      "--box-shadow": "none",
    };
  }
  if (platform.value === "ios") {
    return { ...sharedStyle };
  }
  // Android (Material): flat filled button. The shadow used to sit on the
  // square host element *and* Ionic added its own on the rounded inner button,
  // which looked like a floating white box behind the button.
  return {
    ...sharedStyle,
    textTransform: "uppercase" as const,
    letterSpacing: hasThai ? "normal" : "0.06em",
    boxShadow: "none",
    "--box-shadow": "none",
  };
});

const buttonRuntimeClass = computed(() => {
  if (!props.isRunMode) return "";
  if (props.element.props.disabled) {
    return "pointer-events-none focus-visible:outline-none";
  }
  if (platform.value === "ios") {
    return "hover:brightness-[0.97] active:brightness-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400";
  }
  return "hover:brightness-[1.03] active:brightness-[0.94] active:shadow-[0_1px_2px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400";
});

// ── FAB ───────────────────────────────────────────────────────────────────
function isLightFabBackground(color: string) {
  const normalized = color.trim().toLowerCase();
  if (
    normalized === "#fff" ||
    normalized === "#ffffff" ||
    normalized === "white" ||
    normalized === "#f0f0f0" ||
    normalized === "#f1f5f9" ||
    normalized === "#e5e7eb" ||
    normalized === "#d1d5db" ||
    normalized === "gray" ||
    normalized === "grey"
  ) {
    return true;
  }

  const hex = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!hex) return false;

  const value = hex[1];
  if (!value) return false;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 180;
}

const fabIconColor = computed(() => {
  const bg = String(props.element.props.backgroundColor || "#3880ff");
  return isLightFabBackground(bg) ? "#111827" : "#ffffff";
});

const fabStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || "#3880ff";
  return {
    "--background": bg,
    "--background-activated": bg,
    "--background-hover": bg,
    "--color": fabIconColor.value,
    "--box-shadow":
      platform.value === "ios"
        ? "0 4px 14px rgba(0,0,0,0.15)"
        : "0 6px 10px rgba(0,0,0,0.25)",
  };
});

// ── Searchbar ─────────────────────────────────────────────────────────────
const searchbarStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || "#f4f5f8";
  if (platform.value === "ios") {
    return { "--background": bg, "--border-radius": "12px" };
  }
  return { "--background": bg, "--border-radius": "4px" };
});

// ── Input / LabelledInput ─────────────────────────────────────────────────
// Text/placeholder defaults to dark so that inputs remain legible on the
// white canvas surface (otherwise they inherit the dark-theme body color).
const INPUT_TEXT = "#0f172a"; // slate-900
const INPUT_PLACEHOLDER = "#94a3b8"; // slate-400

const inputStyle = computed(() => {
  const shared = {
    "--color": INPUT_TEXT,
    "--placeholder-color": INPUT_PLACEHOLDER,
    "--placeholder-opacity": "1",
  };
  if (platform.value === "ios") {
    return {
      ...shared,
      "--background": "#ffffff",
      "--border-color": "#d1d5db",
      "--highlight-color-focused": ionColor.value,
    };
  }
  return {
    ...shared,
    "--background": "#ffffff",
    "--highlight-color-focused": ionColor.value,
    "--border-color": "#9ca3af",
  };
});

// Strip ion-item inset (Ionic defaults ~16px) so every form row — Input,
// Select, Toggle, Checkbox, Radio — shares the same left/right edges.
const formItemStyle = computed(() => ({
  "--padding-start": "0",
  "--padding-end": "0",
  "--inner-padding-start": "0",
  "--inner-padding-end": "0",
  "--background": "transparent",
}));

// Unique per element so two pickers on a page don't open each other's modal.
const datetimeId = computed(() => `datetime-${props.element.id}`);

const selectContent = computed(() => {
  const resolved = resolveListContent(props.element.props);
  if (resolved.length > 0) return resolved;
  return selectOptions.value.map((opt) => ({
    key: String(opt),
    value: String(opt),
  }));
});

const radioContent = computed(() => {
  const resolved = resolveListContent(props.element.props);
  if (resolved.length > 0) return resolved;
  const label = String(props.element.props.label || "Option");
  return [{ key: label, value: label }];
});

const radioGroupValue = computed(() => {
  const current = props.element.props.value;
  if (typeof current === "string") return current;
  // Legacy boolean radio: selected=true => choose first item
  if (props.element.props.selected && radioContent.value[0]) {
    return getListItemValue(radioContent.value[0]);
  }
  return "";
});

const labelledInputWrapStyle = computed(() => {
  const shared = {
    "--color": INPUT_TEXT,
    "--placeholder-color": INPUT_PLACEHOLDER,
    "--placeholder-opacity": "1",
  };
  if (platform.value === "ios") {
    return {
      ...shared,
      "--background": "#ffffff",
      "--border-color": "#d1d5db",
      "--border-radius": "10px",
      "--highlight-color-focused": ionColor.value,
    };
  }
  return {
    ...shared,
    "--background": "#ffffff",
    "--highlight-color-focused": ionColor.value,
    "--border-color": ionColor.value,
  };
});

// ── Range ─────────────────────────────────────────────────────────────────
const rangeStyle = computed(() => ({
  "--bar-background": "#e5e7eb",
  "--bar-background-active": ionColor.value,
  "--knob-background": "#ffffff",
  "--pin-background": ionColor.value,
  "--pin-color": "#ffffff",
}));

// ── Checkbox ──────────────────────────────────────────────────────────────
const checkboxStyle = computed(() => {
  const color = ionColor.value;
  return {
    "--checkbox-background-checked": color,
    "--checkbox-border-color-checked": color,
    "--checkmark-color": "#ffffff",
    "--border-color": props.element.props.checked ? color : "#9ca3af",
  };
});

// ── Toggle ────────────────────────────────────────────────────────────────
const toggleStyle = computed(() => {
  const color = ionColor.value;
  if (platform.value === "ios") {
    return {
      "--track-background": props.element.props.on ? "#34c759" : "#e5e7eb",
      "--track-background-checked": "#34c759",
      "--handle-background": "#ffffff",
    };
  }
  return {
    "--track-background": "#9ca3af",
    "--track-background-checked": `${color}80`,
    "--handle-background": props.element.props.on ? color : "#f3f4f6",
  };
});

// ── Select ────────────────────────────────────────────────────────────────
// IonSelect's host defaults to `display: block` when used without a label,
// which causes the placeholder text and chevron icon to clump at the left.
// Forcing flex makes the native-wrapper grow and keeps the chevron pinned to
// the right edge, matching the full-width layout we use on canvas.
const selectStyle = computed(() => ({
  ...inputStyle.value,
  "--color": INPUT_TEXT,
  "--placeholder-color": INPUT_PLACEHOLDER,
  "--placeholder-opacity": "1",
  "--highlight-color-focused": ionColor.value,
  "--padding-start": "0",
  "--padding-end": "0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}));

// ── Badge ─────────────────────────────────────────────────────────────────
const badgeStyle = computed(() => {
  const color = (props.element.props.color as string) || "#3880ff";
  return {
    "--background": color,
    "--color": "#ffffff",
    borderRadius: platform.value === "ios" ? "20px" : "12px",
  };
});

// ── Chip ──────────────────────────────────────────────────────────────────
const chipStyle = computed(() => {
  const color = (props.element.props.color as string) || "#3880ff";
  const outline = props.element.props.outline as boolean;
  if (platform.value === "ios") {
    return {
      borderRadius: "16px",
      "--background": outline ? "transparent" : `${color}20`,
      border: `1.5px solid ${color}`,
      "--color": color,
    };
  }
  return {
    borderRadius: "8px",
    "--background": outline ? "transparent" : `${color}15`,
    border: `1.5px solid ${color}`,
    "--color": color,
  };
});

// ── Camera status & filter ────────────────────────────────────────────────
const CAMERA_FILTER_PRESETS: Record<string, string> = {
  none: "none",
  grayscale: "grayscale(100%)",
  sepia: "sepia(100%)",
  invert: "invert(100%)",
  blur: "blur(4px)",
  brightness: "brightness(160%)",
  contrast: "contrast(160%)",
  saturate: "saturate(200%)",
  vintage: "sepia(50%) contrast(120%) brightness(90%)",
  warm: "sepia(30%) saturate(140%) brightness(110%)",
  cool: "hue-rotate(180deg) saturate(150%)",
};

const cameraFilterCss = computed(() => {
  const f = props.element.props.filter as string | undefined;
  if (!f || f === "none") return "none";
  return CAMERA_FILTER_PRESETS[f] ?? f;
});


// ── Chart ─────────────────────────────────────────────────────────────────
// ionicColorHex takes precedence over the stored dataset colour so that the
// Ionic colour picker in PropertiesPanel stays in sync with the chart colour.
const chartDatasets = computed(() => {
  const raw = props.element.props.datasets as
    | { label: string; data: number[]; color: string }[]
    | undefined;
  const fallback = [
    { label: "Series 1", data: [40, 65, 28, 80, 52], color: "#3880ff" },
  ];
  const ds = raw && raw.length > 0 ? raw : fallback;
  const overrideColor = props.element.props.ionicColorHex as string | undefined;
  if (!overrideColor) return ds;
  return ds.map((d, i) => (i === 0 ? { ...d, color: overrideColor } : d));
});

// ── List ──────────────────────────────────────────────────────────────────
const listContent = computed(() => {
  const resolved = resolveListContent(props.element.props);
  return resolved.length > 0
    ? resolved
    : [
        { key: "Item 1", value: "item1" },
        { key: "Item 2", value: "item2" },
        { key: "Item 3", value: "item3" },
      ];
});

const listWrapStyle = computed(() => {
  if (platform.value === "ios") {
    return {
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    };
  }
  return { backgroundColor: "#ffffff" };
});

function listItemStyle(idx: number) {
  const isLast = idx === listContent.value.length - 1;
  const base = {
    height: "40px",
    borderBottom: isLast ? "none" : "1px solid #f3f4f6",
  };
  if (platform.value === "ios") {
    return { ...base, paddingLeft: "12px" };
  }
  return base;
}

// ── Heading ───────────────────────────────────────────────────────────────
const headingFontSize = computed(() => {
  const level = (props.element.props.level as number) ?? 1;
  const sizes: Record<number, string> = {
    1: "22px",
    2: "18px",
    3: "15px",
    4: "13px",
    5: "12px",
    6: "11px",
  };
  return sizes[level] ?? "22px";
});

// ── Container helpers ─────────────────────────────────────────────────────
const containerStyle = computed(() => {
  const p = props.element.props;
  return {
    position: "relative" as const,
    minHeight: `${props.forcedHeight ?? props.element.height}px`,
    padding: `${p.padding ?? 12}px`,
    backgroundColor: (p.backgroundColor as string) || "transparent",
  };
});
const innerFlexStyle = computed(() => {
  const p = props.element.props;
  return {
    gap: `${p.gap ?? 12}px`,
    alignItems: "flex-start",
  };
});

function childStyle(childId: string): Record<string, string> {
  const child = getElement(childId);
  if (!child) return {};
  if (child.type === "FloatingActionButton") {
    return fabPositionStyle(child);
  }
  const type = props.element.type;
  const isCol = type === "Container" || type === "ColContainer";
  const colWidth =
    child.type === "Image"
      ? child.width > 0
        ? `${child.width}px`
        : "100%"
      : "100%";
  return {
    ...(isCol
      ? { width: colWidth }
      : { flex: "0 0 auto", minWidth: "0", width: `${child.width}px` }),
  };
}

function fabPositionStyle(child: AppElement): Record<string, string> {
  const horizontal = (child.props.horizontalAlignment as string) ?? "end";
  const vertical = (child.props.verticalAlignment as string) ?? "bottom";
  const edge = (child.props.edge as boolean) ?? false;
  const offset = edge ? "-12px" : "16px";
  const style: Record<string, string> = {
    position: "absolute",
    width: `${child.width}px`,
    height: `${child.height}px`,
    zIndex: "5",
  };

  if (horizontal === "start") {
    style.left = offset;
  } else if (horizontal === "center") {
    style.left = "50%";
  } else {
    style.right = offset;
  }

  if (vertical === "top") {
    style.top = offset;
  } else if (vertical === "center") {
    style.top = "50%";
  } else {
    style.bottom = offset;
  }

  const transforms: string[] = [];
  if (horizontal === "center") transforms.push("translateX(-50%)");
  if (vertical === "center") transforms.push("translateY(-50%)");
  if (transforms.length) {
    style.transform = transforms.join(" ");
  }

  return style;
}

function getElement(id: string): AppElement | undefined {
  const source =
    props.isRunMode && props.runtimeElements
      ? props.runtimeElements
      : store.elements.value;

  return source.find((e) => e.id === id);
}

// ── Drag-to-reorder children ──────────────────────────────────────────────
const draggingChildId = ref<string | null>(null);
const dragOverChildId = ref<string | null>(null);

function onChildDragStart(e: DragEvent, childId: string) {
  if (props.isRunMode) return;
  draggingChildId.value = childId;
  e.dataTransfer!.setData("application/codecraft-child", childId);
  e.dataTransfer!.effectAllowed = "move";
  e.stopPropagation();
}
function onChildDragOver(e: DragEvent, childId: string) {
  if (props.isRunMode) return;
  if (draggingChildId.value === childId) return;
  dragOverChildId.value = childId;
  e.stopPropagation();
}
function onChildDrop(e: DragEvent, targetChildId: string) {
  if (props.isRunMode) return;
  const sourceId = draggingChildId.value;
  if (!sourceId || sourceId === targetChildId) {
    onChildDragEnd();
    return;
  }
  const parent = props.element;
  const from = parent.children.indexOf(sourceId);
  const to = parent.children.indexOf(targetChildId);
  if (from !== -1 && to !== -1) store.reorderChildren(parent.id, from, to);
  onChildDragEnd();
  e.stopPropagation();
}
function onChildDragEnd() {
  draggingChildId.value = null;
  dragOverChildId.value = null;
}
</script>

<style scoped>
/* Force Ionic controls to respect their wrapper's pixel dimensions.
 * Ionic's defaults (min-height: 2.8em on buttons, large paddings on inputs)
 * otherwise overflow the canvas wrapper and the selection ring no longer
 * matches the visual element. `--min-height: 0` + part overrides clamp the
 * native shadow-DOM box to the host's size. */
.canvas-button {
  width: 100%;
  margin: 0;
}

.canvas-fab {
  width: 100%;
  height: 100%;
}

.canvas-fab::part(native) {
  width: 100%;
  height: 100%;
  min-height: 100%;
  margin: 0;
}

.canvas-input {
  --min-height: 0;
  --padding-top: 4px;
  --padding-bottom: 4px;
}

.canvas-select {
  min-height: 0 !important;
  color: #0f172a;
  --min-height: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

/* Pin the select chevron to the right edge regardless of content width.
 * IonSelect's shadow structure is label.select-wrapper → div.select-wrapper-inner → (native-wrapper, icon).
 * The inner wrapper is the flex parent of the placeholder and icon, but it only sizes to content.
 * We stretch it to fill the wrapper and push the icon to the far right via auto margin. */
.canvas-select::part(inner) {
  flex: 1 1 auto;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}
.canvas-select::part(icon) {
  margin-inline-start: auto;
}

.canvas-textarea {
  --min-height: 0;
}

/* @import "@ionic/vue/css/structure.css"; */
</style>
