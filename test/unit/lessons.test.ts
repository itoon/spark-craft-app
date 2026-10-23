import { describe, expect, it } from "vitest";

import type { AppElement, Page } from "../../app/composables/useEditorStore";
import { lessons, type Lesson } from "../../app/data/lessons";
import {
  evaluateLearningRequirements,
  type LearningRequirementContext,
} from "../../app/utils/learningRequirements";

/**
 * Reference solutions: what a learner who followed each lesson ends up with.
 * Every non-manual check of every step must pass on the finished app, and
 * known-wrong versions must fail the checks that teach the fix.
 */

interface Draft {
  type: string;
  props: Record<string, unknown>;
}

function buildPage(pageId: string, rootIndex: number, drafts: Draft[], counters: Record<string, number>): AppElement[] {
  const root: AppElement = {
    id: `${pageId}_container${rootIndex}`,
    pageId,
    type: "Container",
    x: 0,
    y: 0,
    width: 393,
    height: 852,
    props: { direction: "col" },
    parentId: null,
    children: [],
  };
  const elements: AppElement[] = [root];
  for (const draft of drafts) {
    const key = draft.type.toLowerCase();
    counters[key] = (counters[key] ?? 0) + 1;
    const element: AppElement = {
      id: `${pageId}_${key}${counters[key]}`,
      pageId,
      type: draft.type,
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      props: { ...draft.props },
      parentId: draft.type === "Toolbar" ? null : root.id,
      children: [],
    };
    if (draft.type !== "Toolbar") root.children.push(element.id);
    elements.push(element);
  }
  return elements;
}

function scaffold(elements: AppElement[]) {
  return elements
    .filter((element) => element.type !== "Container")
    .map((element) => {
      const name = element.id.split("_")[1];
      const cls = element.type === "Toolbar" ? "Toolbar" : element.type;
      return `var ${name} = new ${cls}('${element.id}');\npage.add(${name});`;
    })
    .join("\n");
}

function context(
  elements: AppElement[],
  jsCodeByPage: Record<string, string>,
  pages: Page[] = [{ id: "page1", name: "Page 1" }],
  manual: string[] = [],
): LearningRequirementContext {
  return {
    elements,
    currentPageId: "page1",
    jsCode: jsCodeByPage.page1 ?? "",
    jsCodeByPage,
    pages,
    manualChecks: manual,
  };
}

function failingChecks(lesson: Lesson, ctx: LearningRequirementContext) {
  const failures: string[] = [];
  for (const step of lesson.steps) {
    const results = evaluateLearningRequirements(
      (step.checks ?? []).filter((check) => check.type !== "manual"),
      ctx,
    );
    for (const result of results) {
      if (!result.met) failures.push(`${step.id}/${result.id}: ${result.message} ${result.detail ?? ""}`);
    }
  }
  return failures;
}

const lesson = (id: string) => lessons.find((item) => item.id === id)!;

describe("lessons catalogue", () => {
  it("has 5 lessons ordered from easy to hard", () => {
    expect(lessons).toHaveLength(5);
    expect(lessons.map((item) => item.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it("uses unique step and check ids inside each lesson", () => {
    for (const item of lessons) {
      const stepIds = item.steps.map((step) => step.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
      for (const step of item.steps) {
        const checkIds = (step.checks ?? []).map((check) => check.id);
        expect(new Set(checkIds).size).toBe(checkIds.length);
      }
    }
  });
});

describe("lesson 1 — hello button", () => {
  const counters: Record<string, number> = {};
  const elements = buildPage("page1", 1, [
    { type: "Heading", props: { content: "สวัสดี!", level: 2 } },
    { type: "Button", props: { content: "กดฉันสิ" } },
  ], counters);
  const base = scaffold(elements);

  it("passes every check with the reference solution", () => {
    const code = `${base}\nbutton1.onClick(() => {\n  heading1.text = 'ยินดีที่ได้รู้จัก!';\n});`;
    expect(failingChecks(lesson("hello-button"), context(elements, { page1: code }))).toEqual([]);
  });

  it("does not pass the click check with the default console.log scaffold", () => {
    const code = `${base}\nbutton1.onClick(() => {\n  console.log('clicked');\n});`;
    const failures = failingChecks(lesson("hello-button"), context(elements, { page1: code }));
    expect(failures.some((line) => line.startsWith("onclick/click-changes"))).toBe(true);
  });

  it("does not leak runtime changes into the design elements", () => {
    const code = `${base}\nheading1.text = 'changed at top level';`;
    failingChecks(lesson("hello-button"), context(elements, { page1: code }));
    expect(elements[1]!.props.content).toBe("สวัสดี!");
  });
});

describe("lesson 2 — tap counter", () => {
  const counters: Record<string, number> = {};
  const elements = buildPage("page1", 1, [
    { type: "Heading", props: { content: "ตัวนับคะแนน" } },
    { type: "Label", props: { content: "0" } },
    { type: "Button", props: { content: "+1" } },
    { type: "Button", props: { content: "เริ่มใหม่" } },
  ], counters);
  const base = scaffold(elements);

  it("passes every check with the reference solution", () => {
    const code = `${base}
var count = 0;
button1.onClick(() => {
  count = count + 1;
  label1.text = count;
  if (count == 10) {
    heading1.text = 'เก่งมาก! 🎉';
  }
});
button2.onClick(() => {
  count = 0;
  label1.text = count;
});`;
    expect(failingChecks(lesson("tap-counter"), context(elements, { page1: code }))).toEqual([]);
  });

  it("catches a reset button that does not reset", () => {
    const code = `${base}
var count = 0;
button1.onClick(() => { count = count + 1; label1.text = count; });
button2.onClick(() => { label1.text = count; });`;
    const failures = failingChecks(lesson("tap-counter"), context(elements, { page1: code }));
    expect(failures.some((line) => line.startsWith("reset/reset-works"))).toBe(true);
  });
});

describe("lesson 3 — mini calculator", () => {
  const counters: Record<string, number> = {};
  const elements = buildPage("page1", 1, [
    { type: "Heading", props: { content: "เครื่องคิดเลขจิ๋ว" } },
    { type: "Input", props: { label: "เลขตัวแรก", value: "" } },
    { type: "Input", props: { label: "เลขตัวที่สอง", value: "" } },
    { type: "Button", props: { content: "+" } },
    { type: "Button", props: { content: "-" } },
    { type: "Button", props: { content: "×" } },
    { type: "Button", props: { content: "÷" } },
    { type: "Label", props: { content: "ผลลัพธ์" } },
  ], counters);
  const base = scaffold(elements);
  const op = (button: string, expr: string) =>
    `${button}.onClick(() => {\n  var a = Number(input1.value);\n  var b = Number(input2.value);\n  label1.text = ${expr};\n});`;

  it("passes every check with the reference solution", () => {
    const code = [
      base,
      op("button1", "a + b"),
      op("button2", "a - b"),
      op("button3", "a * b"),
      `button4.onClick(() => {
  var a = Number(input1.value);
  var b = Number(input2.value);
  if (b == 0) {
    label1.text = 'หารด้วย 0 ไม่ได้นะ';
  } else {
    label1.text = a / b;
  }
});`,
    ].join("\n");
    expect(failingChecks(lesson("mini-calculator"), context(elements, { page1: code }))).toEqual([]);
  });

  it("fails the 2 + 3 = 5 check when Number() is missing (text joins into 23)", () => {
    const code = `${base}\nbutton1.onClick(() => {\n  label1.text = input1.value + input2.value;\n});`;
    const failures = failingChecks(lesson("mini-calculator"), context(elements, { page1: code }));
    expect(failures.some((line) => line.startsWith("plus-fix/plus-5"))).toBe(true);
    expect(failures.some((line) => line.startsWith("plus-bug/plus-handler"))).toBe(false);
  });

  it("fails the divide-by-zero check when the result is Infinity", () => {
    const code = [base, op("button4", "a / b")].join("\n");
    const failures = failingChecks(lesson("mini-calculator"), context(elements, { page1: code }));
    expect(failures.some((line) => line.startsWith("zero/div-zero"))).toBe(true);
  });
});

describe("lesson 4 — magic ball", () => {
  const counters: Record<string, number> = {};
  const elements = buildPage("page1", 1, [
    { type: "Toolbar", props: { title: "ลูกบอลทำนาย" } },
    { type: "Input", props: { label: "คำถามของฉัน", value: "" } },
    { type: "Button", props: { content: "ทำนาย!" } },
    { type: "Heading", props: { content: "🔮" } },
  ], counters);
  const base = scaffold(elements);

  it("passes every check with the reference solution", () => {
    const code = `${base}
var answers = ['ใช่แน่นอน!', 'ไม่น่าจะนะ', 'ลองถามใหม่อีกที', 'เป็นไปได้สูง', 'อย่าเพิ่งดีกว่า'];
button1.onClick(() => {
  if (input1.value == '') {
    notify.toast('พิมพ์คำถามก่อนนะ');
    return;
  }
  var i = Math.floor(Math.random() * answers.length);
  heading1.text = answers[i];
  phone.speak(answers[i]);
  phone.vibrate(300);
});`;
    expect(failingChecks(lesson("magic-ball"), context(elements, { page1: code }))).toEqual([]);
  });
});

describe("lesson 5 — tap race", () => {
  const counters: Record<string, number> = {};
  const page1 = buildPage("page1", 1, [
    { type: "Heading", props: { content: "เกมแตะเร็ว ⚡" } },
    { type: "Label", props: { content: "สถิติสูงสุด: 0" } },
    { type: "Button", props: { content: "เริ่มเกม" } },
  ], counters);
  const page2 = buildPage("page2", 2, [
    { type: "Label", props: { content: "เวลา: 10" } },
    { type: "Heading", props: { content: "0" } },
    { type: "Button", props: { content: "แตะ!" } },
    { type: "Button", props: { content: "กลับ" } },
  ], counters);
  const pages: Page[] = [
    { id: "page1", name: "เริ่ม" },
    { id: "page2", name: "เกม" },
  ];

  const page1Code = `${scaffold(page1)}
var best = storage.get('best', 0);
label1.text = 'สถิติสูงสุด: ' + best;
button1.onClick(() => {
  page.goTo('เกม');
});`;

  const page2Code = `${scaffold(page2)}
var score = 0;
var playing = true;
button2.onClick(() => {
  if (playing) {
    score = score + 1;
    heading2.text = score;
  }
});
var timeLeft = 10;
var clock = timer.every(1000, () => {
  timeLeft = timeLeft - 1;
  label2.text = 'เวลา: ' + timeLeft;
  if (timeLeft == 0) {
    timer.stop(clock);
    playing = false;
    var best = storage.get('best', 0);
    if (score > best) {
      storage.set('best', score);
      notify.alert('สถิติใหม่! ' + score + ' แต้ม 🏆');
    } else {
      notify.alert('หมดเวลา! ได้ ' + score + ' แต้ม');
    }
  }
});
button3.onClick(() => {
  timer.stopAll();
  page.goTo('เริ่ม');
});`;

  it("passes every check with the reference solution", () => {
    const ctx = context([...page1, ...page2], { page1: page1Code, page2: page2Code }, pages);
    expect(failingChecks(lesson("tap-race"), ctx)).toEqual([]);
  });

  it("catches a countdown that goes negative", () => {
    const noStop = page2Code.replace("timer.stop(clock);", "");
    const ctx = context([...page1, ...page2], { page1: page1Code, page2: noStop }, pages);
    const failures = failingChecks(lesson("tap-race"), ctx);
    expect(failures.some((line) => line.startsWith("game-over/stops-at-0"))).toBe(true);
  });
});
