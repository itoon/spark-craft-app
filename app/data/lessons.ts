import type { LearningBlock } from "./learningContent";
import type { LearningRequirement } from "../utils/learningRequirements";

/**
 * Learning mode — 10 apps for ~12-year-olds, from easy to hard.
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

  // ───────────────────────────────────────────────────────────────── 6
  {
    id: "split-bill",
    order: 6,
    title: "หารค่าขนม",
    tagline: "ใส่ราคา เลือกจำนวนคนกับทิป แล้วรู้เลยว่าต้องจ่ายคนละเท่าไร",
    level: 3,
    minutes: 40,
    icon: "i-lucide-receipt",
    accent: { bg: "bg-emerald-700", text: "text-emerald-700", soft: "bg-emerald-50" },
    concepts: ["Range + Select + Toggle", "Math.ceil (ปัดขึ้น)", "if / else if / else"],
    steps: [
      {
        id: "design",
        title: "ออกแบบหน้าจอ",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "แอปนี้รับข้อมูล 3 แบบ: พิมพ์ราคา (Input), เลื่อนเลือกจำนวนคน (Range) และเลือกทิป (Select)",
          },
          {
            id: "s1",
            type: "steps",
            items: [
              "วาง Toolbar เขียนว่า “หารค่าขนม”",
              "วาง Input เปลี่ยน Label เป็น “ราคารวม (บาท)”",
              "วาง Range ตั้ง Min = 2, Value = 2, Max = 10 (จำนวนคน)",
              "วาง Select (ไว้เลือกทิป ตัวเลือกจะใส่ในโค้ดทีหลัง)",
              "วาง Toggle เขียนว่า “ฉันเลี้ยงเอง 🤑”",
              "วาง Button “คำนวณ”, Heading “คนละ ? บาท” และ Label ไว้ใต้สุด",
            ],
          },
        ],
        checks: [
          { id: "input", type: "element-count", elementType: "Input", minCount: 1, message: "มีช่องใส่ราคา" },
          {
            id: "range",
            type: "element-prop-matches",
            elementType: "RangeInput",
            props: { min: "^2$", max: "^10$", value: "^([2-9]|10)$" },
            message: "มี Range เลือกได้ 2–10 คน (Value อยู่ระหว่าง 2–10)",
          },
          { id: "select", type: "element-count", elementType: "Select", minCount: 1, message: "มี Select เลือกทิป" },
          { id: "toggle", type: "element-count", elementType: "Toggle", minCount: 1, message: "มี Toggle “ฉันเลี้ยงเอง”" },
          { id: "heading", type: "element-count", elementType: "Heading", minCount: 1, message: "มี Heading โชว์ผลลัพธ์" },
        ],
        hint: "คลิก Range บนจอมือถือ แล้วแก้ Min, Value และ Max ในแผง Properties ด้านขวา ถ้า Value ยังเป็น 50 ตอนกดคำนวณจะหารด้วย 50",
      },
      {
        id: "divide",
        title: "หารเท่า ๆ กัน",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "100 บาท หาร 3 คน ได้ 33.33… ซึ่งจ่ายจริงไม่ได้ Math.ceil(...) ปัดขึ้นเป็นจำนวนเต็ม (34) จะได้ไม่มีใครจ่ายขาด",
          },
          {
            id: "c1",
            type: "code",
            title: "ปุ่มคำนวณ",
            language: "javascript",
            code: `button1.onClick(() => {
  var total = Number(input1.value);
  var people = Number(rangeinput1.value);
  var each = Math.ceil(total / people);
  heading1.text = 'คนละ ' + each + ' บาท';
});`,
          },
          {
            id: "n1",
            type: "note",
            content: "rangeinput1.value คือจำนวนที่เลื่อนไว้ตอนนั้น ลอง Run แล้วเลื่อน Range ดูว่าผลลัพธ์เปลี่ยนตาม",
          },
        ],
        checks: [
          {
            id: "even",
            type: "scenario",
            actions: [
              { type: "input", values: [100] },
              { type: "set", elementType: "RangeInput", value: 4 },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(25) },
            message: "100 บาท 4 คน ได้คนละ 25",
          },
          {
            id: "round-up",
            type: "scenario",
            actions: [
              { type: "input", values: [100] },
              { type: "set", elementType: "RangeInput", value: 3 },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(34) },
            message: "100 บาท 3 คน ปัดขึ้นเป็นคนละ 34",
          },
        ],
        hint: "ถ้าได้ 33 แปลว่าใช้ Math.round หรือ Math.floor อยู่ ต้องใช้ Math.ceil ถึงจะปัดขึ้น",
      },
      {
        id: "tip",
        title: "บวกทิปด้วย if / else if",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "เลือกทิป 10% แปลว่าต้องจ่ายเพิ่มอีก 10% ของราคา ใส่ตัวเลือกให้ Select ก่อน (ตัวเลือกของ Select ใส่ในโค้ดเป็น Array) แล้วใช้ if เช็กว่าเลือกอะไรไว้",
          },
          {
            id: "c0",
            type: "code",
            title: "ตัวเลือกทิป (ใส่ไว้นอกปุ่ม ต่อจาก page.add)",
            language: "javascript",
            code: `select1.options = ['0%', '5%', '10%'];`,
          },
          {
            id: "c1",
            type: "code",
            title: "แก้ในปุ่มคำนวณ (แทนบรรทัด var each เดิม)",
            language: "javascript",
            code: `  var tip = 0;
  if (select1.value == '5%') {
    tip = 5;
  } else if (select1.value == '10%') {
    tip = 10;
  }
  var sum = total * (100 + tip) / 100;
  var each = Math.ceil(sum / people);`,
          },
          {
            id: "w1",
            type: "warning",
            content:
              "ทำไมไม่เขียน total * 1.1 ? เพราะคอมเก็บทศนิยมบางตัวไม่เป๊ะ 100 * 1.1 ได้ 110.00000000000001 แล้ว Math.ceil ปัดขึ้นเป็น 111 ใช้เลขเต็ม (10) แล้วค่อยหาร 100 จะได้ 110 พอดี",
          },
        ],
        checks: [
          {
            id: "tip-options",
            type: "scenario",
            actions: [],
            expect: { kind: "text", elementType: "Select", prop: "options", pattern: "0%.*5%.*10%" },
            message: "Select มีตัวเลือก 0%, 5%, 10%",
          },
          {
            id: "tip-10",
            type: "scenario",
            actions: [
              { type: "input", values: [100] },
              { type: "set", elementType: "RangeInput", value: 4 },
              { type: "set", elementType: "Select", value: "10%" },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(28) },
            message: "100 บาท 4 คน ทิป 10% ได้คนละ 28",
          },
          {
            id: "tip-exact",
            type: "scenario",
            actions: [
              { type: "input", values: [200] },
              { type: "set", elementType: "RangeInput", value: 2 },
              { type: "set", elementType: "Select", value: "10%" },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(110) },
            message: "200 บาท 2 คน ทิป 10% ได้คนละ 110 พอดี (ไม่ใช่ 111)",
          },
          {
            id: "tip-0",
            type: "scenario",
            actions: [
              { type: "input", values: [100] },
              { type: "set", elementType: "RangeInput", value: 4 },
              { type: "set", elementType: "Select", value: "0%" },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(25) },
            message: "ทิป 0% ยังได้คนละ 25 เหมือนเดิม",
          },
        ],
        hint: "ค่าใน if ต้องเขียนให้ตรงกับตัวเลือกใน select1.options เป๊ะ ๆ เช่น '10%' ไม่มีเว้นวรรค",
      },
      {
        id: "guard",
        title: "ดักราคาที่ใส่ผิด",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "ลองกดคำนวณโดยไม่ใส่ราคา จะได้ 0 บาท หรือใส่ -50 ก็ได้ติดลบ ใส่โค้ดนี้ไว้บรรทัดแรกในปุ่มคำนวณ",
          },
          {
            id: "c1",
            type: "code",
            title: "ต่อจากบรรทัด var total",
            language: "javascript",
            code: `  if (total <= 0) {
    notify.toast('ใส่ราคาก่อนนะ');
    return;
  }`,
          },
          {
            id: "n1",
            type: "note",
            content: "return = หยุดทำโค้ดที่เหลือในปุ่มนี้ทันที บรรทัดหลังจากนั้นจะไม่ทำงาน",
          },
        ],
        checks: [
          {
            id: "empty",
            type: "scenario",
            actions: [
              { type: "input", values: [""] },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "called", service: ["notify.toast", "notify.alert"] },
            message: "ไม่ใส่ราคาแล้วขึ้นข้อความเตือน",
          },
          {
            id: "negative",
            type: "scenario",
            actions: [
              { type: "input", values: [-50] },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "called", service: ["notify.toast", "notify.alert"] },
            message: "ใส่ราคาติดลบแล้วขึ้นข้อความเตือน",
          },
        ],
      },
      {
        id: "treat",
        title: "เลี้ยงเอง + คำแนะนำ",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "ถ้าเปิด Toggle “ฉันเลี้ยงเอง” ให้บอกยอดทั้งหมดแทน แล้วใช้ Label บอกว่ายอดต่อคนแพงหรือถูก",
          },
          {
            id: "c1",
            type: "code",
            title: "แทนบรรทัด heading1.text เดิม",
            language: "javascript",
            code: `  if (toggle1.on) {
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
  }`,
          },
          {
            id: "ch",
            type: "note",
            content: "ท้าทาย: แชร์ลิงก์ให้เพื่อนลองหาบั๊ก หรือดัดแปลงเป็นเครื่องคิดค่าไฟ / BMI",
          },
        ],
        checks: [
          {
            id: "treat-on",
            type: "scenario",
            actions: [
              { type: "input", values: [100] },
              { type: "set", elementType: "RangeInput", value: 4 },
              { type: "set", elementType: "Toggle", value: true },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(100) },
            message: "เปิด “ฉันเลี้ยงเอง” แล้วบอกยอดทั้งหมด 100 บาท",
          },
          {
            id: "treat-tip",
            type: "scenario",
            actions: [
              { type: "input", values: [100] },
              { type: "set", elementType: "RangeInput", value: 4 },
              { type: "set", elementType: "Select", value: "10%" },
              { type: "set", elementType: "Toggle", value: true },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(110) },
            message: "เลี้ยงเอง 100 บาท + ทิป 10% = 110 บาท",
          },
          {
            id: "cheap",
            type: "scenario",
            actions: [
              { type: "input", values: [100] },
              { type: "set", elementType: "RangeInput", value: 4 },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: "ถูก" },
            message: "คนละ 25 บาท ขึ้นว่าถูก",
          },
          {
            id: "pricey",
            type: "scenario",
            actions: [
              { type: "input", values: [1000] },
              { type: "set", elementType: "RangeInput", value: 2 },
              { type: "click", match: ["คำนวณ", "calc"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: "แพง" },
            message: "คนละ 500 บาท ขึ้นว่าแพง",
          },
        ],
        hint: "toggle1.on เป็น true เมื่อเปิด Toggle ถ้ายอดเลี้ยงขึ้น 111 แทน 110 ให้ใช้ตัวแปร sum จากขั้นทิป ไม่คูณ 1.1 เอง",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 7
  {
    id: "quiz",
    order: 7,
    title: "Quiz หลายหน้า",
    tagline: "ตอบคำถามทีละหน้า เก็บคะแนนข้ามหน้า แล้วสรุปผลตอนจบ",
    level: 3,
    minutes: 50,
    icon: "i-lucide-circle-help",
    accent: { bg: "bg-sky-700", text: "text-sky-700", soft: "bg-sky-50" },
    concepts: ["4 หน้า + page.goTo", "Radio", "storage (ส่งคะแนนข้ามหน้า)"],
    steps: [
      {
        id: "flow",
        title: "วาง flow 4 หน้า",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "วาดบนกระดาษก่อน: เริ่ม → ข้อ 1 → ข้อ 2 → ผลลัพธ์ แต่ละลูกศรคือปุ่มที่ใช้ page.goTo",
          },
          {
            id: "s1",
            type: "steps",
            items: [
              "เปลี่ยนชื่อ Page 1 เป็น เริ่ม แล้ววาง Heading “Quiz ความรู้รอบตัว” กับ Button “เริ่ม”",
              "กด + สร้างหน้าใหม่อีก 3 หน้า ตั้งชื่อว่า ข้อ 1, ข้อ 2 และ ผลลัพธ์",
            ],
          },
        ],
        checks: [
          { id: "four-pages", type: "page-count", minCount: 4, message: "มี 4 หน้า" },
          {
            id: "start-button",
            type: "element-count",
            elementType: "Button",
            pageId: "page1",
            minCount: 1,
            message: "หน้าเริ่มมีปุ่มเริ่ม",
          },
        ],
      },
      {
        id: "start",
        title: "เริ่มนับคะแนนจาก 0",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "ตัวแปรธรรมดาหายไปเมื่อเปลี่ยนหน้า เลยเก็บคะแนนไว้ใน storage ซึ่งทุกหน้าอ่านได้ กดเริ่มเมื่อไรก็ตั้งคะแนนเป็น 0 ใหม่",
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า เริ่ม",
            language: "javascript",
            code: `button1.onClick(() => {
  storage.set('score', 0);
  page.goTo('ข้อ 1');
});`,
          },
        ],
        checks: [
          {
            id: "reset-score",
            type: "scenario",
            pageId: "page1",
            actions: [{ type: "click", match: ["เริ่ม", "start"], index: 0 }],
            expect: { kind: "called", service: "storage.set" },
            message: "กดเริ่มแล้วตั้งคะแนนเป็น 0 ด้วย storage.set",
          },
          {
            id: "go-q1",
            type: "scenario",
            pageId: "page1",
            actions: [{ type: "click", match: ["เริ่ม", "start"], index: 0 }],
            expect: { kind: "navigated", page: "page2" },
            message: "กดเริ่มแล้วไปหน้า ข้อ 1",
          },
        ],
      },
      {
        id: "q1-design",
        title: "หน้าข้อ 1 + ตัวเลือก",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "สลับไปหน้า ข้อ 1 วาง Heading “เมืองหลวงของไทยคือ?”",
              "วาง Radio 1 อัน (Radio อันเดียวมีหลายตัวเลือกได้)",
              "วาง Button “ตอบ”, Label ว่าง ๆ ไว้บอกผล และ Button “ข้อต่อไป”",
            ],
          },
          {
            id: "t1",
            type: "text",
            content: "ตัวเลือกของ Radio ใส่ในโค้ดเป็น Array (รายการในวงเล็บ [ ]) ดูชื่อ Radio จาก Available IDs",
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า ข้อ 1",
            language: "javascript",
            code: `radiobutton1.content = ['เชียงใหม่', 'กรุงเทพฯ', 'ภูเก็ต'];`,
          },
        ],
        checks: [
          {
            id: "radio",
            type: "element-count",
            elementType: "RadioButton",
            pageId: "page2",
            minCount: 1,
            message: "หน้าข้อ 1 มี Radio",
          },
          {
            id: "buttons",
            type: "element-count",
            elementType: "Button",
            pageId: "page2",
            minCount: 2,
            message: "หน้าข้อ 1 มีปุ่ม ตอบ และ ข้อต่อไป",
          },
          {
            id: "choices",
            type: "scenario",
            pageId: "page2",
            actions: [],
            expect: { kind: "text", elementType: "RadioButton", prop: "content", pattern: "กรุงเทพ" },
            message: "Radio มีตัวเลือก กรุงเทพฯ",
          },
        ],
      },
      {
        id: "q1-answer",
        title: "ตรวจคำตอบ",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "radiobutton1.value คือตัวเลือกที่ผู้เล่นกดไว้ อ่านคะแนนเดิมจาก storage ถ้าตอบถูกก็บวก 1 แล้วบันทึกกลับ",
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า ข้อ 1 — ปุ่มตอบ และ ข้อต่อไป",
            language: "javascript",
            code: `button2.onClick(() => {
  var score = storage.get('score', 0);
  if (radiobutton1.value == 'กรุงเทพฯ') {
    score = score + 1;
    label1.text = 'ถูก! ✅ ได้ ' + score + ' คะแนน';
  } else {
    label1.text = 'ยังไม่ถูกนะ ❌ ได้ ' + score + ' คะแนน';
  }
  storage.set('score', score);
});

button3.onClick(() => {
  page.goTo('ข้อ 2');
});`,
          },
        ],
        checks: [
          {
            id: "right",
            type: "scenario",
            pageId: "page2",
            storage: { score: 0 },
            actions: [
              { type: "set", elementType: "RadioButton", value: "กรุงเทพฯ" },
              { type: "click", match: ["ตอบ", "answer"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: "^(?!.*(ไม่ถูก|ผิด)).*ถูก.*1" },
            message: "เลือก กรุงเทพฯ แล้วขึ้นว่าถูก ได้ 1 คะแนน",
          },
          {
            id: "wrong",
            type: "scenario",
            pageId: "page2",
            storage: { score: 0 },
            actions: [
              { type: "set", elementType: "RadioButton", value: "ภูเก็ต" },
              { type: "click", match: ["ตอบ", "answer"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: "ไม่ถูก|ผิด" },
            message: "เลือก ภูเก็ต แล้วขึ้นว่ายังไม่ถูก",
          },
          {
            id: "saves",
            type: "scenario",
            pageId: "page2",
            actions: [
              { type: "set", elementType: "RadioButton", value: "กรุงเทพฯ" },
              { type: "click", match: ["ตอบ", "answer"], index: 0 },
            ],
            expect: { kind: "called", service: "storage.set" },
            message: "บันทึกคะแนนด้วย storage.set",
          },
          {
            id: "next",
            type: "scenario",
            pageId: "page2",
            actions: [{ type: "click", match: ["ต่อไป", "next"], index: 1 }],
            expect: { kind: "navigated", page: "page3" },
            message: "กดข้อต่อไปแล้วไปหน้า ข้อ 2",
          },
        ],
        hint: "คำใน if ต้องตรงกับตัวเลือกใน radiobutton1.content เป๊ะ ๆ รวมทั้ง ฯ ด้วย",
      },
      {
        id: "q1-once",
        title: "กดตอบรัว ๆ ได้คะแนนเพิ่ม?",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "ลอง Run แล้วเลือกข้อถูก จากนั้นกด “ตอบ” 3 ครั้ง คะแนนขึ้นเป็น 3 ใช่ไหม? ใช้ตัวแปร answered จำไว้ว่าตอบไปแล้ว (เหมือน playing ในเกมแตะเร็ว)",
          },
          {
            id: "c1",
            type: "code",
            title: "ตอบได้ครั้งเดียว",
            language: "javascript",
            code: `var answered = false;

button2.onClick(() => {
  if (answered) {
    return;
  }
  answered = true;
  // ...โค้ดตรวจคำตอบเดิม...
});`,
          },
        ],
        checks: [
          {
            id: "once",
            type: "scenario",
            pageId: "page2",
            storage: { score: 0 },
            actions: [
              { type: "set", elementType: "RadioButton", value: "กรุงเทพฯ" },
              { type: "click", match: ["ตอบ", "answer"], index: 0, times: 3 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: "^\\D*1\\D*$" },
            message: "กดตอบ 3 ครั้ง ยังได้แค่ 1 คะแนน",
          },
        ],
      },
      {
        id: "q2",
        title: "ข้อ 2 ทำเอง",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "หน้า ข้อ 2 หน้าตาเหมือนข้อ 1 ทุกอย่าง วางชิ้นส่วนแบบเดิม แล้ว copy โค้ดข้อ 1 มาวาง เปลี่ยนชื่อให้ตรงกับ Available IDs ของหน้านี้",
          },
          {
            id: "b1",
            type: "bullet-list",
            items: [
              "คำถาม: 1 สัปดาห์มีกี่วัน?",
              "ตัวเลือก: ['5 วัน', '7 วัน', '10 วัน'] คำตอบที่ถูกคือ '7 วัน'",
              "ปุ่มข้อต่อไป: page.goTo('ผลลัพธ์')",
            ],
          },
          {
            id: "n1",
            type: "note",
            content: "หน้านี้ชื่อชิ้นส่วนอาจเป็น radiobutton2, button4, label2, button5 ถ้าลืมเปลี่ยนชื่อ ปุ่มจะไปทำงานกับของในหน้าข้อ 1 แทน",
          },
        ],
        checks: [
          {
            id: "q2-right",
            type: "scenario",
            pageId: "page3",
            storage: { score: 1 },
            actions: [
              { type: "set", elementType: "RadioButton", value: "7 วัน" },
              { type: "click", match: ["ตอบ", "answer"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: "^(?!.*(ไม่ถูก|ผิด)).*ถูก.*2" },
            message: "ข้อ 1 ได้ 1 คะแนน + ตอบ 7 วัน ถูก รวมเป็น 2 คะแนน",
          },
          {
            id: "q2-next",
            type: "scenario",
            pageId: "page3",
            actions: [{ type: "click", match: ["ต่อไป", "next", "ผล"], index: 1 }],
            expect: { kind: "navigated", page: "page4" },
            message: "กดข้อต่อไปแล้วไปหน้าผลลัพธ์",
          },
        ],
        hint: "ถ้าได้ 1 คะแนนแทน 2 แปลว่าลืมอ่านคะแนนเดิมด้วย storage.get('score', 0)",
      },
      {
        id: "result",
        title: "หน้าผลลัพธ์",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "สลับไปหน้า ผลลัพธ์ วาง Heading, Label และ Button “เล่นใหม่”",
              "ไปที่ Code ใส่โค้ดด้านล่าง (ชื่ออาจเป็น heading4, label3, button6)",
            ],
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า ผลลัพธ์",
            language: "javascript",
            code: `var score = storage.get('score', 0);
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
          },
          {
            id: "ch",
            type: "note",
            content: "ท้าทาย: เพิ่มข้อ 3 ในเรื่องที่ชอบ หรือจับเวลาข้อละ 10 วินาทีด้วย timer.after",
          },
        ],
        checks: [
          {
            id: "shows-score",
            type: "scenario",
            pageId: "page4",
            storage: { score: 1 },
            actions: [],
            expect: { kind: "text", elementType: "Heading", pattern: "1\\s*/\\s*2" },
            message: "ได้ 1 คะแนนแล้วโชว์ 1 / 2",
          },
          {
            id: "praise",
            type: "scenario",
            pageId: "page4",
            storage: { score: 2 },
            actions: [],
            expect: { kind: "text", elementType: "Label", pattern: "เก่ง" },
            message: "ได้เต็มแล้วขึ้นคำชม",
          },
          {
            id: "again",
            type: "scenario",
            pageId: "page4",
            actions: [{ type: "click", match: ["ใหม่", "again"], index: 0 }],
            expect: { kind: "navigated", page: "page1" },
            message: "กดเล่นใหม่แล้วกลับหน้าเริ่ม",
          },
          { id: "played", type: "manual", message: "ฉันเล่นครบทุกข้อใน Run แล้ว" },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 8
  {
    id: "homework-list",
    order: 8,
    title: "สมุดจดการบ้าน",
    tagline: "จดการบ้านลง List ลบเมื่อทำเสร็จ ปิดแอปแล้วงานยังอยู่",
    level: 4,
    minutes: 50,
    icon: "i-lucide-notebook-pen",
    accent: { bg: "bg-rose-700", text: "text-rose-700", soft: "bg-rose-50" },
    concepts: ["Array + push / shift", "function render()", "storage จำรายการ"],
    steps: [
      {
        id: "design",
        title: "ออกแบบหน้าจอ",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "วาง Toolbar เขียนว่า “สมุดจดการบ้าน”",
              "วาง Input (Label: การบ้าน) และ Select (ไว้เลือกวิชา ตัวเลือกจะใส่ในโค้ด)",
              "วาง Button “เพิ่ม” และ Label “เหลือ 0 งาน”",
              "วาง List แล้ววาง Button “ลบอันแรก” กับ “ลบทั้งหมด” ไว้ใต้ List",
            ],
          },
        ],
        checks: [
          { id: "input", type: "element-count", elementType: "Input", minCount: 1, message: "มีช่องพิมพ์การบ้าน" },
          { id: "select", type: "element-count", elementType: "Select", minCount: 1, message: "มี Select เลือกวิชา" },
          { id: "list", type: "element-count", elementType: "List", minCount: 1, message: "มี List โชว์งาน" },
          { id: "buttons", type: "element-count", elementType: "Button", minCount: 3, message: "มีปุ่ม เพิ่ม, ลบอันแรก, ลบทั้งหมด" },
          { id: "label", type: "element-count", elementType: "Label", minCount: 1, message: "มี Label นับจำนวนงาน" },
        ],
      },
      {
        id: "render",
        title: "ข้อมูล → หน้าจอ ด้วย render()",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "บรรทัดแรกใส่ตัวเลือกวิชาให้ Select (ตัวเลือกของ Select ใส่ในโค้ดเป็น Array) ส่วน tasks คือ Array เก็บงานทั้งหมด และ function render() วาดหน้าจอใหม่จากข้อมูลใน tasks ทุกครั้งที่ข้อมูลเปลี่ยนให้เรียก render()",
          },
          {
            id: "c1",
            type: "code",
            title: "ใส่ไว้บนสุด ต่อจาก page.add",
            language: "javascript",
            code: `select1.options = ['คณิต', 'ไทย', 'วิทย์', 'อังกฤษ'];

var tasks = [];

function render() {
  list1.content = tasks;
  label1.text = 'เหลือ ' + tasks.length + ' งาน';
}

render();`,
          },
          {
            id: "tip",
            type: "tip",
            content: "แอปจริงแทบทุกแอปทำแบบนี้: แก้ข้อมูลก่อน แล้วค่อยวาดหน้าจอจากข้อมูล ไม่ไปแก้หน้าจอทีละจุด",
          },
        ],
        checks: [
          {
            id: "empty-list",
            type: "scenario",
            actions: [],
            expect: { kind: "text", elementType: "List", prop: "content", pattern: "^\\[\\]$" },
            message: "เปิดแอปแล้ว List ว่าง (Item 1, 2, 3 หายไป)",
          },
          {
            id: "count-0",
            type: "scenario",
            actions: [],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(0) },
            message: "Label ขึ้นว่าเหลือ 0 งาน",
          },
          {
            id: "subjects",
            type: "scenario",
            actions: [],
            expect: { kind: "text", elementType: "Select", prop: "options", pattern: "คณิต" },
            message: "Select มีตัวเลือกวิชา",
          },
        ],
      },
      {
        id: "add",
        title: "เพิ่มงานด้วย push",
        blocks: [
          {
            id: "c1",
            type: "code",
            title: "ปุ่มเพิ่ม",
            language: "javascript",
            code: `button1.onClick(() => {
  if (input1.value == '') {
    notify.toast('พิมพ์การบ้านก่อนนะ');
    return;
  }
  tasks.push(select1.value + ': ' + input1.value);
  input1.value = '';
  render();
});`,
          },
          {
            id: "n1",
            type: "note",
            content: "tasks.push(...) = ต่อท้าย Array 1 อัน แล้ว input1.value = '' ล้างช่องให้พิมพ์งานต่อไปได้เลย",
          },
        ],
        checks: [
          {
            id: "adds",
            type: "scenario",
            actions: [
              { type: "set", elementType: "Select", value: "คณิต" },
              { type: "input", values: ["แบบฝึกหัดหน้า 12"] },
              { type: "click", match: ["เพิ่ม", "add"], index: 0 },
            ],
            expect: { kind: "text", elementType: "List", prop: "content", pattern: "คณิต.*แบบฝึกหัดหน้า 12" },
            message: "เพิ่ม “คณิต: แบบฝึกหัดหน้า 12” แล้วขึ้นใน List",
          },
          {
            id: "counts",
            type: "scenario",
            actions: [
              { type: "input", values: ["งานแรก"] },
              { type: "click", match: ["เพิ่ม", "add"], index: 0 },
              { type: "input", values: ["งานสอง"] },
              { type: "click", match: ["เพิ่ม", "add"], index: 0 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(2) },
            message: "เพิ่ม 2 งานแล้ว Label บอกเหลือ 2 งาน",
          },
          {
            id: "blank",
            type: "scenario",
            actions: [
              { type: "input", values: [""] },
              { type: "click", match: ["เพิ่ม", "add"], index: 0 },
            ],
            expect: { kind: "called", service: ["notify.toast", "notify.alert"] },
            message: "ไม่พิมพ์อะไรแล้วกดเพิ่ม ขึ้นข้อความเตือน",
          },
        ],
        hint: "ถ้า List ไม่เปลี่ยน ดูว่าเรียก render() หลัง tasks.push แล้วหรือยัง",
      },
      {
        id: "remove",
        title: "ลบงานด้วย shift",
        blocks: [
          {
            id: "c1",
            type: "code",
            title: "ปุ่มลบอันแรก และ ลบทั้งหมด",
            language: "javascript",
            code: `button2.onClick(() => {
  tasks.shift();
  render();
});

button3.onClick(() => {
  tasks = [];
  render();
});`,
          },
          {
            id: "n1",
            type: "note",
            content: "tasks.shift() = เอาอันแรกออกจาก Array ส่วน tasks = [] คือเปลี่ยนเป็น Array ว่าง",
          },
        ],
        checks: [
          {
            id: "shift",
            type: "scenario",
            actions: [
              { type: "input", values: ["งานแรก"] },
              { type: "click", match: ["เพิ่ม", "add"], index: 0 },
              { type: "input", values: ["งานสอง"] },
              { type: "click", match: ["เพิ่ม", "add"], index: 0 },
              { type: "click", match: ["อันแรก", "first"], index: 1 },
            ],
            expect: { kind: "text", elementType: "List", prop: "content", pattern: "^(?!.*งานแรก).*งานสอง" },
            message: "กดลบอันแรกแล้ว งานแรกหายไป งานสองยังอยู่",
          },
          {
            id: "clear",
            type: "scenario",
            actions: [
              { type: "input", values: ["งานแรก"] },
              { type: "click", match: ["เพิ่ม", "add"], index: 0 },
              { type: "click", match: ["ทั้งหมด", "all"], index: 2 },
            ],
            expect: { kind: "text", elementType: "Label", pattern: SHOWS_NUMBER(0) },
            message: "กดลบทั้งหมดแล้วเหลือ 0 งาน",
          },
        ],
      },
      {
        id: "save",
        title: "ปิดแอปแล้วงานยังอยู่",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "ตอนนี้ปิดแอปแล้วงานหายหมด แก้ 2 จุด: ตอนเปิดแอปให้อ่าน tasks จาก storage และใน render() ให้บันทึกทุกครั้ง",
          },
          {
            id: "c1",
            type: "code",
            title: "แก้บรรทัด var tasks และเพิ่มใน render()",
            language: "javascript",
            code: `var tasks = storage.get('tasks', []);

function render() {
  list1.content = tasks;
  label1.text = 'เหลือ ' + tasks.length + ' งาน';
  storage.set('tasks', tasks);
}`,
          },
          {
            id: "ch",
            type: "note",
            content:
              "ท้าทาย: แตะงานใน List เพื่อลบงานนั้น — list1.onItemClick((item, index) => { tasks.splice(index, 1); render(); })",
          },
        ],
        checks: [
          {
            id: "loads",
            type: "scenario",
            storage: { tasks: ["วิทย์: รายงานต้นไม้"] },
            actions: [],
            expect: { kind: "text", elementType: "List", prop: "content", pattern: "รายงานต้นไม้" },
            message: "เปิดแอปแล้วงานที่จดไว้ครั้งก่อนยังอยู่",
          },
          {
            id: "stores",
            type: "scenario",
            actions: [
              { type: "input", values: ["งานแรก"] },
              { type: "click", match: ["เพิ่ม", "add"], index: 0 },
            ],
            expect: { kind: "called", service: "storage.set" },
            message: "เพิ่มงานแล้วบันทึกด้วย storage.set",
          },
          { id: "reopened", type: "manual", message: "ฉันกด Stop แล้ว Run ใหม่ งานยังอยู่" },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 9
  {
    id: "photo-booth",
    order: 9,
    title: "ตู้ถ่ายรูปฟิลเตอร์",
    tagline: "เปิดกล้อง เลือกฟิลเตอร์ นับถอยหลัง 3-2-1 แล้วถ่าย",
    level: 5,
    minutes: 45,
    icon: "i-lucide-camera",
    accent: { bg: "bg-fuchsia-700", text: "text-fuchsia-700", soft: "bg-fuchsia-50" },
    concepts: ["Camera", "async / await", "timer นับถอยหลัง"],
    steps: [
      {
        id: "design",
        title: "ออกแบบตู้ถ่ายรูป",
        blocks: [
          {
            id: "s1",
            type: "steps",
            items: [
              "วาง Camera (อยู่ในหมวด Plugins)",
              "วาง Button “เปิดกล้อง”, “ขาวดำ”, “วินเทจ”",
              "วาง Heading ว่าง ๆ ไว้โชว์ตัวเลขนับถอยหลัง และ Button “ถ่าย 📸”",
              "วาง Image ไว้โชว์รูปที่ถ่าย และ Button “บันทึก”",
            ],
          },
          {
            id: "w1",
            type: "warning",
            content: "ขออนุญาตทุกครั้งก่อนถ่ายรูปเพื่อน และห้ามแชร์รูปคนอื่นโดยที่เขาไม่รู้",
          },
        ],
        checks: [
          { id: "camera", type: "element-count", elementType: "Camera", minCount: 1, message: "มี Camera" },
          { id: "image", type: "element-count", elementType: "Image", minCount: 1, message: "มี Image โชว์รูป" },
          { id: "heading", type: "element-count", elementType: "Heading", minCount: 1, message: "มี Heading นับถอยหลัง" },
          { id: "buttons", type: "element-count", elementType: "Button", minCount: 4, message: "มีปุ่มอย่างน้อย 4 ปุ่ม" },
        ],
      },
      {
        id: "open",
        title: "เปิดกล้อง",
        blocks: [
          {
            id: "c1",
            type: "code",
            title: "ปุ่มเปิดกล้อง",
            language: "javascript",
            code: `button1.onClick(() => {
  camera1.open();
});`,
          },
          {
            id: "n1",
            type: "note",
            content: "กด Run แล้วกดเปิดกล้อง เบราว์เซอร์จะถามว่าอนุญาตให้ใช้กล้องไหม ให้กดอนุญาต",
          },
        ],
        checks: [
          {
            id: "opens",
            type: "scenario",
            actions: [{ type: "click", match: ["เปิด", "open"], index: 0 }],
            expect: { kind: "text", elementType: "Camera", prop: "open", pattern: "^true$" },
            message: "กดเปิดกล้องแล้วกล้องเปิด",
          },
          { id: "saw-camera", type: "manual", message: "ฉันเห็นภาพจากกล้องใน Run แล้ว" },
        ],
      },
      {
        id: "filters",
        title: "ฟิลเตอร์",
        blocks: [
          {
            id: "c1",
            type: "code",
            title: "ปุ่มฟิลเตอร์",
            language: "javascript",
            code: `button2.onClick(() => {
  camera1.setFilter('grayscale');
});

button3.onClick(() => {
  camera1.setFilter('vintage');
});`,
          },
          {
            id: "tags",
            type: "tags",
            items: ["none", "grayscale", "sepia", "vintage", "warm", "cool", "invert", "blur"],
          },
          { id: "n1", type: "note", content: "ลองเพิ่มปุ่มฟิลเตอร์อื่นจากรายการด้านบน ใช้ 'none' เพื่อกลับเป็นภาพปกติ" },
        ],
        checks: [
          {
            id: "gray",
            type: "scenario",
            actions: [{ type: "click", match: ["ขาวดำ", "gray"], index: 1 }],
            expect: { kind: "text", elementType: "Camera", prop: "filter", pattern: "^grayscale$" },
            message: "กดขาวดำแล้วภาพเป็นขาวดำ",
          },
          {
            id: "vintage",
            type: "scenario",
            actions: [{ type: "click", match: ["วินเทจ", "vintage"], index: 2 }],
            expect: { kind: "text", elementType: "Camera", prop: "filter", pattern: "^vintage$" },
            message: "กดวินเทจแล้วภาพเป็นวินเทจ",
          },
        ],
      },
      {
        id: "shoot",
        title: "ถ่ายรูปด้วย await",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "การถ่ายรูปใช้เวลานิดหนึ่ง await แปลว่า “รอให้ถ่ายเสร็จก่อน แล้วค่อยทำบรรทัดถัดไป” ฟังก์ชันที่มี await ต้องมีคำว่า async นำหน้า",
          },
          {
            id: "c1",
            type: "code",
            title: "ปุ่มถ่าย และ บันทึก",
            language: "javascript",
            code: `var lastShot = null;

button4.onClick(async () => {
  lastShot = await camera1.capture();
  image1.src = lastShot.dataUrl;
});

button5.onClick(() => {
  if (lastShot) {
    lastShot.save('my-photo.png');
  }
});`,
          },
        ],
        checks: [
          {
            id: "await",
            type: "code-pattern",
            pattern: "await\\s+\\w+\\.capture\\(",
            mode: "regex",
            message: "ใช้ await รอ capture() ถ่ายเสร็จ",
          },
          {
            id: "show",
            type: "code-pattern",
            pattern: "\\.src\\s*=",
            mode: "regex",
            message: "เอารูปไปใส่ใน Image (.src = ...)",
          },
          {
            id: "save",
            type: "code-pattern",
            pattern: "\\.save\\(",
            mode: "regex",
            message: "ปุ่มบันทึกเรียก .save(...)",
          },
          { id: "took-photo", type: "manual", message: "ฉันถ่ายแล้วรูปขึ้นใน Image" },
        ],
        hint: "ถ้าขึ้นว่า Camera is not ready ให้กดเปิดกล้องก่อนกดถ่าย",
      },
      {
        id: "countdown",
        title: "นับถอยหลัง 3-2-1",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "แทนปุ่มถ่ายเดิมด้วยแบบนี้: นับ 3-2-1 ทุก 1 วินาที พูดตัวเลขออกเสียง แล้วค่อยถ่าย",
          },
          {
            id: "c1",
            type: "code",
            title: "ปุ่มถ่าย (แบบนับถอยหลัง)",
            language: "javascript",
            code: `button4.onClick(() => {
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
});`,
          },
          {
            id: "ch",
            type: "note",
            content: "ท้าทาย: เขย่ามือถือเพื่อถ่าย (motion.onShake) หรือปุ่มสุ่มฟิลเตอร์",
          },
        ],
        checks: [
          {
            id: "starts-3",
            type: "scenario",
            actions: [{ type: "click", match: ["ถ่าย", "shoot", "📸"], index: 3 }],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(3) },
            message: "กดถ่ายแล้วขึ้น 3",
          },
          {
            id: "ticks-1",
            type: "scenario",
            actions: [
              { type: "click", match: ["ถ่าย", "shoot", "📸"], index: 3 },
              { type: "tick", times: 2 },
            ],
            expect: { kind: "text", elementType: "Heading", pattern: SHOWS_NUMBER(1) },
            message: "ผ่านไป 2 วินาทีเหลือ 1",
          },
          {
            id: "speaks",
            type: "scenario",
            actions: [{ type: "click", match: ["ถ่าย", "shoot", "📸"], index: 3 }],
            expect: { kind: "called", service: "phone.speak" },
            message: "พูดตัวเลขออกเสียง",
          },
          { id: "on-phone", type: "manual", message: "ฉันลองถ่ายบนมือถือจริงแล้ว" },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────── 10
  {
    id: "eco-map",
    order: 10,
    title: "Eco Map สำรวจโรงเรียน",
    tagline: "ปักหมุดจุดในโรงเรียนด้วย GPS ดูบนแผนที่ แล้วสรุปเป็นกราฟ",
    level: 5,
    minutes: 60,
    icon: "i-lucide-map-pinned",
    accent: { bg: "bg-lime-700", text: "text-lime-700", soft: "bg-lime-50" },
    concepts: ["location.get (GPS)", "Map + Chart", "รวมทุกอย่าง: หลายหน้า + storage + Array"],
    steps: [
      {
        id: "pages",
        title: "แอป 4 หน้า",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "บทสุดท้าย รวมทุกอย่างที่เรียนมา: ออกไปสำรวจถังขยะ ต้นไม้ จุดน้ำดื่ม หรือจุดที่ควรปรับปรุงในโรงเรียน แล้วปักหมุดไว้",
          },
          {
            id: "s1",
            type: "steps",
            items: [
              "หน้า หน้าแรก: Heading “Eco Map 🌱” + Button “ปักหมุด”, “ดูแผนที่”, “สรุปผล”",
              "หน้า ปักหมุด: Select (ประเภทจุด), Input (หมายเหตุ), Button “บันทึกตำแหน่งนี้”",
              "หน้า แผนที่: Map + Button “หน้าแรก”",
              "หน้า สรุปผล: Chart + Button “หน้าแรก”",
            ],
          },
        ],
        checks: [
          { id: "four-pages", type: "page-count", minCount: 4, message: "มี 4 หน้า" },
          {
            id: "menu",
            type: "element-count",
            elementType: "Button",
            pageId: "page1",
            minCount: 3,
            message: "หน้าแรกมี 3 ปุ่ม",
          },
          {
            id: "form",
            type: "element-count",
            elementType: "Select",
            pageId: "page2",
            minCount: 1,
            message: "หน้าปักหมุดมี Select เลือกประเภท",
          },
          { id: "map", type: "element-count", elementType: "Map", pageId: "page3", minCount: 1, message: "หน้าแผนที่มี Map" },
          {
            id: "chart",
            type: "element-count",
            elementType: "Chart",
            pageId: "page4",
            minCount: 1,
            message: "หน้าสรุปผลมี Chart",
          },
        ],
      },
      {
        id: "menu-nav",
        title: "เมนูหน้าแรก",
        blocks: [
          {
            id: "c1",
            type: "code",
            title: "หน้า หน้าแรก",
            language: "javascript",
            code: `button1.onClick(() => {
  page.goTo('ปักหมุด');
});
button2.onClick(() => {
  page.goTo('แผนที่');
});
button3.onClick(() => {
  page.goTo('สรุปผล');
});`,
          },
          {
            id: "n1",
            type: "note",
            content: "ปุ่ม “หน้าแรก” ในหน้าแผนที่กับหน้าสรุปผล ใส่ page.goTo('หน้าแรก') เองได้เลย",
          },
        ],
        checks: [
          {
            id: "to-add",
            type: "scenario",
            pageId: "page1",
            actions: [{ type: "click", match: ["ปักหมุด"], index: 0 }],
            expect: { kind: "navigated", page: "page2" },
            message: "ปักหมุด → หน้าปักหมุด",
          },
          {
            id: "to-map",
            type: "scenario",
            pageId: "page1",
            actions: [{ type: "click", match: ["แผนที่", "map"], index: 1 }],
            expect: { kind: "navigated", page: "page3" },
            message: "ดูแผนที่ → หน้าแผนที่",
          },
          {
            id: "to-stats",
            type: "scenario",
            pageId: "page1",
            actions: [{ type: "click", match: ["สรุป"], index: 2 }],
            expect: { kind: "navigated", page: "page4" },
            message: "สรุปผล → หน้าสรุปผล",
          },
        ],
      },
      {
        id: "save-spot",
        title: "บันทึกตำแหน่งด้วย GPS",
        blocks: [
          {
            id: "t1",
            type: "text",
            content:
              "location.get() ถามตำแหน่งจาก GPS ต้องรอสักครู่จึงใช้ await แต่ละจุดเก็บเป็น object { type, note, lat, lng } ต่อท้าย Array spots",
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า ปักหมุด",
            language: "javascript",
            code: `select1.options = ['ต้นไม้', 'ถังขยะ', 'จุดน้ำดื่ม', 'ควรปรับปรุง'];

async function saveSpot() {
  var p = await location.get();
  var spots = storage.get('spots', []);
  spots.push({ type: select1.value, note: input1.value, lat: p.lat, lng: p.lng });
  storage.set('spots', spots);
  notify.toast('บันทึกแล้ว 📍');
  page.goTo('แผนที่');
}

button4.onClick(saveSpot);`,
          },
          {
            id: "tip",
            type: "tip",
            content: "ทดสอบในคอมได้: ตอน Run เปิดแผง Sensor Simulator แล้วตั้งตำแหน่ง GPS ได้เลย ไม่ต้องเดินจริง",
          },
        ],
        checks: [
          {
            id: "kinds",
            type: "scenario",
            pageId: "page2",
            actions: [],
            expect: { kind: "text", elementType: "Select", prop: "options", pattern: "ต้นไม้.*ถังขยะ" },
            message: "Select มีตัวเลือกประเภทจุด",
          },
          {
            id: "gps",
            type: "scenario",
            pageId: "page2",
            actions: [{ type: "click", match: ["บันทึก", "save"], index: 0 }],
            expect: { kind: "called", service: "location.get" },
            message: "กดบันทึกแล้วถามตำแหน่งด้วย location.get()",
          },
          {
            id: "push",
            type: "code-pattern",
            pageId: "page2",
            pattern: "\\.push\\(",
            mode: "regex",
            message: "ต่อท้ายจุดใหม่เข้า Array ด้วย push",
          },
          {
            id: "store",
            type: "code-pattern",
            pageId: "page2",
            pattern: "storage\\.set\\(",
            mode: "regex",
            message: "บันทึกจุดทั้งหมดด้วย storage.set",
          },
        ],
        hint: "ถ้าใช้ await ใน function ต้องมีคำว่า async นำหน้า function",
      },
      {
        id: "markers",
        title: "ปักหมุดบนแผนที่",
        blocks: [
          {
            id: "c1",
            type: "code",
            title: "หน้า แผนที่",
            language: "javascript",
            code: `var spots = storage.get('spots', []);

spots.forEach((s) => {
  map1.addMarker(s.lat, s.lng, s.type + ': ' + s.note);
});

if (spots.length > 0) {
  map1.setCenter(spots[0].lat, spots[0].lng, 17);
}`,
          },
          {
            id: "n1",
            type: "note",
            content: "forEach = ทำโค้ดข้างในกับทุกจุดใน Array ทีละจุด s คือจุดที่กำลังทำอยู่",
          },
        ],
        checks: [
          {
            id: "shows-spots",
            type: "scenario",
            pageId: "page3",
            storage: {
              spots: [
                { type: "ต้นไม้", note: "ต้นมะม่วง", lat: 13.7563, lng: 100.5018 },
                { type: "ถังขยะ", note: "ถังแดงหน้าโรงอาหาร", lat: 13.7565, lng: 100.502 },
              ],
            },
            actions: [],
            expect: { kind: "text", elementType: "Map", prop: "markers", pattern: "ต้นมะม่วง.*ถังแดง" },
            message: "จุดที่บันทึกไว้ 2 จุดขึ้นเป็นหมุดบนแผนที่",
          },
        ],
      },
      {
        id: "stats",
        title: "สรุปเป็นกราฟ",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "นับว่าแต่ละประเภทมีกี่จุด เก็บไว้ใน object counts เช่น { ต้นไม้: 2, ถังขยะ: 1 } แล้วส่งให้ Chart วาด",
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า สรุปผล",
            language: "javascript",
            code: `var spots = storage.get('spots', []);
var counts = {};

spots.forEach((s) => {
  counts[s.type] = (counts[s.type] || 0) + 1;
});

chart1.setData(Object.keys(counts), Object.values(counts));
chart1.setTitle('จุดที่สำรวจได้');`,
          },
        ],
        checks: [
          {
            id: "labels",
            type: "scenario",
            pageId: "page4",
            storage: {
              spots: [
                { type: "ต้นไม้", note: "", lat: 0, lng: 0 },
                { type: "ถังขยะ", note: "", lat: 0, lng: 0 },
                { type: "ต้นไม้", note: "", lat: 0, lng: 0 },
              ],
            },
            actions: [],
            expect: { kind: "text", elementType: "Chart", prop: "labels", pattern: "ต้นไม้.*ถังขยะ" },
            message: "กราฟมีแท่ง ต้นไม้ กับ ถังขยะ",
          },
          {
            id: "counts",
            type: "scenario",
            pageId: "page4",
            storage: {
              spots: [
                { type: "ต้นไม้", note: "", lat: 0, lng: 0 },
                { type: "ถังขยะ", note: "", lat: 0, lng: 0 },
                { type: "ต้นไม้", note: "", lat: 0, lng: 0 },
              ],
            },
            actions: [],
            expect: { kind: "text", elementType: "Chart", prop: "datasets", pattern: "\"data\":\\[2,1\\]" },
            message: "ต้นไม้ 2 จุด ถังขยะ 1 จุด",
          },
        ],
        hint: "ถ้ากราฟว่าง ลองไปหน้าปักหมุดแล้วบันทึกสัก 2–3 จุดก่อน",
      },
      {
        id: "shake",
        title: "เขย่าเพื่อบันทึกเร็ว + ออกสำรวจจริง",
        blocks: [
          {
            id: "t1",
            type: "text",
            content: "เพราะเราเขียน saveSpot เป็น function ไว้แล้ว จะเรียกจากที่ไหนก็ได้ เพิ่มบรรทัดนี้ในหน้า ปักหมุด",
          },
          {
            id: "c1",
            type: "code",
            title: "หน้า ปักหมุด",
            language: "javascript",
            code: `motion.onShake(saveSpot);`,
          },
          {
            id: "s1",
            type: "steps",
            items: [
              "กด APK เพื่อติดตั้งลงมือถือ (หรือกด “มือถือ” แล้วสแกน QR)",
              "ออกไปเดินสำรวจในโรงเรียน 15 นาที ปักหมุดให้ได้อย่างน้อย 5 จุด",
              "กลับมาดูกราฟ แล้วเล่าให้เพื่อนฟังว่าเจออะไร และแอปช่วยอะไรได้บ้าง",
            ],
          },
        ],
        checks: [
          {
            id: "shake-saves",
            type: "scenario",
            pageId: "page2",
            actions: [{ type: "shake" }],
            expect: { kind: "called", service: "location.get" },
            message: "เขย่ามือถือแล้วบันทึกตำแหน่ง",
          },
          { id: "field", type: "manual", message: "ฉันออกไปปักหมุดจริงได้อย่างน้อย 5 จุด" },
        ],
      },
    ],
  },
];

export function getLesson(id: string | null | undefined): Lesson | null {
  return lessons.find((lesson) => lesson.id === id) ?? null;
}
