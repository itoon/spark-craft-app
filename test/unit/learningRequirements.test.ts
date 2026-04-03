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
