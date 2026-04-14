<template>
  <ClientOnly class="absolute inset-0 flex flex-col overflow-hidden">
    <div
      v-if="toolbarElement"
      class="sticky top-0 z-10 w-full shrink-0"
      :style="{ height: `${toolbarHeight}px` }"
    >
      <EditorCanvasElementRenderer
        :element="toolbarElement"
        is-run-mode
        :platform-override="platformOverride"
        :runtime-element-ids="Array.from(runtimeElementIds)"
        :runtime-elements="pageElements"
        @run-click="emit('run-click', $event)"
        @run-input="(id, patch) => emit('run-input', id, patch)"
      />
    </div>

    <div
      class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      :style="{
        paddingTop: `${bodyTopPadding}px`,
        paddingBottom: `${BODY_BOTTOM_PADDING}px`,
      }"
    >
      <template v-for="element in visibleBodyElements" :key="element.id">
        <div
          class="w-full shrink-0"
          :style="{ minHeight: `${bodyElementHeight(element)}px` }"
        >
          <EditorCanvasElementRenderer
            :element="element"
            is-run-mode
            :platform-override="platformOverride"
            :forced-height="bodyElementHeight(element)"
            :runtime-element-ids="Array.from(runtimeElementIds)"
            :runtime-elements="pageElements"
            @run-click="emit('run-click', $event)"
            @run-input="(id, patch) => emit('run-input', id, patch)"
          />
        </div>
      </template>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { AppElement } from "~/composables/useEditorStore";
import {
  BODY_BOTTOM_PADDING,
  usePreviewPageLayout,
} from "~/composables/usePreviewPageLayout";

const props = defineProps<{
  pageElements: AppElement[];
  platformOverride?: "ios" | "android";
  viewportHeight?: number;
}>();

const emit = defineEmits<{
  (e: "run-click", id: string): void;
  (e: "run-input", id: string, patch: Record<string, unknown>): void;
}>();

const pageElements = computed(() => props.pageElements);
const platform = computed(() => props.platformOverride ?? "ios");
const {
  runtimeElementIds,
  toolbarElement,
  toolbarHeight,
  bodyTopPadding,
  bodyElements,
  bodyElementHeight,
} = usePreviewPageLayout(
  pageElements,
  platform,
  computed(() => props.viewportHeight ?? 0),
);

function isVisibleSpinner(element: AppElement) {
  return element.type !== "Spinner" || element.props.show !== false;
}

const visibleBodyElements = computed(() =>
  bodyElements.value.filter((element) => isVisibleSpinner(element)),
);
</script>
