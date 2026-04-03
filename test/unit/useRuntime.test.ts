import { describe, expect, it, vi } from "vitest";

import { usePaletteItems } from "../../app/composables/usePaletteItems";
import {
  executeCode,
  syncRuntimeElementProps,
  type ElementInstance,
} from "../../app/composables/useRuntime";
import type { AppElement } from "../../app/composables/useEditorStore";

function makeElement(
  id: string,
  type: string,
  props: Record<string, unknown> = {},
): AppElement {
  return {
    id,
    pageId: "page1",
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    props,
    parentId: null,
    children: [],
  };
}

describe("executeCode", () => {
  it("renders only elements explicitly added with page.add(...)", () => {
    const elements: AppElement[] = [
      makeElement("page1_button1", "Button", { label: "One" }),
      makeElement("page1_button2", "Button", { label: "Two" }),
      makeElement("page1_button3", "Button", { label: "Three" }),
    ];

    const result = executeCode(
      [
        "const button1 = new Button('page1_button1')",
        "const button2 = new Button('page1_button2')",
        "const button3 = new Button('page1_button3')",
        "page.add(button1)",
        "page.add(button3)",
      ].join("\n"),
      elements,
    );

    expect(result.pageElements.map((element) => element.id)).toEqual([
      "page1_button1",
      "page1_button3",
    ]);
    expect(result.instances.map((instance) => instance.__el.id)).toEqual([
      "page1_button1",
      "page1_button3",
    ]);
  });

  it("auto-adds parent containers behind the scenes for added children", () => {
    const container = makeElement("page1_container1", "Container");
    container.children = ["page1_card1", "page1_list1"];

    const elements: AppElement[] = [
      container,
      {
        ...makeElement("page1_card1", "Card", { title: "Card" }),
        parentId: "page1_container1",
      },
      {
        ...makeElement("page1_list1", "List", { items: ["One", "Two"] }),
        parentId: "page1_container1",
      },
    ];

    const result = executeCode(
      [
        "const card1 = new Card('page1_card1')",
        "page.add(card1)",
      ].join("\n"),
      elements,
    );

    expect(result.pageElements.map((element) => element.id)).toEqual([
      "page1_container1",
      "page1_card1",
    ]);
  });

  it("exposes live .value for Input and LabelledInput elements", () => {
    const updates = vi.fn();
    const elements: AppElement[] = [
      makeElement("page1_input1", "Input", {
        placeholder: "Enter text",
        value: "start",
      }),
      makeElement("page1_labelledinput1", "LabelledInput", {
        label: "Name",
        placeholder: "Enter value",
        value: "alpha",
      }),
    ];

    const result = executeCode(
      [
        "const input1 = new Input('page1_input1')",
        "const labelled1 = new LabelledInput('page1_labelledinput1')",
        "page.add(input1)",
        "page.add(labelled1)",
        "console.log(input1.value)",
        "console.log(labelled1.value)",
      ].join("\n"),
      elements,
      updates,
    );

    const inputInstance = result.instances.find(
      (instance) => instance.__el.id === "page1_input1",
    ) as ElementInstance & { value: string };
    const labelledInstance = result.instances.find(
      (instance) => instance.__el.id === "page1_labelledinput1",
    ) as ElementInstance & { value: string };

    expect(inputInstance.value).toBe("start");
    expect(labelledInstance.value).toBe("alpha");

    inputInstance.value = "next input";
    labelledInstance.value = "next labelled";

    expect(updates).toHaveBeenCalledWith("page1_input1", { value: "next input" });
    expect(updates).toHaveBeenCalledWith("page1_labelledinput1", {
      value: "next labelled",
    });
  });

  it("supports page.goTo(...) from event handlers", () => {
    const navigate = vi.fn();
    const elements: AppElement[] = [
      makeElement("page1_button3", "Button", { label: "Go Page 2" }),
    ];

    const result = executeCode(
      [
        "const button3 = new Button('page1_button3')",
        "page.add(button3)",
        "button3.onClick(() => {",
        "  page.goTo('page2')",
        "})",
      ].join("\n"),
      elements,
      undefined,
      navigate,
    );

    const buttonInstance = result.instances[0];

    buttonInstance?.__onClick?.();

    expect(navigate).toHaveBeenCalledWith("page2");
  });

  it("streams console output through the live log callback", () => {
    const onLog = vi.fn();

    executeCode(
      "console.log('hello runtime')",
      [],
      undefined,
      undefined,
      onLog,
    );

    expect(onLog).toHaveBeenCalledWith({
      type: "log",
      message: "hello runtime",
    });
  });
});

describe("syncRuntimeElementProps", () => {
  it("keeps runtime instances in sync after the user edits an input value", () => {
    const elements: AppElement[] = [
      makeElement("page1_input1", "Input", {
        placeholder: "Enter text",
        value: "",
      }),
    ];

    const result = executeCode(
      [
        "const input1 = new Input('page1_input1')",
        "page.add(input1)",
      ].join("\n"),
      elements,
    );

    const synced = syncRuntimeElementProps(
      {
        pageElements: result.pageElements,
        instances: result.instances,
      },
      "page1_input1",
      { value: "typed from runtime" },
    );

    const inputInstance = synced.instances[0] as ElementInstance & { value: string };

    expect(synced.pageElements[0]?.props.value).toBe("typed from runtime");
    expect(inputInstance.value).toBe("typed from runtime");
    expect(inputInstance.valueOf()).toBe("typed from runtime");
  });
});

describe("usePaletteItems", () => {
  it("gives Input and LabelledInput default value props", () => {
    const groups = usePaletteItems();
    const inputGroup = groups.find((group) => group.label === "Input");

    const input = inputGroup?.items.find((item) => item.type === "Input");
    const labelledInput = inputGroup?.items.find(
      (item) => item.type === "LabelledInput",
    );

    expect(input?.defaultProps.value).toBe("");
    expect(labelledInput?.defaultProps.value).toBe("");
  });

  it("includes Heading and Textarea with learning-friendly defaults", () => {
    const groups = usePaletteItems();
    const displayGroup = groups.find((group) => group.label === "Display");

    const heading = displayGroup?.items.find((item) => item.type === "Heading");
    const textBox = displayGroup?.items.find((item) => item.type === "TextBox");

    expect(heading?.defaultProps.text).toBe("Heading");
    expect(heading?.defaultProps.level).toBe(2);
    expect(textBox?.defaultProps.placeholder).toBe("Write something...");
    expect(textBox?.defaultProps.textAlign).toBe("left");
    expect(textBox?.defaultProps.wrap).toBe("wrap");
  });

  it("gives Toggle content and font-size defaults for the new design", () => {
    const groups = usePaletteItems();
    const inputGroup = groups.find((group) => group.label === "Input");
    const toggle = inputGroup?.items.find((item) => item.type === "Toggle");

    expect(toggle?.defaultProps.content).toBe("Label");
    expect(toggle?.defaultProps.fontSize).toBe(16);
    expect(toggle?.defaultProps.on).toBe(false);
  });

  it("includes Spacer, Separator, Label, and Link with the requested design defaults", () => {
    const groups = usePaletteItems();
    const layoutGroup = groups.find((group) => group.label === "Layout");
    const displayGroup = groups.find((group) => group.label === "Display");

    const spacer = layoutGroup?.items.find((item) => item.type === "Spacer");
    const separator = layoutGroup?.items.find((item) => item.type === "Separator");
    const label = displayGroup?.items.find((item) => item.type === "Label");
    const link = displayGroup?.items.find((item) => item.type === "Link");

    expect(spacer?.defaultHeight).toBe(50);
    expect(separator?.defaultProps.paddingTop).toBe(8);
    expect(separator?.defaultProps.paddingBottom).toBe(8);
    expect(label?.defaultProps.content).toBe("Label");
    expect(label?.defaultProps.fontSize).toBe(14);
    expect(link?.defaultProps.content).toBe("Click here");
    expect(link?.defaultProps.href).toBe("#");
  });
});
