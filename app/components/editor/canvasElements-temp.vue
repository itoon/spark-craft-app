<template>
  <div class="w-full h-full">
    <ion-app>
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
            class="relative transition-shadow duration-100"
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
            @click.stop="handleElementClick"
            @dragstart="onChildDragStart($event, childId)"
            @dragover.prevent="onChildDragOver($event, childId)"
            @drop.prevent="onChildDrop($event, childId)"
            @dragend="onChildDragEnd"
          >
            <template
              v-if="
                store.selectedElementId.value === childId && !props.isRunMode
              "
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

      <!-- ─── Toolbar (ion-header / ion-toolbar) ────────────────────────────
           iOS  : white bg, bold centered title, thin 1px bottom border
           Android: primary color bg, left title, bottom shadow              -->
      <IonToolbar
        v-else-if="element.type === 'Toolbar'"
        class="toolbar-canvas w-full h-full select-none"
        :mode="ionicMode"
        :style="toolbarStyle"
        @click.stop="handleElementClick"
      >
        <div class="flex h-full items-center px-4 gap-2">
          <UIcon
            v-if="element.props.showBack && platform === 'ios'"
            name="i-lucide-chevron-left"
            class="size-5 shrink-0"
            :style="{ color: iosToolbarTint }"
          />
          <UIcon
            v-if="element.props.showBack && platform === 'android'"
            name="i-lucide-arrow-left"
            class="size-5 text-white shrink-0"
          />
          <IonTitle class="truncate" :style="toolbarTitleStyle">
            {{ (element.props.title as string) || "My App" }}
          </IonTitle>
        </div>
      </IonToolbar>

      <!-- ─── Card (ion-card) ───────────────────────────────────────────────
           iOS  : rounded-2xl, white, subtle shadow
           Android: rounded-lg, white, md elevation shadow                   -->
      <IonCard
        v-else-if="element.type === 'Card'"
        class="m-0 w-full h-full overflow-hidden select-none"
        :mode="ionicMode"
        :style="cardStyle"
        @click.stop="handleElementClick"
      >
        <IonCardHeader class="pb-1">
          <IonCardTitle class="text-[13px] font-semibold text-gray-800">
            {{ (element.props.title as string) || "Card Title" }}
          </IonCardTitle>
          <IonCardSubtitle class="text-[11px] text-gray-500">
            {{ (element.props.subtitle as string) || "Subtitle" }}
          </IonCardSubtitle>
        </IonCardHeader>
        <IonCardContent>
          <div class="h-14 rounded bg-gray-50" />
        </IonCardContent>
      </IonCard>

      <!-- ─── Segment (ion-segment) ─────────────────────────────────────────
           iOS  : pill container, sliding white indicator
           Android: flat tab underline indicator                              -->
      <IonSegment
        v-else-if="element.type === 'Segment'"
        class="w-full h-full select-none"
        :mode="ionicMode"
        :value="String((element.props.selected as number) ?? 0)"
        :style="segmentWrapStyle"
        @click.stop="handleElementClick"
        @ionChange="handleSegmentChange"
      >
        <IonSegmentButton
          v-for="(opt, idx) in segmentOptions"
          :key="idx"
          :value="String(idx)"
          :style="segmentItemStyle(idx)"
        >
          <IonLabel class="text-[11px] font-semibold">{{ opt }}</IonLabel>
        </IonSegmentButton>
      </IonSegment>

      <!-- ─── Button (ion-button) ───────────────────────────────────────────
           iOS  : rounded-full, ghost/solid, colored text or filled
           Android: rounded-md, contained Material button                    -->

      <IonButton
        v-else-if="element.type === 'Button'"
        class="canvas-button w-full h-full select-none"
        :mode="ionicMode"
        expand="block"
        :fill="buttonFill"
        :disabled="Boolean(element.props.disabled)"
        :style="buttonStyle"
        :class="buttonRuntimeClass"
        @click.stop="handleButtonClick"
      >
        {{ (element.props.label as string) || "Button" }}
      </IonButton>

      <!-- ─── FloatingActionButton (ion-fab) ───────────────────────────────
           iOS  : circle, primary color, soft shadow
           Android: circle, primary color, Material elevation                -->
      <div
        v-else-if="element.type === 'FloatingActionButton'"
        class="w-full h-full flex items-center justify-center select-none"
        :style="fabStyle"
        @click.stop="handleElementClick"
      >
        <UIcon
          :name="(element.props.icon as string) || 'i-lucide-plus'"
          class="size-5 text-white"
        />
      </div>

      <!-- ─── Searchbar (ion-searchbar) ────────────────────────────────────
           iOS  : rounded-xl bg, no border, magnifier inside
           Android: rounded-sm, subtle bg, magnifier + mic icon              -->
      <IonSearchbar
        v-else-if="element.type === 'Searchbar'"
        class="w-full h-full"
        :mode="ionicMode"
        :animated="props.isRunMode"
        :value="(element.props.value as string) || ''"
        :placeholder="(element.props.placeholder as string) || 'Search'"
        :style="searchbarStyle"
        @click.stop="handleElementClick"
        @ionInput="handleSearchbarInput"
      />

      <!-- ─── LabelledInput ────────────────────────────────────────────────
           iOS  : rounded outline border, floating label
           Android: underline + floating label (Material)                    -->
      <IonInput
        v-else-if="element.type === 'LabelledInput'"
        class="w-full h-full"
        :mode="ionicMode"
        label-placement="stacked"
        fill="outline"
        :label="(element.props.label as string) || 'Label'"
        :value="(element.props.value as string) || ''"
        :placeholder="(element.props.placeholder as string) || 'Enter value'"
        :style="labelledInputWrapStyle"
        @click.stop="handleElementClick"
        @ionInput="handleIonInput"
      />

      <!-- ─── Input (ion-input) ─────────────────────────────────────────────
           iOS  : rounded rect border
           Android: bottom-border only (Material underline)                  -->
      <IonInput
        v-else-if="element.type === 'Input'"
        class="w-full h-full"
        :mode="ionicMode"
        :value="(element.props.value as string) || ''"
        :placeholder="(element.props.placeholder as string) || 'Enter text...'"
        :style="inputStyle"
        @click.stop="handleElementClick"
        @ionInput="handleIonInput"
      />

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
        :style="rangeStyle"
        @click.stop="handleElementClick"
        @ionInput="handleIonRangeInput"
      />

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
          {{ (element.props.placeholder as string) || "Select date" }}
        </span>
        <UIcon
          :name="
            platform === 'ios'
              ? 'i-lucide-chevrons-up-down'
              : 'i-lucide-calendar'
          "
          class="size-3.5 text-gray-400 shrink-0"
        />
      </div>

      <!-- ─── Checkbox (ion-checkbox) ───────────────────────────────────────
           iOS  : rounded-sm with checkmark, indigo fill
           Android: rounded-sm, Material style                               -->
      <div
        v-else-if="element.type === 'Checkbox'"
        class="w-full h-full flex items-center gap-2"
        @click.stop="handleElementClick"
      >
        <IonCheckbox
          :mode="ionicMode"
          :checked="Boolean(element.props.checked)"
          :style="checkboxStyle"
          @ionChange="handleCheckboxChange"
        />
        <IonLabel class="text-[12px] text-gray-700 truncate">
          {{ (element.props.label as string) || "Checkbox" }}
        </IonLabel>
      </div>

      <!-- ─── RadioButton (ion-radio) ───────────────────────────────────────
           iOS  : checkmark style (filled circle with inner check)
           Android: outer ring + filled inner circle                         -->
      <div
        v-else-if="element.type === 'RadioButton'"
        class="w-full h-full flex items-center gap-2"
        @click.stop="handleElementClick"
      >
        <IonRadioGroup
          :mode="ionicMode"
          :value="Boolean(element.props.selected)"
          @ionChange="handleRadioChange"
        >
          <div class="flex items-center gap-2">
            <IonRadio :value="true" />
            <IonLabel class="text-[12px] text-gray-700 truncate">
              {{ (element.props.label as string) || "Option" }}
            </IonLabel>
          </div>
        </IonRadioGroup>
      </div>

      <!-- ─── Toggle (ion-toggle) ───────────────────────────────────────────
           iOS  : wide pill, green when on
           Android: narrower track, colored when on                          -->
      <div
        v-else-if="element.type === 'Toggle'"
        class="w-full h-full flex items-center justify-between gap-4 border-b border-slate-200 px-3"
        @click.stop="handleElementClick"
      >
        <IonLabel
          class="text-gray-700 truncate"
          :style="{ fontSize: `${element.props.fontSize ?? 16}px` }"
        >
          {{
            (element.props.content as string) ||
            (element.props.label as string) ||
            "Label"
          }}
        </IonLabel>
        <IonToggle
          :mode="ionicMode"
          :checked="Boolean(element.props.on)"
          :style="toggleStyle"
          @ionChange="handleToggleChange"
        />
      </div>

      <!-- ─── Select (ion-select) ───────────────────────────────────────────
           iOS  : right-aligned value + chevrons
           Android: underline field + dropdown arrow                         -->
      <IonSelect
        v-else-if="element.type === 'Select'"
        class="w-full h-full"
        :mode="ionicMode"
        :value="(element.props.value as string) || ''"
        :placeholder="(element.props.placeholder as string) || 'Select...'"
        :interface="(element.props.interface as string) || 'popover'"
        :style="selectStyle"
        @click.stop="handleElementClick"
        @ionChange="handleSelectChange"
      >
        <IonSelectOption
          v-for="(opt, idx) in selectOptions"
          :key="idx"
          :value="opt"
        >
          {{ opt }}
        </IonSelectOption>
      </IonSelect>

      <!-- ─── Badge (ion-badge) ─────────────────────────────────────────────
           iOS  : pill shape, bold text
           Android: pill, slightly smaller padding                           -->
      <div
        v-else-if="element.type === 'Badge'"
        class="w-full h-full flex items-center justify-center select-none"
        @click.stop="handleElementClick"
      >
        <IonBadge :style="badgeStyle">
          {{ (element.props.text as string) || "New" }}
        </IonBadge>
      </div>

      <!-- ─── Chip (ion-chip) ───────────────────────────────────────────────
           iOS  : rounded-full pill, colored border/fill
           Android: rounded-lg, outlined or filled                           -->
      <div
        v-else-if="element.type === 'Chip'"
        class="w-full h-full flex items-center justify-center select-none"
        @click.stop="handleElementClick"
      >
        <IonChip :outline="Boolean(element.props.outline)" :style="chipStyle">
          <IonLabel>{{ (element.props.label as string) || "Chip" }}</IonLabel>
        </IonChip>
      </div>

      <!-- ─── Spinner (ion-spinner) ─────────────────────────────────────────
           iOS  : iOS activity spinner (lines)
           Android: Material circular progress                                -->
      <div
        v-else-if="element.type === 'Spinner'"
        class="w-full h-full flex items-center justify-center select-none"
        @click.stop="handleElementClick"
      >
        <IonSpinner
          :name="platform === 'ios' ? 'lines' : 'crescent'"
          :style="{ color: ionColor }"
        />
      </div>

      <!-- ─── Heading ──────────────────────────────────────────────────────── -->
      <IonLabel
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
        {{ (element.props.text as string) || "Heading" }}
      </IonLabel>

      <!-- ─── Label ────────────────────────────────────────────────────────── -->
      <IonLabel
        v-else-if="element.type === 'Label'"
        class="w-full h-full flex items-center overflow-hidden select-none"
        @click.stop="handleElementClick"
        :style="{
          color: (element.props.color as string) || '#334155',
          fontSize: `${element.props.fontSize ?? 14}px`,
          lineHeight: '1.3',
        }"
      >
        {{ (element.props.content as string) || "Label" }}
      </IonLabel>

      <!-- ─── TextBox ──────────────────────────────────────────────────────── -->
      <IonTextarea
        v-else-if="element.type === 'TextBox'"
        class="w-full h-full overflow-hidden select-none"
        :mode="ionicMode"
        :auto-grow="false"
        :value="(element.props.content as string) || ''"
        :placeholder="
          (element.props.placeholder as string) || 'Write something...'
        "
        @click.stop="handleElementClick"
        @ionInput="handleTextareaInput"
        :style="{
          '--color': (element.props.color as string) || '#334155',
          fontSize: `${element.props.fontSize ?? 14}px`,
          lineHeight: '1.4',
          textAlign: (element.props.textAlign as string) || 'left',
          whiteSpace:
            (element.props.wrap as string) === 'unwrap' ? 'nowrap' : 'normal',
          wordBreak:
            (element.props.wrap as string) === 'unwrap'
              ? 'normal'
              : 'break-word',
        }"
      />

      <!-- ─── List (ion-list / ion-item) ───────────────────────────────────
           iOS  : inset rounded card, inner separators
           Android: flat full-width list, dividers                           -->
      <IonList
        v-else-if="element.type === 'List'"
        class="w-full h-full overflow-hidden select-none"
        :mode="ionicMode"
        :style="listWrapStyle"
        @click.stop="handleElementClick"
      >
        <IonItem
          v-for="(item, i) in (element.props.items as string[]) || [
            'Item 1',
            'Item 2',
            'Item 3',
          ]"
          :key="i"
          lines="full"
          :style="listItemStyle(i)"
          @click.stop="handleElementClick"
        >
          <IonLabel class="text-[12px] text-gray-700">{{ item }}</IonLabel>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-3 text-gray-400 shrink-0"
          />
        </IonItem>
      </IonList>

      <!-- ─── Image ────────────────────────────────────────────────────────── -->
      <IonImg
        v-else-if="element.type === 'Image'"
        :src="(element.props.src as string) || 'https://picsum.photos/160/120'"
        class="w-full h-full object-cover select-none cursor-pointer"
        :style="{ borderRadius: `${element.props.borderRadius ?? 4}px` }"
        @click.stop="handleElementClick"
      />

      <!-- ─── Camera Plugin ──────────────────────────────────────────────── -->
      <div
        v-else-if="element.type === 'Camera'"
        class="w-full h-full overflow-hidden rounded-2xl border border-slate-200 select-none"
        :class="
          props.isRunMode && !element.props.open ? 'hidden' : 'flex flex-col'
        "
        @click.stop="handleElementClick"
      >
        <div
          class="flex items-center justify-between px-3 py-2 text-white"
          :style="{
            backgroundColor: platform === 'ios' ? '#111827' : '#1f2937',
          }"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-camera" class="size-4" />
            <span class="text-xs font-semibold">
              {{ (element.props.title as string) || "Camera" }}
            </span>
          </div>
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-medium"
            :style="cameraStatusStyle"
          >
            {{ element.props.open ? "Open" : "Closed" }}
          </span>
        </div>
        <div
          class="relative flex-1 bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500"
        >
          <video
            v-if="shouldUseLiveCamera && !cameraError"
            ref="cameraVideoRef"
            class="h-full w-full object-cover"
            autoplay
            muted
            playsinline
          />
          <div
            v-if="!shouldUseLiveCamera || cameraError"
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-white/90"
          >
            <UIcon name="i-lucide-aperture" class="size-10" />
            <span class="text-xs font-medium">
              {{
                cameraError
                  ? cameraError
                  : element.props.open
                    ? "Camera preview active"
                    : "Camera is closed"
              }}
            </span>
            <span v-if="cameraError" class="text-[10px] text-white/70">
              Camera access usually needs permission and often requires HTTPS or
              localhost.
            </span>
          </div>
        </div>
      </div>

      <!-- ─── Link ─────────────────────────────────────────────────────────── -->
      <div
        v-else-if="element.type === 'Link'"
        class="w-full h-full flex items-center overflow-hidden select-none"
        @click.stop="handleElementClick"
      >
        <span
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

      <!-- ─── Video ────────────────────────────────────────────────────────── -->
      <div
        v-else-if="element.type === 'Video'"
        class="w-full h-full flex items-center justify-center bg-gray-900 select-none"
        :style="{ borderRadius: `${element.props.borderRadius ?? 4}px` }"
        @click.stop="handleElementClick"
      >
        <div class="flex flex-col items-center gap-1.5">
          <div
            class="size-8 rounded-full bg-white/20 flex items-center justify-center"
          >
            <UIcon name="i-lucide-play" class="size-4 text-white ml-0.5" />
          </div>
          <span class="text-[9px] text-white/40 font-mono">video</span>
        </div>
      </div>

      <!-- ─── Separator ────────────────────────────────────────────────────── -->
      <div
        v-else-if="element.type === 'Separator'"
        class="w-full h-full flex items-center select-none box-border"
        @click.stop="handleElementClick"
        :style="{
          paddingTop: `${element.props.paddingTop ?? 8}px`,
          paddingBottom: `${element.props.paddingBottom ?? 8}px`,
        }"
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
            color: (element.props.color as string) || ionColor,
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
        <span class="text-[10px] text-neutral-500 font-mono">{{
          element.type
        }}</span>
      </div>
    </ion-app>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import type { AppElement } from "~/composables/useEditorStore";
import { useEditorStore } from "~/composables/useEditorStore";
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

function updateRunProps(propsPatch: Record<string, unknown>) {
  if (!props.isRunMode) return;
  emit("run-input", props.element.id, propsPatch);
}

function handleTextInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  updateRunProps({ value: target.value });
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

function handleRangeInput(event: Event) {
  const target = event.target as HTMLInputElement;
  updateRunProps({ value: Number(target.value) });
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

function toggleBooleanProp(propName: string) {
  updateRunProps({ [propName]: !props.element.props[propName] });
}

function inputDisplayValue(value: string, placeholder: string) {
  return value.trim() ? value : placeholder;
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

// Ionic primary color
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

// ── Toolbar ───────────────────────────────────────────────────────────────
const iosToolbarTint = "#3880ff";

const toolbarStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || "#3880ff";
  if (platform.value === "ios") {
    return {
      "--background": "#ffffff",
      borderBottom: "1px solid #e0e0e0",
      justifyContent: "center",
    };
  }
  return {
    "--background": bg,
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  };
});

const toolbarTitleStyle = computed(() => {
  if (platform.value === "ios") {
    return {
      fontWeight: "700",
      fontSize: "17px",
      color: "#000000",
      flex: "1",
      textAlign: "center" as const,
    };
  }
  return {
    fontWeight: "500",
    fontSize: "20px",
    color: "#ffffff",
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
  const color = (props.element.props.color as string) || "#3880ff";
  if (platform.value === "ios") {
    return { backgroundColor: "#f0f0f0", borderRadius: "10px", padding: "2px" };
  }
  return { backgroundColor: "#ffffff", borderBottom: `2px solid #e5e7eb` };
});

const segmentInnerStyle = computed(() => {
  if (platform.value === "ios") return {};
  return {};
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
  // Android: colored text for active tab, gray for inactive
  return idx === selected
    ? { color: color, borderBottom: `2px solid ${color}`, marginBottom: "-2px" }
    : { color: "#888888" };
}

// ── Button ────────────────────────────────────────────────────────────────
const buttonStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || "#3880ff";
  const fill = (props.element.props.fill as string) || "solid";
  const isDisabled = Boolean(props.element.props.disabled);
  const radius =
    typeof props.element.props.borderRadius === "number"
      ? `${props.element.props.borderRadius}px`
      : platform.value === "ios"
        ? "14px"
        : "4px";

  const sharedStyle = {
    opacity: isDisabled ? "0.58" : "1",
    cursor: props.isRunMode && !isDisabled ? "pointer" : "default",
    fontWeight: platform.value === "ios" ? "500" : "500",
    fontSize: platform.value === "ios" ? "17px" : "14px",
    lineHeight: platform.value === "ios" ? "1.2" : "1",
  };

  if (fill === "clear") {
    return {
      ...sharedStyle,
      "--background": "transparent",
      "--background-hover": "transparent",
      "--background-activated": "transparent",
      "--border-radius": radius,
      "--color": bg,
      textTransform:
        platform.value === "android" ? ("uppercase" as const) : "none",
      letterSpacing: platform.value === "android" ? "0.06em" : "-0.01em",
      boxShadow: "none",
    };
  }
  if (fill === "outline") {
    return {
      ...sharedStyle,
      "--background": "transparent",
      "--background-hover": "transparent",
      "--background-activated": "transparent",
      "--border-color": bg,
      "--border-style": "solid",
      "--border-width": "1px",
      "--border-radius": radius,
      "--color": bg,
      textTransform:
        platform.value === "android" ? ("uppercase" as const) : "none",
      letterSpacing: platform.value === "android" ? "0.06em" : "-0.01em",
      boxShadow: "none",
    };
  }
  if (platform.value === "ios") {
    return {
      ...sharedStyle,
      "--background": bg,
      "--background-hover": bg,
      "--background-activated": bg,
      "--border-radius": radius,
      "--color": "#ffffff",
      letterSpacing: "-0.01em",
      boxShadow: "none",
    };
  }
  // Android: Material contained
  return {
    ...sharedStyle,
    "--background": bg,
    "--background-hover": bg,
    "--background-activated": bg,
    "--border-radius": radius,
    "--color": "#ffffff",
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
const fabStyle = computed(() => {
  const bg = (props.element.props.backgroundColor as string) || "#3880ff";
  return {
    backgroundColor: bg,
    borderRadius: "50%",
    boxShadow:
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
const inputStyle = computed(() => {
  if (platform.value === "ios") {
    return {
      "--background": "#ffffff",
      "--border-color": "#d1d5db",
      "--border-radius": "10px",
      "--highlight-color-focused": ionColor.value,
    };
  }
  return {
    "--background": "transparent",
    "--highlight-color-focused": ionColor.value,
    "--border-color": "#9ca3af",
  };
});

const labelledInputWrapStyle = computed(() => {
  if (platform.value === "ios") {
    return {
      "--background": "#ffffff",
      "--border-color": "#d1d5db",
      "--border-radius": "10px",
      "--highlight-color-focused": ionColor.value,
    };
  }
  return {
    "--background": "transparent",
    "--highlight-color-focused": ionColor.value,
    "--border-color": ionColor.value,
  };
});

// ── Range ─────────────────────────────────────────────────────────────────
const rangePercent = computed(() => {
  const p = props.element.props;
  const min = (p.min as number) ?? 0;
  const max = (p.max as number) ?? 100;
  const val = (p.value as number) ?? 50;
  return Math.round(((val - min) / (max - min)) * 100);
});

const rangeThumbStyle = computed(() => {
  const color = ionColor.value;
  const base = {
    left: `calc(${rangePercent.value}% - 10px)`,
    backgroundColor: "#ffffff",
    border: `2px solid ${color}`,
  };
  if (platform.value === "ios") {
    return {
      ...base,
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    };
  }
  return {
    ...base,
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  };
});

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

// ── Radio ─────────────────────────────────────────────────────────────────
const radioIosStyle = computed(() => {
  const color = ionColor.value;
  return {
    borderColor: props.element.props.selected ? color : "#9ca3af",
    backgroundColor: "#ffffff",
  };
});

const radioAndroidOuterStyle = computed(() => {
  const color = ionColor.value;
  return { borderColor: props.element.props.selected ? color : "#9ca3af" };
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

const rangeStyle = computed(() => ({
  "--bar-background": "#e5e7eb",
  "--bar-background-active": ionColor.value,
  "--knob-background": "#ffffff",
  "--pin-background": ionColor.value,
  "--pin-color": "#ffffff",
}));

const selectStyle = computed(() => ({
  ...inputStyle.value,
  "--placeholder-color": "#9ca3af",
  "--highlight-color-focused": ionColor.value,
}));

const cameraStatusStyle = computed(() => ({
  backgroundColor: props.element.props.open ? "#22c55e" : "#475569",
  color: "#ffffff",
}));

// ── List ──────────────────────────────────────────────────────────────────
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
  const items = (props.element.props.items as string[]) || [];
  const isLast = idx === items.length - 1;
  const base = {
    height: "44px",
    borderBottom: isLast ? "none" : "1px solid #f3f4f6",
  };
  if (platform.value === "ios") {
    return { ...base, paddingLeft: "16px" };
  }
  return base;
}

// ── Heading font size ─────────────────────────────────────────────────────
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

const textBoxDisplayValue = computed(() => {
  const content = (props.element.props.content as string) || "";
  const placeholder =
    (props.element.props.placeholder as string) || "Write something...";
  return content.trim() ? content : placeholder;
});

// ── Container helpers ─────────────────────────────────────────────────────
const containerStyle = computed(() => {
  const p = props.element.props;
  return {
    position: "relative",
    width: "100%",
    height: `${props.forcedHeight ?? props.element.height}px`,
    padding: `${p.padding ?? 8}px`,
    backgroundColor: (p.backgroundColor as string) || "transparent",
  };
});
const innerFlexStyle = computed(() => {
  const p = props.element.props;
  return { gap: `${p.gap ?? 8}px` };
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
    ...(isCol ? { width: "100%" } : { flex: "1", minWidth: "0" }),
    height: `${child.height}px`,
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
.canvas-button {
  width: 100%;
  height: 100%;
  margin: 0;
}

.canvas-button::part(native) {
  width: 100%;
  height: 100%;
  min-height: 100%;
  margin: 0;
  overflow: hidden;
}
</style>
