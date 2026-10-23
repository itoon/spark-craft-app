import { beforeEach, describe, expect, it } from "vitest";

import {
  applyPersistedEditorState,
  resetEditorStoreForTests,
  serializeEditorState,
  useEditorStore,
} from "../../app/composables/useEditorStore";
import { usePaletteItems } from "../../app/composables/usePaletteItems";

describe("useEditorStore project flow", () => {
  beforeEach(() => {
    resetEditorStoreForTests();
  });

  it("creates a fresh project when newProject is called", () => {
    const store = useEditorStore();
    const palette = usePaletteItems();
    const inputItem = palette
      .flatMap((group) => group.items)
      .find((item) => item.type === "Input");

    if (!inputItem) {
      throw new Error("Input palette item not found");
    }

    store.addElement(inputItem);
    store.setJsCode("console.log('hello')");
    store.setShareLinkId("ccexisting12345");

    const previousProjectId = store.projectId.value;

    store.newProject();

    expect(store.projectId.value).not.toBe(previousProjectId);
    expect(store.shareLinkId.value).toBeNull();
    expect(store.pages.value).toEqual([{ id: "page1", name: "Page 1" }]);
    expect(store.currentPageId.value).toBe("page1");
    expect(store.jsCode.value).toBe("");
    expect(store.elements.value).toHaveLength(1);
    expect(store.elements.value[0]?.type).toBe("Container");
  });

  it("can serialize and restore the current project like a refresh reload", () => {
    const store = useEditorStore();
    const palette = usePaletteItems();
    const buttonItem = palette
      .flatMap((group) => group.items)
      .find((item) => item.type === "Button");

    if (!buttonItem) {
      throw new Error("Button palette item not found");
    }

    store.addElement(buttonItem);
    store.setJsCode("console.log('persist me')");
    store.setActiveDevice("android");
    store.setShareLinkId("ccsaved12345");

    const savedState = serializeEditorState();

    resetEditorStoreForTests();

    const restored = applyPersistedEditorState(savedState);

    expect(restored).toBe(true);
    expect(store.projectId.value).toBe(savedState.projectId);
    expect(store.shareLinkId.value).toBe("ccsaved12345");
    expect(store.activeDeviceId.value).toBe("android");
    expect(store.jsCode.value).toBe("console.log('persist me')");
    expect(store.elements.value.map((element) => element.id)).toEqual(
      savedState.elements.map((element) => element.id)
    );
  });

  it("stores a trimmed project name and falls back when blank", () => {
    const store = useEditorStore();

    store.setProjectName("  My Cool App  ");
    expect(store.projectName.value).toBe("My Cool App");

    store.setProjectName("   ");
    expect(store.projectName.value).toBe("Untitled Project");
  });
});
