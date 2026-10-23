import type { LearningBlock } from "./learningContent";
import type { LearningRequirement } from "../utils/learningRequirements";

/**
 * Learning mode — 5 apps for ~12-year-olds, from easy to hard.
 * Every step has `checks`: live ✓/○ items that must pass before "next".
 * Checks test behaviour (click the button → did the text change?) rather
 * than exact code, so learners can write it their own way.
 */

export interface LessonStep {
  id: string;
  title: string;
  blocks: LearningBlock[];
  checks?: LearningRequirement[];
  /** Shown behind a "ขอคำใบ้" button when the learner is stuck. */
  hint?: string;
}

export interface Lesson {
  id: string;
  order: number;
  title: string;
  tagline: string;
  /** 1 = easiest … 5 = hardest */
  level: 1 | 2 | 3 | 4 | 5;
  minutes: number;
  icon: string;
  /** Tailwind classes for the lesson accent */
  accent: { bg: string; text: string; soft: string };
  concepts: string[];
  steps: LessonStep[];
}

// Reusable regexes
const NOT_DEFAULT = (word: string) => `^(?!\\s*${word}\\s*$).+`;
const SHOWS_NUMBER = (n: number) => `(^|[^\\d.])${n}([^\\d]|$)`;

const PLUS = ["+", "บวก"];
const MINUS = ["-", "−", "ลบ"];
const TIMES = ["×", "x", "*", "คูณ"];
const DIVIDE = ["÷", "/", "หาร"];

export const lessons: Lesson[] = [
  // ───────────────────────────────────────────────────────────────── 1
  {
    id: "hello-button",
    order: 1,
    title: "ปุ่มทักทาย",
    tagline: "กดปุ่มแล้วข้อความบนจอเปลี่ยน — แอปแรกของเรา",
    level: 1,
    minutes: 15,
    icon: "i-lucide-hand",
    accent: { bg: "bg-sky-700", text: "text-sky-700", soft: "bg-sky-50" },
    concepts: ["Element", "Property", "Event"],
    steps: [
      {
        id: "intro",
        title: "มาสร้างแอปแรกกัน!",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "เราจะทำแอปที่มีหัวข้อหนึ่งอันกับปุ่มหนึ่งปุ่ม พอกดปุ่ม หัวข้อจะเปลี่ยนข้อความ ฟังดูง่าย แต่เป็นหัวใจของทุกแอปในโลกเลยนะ",
          },
          {
            id: "b1",
            type: "bullet-list",
            items: [
              "Element = ชิ้นส่วนบนจอ เช่น ปุ่ม ข้อความ รูป",
              "Property = ค่าของชิ้นส่วน เช่น ข้อความ สี ขนาด",
              "Event = เหตุการณ์ เช่น “ถูกกด” แล้วเราสั่งให้แอปทำอะไรต่อ",
            ],
          },
          {
            id: "tip1",
            type: "tip",
            content:
              "แต่ละขั้นมี “ภารกิจ” ให้ทำ พอทำครบ วงกลมจะกลายเป็นเครื่องหมายถูก ✓ แล้วปุ่มไปขั้นต่อไปจะกดได้",
          },
        ],
      },
      {
        id: "heading",
        title: "วางหัวข้อ (Heading)",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "ในแผง Elements กดที่ Heading",
              "หัวข้อจะโผล่บนจอมือถือตรงกลาง ให้คลิกที่หัวข้อนั้น",
              "ดูแผง Properties ทางขวา ช่อง Content แล้วพิมพ์ “สวัสดี!”",
            ],
          },
          {
            id: "n1",
            type: "note",
            content: "ข้อความที่เราพิมพ์ในช่อง Content คือ Property ของหัวข้อ",
          },
        ],
        checks: [
          {
            id: "h-count",
            type: "element-count",
            elementType: "Heading",
            minCount: 1,
            message: "มีหัวข้อ (Heading) บนจอ 1 อัน",
          },
          {
            id: "h-text",
            type: "element-prop-matches",
            elementType: "Heading",
            props: { content: NOT_DEFAULT("Heading") },
            message: "เปลี่ยนข้อความหัวข้อเป็นคำของเราเอง",
          },
        ],
        hint: "คลิกที่หัวข้อบนจอมือถือก่อน แผง Properties ถึงจะแสดงช่อง Content",
      },
      {
        id: "button",
        title: "วางปุ่ม (Button)",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "กดที่ Button ในแผง Elements",
              "คลิกปุ่มบนจอ แล้วเปลี่ยน Content เป็น “กดฉันสิ”",
              "ลองเลือกสีปุ่มที่ชอบในหัวข้อ Color",
            ],
          },
        ],
        checks: [
          {
            id: "b-count",
            type: "element-count",
            elementType: "Button",
            minCount: 1,
            message: "มีปุ่ม (Button) บนจอ",
          },
          {
            id: "b-text",
            type: "element-prop-matches",
            elementType: "Button",
            props: { content: NOT_DEFAULT("Button") },
            message: "ปุ่มมีข้อความของเราเอง",
          },
        ],
      },
      {
        id: "code",
        title: "เปิดห้องโค้ด",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "กดแท็บ Code ด้านบน ระบบจะเขียนโค้ดเริ่มต้นให้เลย ลองอ่านดูว่าแต่ละบรรทัดหมายความว่าอะไร",
          },
          {
            id: "c1",
            type: "code",
            title: "โค้ดที่ระบบเขียนให้",
            language: "javascript",
            code: `var heading1 = new Heading('page1_heading1');
page.add(heading1);

var button1 = new Button('page1_button1');
page.add(button1);`,
          },
          {
            id: "b1",
            type: "bullet-list",
            items: [
              "new Heading('page1_heading1') = หยิบหัวข้อที่เราวางไว้มาใช้ในโค้ด",
              "var heading1 = ตั้งชื่อเล่นให้มันว่า heading1",
              "page.add(heading1) = เอาไปวางบนจอตอนแอปทำงาน",
            ],
          },
          {
            id: "w1",
            type: "warning",
            content:
              "ถ้าหน้า Code ว่าง ให้กลับไป Design วางชิ้นส่วนให้ครบก่อน แล้วค่อยกลับมาที่ Code ใหม่",
          },
        ],
        checks: [
          {
            id: "rt-heading",
            type: "runtime-added",
            elementType: "Heading",
            minCount: 1,
            message: "โค้ดวางหัวข้อลงจอด้วย page.add(...)",
          },
          {
            id: "rt-button",
            type: "runtime-added",
            elementType: "Button",
            minCount: 1,
            message: "โค้ดวางปุ่มลงจอด้วย page.add(...)",
          },
        ],
      },
      {
        id: "onclick",
        title: "สั่งให้ปุ่มทำงาน",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "ตอนนี้ปุ่มกดได้แต่ยังไม่ทำอะไร เราจะบอกแอปว่า “เมื่อ button1 ถูกกด ให้เปลี่ยนข้อความของ heading1” ให้หาบรรทัด button1.onClick ด้านล่างสุดของโค้ด แล้วแก้ให้เป็นแบบนี้",
          },
          {
            id: "c1",
            type: "code",
            title: "เมื่อกดปุ่ม → เปลี่ยนข้อความ",
            language: "javascript",
            code: `button1.onClick(() => {
  heading1.text = 'ยินดีที่ได้รู้จัก!';
});`,
          },
          {
            id: "n1",
            type: "note",
            content:
              "ทุกอย่างที่อยู่ใน { } จะทำงานเฉพาะตอนกดปุ่มเท่านั้น นี่แหละคือ Event",
          },
        ],
        checks: [
          {
            id: "has-handler",
            type: "runtime-handler",
            elementType: "Button",
            event: "onClick",
            minCount: 1,
            message: "ใส่ onClick ให้ปุ่มแล้ว",
          },
          {
            id: "click-changes",
            type: "scenario",
            actions: [{ type: "click", index: 0 }],
            expect: { kind: "changed", elementType: "Heading" },
            message: "กดปุ่มแล้ว หัวข้อเปลี่ยนข้อความ",
          },
        ],
        hint: "ชื่อในโค้ดต้องตรงกับชื่อที่ตั้งด้วย var เช่น heading1 (h ตัวเล็ก) และอย่าลืม ' ' ครอบข้อความ",
      },
      {
        id: "run",
        title: "กด Run แล้วลองเล่น",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "กดปุ่ม Run สีเขียวมุมขวาบน",
              "กดปุ่ม “กดฉันสิ” ในจอมือถือ หัวข้อต้องเปลี่ยน",
              "กด Stop เพื่อกลับมาแก้ต่อ",
            ],
          },
          {
            id: "tip1",
            type: "tip",
            content:
              "อยากเล่นบนมือถือจริง? กดปุ่ม “มือถือ” ด้านบน แล้วสแกน QR ด้วยกล้องมือถือ",
          },
          {
            id: "ch",
            type: "note",
            content:
              "ท้าทาย: ลองเพิ่ม heading1.color = '#e11d48'; ใน onClick ให้หัวข้อเปลี่ยนเป็นสีแดงด้วย",
          },
        ],
        checks: [
          {
            id: "ran-it",
            type: "manual",
            message: "ฉันกด Run แล้วลองกดปุ่มดูแล้ว",
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 2
  {
    id: "tap-counter",
    order: 2,
    title: "ตัวนับคะแนน",
    tagline: "กด +1 แล้วตัวเลขเพิ่ม ครบ 10 มีเซอร์ไพรส์",
    level: 2,
    minutes: 20,
    icon: "i-lucide-plus-circle",
    accent: { bg: "bg-emerald-700", text: "text-emerald-700", soft: "bg-emerald-50" },
    concepts: ["ตัวแปร (Variable)", "+1", "if"],
    steps: [
      {
        id: "intro",
        title: "แอปที่ “จำ” ได้",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "แอปนับคะแนนต้องจำว่าตอนนี้นับไปถึงเท่าไหร่แล้ว สิ่งที่ใช้จำค่าในโปรแกรมเรียกว่า “ตัวแปร” (variable) เหมือนกล่องที่มีชื่อ ใส่ตัวเลขไว้ข้างใน",
          },
          {
            id: "b1",
            type: "bullet-list",
            items: [
              "หัวข้อ: ชื่อแอป",
              "ป้าย (Label): โชว์ตัวเลข",
              "ปุ่ม +1 และปุ่ม เริ่มใหม่",
            ],
          },
        ],
      },
      {
        id: "design",
        title: "ออกแบบหน้าจอ",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "วาง Heading แล้วเปลี่ยนข้อความเป็น “ตัวนับคะแนน”",
              "วาง Label แล้วเปลี่ยน Content เป็น 0",
              "วาง Button แล้วเปลี่ยนข้อความเป็น +1",
              "วาง Button อีกปุ่ม เปลี่ยนเป็น เริ่มใหม่",
            ],
          },
          {
            id: "tip1",
            type: "tip",
            content: "เลือก Label แล้วลองเพิ่ม Font Size ให้ตัวเลขใหญ่ ๆ จะดูเท่ขึ้น",
          },
        ],
        checks: [
          { id: "label", type: "element-count", elementType: "Label", minCount: 1, message: "มีป้าย (Label) โชว์ตัวเลข" },
          { id: "buttons", type: "element-count", elementType: "Button", minCount: 2, message: "มีปุ่ม 2 ปุ่ม" },
          {
            id: "plus-text",
            type: "element-prop-matches",
            elementType: "Button",
            props: { content: "\\+\\s*1" },
            message: "มีปุ่มที่เขียนว่า +1",
          },
        ],
      },
      {
        id: "variable",
        title: "สร้างตัวแปรและปุ่ม +1",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "ไปที่ Code แล้วเพิ่มโค้ดนี้ไว้ท้ายสุด (ถ้ามี button1.onClick อยู่แล้ว ให้แก้ของเดิม)",
          },
          {
            id: "c1",
            type: "code",
            title: "นับเพิ่มทีละ 1",
            language: "javascript",
            code: `var count = 0;

button1.onClick(() => {
  count = count + 1;
  label1.text = count;
});`,
          },
          {
            id: "b1",
            type: "bullet-list",
            items: [
              "var count = 0 → สร้างกล่องชื่อ count ใส่เลข 0",
              "count = count + 1 → เอาค่าเดิมมาบวก 1 แล้วเก็บกลับ",
              "label1.text = count → เอาตัวเลขไปโชว์บนป้าย",
            ],
          },
        ],
        checks: [
          {
            id: "var",
            type: "code-pattern",
            mode: "regex",
            pattern: "\\b(var|let)\\s+\\w+\\s*=\\s*0\\b",
            message: "มีตัวแปรที่เริ่มจาก 0",
          },
          {
            id: "plus3",
            type: "scenario",
            actions: [{ type: "click", match: ["+1", "+"], index: 0, times: 3 }],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(3) },
            message: "กด +1 สามครั้ง ป้ายต้องขึ้น 3",
          },
        ],
        hint: "ถ้าป้ายไม่เปลี่ยน ดูชื่อป้ายใน Available IDs ด้านบนของหน้า Code อาจเป็น label2 ก็ได้",
      },
      {
        id: "reset",
        title: "ปุ่มเริ่มใหม่",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "ปุ่มที่สองต้องทำให้ตัวแปรกลับเป็น 0 และโชว์ 0 บนป้าย ลองเขียนเองก่อน ถ้าติดค่อยดูโค้ดตัวอย่าง",
          },
          {
            id: "c1",
            type: "code",
            title: "เฉลย",
            language: "javascript",
            code: `button2.onClick(() => {
  count = 0;
  label1.text = count;
});`,
          },
        ],
        checks: [
          {
            id: "reset-works",
            type: "scenario",
            actions: [
              { type: "click", match: ["+1", "+"], index: 0, times: 2 },
              { type: "click", match: ["เริ่มใหม่", "reset", "รีเซ็ต", "ล้าง"], index: 1 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: "^\\D*0\\D*$" },
            message: "กด +1 สองครั้ง แล้วกดเริ่มใหม่ ป้ายต้องกลับเป็น 0",
          },
        ],
      },
      {
        id: "if",
        title: "ครบ 10 แล้วเซอร์ไพรส์!",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "เราจะให้แอป “ตัดสินใจ” เองด้วยคำสั่ง if (ถ้า…) ใส่โค้ดนี้ไว้ใน onClick ของปุ่ม +1 ต่อจากบรรทัด label1.text",
          },
          {
            id: "c1",
            type: "code",
            title: "ถ้า count เท่ากับ 10",
            language: "javascript",
            code: `  if (count == 10) {
    heading1.text = 'เก่งมาก! 🎉';
  }`,
          },
          {
            id: "n1",
            type: "note",
            content: "ใช้ == (เท่ากับสองตัว) เวลาเปรียบเทียบ ส่วน = ตัวเดียวคือการใส่ค่าลงกล่อง",
          },
        ],
        checks: [
          { id: "has-if", type: "code-pattern", mode: "regex", pattern: "\\bif\\s*\\(", message: "ใช้คำสั่ง if" },
          {
            id: "ten",
            type: "scenario",
            actions: [{ type: "click", match: ["+1", "+"], index: 0, times: 10 }],
            expect: { kind: "changed", elementType: "Heading" },
            message: "กด +1 ครบ 10 ครั้ง หัวข้อเปลี่ยน",
          },
        ],
      },
      {
        id: "play",
        title: "เล่นจริง + ท้าทาย",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: ["กด Run แล้วลองกดให้ครบ 10", "กดเริ่มใหม่ แล้วนับใหม่อีกรอบ"],
          },
          {
            id: "ch",
            type: "note",
            content: "ท้าทาย: เพิ่มปุ่ม −1 เอง แต่ห้ามให้ตัวเลขติดลบ (ใช้ if ช่วย)",
          },
        ],
        checks: [{ id: "played", type: "manual", message: "ฉันลองนับครบ 10 แล้ว" }],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 3
  {
    id: "mini-calculator",
    order: 3,
    title: "เครื่องคิดเลขจิ๋ว",
    tagline: "รับตัวเลข 2 ตัว แล้ว บวก ลบ คูณ หาร",
    level: 3,
    minutes: 30,
    icon: "i-lucide-calculator",
    accent: { bg: "bg-violet-600", text: "text-violet-700", soft: "bg-violet-50" },
    concepts: ["Input → คิด → Output", "Number()", "หารด้วย 0"],
    steps: [
      {
        id: "intro",
        title: "ข้อมูลไหลผ่านแอปยังไง",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "เครื่องคิดเลขคือตัวอย่าง dataflow ที่ชัดที่สุด: ข้อมูลเข้า (พิมพ์ตัวเลข) → ประมวลผล (บวก) → ข้อมูลออก (โชว์คำตอบ)",
          },
          {
            id: "b1",
            type: "bullet-list",
            items: ["Input 2 ช่อง: เลขตัวแรก, เลขตัวที่สอง", "ปุ่ม 4 ปุ่ม: + - × ÷", "Label 1 อัน: โชว์ผลลัพธ์"],
          },
        ],
      },
      {
        id: "design",
        title: "ออกแบบหน้าจอ",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "วาง Heading เขียนว่า “เครื่องคิดเลขจิ๋ว”",
              "วาง Input 2 อัน เปลี่ยน Label เป็น “เลขตัวแรก” กับ “เลขตัวที่สอง”",
              "วาง Button 4 ปุ่ม เขียนว่า +  -  ×  ÷",
              "วาง Label 1 อัน เขียนว่า “ผลลัพธ์”",
            ],
          },
        ],
        checks: [
          { id: "inputs", type: "element-count", elementType: "Input", minCount: 2, message: "มีช่อง Input 2 ช่อง" },
          { id: "buttons", type: "element-count", elementType: "Button", minCount: 4, message: "มีปุ่ม 4 ปุ่ม" },
          { id: "label", type: "element-count", elementType: "Label", minCount: 1, message: "มี Label โชว์ผลลัพธ์" },
        ],
      },
      {
        id: "plus-bug",
        title: "ปุ่มบวก (มีกับดัก!)",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "ไปที่ Code แล้วแก้ onClick ของปุ่ม + ให้เป็นแบบนี้ จากนั้นกด Run ใส่ 2 กับ 3 แล้วกด +",
          },
          {
            id: "c1",
            type: "code",
            title: "ลองแบบนี้ก่อน",
            language: "javascript",
            code: `button1.onClick(() => {
  label1.text = input1.value + input2.value;
});`,
          },
          {
            id: "w1",
            type: "warning",
            content: "ได้ 23 แทน 5 ใช่ไหม? เพราะสิ่งที่พิมพ์ในช่องเป็น “ข้อความ” ข้อความ + ข้อความ = เอามาต่อกัน",
          },
        ],
        checks: [
          {
            id: "plus-handler",
            type: "scenario",
            actions: [
              { type: "input", values: [2, 3] },
              { type: "click", match: PLUS, index: 0 },
            ],
            expect: { kind: "changed", elementType: "Label" },
            message: "กด + แล้ว Label เปลี่ยน",
          },
          { id: "saw-bug", type: "manual", message: "ฉันเห็นแล้วว่ามันขึ้น 23" },
        ],
      },
      {
        id: "plus-fix",
        title: "แก้กับดักด้วย Number()",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "Number(...) เปลี่ยนข้อความให้เป็นตัวเลขจริง ๆ ก่อนเอามาบวก",
          },
          {
            id: "c1",
            type: "code",
            title: "บวกแบบถูกต้อง",
            language: "javascript",
            code: `button1.onClick(() => {
  var a = Number(input1.value);
  var b = Number(input2.value);
  label1.text = a + b;
});`,
          },
        ],
        checks: [
          {
            id: "plus-5",
            type: "scenario",
            actions: [
              { type: "input", values: [2, 3] },
              { type: "click", match: PLUS, index: 0 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(5) },
            message: "ใส่ 2 กับ 3 แล้วกด + ต้องได้ 5",
          },
        ],
        hint: "ถ้ายังได้ 23 แปลว่ายังลืมใส่ Number( ) ครอบ input1.value หรือ input2.value",
      },
      {
        id: "others",
        title: "ลบ คูณ หาร",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "ทำอีก 3 ปุ่มเองเลย เครื่องหมายในโค้ดคือ  -  *  /  (คูณใช้ * หารใช้ /)",
          },
          {
            id: "c1",
            type: "code",
            title: "ตัวอย่างปุ่มลบ",
            language: "javascript",
            code: `button2.onClick(() => {
  var a = Number(input1.value);
  var b = Number(input2.value);
  label1.text = a - b;
});`,
          },
        ],
        checks: [
          {
            id: "minus",
            type: "scenario",
            actions: [
              { type: "input", values: [7, 4] },
              { type: "click", match: MINUS, index: 1 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(3) },
            message: "7 - 4 ได้ 3",
          },
          {
            id: "times",
            type: "scenario",
            actions: [
              { type: "input", values: [6, 3] },
              { type: "click", match: TIMES, index: 2 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(18) },
            message: "6 × 3 ได้ 18",
          },
          {
            id: "divide",
            type: "scenario",
            actions: [
              { type: "input", values: [8, 2] },
              { type: "click", match: DIVIDE, index: 3 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(4) },
            message: "8 ÷ 2 ได้ 4",
          },
        ],
      },
      {
        id: "zero",
        title: "หารด้วย 0 ได้ไหม?",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "ลองใส่ 8 กับ 0 แล้วกด ÷ จะขึ้น Infinity ซึ่งคนใช้แอปงงแน่ ๆ ใช้ if ดักไว้ก่อน",
          },
          {
            id: "c1",
            type: "code",
            title: "ดักการหารด้วย 0",
            language: "javascript",
            code: `button4.onClick(() => {
  var a = Number(input1.value);
  var b = Number(input2.value);
  if (b == 0) {
    label1.text = 'หารด้วย 0 ไม่ได้นะ';
  } else {
    label1.text = a / b;
  }
});`,
          },
        ],
        checks: [
          {
            id: "div-zero",
            type: "scenario",
            actions: [
              { type: "input", values: [8, 0] },
              { type: "click", match: DIVIDE, index: 3 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: "^(?!.*(Infinity|NaN)).*[^\\s].*$" },
            message: "8 ÷ 0 ต้องไม่ขึ้น Infinity",
          },
          {
            id: "div-still-works",
            type: "scenario",
            actions: [
              { type: "input", values: [9, 3] },
              { type: "click", match: DIVIDE, index: 3 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(3) },
            message: "9 ÷ 3 ยังได้ 3 เหมือนเดิม",
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 4
  {
    id: "magic-ball",
    order: 4,
    title: "ลูกบอลทำนาย",
    tagline: "ถามอะไรก็ได้ แอปสุ่มคำตอบ พูดออกเสียง และสั่นบนมือถือ",
    level: 4,
    minutes: 30,
    icon: "i-lucide-sparkles",
    accent: { bg: "bg-fuchsia-700", text: "text-fuchsia-700", soft: "bg-fuchsia-50" },
    concepts: ["List", "สุ่ม (random)", "notify / phone", "ทดสอบบนมือถือ"],
    steps: [
      {
        id: "design",
        title: "ออกแบบลูกบอลทำนาย",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "วาง Toolbar แล้วตั้ง Title เป็น “ลูกบอลทำนาย”",
              "วาง Input เปลี่ยน Label เป็น “คำถามของฉัน”",
              "วาง Button เขียนว่า “ทำนาย!”",
              "วาง Heading เขียนว่า 🔮 (เดี๋ยวคำตอบจะมาโชว์ตรงนี้)",
            ],
          },
        ],
        checks: [
          { id: "input", type: "element-count", elementType: "Input", minCount: 1, message: "มีช่องพิมพ์คำถาม" },
          { id: "button", type: "element-count", elementType: "Button", minCount: 1, message: "มีปุ่มทำนาย" },
          { id: "heading", type: "element-count", elementType: "Heading", minCount: 1, message: "มี Heading ไว้โชว์คำตอบ" },
        ],
      },
      {
        id: "list",
        title: "ลิสต์คำตอบ + สุ่ม",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "List คือกล่องที่ใส่ของได้หลายชิ้นเรียงกัน แต่ละชิ้นมีเลขลำดับ เริ่มจาก 0 เราจะสุ่มเลขลำดับแล้วหยิบคำตอบออกมา",
          },
          {
            id: "c1",
            type: "code",
            title: "สุ่มคำตอบ",
            language: "javascript",
            code: `var answers = ['ใช่แน่นอน!', 'ไม่น่าจะนะ', 'ลองถามใหม่อีกที', 'เป็นไปได้สูง', 'อย่าเพิ่งดีกว่า'];

button1.onClick(() => {
  var i = Math.floor(Math.random() * answers.length);
  heading1.text = answers[i];
});`,
          },
          {
            id: "b1",
            type: "bullet-list",
            items: [
              "Math.random() ให้เลขสุ่มระหว่าง 0 ถึง 0.999…",
              "คูณด้วยจำนวนคำตอบ (5) แล้ว Math.floor ปัดเศษทิ้ง → ได้ 0 ถึง 4",
              "answers[i] = หยิบคำตอบลำดับที่ i",
            ],
          },
        ],
        checks: [
          {
            id: "has-list",
            type: "code-pattern",
            mode: "regex",
            pattern: "\\[\\s*(['\"`][^'\"`]*['\"`]\\s*,\\s*){2,}['\"`]",
            message: "มีลิสต์คำตอบอย่างน้อย 3 คำตอบ",
          },
          { id: "random", type: "code-pattern", pattern: "Math.random()", message: "ใช้ Math.random() สุ่ม" },
          {
            id: "answers",
            type: "scenario",
            actions: [
              { type: "input", values: ["ฉันจะสอบผ่านไหม"] },
              { type: "click", index: 0 },
            ],
            expect: { kind: "changed", elementType: "Heading" },
            message: "กดทำนายแล้ว คำตอบขึ้นบน Heading",
          },
        ],
      },
      {
        id: "guard",
        title: "ยังไม่พิมพ์คำถาม ห้ามทำนาย",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "notify.toast(...) คือข้อความเด้งสั้น ๆ ด้านล่างจอ (ใน App Inventor เรียกว่า Notifier) ใส่ไว้บรรทัดแรกใน onClick",
          },
          {
            id: "c1",
            type: "code",
            title: "เช็กว่าพิมพ์คำถามหรือยัง",
            language: "javascript",
            code: `  if (input1.value == '') {
    notify.toast('พิมพ์คำถามก่อนนะ');
    return;
  }`,
          },
          {
            id: "n1",
            type: "note",
            content: "return = หยุดตรงนี้ ไม่ต้องทำบรรทัดที่เหลือ",
          },
        ],
        checks: [
          {
            id: "toast-empty",
            type: "scenario",
            actions: [
              { type: "input", values: [""] },
              { type: "click", index: 0 },
            ],
            expect: { kind: "called", service: ["notify.toast", "notify.alert"] },
            message: "ถ้าไม่พิมพ์คำถาม ต้องมีข้อความเด้งเตือน",
          },
          {
            id: "still-answers",
            type: "scenario",
            actions: [
              { type: "input", values: ["วันนี้ฝนจะตกไหม"] },
              { type: "click", index: 0 },
            ],
            expect: { kind: "changed", elementType: "Heading" },
            message: "ถ้าพิมพ์คำถามแล้ว ยังทำนายได้ตามปกติ",
          },
        ],
      },
      {
        id: "speak",
        title: "ให้แอปพูดและสั่น",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "เพิ่มสองบรรทัดนี้ต่อจาก heading1.text = answers[i];",
          },
          {
            id: "c1",
            type: "code",
            title: "พูด + สั่น",
            language: "javascript",
            code: `  phone.speak(answers[i]);
  phone.vibrate(300);`,
          },
          {
            id: "n1",
            type: "note",
            content: "บนคอมจะได้ยินเสียงแต่ไม่สั่น บนมือถือ Android จะสั่นด้วย (iPhone ไม่รองรับการสั่น)",
          },
        ],
        checks: [
          {
            id: "speaks",
            type: "scenario",
            actions: [
              { type: "input", values: ["พรุ่งนี้จะโชคดีไหม"] },
              { type: "click", index: 0 },
            ],
            expect: { kind: "called", service: "phone.speak" },
            message: "กดทำนายแล้ว แอปพูดคำตอบ",
          },
        ],
      },
      {
        id: "phone",
        title: "ทดสอบบนมือถือจริง",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "ต่อมือถือเข้า Wi‑Fi เดียวกับคอม",
              "กดปุ่ม “มือถือ” ด้านบน แล้วสแกน QR",
              "พิมพ์คำถามบนมือถือ แล้วกดทำนาย",
              "ลองแก้คำตอบในลิสต์บนคอม ดูมือถือเปลี่ยนตามทันที",
            ],
          },
        ],
        checks: [{ id: "on-phone", type: "manual", message: "ฉันลองเล่นบนมือถือแล้ว" }],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 5
  {
    id: "tap-race",
    order: 5,
    title: "เกมแตะเร็ว",
    tagline: "แตะให้ได้มากที่สุดใน 10 วินาที แล้วจำสถิติไว้",
    level: 5,
    minutes: 45,
    icon: "i-lucide-zap",
    accent: { bg: "bg-amber-700", text: "text-amber-700", soft: "bg-amber-50" },
    concepts: ["2 หน้า + page.goTo", "timer", "storage (จำสถิติ)"],
    steps: [
      {
        id: "pages",
        title: "เกมนี้มี 2 หน้า",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "หน้า “เริ่ม” โชว์สถิติและปุ่มเริ่มเกม ส่วนหน้า “เกม” มีเวลานับถอยหลังกับปุ่มให้แตะรัว ๆ",
          },
          {
            id: "s1",
            type: "steps",
            items: [
              "คลิกชื่อ Page 1 เหนือจอมือถือ แล้วเปลี่ยนชื่อเป็น เริ่ม",
              "วาง Heading “เกมแตะเร็ว ⚡”, Label “สถิติสูงสุด: 0”, Button “เริ่มเกม”",
              "กด + ข้างชื่อหน้าเพื่อสร้างหน้าใหม่ แล้วตั้งชื่อว่า เกม",
              "ในหน้าเกม วาง Label “เวลา: 10”, Heading “0”, Button “แตะ!”, Button “กลับ”",
            ],
          },
        ],
        checks: [
          { id: "two-pages", type: "page-count", minCount: 2, message: "มี 2 หน้า" },
          {
            id: "start-button",
            type: "element-count",
            elementType: "Button",
            pageId: "page1",
            minCount: 1,
            message: "หน้าแรกมีปุ่มเริ่มเกม",
          },
          {
            id: "game-buttons",
            type: "element-count",
            elementType: "Button",
            pageId: "page2",
            minCount: 2,
            message: "หน้าเกมมีปุ่ม แตะ! และ กลับ",
          },
          {
            id: "game-label",
            type: "element-count",
            elementType: "Label",
            pageId: "page2",
            minCount: 1,
            message: "หน้าเกมมี Label โชว์เวลา",
          },
        ],
      },
      {
        id: "goto",
        title: "ปุ่มเริ่มเกม → ไปหน้าเกม",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "สลับกลับมาหน้า เริ่ม (ลูกศรข้างชื่อหน้า) แล้วไปที่ Code ใส่โค้ดนี้",
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า เริ่ม",
            language: "javascript",
            code: `button1.onClick(() => {
  page.goTo('เกม');
});`,
          },
          {
            id: "n1",
            type: "note",
            content: "แต่ละหน้ามีโค้ดของตัวเอง ดูชื่อหน้าที่หัวของ Code editor ว่ากำลังแก้หน้าไหนอยู่",
          },
        ],
        checks: [
          {
            id: "go-game",
            type: "scenario",
            pageId: "page1",
            actions: [{ type: "click", match: ["เริ่ม", "start"], index: 0 }],
            expect: { kind: "navigated", page: "page2" },
            message: "กดเริ่มเกมแล้วไปหน้าเกม",
          },
        ],
        hint: "ชื่อใน page.goTo('...') ต้องตรงกับชื่อหน้าเป๊ะ ๆ หรือจะใช้ 'page2' ก็ได้",
      },
      {
        id: "tap",
        title: "แตะแล้วได้แต้ม",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "สลับไปหน้า เกม แล้วไปที่ Code ชื่อของชิ้นส่วนในหน้านี้อาจเป็น label2, heading2, button2, button3 ให้ดูจาก Available IDs",
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า เกม — นับแต้ม",
            language: "javascript",
            code: `var score = 0;
var playing = true;

button2.onClick(() => {
  if (playing) {
    score = score + 1;
    heading2.text = score;
  }
});`,
          },
        ],
        checks: [
          {
            id: "tap5",
            type: "scenario",
            pageId: "page2",
            actions: [{ type: "click", match: ["แตะ", "tap"], index: 0, times: 5 }],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(5) },
            message: "แตะ 5 ครั้ง ได้ 5 แต้ม",
          },
        ],
      },
      {
        id: "timer",
        title: "นาฬิกานับถอยหลัง",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "timer.every(1000, ...) = ทำโค้ดข้างในทุก ๆ 1000 มิลลิวินาที (1 วินาที) เหมือน Clock ใน App Inventor",
          },
          {
            id: "c1",
            type: "code",
            title: "ลดเวลาทุก 1 วินาที",
            language: "javascript",
            code: `var timeLeft = 10;

var clock = timer.every(1000, () => {
  timeLeft = timeLeft - 1;
  label2.text = 'เวลา: ' + timeLeft;
});`,
          },
        ],
        checks: [
          {
            id: "ticks",
            type: "scenario",
            pageId: "page2",
            actions: [{ type: "tick", times: 3 }],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(7) },
            message: "ผ่านไป 3 วินาที เวลาเหลือ 7",
          },
        ],
      },
      {
        id: "game-over",
        title: "หมดเวลา!",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "ถ้าไม่หยุดนาฬิกา เวลาจะติดลบไปเรื่อย ๆ ใส่โค้ดนี้ไว้ใน timer.every ต่อจากบรรทัด label2.text",
          },
          {
            id: "c1",
            type: "code",
            title: "หยุดเกมเมื่อเวลาเป็น 0",
            language: "javascript",
            code: `  if (timeLeft == 0) {
    timer.stop(clock);
    playing = false;
    notify.alert('หมดเวลา! ได้ ' + score + ' แต้ม');
  }`,
          },
        ],
        checks: [
          {
            id: "stops-at-0",
            type: "scenario",
            pageId: "page2",
            actions: [{ type: "tick", times: 13 }],
            expect: { kind: "text", elementType: "Label", pattern: "^(?!.*-)\\D*0\\D*$" },
            message: "เวลาหยุดที่ 0 ไม่ติดลบ",
          },
          {
            id: "no-more-points",
            type: "scenario",
            pageId: "page2",
            actions: [
              { type: "click", match: ["แตะ", "tap"], index: 0, times: 2 },
              { type: "tick", times: 12 },
              { type: "click", match: ["แตะ", "tap"], index: 0, times: 3 },
            ],
            expect: { kind: "text", elementType: "Heading", pattern: "^\\D*2\\D*$" },
            message: "หมดเวลาแล้ว แตะเพิ่มต้องไม่ได้แต้ม",
          },
          {
            id: "alerts",
            type: "scenario",
            pageId: "page2",
            actions: [{ type: "tick", times: 10 }],
            expect: { kind: "called", service: ["notify.alert", "notify.toast"] },
            message: "หมดเวลาแล้วบอกผู้เล่นว่าได้กี่แต้ม",
          },
        ],
      },
      {
        id: "best",
        title: "จำสถิติสูงสุด",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "storage จำค่าไว้ในเครื่องแม้ปิดแอป (App Inventor เรียกว่า TinyDB) แก้ส่วนหมดเวลาให้เช็กสถิติก่อน",
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า เกม — บันทึกสถิติ",
            language: "javascript",
            code: `  if (timeLeft == 0) {
    timer.stop(clock);
    playing = false;
    var best = storage.get('best', 0);
    if (score > best) {
      storage.set('best', score);
      notify.alert('สถิติใหม่! ' + score + ' แต้ม 🏆');
    } else {
      notify.alert('หมดเวลา! ได้ ' + score + ' แต้ม');
    }
  }`,
          },
          {
            id: "c2",
            type: "code",
            title: "หน้า เริ่ม — โชว์สถิติ (ใส่บรรทัดบนสุด)",
            language: "javascript",
            code: `var best = storage.get('best', 0);
label1.text = 'สถิติสูงสุด: ' + best;`,
          },
        ],
        checks: [
          {
            id: "saves",
            type: "scenario",
            pageId: "page2",
            storage: { best: 1 },
            actions: [
              { type: "click", match: ["แตะ", "tap"], index: 0, times: 3 },
              { type: "tick", times: 10 },
            ],
            expect: { kind: "called", service: "storage.set" },
            message: "ทำแต้มชนะสถิติเดิม แล้วบันทึกด้วย storage.set",
          },
          {
            id: "shows-best",
            type: "scenario",
            pageId: "page1",
            storage: { best: 7 },
            actions: [],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(7) },
            message: "หน้า เริ่ม โชว์สถิติที่จำไว้",
          },
        ],
      },
      {
        id: "back",
        title: "ปุ่มกลับ + เล่นบนมือถือ",
        blocks: [
          {
            id: "c1",
            type: "code",
            title: "หน้า เกม — ปุ่มกลับ",
            language: "javascript",
            code: `button3.onClick(() => {
  timer.stopAll();
  page.goTo('เริ่ม');
});`,
          },
          {
            id: "s1",
            type: "steps",
            items: [
              "กด Run แล้วเล่นให้จบ 1 รอบ",
              "กด “มือถือ” แล้วสแกน QR เล่นแข่งกับเพื่อน!",
            ],
          },
          {
            id: "ch",
            type: "note",
            content: "ท้าทาย: ให้มือถือสั่นทุกครั้งที่แตะ (phone.vibrate(30)) และพูดคะแนนตอนจบ",
          },
        ],
        checks: [
          {
            id: "back-nav",
            type: "scenario",
            pageId: "page2",
            actions: [{ type: "click", match: ["กลับ", "back"], index: 1 }],
            expect: { kind: "navigated", page: "page1" },
            message: "กดกลับแล้วไปหน้าเริ่ม",
          },
          { id: "played", type: "manual", message: "ฉันเล่นจบ 1 รอบแล้ว" },
        ],
      },
    ],
  },
];

export function getLesson(id: string | null | undefined): Lesson | null {
  return lessons.find((lesson) => lesson.id === id) ?? null;
}
