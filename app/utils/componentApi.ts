import { usePaletteItems } from "../composables/usePaletteItems";

export interface ComponentApiSchema {
  designType: string;
  className: string;
  label: string;
  props: string[];
  methods: string[];
  codeExample: string;
}

const COMPONENT_CLASS_NAME_BY_TYPE: Record<string, string> = {
  Toolbar: "Toolbar",
  Button: "Button",
  FloatingActionButton: "FAB",
  Input: "Input",
  LabelledInput: "LabelledInput",
  RangeInput: "Range",
  DateTimePicker: "DatePicker",
  Checkbox: "Checkbox",
  RadioButton: "Radio",
  Toggle: "Toggle",
  Select: "Select",
  Heading: "Heading",
  Label: "Label",
  TextBox: "Textarea",
  Spinner: "Spinner",
  Image: "Image",
  Camera: "Camera",
  Link: "Link",
  List: "List",
  Separator: "Separator",
  Spacer: "Spacer",
  Chart: "Chart",
  Map: "Map",
  Sound: "Sound",
};

const EXTRA_DEFAULT_PROPS: Record<string, Record<string, unknown>> = {};

/**
 * Elements the user can change in Run mode → the props in a run-input patch
 * that count as "the value changed" (and fire onChange).
 */
export const CHANGE_EVENT_PROPS: Record<string, string[]> = {
  Input: ["value"],
  LabelledInput: ["value"],
  Searchbar: ["value"],
  Select: ["value"],
  DateTimePicker: ["value"],
  TextBox: ["content"],
  RangeInput: ["value"],
  Toggle: ["on"],
  Checkbox: ["checked"],
  RadioButton: ["value", "selected"],
  Segment: ["selected"],
};

export function supportsChangeEvent(designType: string) {
  return designType in CHANGE_EVENT_PROPS;
}

const CHANGE_METHOD = "onChange(callback(value))";

// onChange example per element: [callback param, body]
const CHANGE_EXAMPLE_BY_TYPE: Record<string, [string, string]> = {
  RangeInput: ["value", "label1.text = 'ค่า: ' + value;"],
  Toggle: ["on", "label1.text = on ? 'เปิด' : 'ปิด';"],
  Checkbox: ["checked", "label1.text = checked ? 'ติ๊กแล้ว ✅' : 'ยังไม่ติ๊ก';"],
  Select: ["choice", "label1.text = 'เลือก: ' + choice;"],
  RadioButton: ["choice", "label1.text = 'ตอบ: ' + choice;"],
  DateTimePicker: ["date", "label1.text = 'วันที่: ' + date;"],
  Segment: ["index", "label1.text = 'แท็บที่ ' + index;"],
};

/** Display-only elements: tapping them should do nothing, so they have no onClick */
export const NO_CLICK_TYPES = ["Heading", "Label", "Spinner", "Separator", "Spacer"];

/**
 * Elements that never appear on the screen (App Inventor's "non-visible
 * components"). They sit in the tray under the phone, need no page.add()
 * and can't be tapped.
 */
export const NON_VISUAL_TYPES = ["Sound"];

export function isNonVisualType(designType: string) {
  return NON_VISUAL_TYPES.includes(designType);
}

/**
 * pageId of app-level elements: off-screen elements (Sound) belong to the
 * whole app, so every page can use them and they keep playing across pages.
 */
export const APP_PAGE_ID = "__app__";

/** True when `element` can be used on `pageId`: its own page or the whole app */
export function isOnPage(element: { pageId: string }, pageId: string) {
  return element.pageId === pageId || element.pageId === APP_PAGE_ID;
}

/** Valid id for a renamable element: also its variable name in code */
export const ELEMENT_NAME_PATTERN = /^[A-Za-z_$][\w$]*$/;

export function supportsClickEvent(designType: string) {
  return !NO_CLICK_TYPES.includes(designType) && !isNonVisualType(designType);
}

/** Element-only events beyond onClick / onChange → the designTypes that have them */
export const ELEMENT_EVENT_TYPES: Record<string, string[]> = {
  onLongPress: ["Button"],
  onEnter: ["Input", "LabelledInput"],
  onItemClick: ["List"],
  onReady: ["Camera"],
  onError: ["Camera"],
  onEnd: ["Sound"],
};

export function supportsElementEvent(event: string, designType: string) {
  return Boolean(ELEMENT_EVENT_TYPES[event]?.includes(designType));
}

/** Events to show for an element in the Properties panel, most useful first */
export function getElementEvents(designType: string): string[] {
  if (designType === "Camera") return ["onReady", "onError"];
  const events = supportsClickEvent(designType) ? ["onClick"] : [];
  if (supportsChangeEvent(designType)) events.push("onChange");
  for (const event of ["onLongPress", "onEnter", "onItemClick", "onEnd"]) {
    if (supportsElementEvent(event, designType)) events.push(event);
  }
  return events;
}

const COMMON_ELEMENT_METHODS = ["onClick(callback)"];
const BUTTON_METHODS = ["onLongPress(callback)"];
const INPUT_METHODS = ["onEnter(callback(text))"];
const LIST_METHODS = ["onItemClick(callback(item, index))"];
const SOUND_METHODS = ["play()", "stop()", "onEnd(callback)"];
const CAMERA_METHODS = [
  "open()",
  "close()",
  "getVideoElement()",
  "capture()",
  "reset()",
  "setFilter(filter)",
  "onReady(callback)",
  "onError(callback(message))",
];
const TOOLBAR_METHODS = ["backButton.onClick(callback)"];
const SPINNER_METHODS = ["show()", "hide()"];
const MAP_METHODS = [
  "setCenter(lat, lng, zoom)",
  "addMarker(lat, lng, text)",
  "clearMarkers()",
  "onClick(callback(lat, lng))",
];
const CHART_METHODS = [
  "setData(labels, data)",
  "setDatasets(datasets)",
  "setType(type)",
  "setTitle(title)",
];

function unique(items: string[]) {
  return Array.from(new Set(items));
}

export function getComponentClassMap(): Record<string, string> {
  return { ...COMPONENT_CLASS_NAME_BY_TYPE };
}

export function getComponentApiSchemas(): ComponentApiSchema[] {
  const groups = usePaletteItems();
  const byType = new Map<
    string,
    { label: string; defaultProps: Record<string, unknown> }
  >();

  for (const group of groups) {
    for (const item of group.items) {
      byType.set(item.type, {
        label: item.label,
        defaultProps: item.defaultProps,
      });
    }
  }

  const schemas: ComponentApiSchema[] = [];

  for (const [designType, className] of Object.entries(COMPONENT_CLASS_NAME_BY_TYPE)) {
    const fromPalette = byType.get(designType);
    const defaultProps = {
      ...(EXTRA_DEFAULT_PROPS[designType] ?? {}),
      ...(fromPalette?.defaultProps ?? {}),
    };

    const props = unique([
      ...Object.keys(defaultProps),
      "id",
      "width",
      "height",
    ]);

    const methods = unique([
      ...(supportsClickEvent(designType) ? COMMON_ELEMENT_METHODS : []),
      ...(supportsChangeEvent(designType) ? [CHANGE_METHOD] : []),
      ...(designType === "Button" ? BUTTON_METHODS : []),
      ...(designType === "Input" || designType === "LabelledInput" ? INPUT_METHODS : []),
      ...(designType === "List" ? LIST_METHODS : []),
      ...(designType === "Sound" ? SOUND_METHODS : []),
      ...(designType === "Camera" ? CAMERA_METHODS : []),
      ...(designType === "Toolbar" ? TOOLBAR_METHODS : []),
      ...(designType === "Spinner" ? SPINNER_METHODS : []),
      ...(designType === "Chart" ? CHART_METHODS : []),
      ...(designType === "Map" ? MAP_METHODS : []),
    ]);

    schemas.push({
      designType,
      className,
      label: fromPalette?.label ?? designType,
      props,
      methods,
      codeExample: [
        `var ${className.charAt(0).toLowerCase()}${className.slice(1)}1 = new ${className}('page1_${className.toLowerCase()}1');`,
        // Off-screen elements don't need page.add()
        ...(isNonVisualType(designType)
          ? []
          : [`page.add(${className.charAt(0).toLowerCase()}${className.slice(1)}1);`]),
        ...(designType === "Sound"
          ? [
              ``,
              `// Pick the sound in Properties (▶ to listen), then play it from code`,
              `button1.onClick(() => {`,
              `  sound1.play();`,
              `});`,
              ``,
              `// Change it from code: 'correct' 'wrong' 'win' 'coin' 'pop' ...`,
              `sound1.sound = 'win';`,
              `sound1.volume = 50;   // 0–100`,
              `sound1.loop = true;   // repeat until stop()`,
              ``,
              `// Runs when the sound finishes (not when stopped)`,
              `sound1.onEnd(() => {`,
              `  label1.text = 'เล่นจบแล้ว';`,
              `});`,
            ]
          : []),
        ...(supportsChangeEvent(designType)
          ? (() => {
              const [param, body] = CHANGE_EXAMPLE_BY_TYPE[designType] ?? ["text", "label1.text = text;"];
              return [
                ``,
                `// Runs every time the user changes the value`,
                `${className.charAt(0).toLowerCase()}${className.slice(1)}1.onChange((${param}) => {`,
                `  ${body}`,
                `});`,
              ];
            })()
          : []),
        ...(designType === "Button"
          ? [
              ``,
              `// Tap = onClick, press and hold = onLongPress`,
              `button1.onClick(() => {`,
              `  label1.text = 'แตะ';`,
              `});`,
              `button1.onLongPress(() => {`,
              `  label1.text = 'กดค้าง ⏳';`,
              `});`,
            ]
          : []),
        ...(designType === "Input" || designType === "LabelledInput"
          ? [
              ``,
              `// Runs when the user presses Enter`,
              `${className.charAt(0).toLowerCase()}${className.slice(1)}1.onEnter((text) => {`,
              `  label1.text = 'ส่งแล้ว: ' + text;`,
              `  ${className.charAt(0).toLowerCase()}${className.slice(1)}1.value = '';`,
              `});`,
            ]
          : []),
        ...(designType === "List"
          ? [
              `list1.content = ['คณิต', 'วิทย์', 'อังกฤษ'];`,
              ``,
              `// item = the text of the row, index = its position (0, 1, 2...)`,
              `list1.onItemClick((item, index) => {`,
              `  label1.text = 'เลือกข้อ ' + (index + 1) + ': ' + item;`,
              `});`,
            ]
          : []),
        ...(designType === "Toolbar"
          ? [
              `${className.charAt(0).toLowerCase()}${className.slice(1)}1.backButton.onClick(() => {`,
              `  page.goTo('page1');`,
              `});`,
            ]
          : []),
        ...(designType === "Spinner"
          ? [
              `${className.charAt(0).toLowerCase()}${className.slice(1)}1.show();`,
              `${className.charAt(0).toLowerCase()}${className.slice(1)}1.hide();`,
            ]
          : []),
        ...(designType === "Chart"
          ? [
              `// Direct property assignment`,
              `chart1.title      = 'Revenue Q1';`,
              `chart1.chartType  = 'line';  // 'bar' | 'line' | 'pie' | 'doughnut'`,
              `chart1.labels     = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];`,
              `chart1.data       = [30, 70, 45, 88, 60];`,
              `chart1.color      = '#2dd36f';`,
              `chart1.height     = 250;`,
              ``,
              `// Multi-series datasets`,
              `chart1.setDatasets([`,
              `  { label: 'Sales', data: [30, 70, 45], color: '#3880ff' },`,
              `  { label: 'Cost',  data: [20, 40, 35], color: '#ff4961' },`,
              `]);`,
            ]
          : []),
        ...(designType === "Map"
          ? [
              `// Center on Bangkok and drop a pin`,
              `map1.setCenter(13.7563, 100.5018, 14);`,
              `map1.addMarker(13.7563, 100.5018, 'โรงเรียน');`,
              ``,
              `// Tap the map to add a pin where you tapped`,
              `map1.onClick((lat, lng) => {`,
              `  map1.addMarker(lat, lng, 'ที่นี่');`,
              `});`,
            ]
          : []),
        ...(designType === "Camera"
          ? [
              `${className.charAt(0).toLowerCase()}${className.slice(1)}1.open();`,
              ``,
              `// Runs once the live preview is showing`,
              `${className.charAt(0).toLowerCase()}${className.slice(1)}1.onReady(() => {`,
              `  label1.text = 'กล้องพร้อมแล้ว 📸';`,
              `});`,
              ``,
              `// Runs when the camera can't start (no permission, no camera…)`,
              `${className.charAt(0).toLowerCase()}${className.slice(1)}1.onError((message) => {`,
              `  label1.text = 'เปิดกล้องไม่ได้: ' + message;`,
              `});`,
              ``,
              `// Apply a filter: 'grayscale','sepia','vintage','warm','cool',`,
              `//   'invert','blur','brightness','contrast','saturate'`,
              `${className.charAt(0).toLowerCase()}${className.slice(1)}1.setFilter('vintage');`,
              ``,
              `// Capture freezes the frame (filter is baked in); reset() resumes`,
              `button1.onClick(async () => {`,
              `  const photo = await ${className.charAt(0).toLowerCase()}${className.slice(1)}1.capture();`,
              `  await photo.save('my-photo.png');`,
              `});`,
              ``,
              `// Resume live camera after capture`,
              `button2.onClick(() => {`,
              `  ${className.charAt(0).toLowerCase()}${className.slice(1)}1.reset();`,
              `});`,
            ]
          : []),
      ].join("\n"),
    });
  }

  return schemas.sort((a, b) => a.className.localeCompare(b.className));
}

export function findComponentApiSchemaByClassName(className: string) {
  return getComponentApiSchemas().find((schema) => schema.className === className);
}

export const PAGE_API_METHODS = ["add(element)", "goTo(pageIdOrName)", "onShow(callback)", "onLeave(callback)"];
export const PAGE_API_EXAMPLE = [
  "page.add(button1);",
  "page.goTo('page2');",
  "",
  "// Runs every time this page appears (also after page.goTo back here)",
  "page.onShow(() => {",
  "  label1.text = 'คะแนน: ' + storage.get('score', 0);",
  "});",
  "",
  "// Runs just before leaving this page",
  "page.onLeave(() => {",
  "  timer.stopAll();",
  "});",
].join("\n");
export const NOTIFY_API_EXAMPLE = [
  "notify.toast('บันทึกแล้ว ✅');",
  "notify.alert('หมดเวลา!');",
  "",
  "// confirm waits for OK / Cancel → use await",
  "button1.onClick(async () => {",
  "  const ok = await notify.confirm('ลบงานทั้งหมดใช่ไหม?');",
  "  if (ok) {",
  "    label1.text = 'ลบแล้ว';",
  "  }",
  "});",
].join("\n");
export const CONSOLE_API_METHODS = ["log(...args)", "warn(...args)", "error(...args)"];
