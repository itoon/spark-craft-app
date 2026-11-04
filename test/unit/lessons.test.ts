import { describe, expect, it } from "vitest";

import type { AppElement, Page } from "../../app/composables/useEditorStore";
import { lessons, type Lesson } from "../../app/data/lessons";
import { getComponentClassMap } from "../../app/utils/componentApi";
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

const classNames = getComponentClassMap();

function scaffold(elements: AppElement[]) {
  return elements
    .filter((element) => element.type !== "Container")
    .map((element) => {
      const name = element.id.split("_")[1];
      const cls = classNames[element.type] ?? element.type;
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
  it("has 10 lessons ordered from easy to hard", () => {
    expect(lessons).toHaveLength(10);
    expect(lessons.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(lessons.map((item) => item.level)).toEqual([1, 2, 3, 4, 5, 3, 3, 4, 5, 5]);
    expect(new Set(lessons.map((item) => item.id)).size).toBe(10);
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

describe("lesson 6 — split bill", () => {
  const counters: Record<string, number> = {};
  const elements = buildPage("page1", 1, [
    { type: "Toolbar", props: { title: "หารค่าขนม" } },
    { type: "Input", props: { label: "ราคารวม (บาท)", value: "" } },
    { type: "RangeInput", props: { min: 2, max: 10, value: 2 } },
    { type: "Select", props: { options: ["Option 1", "Option 2"], value: "" } },
    { type: "Toggle", props: { content: "ฉันเลี้ยงเอง 🤑", on: false } },
    { type: "Button", props: { content: "คำนวณ" } },
    { type: "Heading", props: { content: "คนละ ? บาท" } },
    { type: "Label", props: { content: "" } },
  ], counters);
  const base = scaffold(elements);
  const solution = (rounding = "Math.ceil") => `${base}
select1.options = ['0%', '5%', '10%'];
button1.onClick(() => {
  var total = Number(input1.value);
  if (total <= 0) {
    notify.toast('ใส่ราคาก่อนนะ');
    return;
  }
  var people = Number(rangeinput1.value);
  var tip = 0;
  if (select1.value == '5%') {
    tip = 5;
  } else if (select1.value == '10%') {
    tip = 10;
  }
  var sum = total * (100 + tip) / 100;
  var each = ${rounding}(sum / people);
  if (toggle1.on) {
    heading1.text = 'ฉันเลี้ยงเอง ' + Math.ceil(sum) + ' บาท';
  } else {
    heading1.text = 'คนละ ' + each + ' บาท';
  }
  if (each < 50) {
    label1.text = 'ถูกมาก 😄';
  } else if (each < 150) {
    label1.text = 'โอเคอยู่ 🙂';
  } else {
    label1.text = 'แพงไปไหม 😅';
  }
});`;

  it("passes every check with the reference solution", () => {
    expect(failingChecks(lesson("split-bill"), context(elements, { page1: solution() }))).toEqual([]);
  });

  it("catches a Range left at the palette value 50 (people = 50, not 2–10)", () => {
    const stale = elements.map((element) =>
      element.type === "RangeInput" ? { ...element, props: { ...element.props, value: 50 } } : element,
    );
    const failures = failingChecks(lesson("split-bill"), context(stale, { page1: solution() }));
    expect(failures.some((line) => line.startsWith("design/range"))).toBe(true);
  });

  it("catches the 1.1 floating-point trap (100 * 1.1 → 111 after Math.ceil)", () => {
    const float = solution()
      .replace("tip = 5;", "tip = 0.05;")
      .replace("tip = 10;", "tip = 0.1;")
      .replace("var sum = total * (100 + tip) / 100;", "var sum = total * (1 + tip);");
    const failures = failingChecks(lesson("split-bill"), context(elements, { page1: float }));
    expect(failures.map((line) => line.split(":")[0]).sort()).toEqual(["tip/tip-exact", "treat/treat-tip"]);
  });

  it("catches rounding down instead of up", () => {
    const failures = failingChecks(lesson("split-bill"), context(elements, { page1: solution("Math.round") }));
    expect(failures.some((line) => line.startsWith("divide/round-up"))).toBe(true);
    expect(failures.some((line) => line.startsWith("divide/even"))).toBe(false);
  });
});

describe("lesson 7 — quiz", () => {
  const counters: Record<string, number> = {};
  const page1 = buildPage("page1", 1, [
    { type: "Heading", props: { content: "Quiz ความรู้รอบตัว" } },
    { type: "Button", props: { content: "เริ่ม" } },
  ], counters);
  const page2 = buildPage("page2", 2, [
    { type: "Heading", props: { content: "เมืองหลวงของไทยคือ?" } },
    { type: "RadioButton", props: { value: "", content: [{ key: "Option", value: "Option" }] } },
    { type: "Button", props: { content: "ตอบ" } },
    { type: "Label", props: { content: "" } },
    { type: "Button", props: { content: "ข้อต่อไป" } },
  ], counters);
  const page3 = buildPage("page3", 3, [
    { type: "Heading", props: { content: "1 สัปดาห์มีกี่วัน?" } },
    { type: "RadioButton", props: { value: "", content: [{ key: "Option", value: "Option" }] } },
    { type: "Button", props: { content: "ตอบ" } },
    { type: "Label", props: { content: "" } },
    { type: "Button", props: { content: "ข้อต่อไป" } },
  ], counters);
  const page4 = buildPage("page4", 4, [
    { type: "Heading", props: { content: "" } },
    { type: "Label", props: { content: "" } },
    { type: "Button", props: { content: "เล่นใหม่" } },
  ], counters);
  const pages: Page[] = [
    { id: "page1", name: "เริ่ม" },
    { id: "page2", name: "ข้อ 1" },
    { id: "page3", name: "ข้อ 2" },
    { id: "page4", name: "ผลลัพธ์" },
  ];
  const question = (
    elements: AppElement[],
    names: { radio: string; answer: string; label: string; next: string },
    choices: string,
    right: string,
    nextPage: string,
    readScore = "storage.get('score', 0)",
  ) => `${scaffold(elements)}
${names.radio}.content = ${choices};
var answered = false;
${names.answer}.onClick(() => {
  if (answered) {
    return;
  }
  answered = true;
  var score = ${readScore};
  if (${names.radio}.value == '${right}') {
    score = score + 1;
    ${names.label}.text = 'ถูก! ✅ ได้ ' + score + ' คะแนน';
  } else {
    ${names.label}.text = 'ยังไม่ถูกนะ ❌ ได้ ' + score + ' คะแนน';
  }
  storage.set('score', score);
});
${names.next}.onClick(() => {
  page.goTo('${nextPage}');
});`;
  const code = {
    page1: `${scaffold(page1)}
button1.onClick(() => {
  storage.set('score', 0);
  page.goTo('ข้อ 1');
});`,
    page2: question(page2, { radio: "radiobutton1", answer: "button2", label: "label1", next: "button3" },
      "['เชียงใหม่', 'กรุงเทพฯ', 'ภูเก็ต']", "กรุงเทพฯ", "ข้อ 2"),
    page3: question(page3, { radio: "radiobutton2", answer: "button4", label: "label2", next: "button5" },
      "['5 วัน', '7 วัน', '10 วัน']", "7 วัน", "ผลลัพธ์"),
    page4: `${scaffold(page4)}
var score = storage.get('score', 0);
heading4.text = 'ได้ ' + score + ' / 2 คะแนน';
if (score == 2) {
  label3.text = 'เก่งมาก! 🏆';
} else if (score == 1) {
  label3.text = 'เกือบแล้ว 💪';
} else {
  label3.text = 'ลองใหม่นะ 📚';
}
button6.onClick(() => {
  page.goTo('เริ่ม');
});`,
  };
  const all = [...page1, ...page2, ...page3, ...page4];

  it("passes every check with the reference solution", () => {
    expect(failingChecks(lesson("quiz"), context(all, code, pages))).toEqual([]);
  });

  it("catches answering again for extra points", () => {
    const repeatable = { ...code, page2: code.page2.replace("  if (answered) {\n    return;\n  }\n", "") };
    const failures = failingChecks(lesson("quiz"), context(all, repeatable, pages));
    expect(failures).toEqual([expect.stringMatching(/^q1-once\/once/)]);
  });

  it("catches a question that forgets the score from earlier pages", () => {
    const forgetful = {
      ...code,
      page3: question(page3, { radio: "radiobutton2", answer: "button4", label: "label2", next: "button5" },
        "['5 วัน', '7 วัน', '10 วัน']", "7 วัน", "ผลลัพธ์", "0"),
    };
    const failures = failingChecks(lesson("quiz"), context(all, forgetful, pages));
    expect(failures.some((line) => line.startsWith("q2/q2-right"))).toBe(true);
  });
});

describe("lesson 8 — homework list", () => {
  const counters: Record<string, number> = {};
  const elements = buildPage("page1", 1, [
    { type: "Toolbar", props: { title: "สมุดจดการบ้าน" } },
    { type: "Input", props: { label: "การบ้าน", value: "" } },
    { type: "Select", props: { options: ["Option 1", "Option 2"], value: "" } },
    { type: "Button", props: { content: "เพิ่ม" } },
    { type: "Label", props: { content: "เหลือ 0 งาน" } },
    { type: "List", props: { content: [{ key: "Item 1", value: "item1" }] } },
    { type: "Button", props: { content: "ลบอันแรก" } },
    { type: "Button", props: { content: "ลบทั้งหมด" } },
  ], counters);
  const solution = (load = "storage.get('tasks', [])") => `${scaffold(elements)}
select1.options = ['คณิต', 'ไทย', 'วิทย์', 'อังกฤษ'];
var tasks = ${load};
function render() {
  list1.content = tasks;
  label1.text = 'เหลือ ' + tasks.length + ' งาน';
  storage.set('tasks', tasks);
}
render();
button1.onClick(() => {
  if (input1.value == '') {
    notify.toast('พิมพ์การบ้านก่อนนะ');
    return;
  }
  tasks.push(select1.value + ': ' + input1.value);
  input1.value = '';
  render();
});
button2.onClick(() => {
  tasks.shift();
  render();
});
button3.onClick(() => {
  tasks = [];
  render();
});`;

  it("passes every check with the reference solution", () => {
    expect(failingChecks(lesson("homework-list"), context(elements, { page1: solution() }))).toEqual([]);
  });

  it("catches a list that forgets saved homework when the app reopens", () => {
    const failures = failingChecks(lesson("homework-list"), context(elements, { page1: solution("[]") }));
    expect(failures).toEqual([expect.stringMatching(/^save\/loads/)]);
  });
});

describe("lesson 9 — photo booth", () => {
  const counters: Record<string, number> = {};
  const elements = buildPage("page1", 1, [
    { type: "Camera", props: { open: false, filter: "none" } },
    { type: "Button", props: { content: "เปิดกล้อง" } },
    { type: "Button", props: { content: "ขาวดำ" } },
    { type: "Button", props: { content: "วินเทจ" } },
    { type: "Heading", props: { content: "" } },
    { type: "Button", props: { content: "ถ่าย 📸" } },
    { type: "Image", props: { src: "" } },
    { type: "Button", props: { content: "บันทึก" } },
  ], counters);
  const solution = `${scaffold(elements)}
var lastShot = null;
button1.onClick(() => {
  camera1.open();
});
button2.onClick(() => {
  camera1.setFilter('grayscale');
});
button3.onClick(() => {
  camera1.setFilter('vintage');
});
button4.onClick(() => {
  var n = 3;
  heading1.text = n;
  phone.speak(String(n));
  var countdown = timer.every(1000, async () => {
    n = n - 1;
    if (n > 0) {
      heading1.text = n;
      phone.speak(String(n));
      return;
    }
    timer.stop(countdown);
    heading1.text = '📸';
    lastShot = await camera1.capture();
    image1.src = lastShot.dataUrl;
  });
});
button5.onClick(() => {
  if (lastShot) {
    lastShot.save('my-photo.png');
  }
});`;

  it("passes every check with the reference solution", () => {
    expect(failingChecks(lesson("photo-booth"), context(elements, { page1: solution }))).toEqual([]);
  });

  it("catches filter buttons swapped around", () => {
    const swapped = solution.replace("setFilter('grayscale')", "setFilter('vintage')");
    const failures = failingChecks(lesson("photo-booth"), context(elements, { page1: swapped }));
    expect(failures).toEqual([expect.stringMatching(/^filters\/gray/)]);
  });
});

describe("lesson 10 — eco map", () => {
  const counters: Record<string, number> = {};
  const page1 = buildPage("page1", 1, [
    { type: "Heading", props: { content: "Eco Map 🌱" } },
    { type: "Button", props: { content: "ปักหมุด" } },
    { type: "Button", props: { content: "ดูแผนที่" } },
    { type: "Button", props: { content: "สรุปผล" } },
  ], counters);
  const page2 = buildPage("page2", 2, [
    { type: "Select", props: { options: ["Option 1", "Option 2"], value: "" } },
    { type: "Input", props: { label: "หมายเหตุ", value: "" } },
    { type: "Button", props: { content: "บันทึกตำแหน่งนี้" } },
  ], counters);
  const page3 = buildPage("page3", 3, [
    { type: "Map", props: { lat: 13.7563, lng: 100.5018, zoom: 13, markers: [] } },
    { type: "Button", props: { content: "หน้าแรก" } },
  ], counters);
  const page4 = buildPage("page4", 4, [
    { type: "Chart", props: { chartType: "bar", title: "My Chart", labels: ["Jan"] } },
    { type: "Button", props: { content: "หน้าแรก" } },
  ], counters);
  const pages: Page[] = [
    { id: "page1", name: "หน้าแรก" },
    { id: "page2", name: "ปักหมุด" },
    { id: "page3", name: "แผนที่" },
    { id: "page4", name: "สรุปผล" },
  ];
  const code = {
    page1: `${scaffold(page1)}
button1.onClick(() => { page.goTo('ปักหมุด'); });
button2.onClick(() => { page.goTo('แผนที่'); });
button3.onClick(() => { page.goTo('สรุปผล'); });`,
    page2: `${scaffold(page2)}
select1.options = ['ต้นไม้', 'ถังขยะ', 'จุดน้ำดื่ม', 'ควรปรับปรุง'];
async function saveSpot() {
  var p = await location.get();
  var spots = storage.get('spots', []);
  spots.push({ type: select1.value, note: input1.value, lat: p.lat, lng: p.lng });
  storage.set('spots', spots);
  notify.toast('บันทึกแล้ว 📍');
  page.goTo('แผนที่');
}
button4.onClick(saveSpot);
motion.onShake(saveSpot);`,
    page3: `${scaffold(page3)}
var spots = storage.get('spots', []);
spots.forEach((s) => {
  map1.addMarker(s.lat, s.lng, s.type + ': ' + s.note);
});
if (spots.length > 0) {
  map1.setCenter(spots[0].lat, spots[0].lng, 17);
}
button5.onClick(() => { page.goTo('หน้าแรก'); });`,
    page4: `${scaffold(page4)}
var spots = storage.get('spots', []);
var counts = {};
spots.forEach((s) => {
  counts[s.type] = (counts[s.type] || 0) + 1;
});
chart1.setData(Object.keys(counts), Object.values(counts));
chart1.setTitle('จุดที่สำรวจได้');
button6.onClick(() => { page.goTo('หน้าแรก'); });`,
  };
  const all = [...page1, ...page2, ...page3, ...page4];

  it("passes every check with the reference solution", () => {
    expect(failingChecks(lesson("eco-map"), context(all, code, pages))).toEqual([]);
  });

  it("catches a chart that shows one bar per spot instead of counting", () => {
    const uncounted = {
      ...code,
      page4: code.page4.replace(
        "chart1.setData(Object.keys(counts), Object.values(counts));",
        "chart1.setData(spots.map((s) => s.type), spots.map(() => 1));",
      ),
    };
    const failures = failingChecks(lesson("eco-map"), context(all, uncounted, pages));
    expect(failures).toEqual([expect.stringMatching(/^stats\/counts/)]);
  });
});
