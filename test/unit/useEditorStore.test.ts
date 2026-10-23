import { beforeEach, describe, expect, it } from "vitest";

import {
  applyPersistedEditorState,
  resetEditorStoreForTests,
  serializeEditorState,
  useEditorStore,
} from "../../app/composables/useEditorStore";
import { usePaletteItems } from "../../app/composables/usePaletteItems";
import { APP_PAGE_ID, isOnPage } from "../../app/utils/componentApi";

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

describe("app-level Sound", () => {
  beforeEach(() => {
    resetEditorStoreForTests();
  });

  const soundItem = () => {
    const item = usePaletteItems()
      .flatMap((group) => group.items)
      .find((candidate) => candidate.type === "Sound");
    if (!item) throw new Error("Sound palette item not found");
    return item;
  };

  it("belongs to the whole app with a short id that is also its variable name", () => {
    const store = useEditorStore();
    const first = store.addElement(soundItem());
    store.addPage();
    const second = store.addElement(soundItem());

    expect(first.id).toBe("sound1");
    expect(second.id).toBe("sound2");
    expect(first.pageId).toBe(APP_PAGE_ID);
    expect(first.parentId).toBeNull();
    expect(isOnPage(first, "page1")).toBe(true);
    expect(isOnPage(first, "page2")).toBe(true);
  });

  it("renames a sound and updates every page's code", () => {
    const store = useEditorStore();
    store.addElement(soundItem());
    store.jsCodeByPage.value = {
      page1: "var sound1 = new Sound('sound1'); sound1.play();",
      page2: 'var s = new Sound("sound1");',
    };

    expect(store.renameElement("sound1", "soundWin")).toBeNull();
    expect(store.elements.value.some((el) => el.id === "soundWin")).toBe(true);
    expect(store.jsCodeByPage.value.page1).toBe("var sound1 = new Sound('soundWin'); sound1.play();");
    expect(store.jsCodeByPage.value.page2).toBe('var s = new Sound("soundWin");');
  });

  it("rejects names that can't be used in code or are taken", () => {
    const store = useEditorStore();
    store.addElement(soundItem());
    store.addElement(soundItem());

    expect(store.renameElement("sound1", "2fast")).not.toBeNull();
    expect(store.renameElement("sound1", "เสียง")).not.toBeNull();
    expect(store.renameElement("sound1", "sound2")).toContain("sound2");
    expect(store.elements.value.some((el) => el.id === "sound1")).toBe(true);
  });

  it("moves sounds saved on a page (older projects) to the app", () => {
    const restored = applyPersistedEditorState({
      projectId: "p",
      projectName: "Old",
      shareLinkId: null,
      pages: [{ id: "page1", name: "Page 1" }],
      currentPageId: "page1",
      activeDeviceId: "iphone15",
      jsCodeByPage: {},
      elements: [
        {
          id: "page1_sound1",
          pageId: "page1",
          type: "Sound",
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          props: { sound: "coin" },
          parentId: null,
          children: [],
        },
      ],
    });

    expect(restored).not.toBe(false);
    const store = useEditorStore();
    expect(store.elements.value[0]?.pageId).toBe(APP_PAGE_ID);
    expect(store.elements.value[0]?.id).toBe("page1_sound1");
  });
});
