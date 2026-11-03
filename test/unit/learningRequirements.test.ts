import { describe, expect, it } from "vitest";

import type { AppElement } from "../../app/composables/useEditorStore";
import {
  evaluateLearningRequirement,
  evaluateLearningRequirements,
  type LearningRequirementContext,
  type LearningRequirement,
} from "../../app/utils/learningRequirements";

function makeElement(id: string, type: string, pageId = "page1"): AppElement {
  return {
    id,
    pageId,
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    props: {},
    parentId: null,
    children: [],
  };
}

describe("learning requirements", () => {
  function makeContext(
    elements: AppElement[],
    code = "",
  ): LearningRequirementContext {
    return {
      elements,
      currentPageId: "page1",
      jsCode: code,
    };
  }

  it("passes when the required element exists on the target page", () => {
    const requirement: LearningRequirement = {
      id: "need-button",
      type: "element-count",
      elementType: "Button",
      pageId: "page1",
      minCount: 1,
      message: "Add a button first.",
    };

    const result = evaluateLearningRequirement(
      requirement,
      makeContext([makeElement("page1_button1", "Button")]),
    );

    expect(result.met).toBe(true);
  });

  it("fails when the element is missing from the target page", () => {
    const requirement: LearningRequirement = {
      id: "need-button",
      type: "element-count",
      elementType: "Button",
      pageId: "page1",
      minCount: 1,
      message: "Add a button first.",
    };

    const result = evaluateLearningRequirement(
      requirement,
      makeContext([makeElement("page2_button1", "Button", "page2")]),
    );

    expect(result.met).toBe(false);
    expect(result.message).toBe("Add a button first.");
  });

  it("supports element prop checks without depending on id", () => {
    const requirement: LearningRequirement = {
      id: "input-placeholder",
      type: "element-props",
      elementType: "Input",
      pageId: "page1",
      minCount: 1,
      props: { placeholder: "__exists__" },
      message: "Add an input with placeholder.",
    };

    const result = evaluateLearningRequirement(
      requirement,
      makeContext([
        {
          ...makeElement("page1_input1", "Input"),
          props: { placeholder: "Enter text" },
        },
      ]),
    );

    expect(result.met).toBe(true);
  });

  it("supports runtime-added and runtime-handler checks", () => {
    const elements = [
      makeElement("page1_button1", "Button"),
    ];
    const code = [
      "const button1 = new Button('page1_button1')",
      "page.add(button1)",
      "button1.onClick(() => console.log('clicked'))",
    ].join("\n");

    const addedResult = evaluateLearningRequirement(
      {
        id: "runtime-button",
        type: "runtime-added",
        elementType: "Button",
        pageId: "page1",
        minCount: 1,
        message: "Add button at runtime.",
      },
      makeContext(elements, code),
    );

    const handlerResult = evaluateLearningRequirement(
      {
        id: "runtime-handler",
        type: "runtime-handler",
        elementType: "Button",
        pageId: "page1",
        event: "onClick",
        minCount: 1,
        message: "Attach onClick.",
      },
      makeContext(elements, code),
    );

    expect(addedResult.met).toBe(true);
    expect(handlerResult.met).toBe(true);
  });

  it("supports onChange runtime-handler checks", () => {
    const elements = [makeElement("page1_range1", "RangeInput")];
    const requirement = {
      id: "range-change",
      type: "runtime-handler" as const,
      elementType: "RangeInput",
      pageId: "page1",
      event: "onChange" as const,
      minCount: 1,
      message: "Attach onChange.",
    };
    const base = "const range1 = new Range('page1_range1')\npage.add(range1)";

    expect(evaluateLearningRequirement(requirement, makeContext(elements, base)).met).toBe(false);
    expect(
      evaluateLearningRequirement(
        requirement,
        makeContext(elements, `${base}\nrange1.onChange((value) => console.log(value))`),
      ).met,
    ).toBe(true);
  });

  it("supports source code pattern checks", () => {
    const result = evaluateLearningRequirement(
      {
        id: "code-pattern",
        type: "code-pattern",
        pageId: "page1",
        pattern: "page.goTo(",
        mode: "includes",
        message: "Use page.goTo.",
      },
      makeContext([], "button1.onClick(() => { page.goTo('page2') })"),
    );

    expect(result.met).toBe(true);
  });

  it("evaluates multiple requirements for a learning page", () => {
    const requirements: LearningRequirement[] = [
      {
        id: "button",
        type: "element-count",
        elementType: "Button",
        pageId: "page1",
        message: "Add a button.",
      },
      {
        id: "input",
        type: "element-count",
        elementType: "Input",
        pageId: "page1",
        message: "Add an input.",
      },
    ];

    const results = evaluateLearningRequirements(
      requirements,
      makeContext([makeElement("page1_button1", "Button")]),
    );

    expect(results).toEqual([
      { id: "button", met: true, message: "Add a button." },
      { id: "input", met: false, message: "Add an input." },
    ]);
  });
});

describe("scenario checks", () => {
  function withProps(id: string, type: string, props: Record<string, unknown>): AppElement {
    return { ...makeElement(id, type), props };
  }

  const elements = [
    withProps("page1_radio1", "RadioButton", {
      value: "",
      content: [{ key: "A", value: "a" }, { key: "B", value: "b" }],
    }),
    withProps("page1_radio2", "RadioButton", { value: "" }),
    withProps("page1_toggle1", "Toggle", { on: false }),
    withProps("page1_button1", "Button", { content: "ตอบ" }),
    withProps("page1_label1", "Label", { content: "" }),
    withProps("page1_list1", "List", { content: [] }),
  ];
  const code = `var radio1 = new Radio('page1_radio1');
var radio2 = new Radio('page1_radio2');
var toggle1 = new Toggle('page1_toggle1');
var button1 = new Button('page1_button1');
var label1 = new Label('page1_label1');
var list1 = new List('page1_list1');
[radio1, radio2, toggle1, button1, label1, list1].forEach((item) => page.add(item));
button1.onClick(() => {
  label1.text = radio2.value + ' ' + toggle1.on;
  list1.content = [{ key: 'การบ้านคณิต', value: 'ส่งพรุ่งนี้' }];
});`;

  const scenario = (actions: Extract<LearningRequirement, { type: "scenario" }>["actions"], pattern: string, prop?: string) =>
    evaluateLearningRequirement(
      {
        id: "s",
        type: "scenario",
        actions,
        expect: { kind: "text", elementType: prop ? "List" : "Label", prop, pattern },
        message: "",
      },
      { elements, currentPageId: "page1", jsCode: code },
    );

  it("sets Radio and Toggle values with a set action (picked by index within the type)", () => {
    const result = scenario(
      [
        { type: "set", elementType: "RadioButton", index: 1, value: "b" },
        { type: "set", elementType: "Toggle", value: true },
        { type: "click", match: "ตอบ" },
      ],
      "^b true$",
    );
    expect(result.met).toBe(true);
  });

  it("matches text inside array props such as List content", () => {
    expect(scenario([{ type: "click", match: "ตอบ" }], "การบ้านคณิต", "content").met).toBe(true);
    expect(scenario([], "การบ้านคณิต", "content").met).toBe(false);
  });
});
