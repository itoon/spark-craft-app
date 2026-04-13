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
        <EditorCanvasElementRenderer
          v-if="getElement(childId)"
          :element="getElement(childId)!"
          :is-run-mode="props.isRunMode"
          :platform-override="props.platformOverride"
          :runtime-element-ids="props.runtimeElementIds"
          :runtime-elements="props.runtimeElements"
          @run-click="emit('run-click', $event)"
          @run-input="(id, patch) => emit('run-input', id, patch)"
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
  <IonHeader :mode="ionicMode" v-else-if="element.type === 'Toolbar'">
    <IonToolbar
      class="toolbar-canvas w-full h-full select-none flex"
      :mode="ionicMode"
      :color="toolbarIonicColor"
      :style="toolbarStyle"
      @click.stop="handleElementClick"
    >
      <div class="flex h-full items-center px-3 gap-1.5">
        <button
          v-if="element.props.showBack && platform === 'ios'"
          type="button"
          class="inline-flex shrink-0 items-center justify-center relative z-10"
          @click="handleToolbarBackClick"
        >
          <UIcon
            name="i-lucide-chevron-left"
            class="size-5 shrink-0"
            :style="{ color: `var(--ion-color-${toolbarIonicColor}-contrast)` }"
          />
        </button>
        <button
          v-if="element.props.showBack && platform === 'android'"
          type="button"
          class="inline-flex shrink-0 items-center justify-center relative z-10"
          @click="handleToolbarBackClick"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-5 shrink-0"
            :style="{ color: `var(--ion-color-${toolbarIonicColor}-contrast)` }"
          />
        </button>
        <IonTitle class="truncate" :style="toolbarTitleStyle">
          {{ (element.props.title as string) || "My App" }}
        </IonTitle>
      </div>
    </IonToolbar>
  </IonHeader>
  <!-- ─── Button (ion-button) ────────────────────────────
       iOS  : rounded-full, ghost/solid, colored text or filled
       Android: rounded-md, contained Material button -->
  <IonButton
    v-else-if="element.type === 'Button'"
    :mode="ionicMode"
    expand="full"
    :fill="buttonFill"
    :size="buttonSize"
    :color="buttonIonicColor"
    :disabled="Boolean(element.props.disabled)"
    :style="buttonStyle"
    :class="[
      'canvas-button select-none',
      buttonRuntimeClass,
      designInteractiveClass,
    ]"
    @click.stop="handleButtonClick"
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
      @click.stop="handleElementClick"
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
    <IonItem :style="labelledInputItemStyle">
      <IonInput
        label-placement="floating"
        :mode="ionicMode"
        :placeholder="(element.props.placeholder as string) || ''"
        :value="(element.props.value as string) || ''"
        :label="(element.props.label as string) || 'Label'"
        @click.stop="handleElementClick"
        @ionInput="handleIonInput"
      ></IonInput>
    </IonItem>
  </IonList>

  <!-- ─── Input (ion-input) ──────────────────────────────
       iOS  : rounded rect border
       Android: bottom-border only (Material underline) -->
  <IonList v-else-if="element.type === 'Input'" class="p-0! w-full">
    <IonItem :style="inputItemStyle">
      <IonInput
        label-placement="stacked"
        :mode="ionicMode"
        :placeholder="(element.props.placeholder as string) || ''"
        :value="(element.props.value as string) || ''"
        :label="(element.props.label as string) || 'Label'"
        @click.stop="handleElementClick"
        @ionInput="handleIonInput"
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
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { buildToolbarBackButtonClickId } from "~/composables/useRuntime";
import type { AppElement } from "~/composables/useEditorStore";
import { useEditorStore } from "~/composables/useEditorStore";
import { getListItemLabel, resolveListContent } from "~/utils/listContent";
import { getVisibleRuntimeChildIds } from "~/utils/runtimeVisibility";

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
}>();

const store = useEditorStore();
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

function handleButtonClick() {
  if (props.isRunMode && props.element.props.disabled) return;
  handleElementClick();
}

function handleToolbarBackClick() {
  console.log("TESTR");
  if (props.isRunMode) {
    emit("run-click", buildToolbarBackButtonClickId(props.element.id));
  } else {
    store.selectElement(props.element.id);
  }
}

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
async function startCameraPreview() {
  if (!import.meta.client || !shouldUseLiveCamera.value) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = "This browser does not support live camera preview.";
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to access the camera.";
    cameraError.value = message;
    stopCameraPreview();
  }
}

function stopCameraPreview() {
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
  updateRunProps({ selected: Boolean(event.detail.value) });
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

const BUTTON_HEIGHT_PX: Record<"small" | "default" | "large", number> = {
  small: 30,
  default: 36,
  large: 42,
};

const buttonIonicColor = computed(
  () => (props.element.props.ionicColor as string) || "primary",
);

// ── Toolbar ───────────────────────────────────────────────────────────────
const toolbarIonicColor = computed(
  () => (props.element.props.ionicColor as string) || "primary",
);

const toolbarStyle = computed(() => ({}));

const toolbarTitleStyle = computed(() => {
  if (platform.value === "ios") {
    return {
      fontWeight: "700",
      fontSize: "17px",
      flex: "1",
      textAlign: "center" as const,
    };
  }
  return {
    fontWeight: "500",
    fontSize: "20px",
    flex: "1",
    textAlign: "left" as const,
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
  const h = `${BUTTON_HEIGHT_PX[buttonSize.value]}px`;
  const sharedStyle = {
    height: h,
    minHeight: h,
    opacity: isDisabled ? "0.58" : "1",
    cursor: props.isRunMode && !isDisabled ? "pointer" : "default",
  };

  if (fill === "clear" || fill === "outline") {
    return {
      ...sharedStyle,
      textTransform:
        platform.value === "android" ? ("uppercase" as const) : "none",
      letterSpacing: platform.value === "android" ? "0.06em" : "-0.01em",
      boxShadow: "none",
    };
  }
  if (platform.value === "ios") {
    return { ...sharedStyle };
  }
  return {
    ...sharedStyle,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    boxShadow: isDisabled
      ? "none"
      : "0 2px 3px rgba(0,0,0,0.2), 0 1px 8px rgba(0,0,0,0.12)",
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

// Strip ion-item inset so the field matches canvas width (Ionic defaults ~16px).
const labelledInputItemStyle = computed(() => ({
  "--padding-start": "0",
  "--padding-end": "0",
  "--inner-padding-start": "0",
  "--inner-padding-end": "0",
}));

const inputItemStyle = computed(() => ({
  "--padding-start": "0",
  "--padding-end": "0",
  "--inner-padding-start": "0",
  "--inner-padding-end": "0",
}));

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
  "--padding-start": "10px",
  "--padding-end": "10px",
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

// ── Camera status ─────────────────────────────────────────────────────────
const cameraStatusStyle = computed(() => ({
  backgroundColor: props.element.props.open ? "#22c55e" : "#475569",
  color: "#ffffff",
}));

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
    position: "relative",
    height: `${props.forcedHeight ?? props.element.height}px`,
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
  if (child.type === "Camera" && props.isRunMode && !child.props.open) {
    return { width: "100%", height: "0px", overflow: "hidden" };
  }
  if (child.type === "FloatingActionButton") {
    return fabPositionStyle(child);
  }
  const type = props.element.type;
  const isCol = type === "Container" || type === "ColContainer";
  return {
    ...(isCol
      ? { width: `w-full` }
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
