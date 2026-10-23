import { computed } from "vue";

import { useEditorStore, type AppElement } from "~/composables/useEditorStore";
import { ELEMENT_CLASS_MAP, varNameFromId } from "~/composables/useRuntime";
import { addElementToCode, findAddedIds, needsPageAdd } from "~/utils/pageAdds";

/**
 * Design elements that the page code doesn't page.add() — they won't show in
 * Run / Live / APK. Empty code counts as "everything added", because Run then
 * uses the generated scaffold (which adds every element).
 */
export function usePageAddStatus() {
  const store = useEditorStore();

  const addedByPage = computed(() => {
    const result: Record<string, Set<string> | null> = {};
    for (const [pageId, code] of Object.entries(store.jsCodeByPage.value)) {
      result[pageId] = code?.trim() ? findAddedIds(code) : null;
    }
    return result;
  });

  function isNotAdded(element: AppElement | null | undefined): boolean {
    if (!element || !needsPageAdd(element.type)) return false;
    const added = addedByPage.value[element.pageId];
    return added ? !added.has(element.id) : false;
  }

  function isNotAddedId(id: string): boolean {
    return isNotAdded(store.elements.value.find((el) => el.id === id));
  }

  const notAddedOnCurrentPage = computed(() =>
    store.elements.value.filter((el) => el.pageId === store.currentPageId.value && isNotAdded(el)),
  );

  /** Write `var x = new Cls('id'); page.add(x);` into that element's page code. */
  function addToCode(element: AppElement) {
    const current = store.jsCodeByPage.value[element.pageId] ?? "";
    const cls = ELEMENT_CLASS_MAP[element.type] ?? element.type;
    store.jsCodeByPage.value[element.pageId] = addElementToCode(current, element.id, cls, varNameFromId(element.id));
    store.markJsCodeInitialized();
  }

  return { isNotAdded, isNotAddedId, notAddedOnCurrentPage, addToCode };
}
