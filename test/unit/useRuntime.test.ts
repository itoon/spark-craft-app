import { describe, expect, it, vi } from "vitest";

import { usePaletteItems } from "../../app/composables/usePaletteItems";
import {
  findComponentApiSchemaByClassName,
  getComponentApiSchemas,
} from "../../app/utils/componentApi";
import {
  executeCode,
  getRuntimeChangeValue,
  syncRuntimeElementProps,
  type ElementInstance,
  type RuntimeExecutionEvent,
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

  it("supports dynamic prop access for component attrs suggested by the editor", () => {
    const updates = vi.fn();
    const elements: AppElement[] = [
      makeElement("page1_button1", "Button", {
        label: "Save",
        fill: "solid",
        backgroundColor: "#3880ff",
      }),
    ];

    const result = executeCode(
      [
        "const button1 = new Button('page1_button1')",
        "page.add(button1)",
        "button1.fill = 'outline'",
        "button1.backgroundColor = '#22c55e'",
      ].join("\n"),
      elements,
      updates,
    );

    const buttonInstance = result.instances[0] as ElementInstance & {
      fill: string;
      backgroundColor: string;
    };

    expect(buttonInstance.fill).toBe("outline");
    expect(buttonInstance.backgroundColor).toBe("#22c55e");
    expect(updates).toHaveBeenCalledWith("page1_button1", { fill: "outline" });
    expect(updates).toHaveBeenCalledWith("page1_button1", {
      backgroundColor: "#22c55e",
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

  it("supports camera.open() and camera.close() from runtime code", () => {
    const updates = vi.fn();
    const elements: AppElement[] = [
      makeElement("page1_camera1", "Camera", { title: "Camera", open: false }),
      makeElement("page1_button1", "Button", { label: "Open Camera" }),
    ];

    const result = executeCode(
      [
        "const camera1 = new Camera('page1_camera1')",
        "const button1 = new Button('page1_button1')",
        "page.add(camera1)",
        "page.add(button1)",
        "button1.onClick(() => {",
        "  camera1.open()",
        "})",
        "camera1.close()",
      ].join("\n"),
      elements,
      updates,
    );

    const buttonInstance = result.instances.find(
      (instance) => instance.__el.id === "page1_button1",
    );

    expect(updates).toHaveBeenCalledWith("page1_camera1", { open: false });

    buttonInstance?.__onClick?.();

    expect(updates).toHaveBeenCalledWith("page1_camera1", { open: true });
  });

  it("routes a plain alert() to the in-app alert instead of the blocking browser one", () => {
    const onNotify = vi.fn();
    const result = executeCode("alert('hi')", [], undefined, undefined, undefined, undefined, {
      services: { onNotify },
    });

    expect(result.logs.find((entry) => entry.type === "error")).toBeUndefined();
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(onNotify.mock.calls[0]![0]).toMatchObject({ kind: "alert", message: "hi" });
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

  it("captures execution events for adds, updates, logs, and navigation", () => {
    const updates = vi.fn();
    const navigate = vi.fn();
    const liveEvents: RuntimeExecutionEvent[] = [];
    const elements: AppElement[] = [
      makeElement("page1_input1", "Input", {
        placeholder: "Enter text",
        value: "",
      }),
      makeElement("page1_button1", "Button", { label: "Go" }),
    ];

    const result = executeCode(
      [
        "const input1 = new Input('page1_input1')",
        "const button1 = new Button('page1_button1')",
        "page.add(input1)",
        "page.add(button1)",
        "input1.value = '42'",
        "console.log(input1.value)",
        "button1.onClick(() => {",
        "  page.goTo('page2')",
        "})",
      ].join("\n"),
      elements,
      updates,
      navigate,
      undefined,
      (event) => {
        liveEvents.push(event);
      },
    );

    expect(result.events.length).toBeGreaterThanOrEqual(6);
    expect(result.events.slice(0, 6).map((event) => event.type)).toEqual([
      "add",
      "log",
      "add",
      "log",
      "update",
      "log",
    ]);
    expect(result.events[0]).toMatchObject({
      type: "add",
      elementId: "page1_input1",
      elementType: "Input",
    });
    expect(result.events[4]).toMatchObject({
      type: "update",
      elementId: "page1_input1",
      propName: "value",
      value: "42",
    });

    const buttonInstance = result.instances.find(
      (instance) => instance.__el.id === "page1_button1",
    );
    buttonInstance?.__onClick?.();

    expect(navigate).toHaveBeenCalledWith("page2");
    expect(liveEvents.at(-2)).toMatchObject({
      type: "navigate",
      pageRef: "page2",
    });
    expect(liveEvents.at(-1)).toMatchObject({
      type: "log",
      message: "Navigate → page2",
    });
  });
});

describe("onChange", () => {
  it("registers onChange on elements the user can change", () => {
    const elements: AppElement[] = [
      makeElement("page1_range1", "RangeInput", { value: 5 }),
      makeElement("page1_toggle1", "Toggle", { on: false }),
      makeElement("page1_input1", "Input", { value: "" }),
    ];
    const result = executeCode(
      [
        "var range1 = new Range('page1_range1'); page.add(range1);",
        "var toggle1 = new Toggle('page1_toggle1'); page.add(toggle1);",
        "var input1 = new Input('page1_input1'); page.add(input1);",
        "range1.onChange((v) => console.log('range ' + v));",
        "toggle1.onChange((on) => console.log('toggle ' + on));",
        "input1.onChange((t) => console.log('input ' + t));",
      ].join("\n"),
      elements,
    );

    expect(result.logs.some((log) => log.type === "error")).toBe(false);
    for (const instance of result.instances) {
      expect(typeof instance.__onChange).toBe("function");
    }

    const range = result.instances.find((i) => i.__el.id === "page1_range1")!;
    range.__onChange!(7);
    expect(result.logs.some((log) => log.message === "range 7")).toBe(true);
  });

  it("explains that display elements have no onChange", () => {
    const result = executeCode(
      "var label1 = new Label('page1_label1'); page.add(label1); label1.onChange(() => {});",
      [makeElement("page1_label1", "Label", { text: "Hi" })],
    );

    expect(result.logs.some((log) => log.type === "error" && log.message === "Label does not support onChange()")).toBe(true);
  });

  it("types the value passed to onChange from a run-input patch", () => {
    expect(getRuntimeChangeValue("RangeInput", { value: "42" })).toBe(42);
    expect(getRuntimeChangeValue("Toggle", { on: 1 })).toBe(true);
    expect(getRuntimeChangeValue("Checkbox", { checked: false })).toBe(false);
    expect(getRuntimeChangeValue("Input", { value: "hello" })).toBe("hello");
    expect(getRuntimeChangeValue("TextBox", { content: "diary" })).toBe("diary");
    expect(getRuntimeChangeValue("RadioButton", { value: "B" })).toBe("B");
    expect(getRuntimeChangeValue("RadioButton", { selected: true })).toBe(true);
    expect(getRuntimeChangeValue("Segment", { selected: "2" })).toBe(2);
    expect(getRuntimeChangeValue("Map", { lastClick: { lat: 1, lng: 2 } })).toBeUndefined();
    expect(getRuntimeChangeValue("Input", { placeholder: "x" })).toBeUndefined();
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

  it("reads a Toggle's on-state through on, value, and checked", () => {
    const result = executeCode(
      ["const toggle1 = new Toggle('page1_toggle1')", "page.add(toggle1)"].join("\n"),
      [makeElement("page1_toggle1", "Toggle", { content: "Wifi", on: false })],
    );

    const synced = syncRuntimeElementProps(
      { pageElements: result.pageElements, instances: result.instances },
      "page1_toggle1",
      { on: true },
    );
    const toggle = synced.instances[0] as ElementInstance & {
      on: boolean;
      value: boolean;
      checked: boolean;
    };

    expect(toggle.on).toBe(true);
    expect(toggle.value).toBe(true);
    expect(toggle.checked).toBe(true);
  });

  it("writes a Toggle's on-state through value", () => {
    const updates: Array<[string, Record<string, unknown>]> = [];
    executeCode(
      [
        "const toggle1 = new Toggle('page1_toggle1')",
        "toggle1.value = true",
        "page.add(toggle1)",
      ].join("\n"),
      [makeElement("page1_toggle1", "Toggle", { content: "Wifi", on: false })],
      (id, props) => updates.push([id, props]),
    );

    expect(updates).toContainEqual(["page1_toggle1", { on: true }]);
  });

  it("reads a Checkbox's checked-state through checked and value", () => {
    const result = executeCode(
      ["const checkbox1 = new Checkbox('page1_checkbox1')", "page.add(checkbox1)"].join("\n"),
      [makeElement("page1_checkbox1", "Checkbox", { label: "Agree", checked: false })],
    );

    const synced = syncRuntimeElementProps(
      { pageElements: result.pageElements, instances: result.instances },
      "page1_checkbox1",
      { checked: true },
    );
    const checkbox = synced.instances[0] as ElementInstance & {
      checked: boolean;
      value: boolean;
      label: string;
    };

    expect(checkbox.checked).toBe(true);
    expect(checkbox.value).toBe(true);
    expect(checkbox.label).toBe("Agree");
  });

  it("keeps a re-declared element in sync with the one on the page", () => {
    const result = executeCode(
      [
        "var toggle2 = new Toggle('page1_toggle2')",
        "page.add(toggle2)",
        "var toggle2 = new Toggle('page1_toggle2')",
        "page.add(toggle2)",
        "toggle2.onClick(() => console.log('t2=' + toggle2.value))",
      ].join("\n"),
      [makeElement("page1_toggle2", "Toggle", { content: "Topping", on: false })],
    );

    expect(result.instances).toHaveLength(1);
    const synced = syncRuntimeElementProps(
      { pageElements: result.pageElements, instances: result.instances },
      "page1_toggle2",
      { on: true },
    );

    // the onClick set through the second declaration runs and reads the live value
    synced.instances[0]!.__onClick?.();
    expect(result.logs.map((entry) => entry.message)).toContain("t2=true");
  });

  it("uses the checked-state when a Toggle or Checkbox is printed", () => {
    const result = executeCode(
      [
        "const toggle1 = new Toggle('page1_toggle1')",
        "const checkbox1 = new Checkbox('page1_checkbox1')",
        "console.log(`${toggle1}|${checkbox1}`)",
      ].join("\n"),
      [
        makeElement("page1_toggle1", "Toggle", { content: "Wifi", on: true }),
        makeElement("page1_checkbox1", "Checkbox", { label: "Agree", checked: false }),
      ],
    );

    expect(result.logs.map((entry) => entry.message)).toContain("true|false");
  });

  it("reads a Textarea's typed text through value", () => {
    const result = executeCode(
      ["const textarea1 = new Textarea('page1_textbox1')", "page.add(textarea1)"].join("\n"),
      [makeElement("page1_textbox1", "TextBox", { placeholder: "Write", content: "" })],
    );

    const synced = syncRuntimeElementProps(
      { pageElements: result.pageElements, instances: result.instances },
      "page1_textbox1",
      { content: "hello" },
    );
    const textarea = synced.instances[0] as ElementInstance & { value: string };

    expect(textarea.value).toBe("hello");
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

    expect(heading?.defaultProps.content).toBe("Heading");
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

  it("includes Camera with a closed-by-default state", () => {
    const groups = usePaletteItems();
    const pluginGroup = groups.find((group) => group.label === "Plugins");
    const camera = pluginGroup?.items.find((item) => item.type === "Camera");

    expect(camera?.defaultProps.open).toBe(false);
    expect(camera?.defaultProps.title).toBe("Camera");
  });
});

describe("componentApi", () => {
  it("builds class, method, and attr metadata for editor suggestions", () => {
    const schemas = getComponentApiSchemas();
    const button = findComponentApiSchemaByClassName("Button");
    const camera = findComponentApiSchemaByClassName("Camera");
    const fab = findComponentApiSchemaByClassName("FAB");

    expect(schemas.length).toBeGreaterThan(10);
    expect(button?.props).toContain("ionicColor");
    expect(button?.props).toContain("fill");
    expect(button?.methods).toContain("onClick(callback)");
    expect(camera?.methods).toContain("open()");
    expect(camera?.methods).toContain("close()");
    expect(fab?.designType).toBe("FloatingActionButton");
  });

  it("lists onChange only for elements the user can change (Cmd+K)", () => {
    const range = findComponentApiSchemaByClassName("Range");
    const toggle = findComponentApiSchemaByClassName("Toggle");
    const label = findComponentApiSchemaByClassName("Label");
    const button = findComponentApiSchemaByClassName("Button");

    expect(range?.methods).toContain("onChange(callback(value))");
    expect(range?.codeExample).toContain("range1.onChange((value) => {");
    expect(toggle?.methods).toContain("onChange(callback(value))");
    expect(label?.methods).not.toContain("onChange(callback(value))");
    expect(button?.methods).not.toContain("onChange(callback(value))");
  });
});
