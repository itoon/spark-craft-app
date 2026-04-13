import { computed, type ComputedRef, type Ref } from "vue";

import type { AppElement } from "~/composables/useEditorStore";

export const TOOLBAR_HEIGHT_IOS = 44;
export const TOOLBAR_HEIGHT_MD = 56;
export const BODY_TOP_PADDING = 14;
export const BODY_BOTTOM_PADDING = 14;

type ElementsSource = Ref<AppElement[]> | ComputedRef<AppElement[]>;
type PlatformSource = Ref<"ios" | "android"> | ComputedRef<"ios" | "android">;

export function usePreviewPageLayout(pageElements: ElementsSource, platform?: PlatformSource) {
  const runtimeElementIds = computed(
    () => new Set(pageElements.value.map((element) => element.id)),
  );

  const toolbarElement = computed(
    () =>
      pageElements.value.find((element) => element.type === "Toolbar") ?? null,
  );

  const toolbarHeight = computed(() =>
    platform?.value === "android" ? TOOLBAR_HEIGHT_MD : TOOLBAR_HEIGHT_IOS,
  );

  const bodyTopPadding = computed(() =>
    toolbarElement.value
      ? BODY_TOP_PADDING
      : toolbarHeight.value + BODY_TOP_PADDING,
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
    const h = toolbarElement.value ? toolbarHeight.value : toolbarHeight.value;
    return Math.max(
      element.height - h - BODY_TOP_PADDING - BODY_BOTTOM_PADDING,
      0,
    );
  }

  return {
    runtimeElementIds,
    toolbarElement,
    toolbarHeight,
    bodyTopPadding,
    bodyElements,
    bodyElementHeight,
  };
}
