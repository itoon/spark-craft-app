import { computed, type ComputedRef, type Ref } from "vue";

import type { AppElement } from "~/composables/useEditorStore";

export const DEFAULT_TOOLBAR_HEIGHT = 56;
export const BODY_TOP_PADDING = 14;
export const BODY_BOTTOM_PADDING = 14;

type ElementsSource = Ref<AppElement[]> | ComputedRef<AppElement[]>;

export function usePreviewPageLayout(pageElements: ElementsSource) {
  const runtimeElementIds = computed(
    () => new Set(pageElements.value.map((element) => element.id)),
  );

  const toolbarElement = computed(
    () =>
      pageElements.value.find((element) => element.type === "Toolbar") ?? null,
  );

  const bodyTopPadding = computed(() =>
    toolbarElement.value
      ? BODY_TOP_PADDING
      : DEFAULT_TOOLBAR_HEIGHT + BODY_TOP_PADDING,
  );

  const bodyElements = computed(() =>
    pageElements.value.filter((element) => {
      if (element.type === "Toolbar") return false;
      const parentIsPresent =
        element.parentId && runtimeElementIds.value.has(element.parentId);
      return !parentIsPresent;
    }),
  );

  function bodyElementHeight(element: AppElement) {
    if (element.type === "Camera" && !element.props.open) return 0;
    if (element.type !== "Container" || element.parentId !== null)
      return element.height;
    const toolbarHeight =
      toolbarElement.value?.height ?? DEFAULT_TOOLBAR_HEIGHT;
    return Math.max(
      element.height - toolbarHeight - BODY_TOP_PADDING - BODY_BOTTOM_PADDING,
      0,
    );
  }

  return {
    runtimeElementIds,
    toolbarElement,
    bodyTopPadding,
    bodyElements,
    bodyElementHeight,
  };
}
