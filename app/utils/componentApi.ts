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

const COMMON_ELEMENT_METHODS = ["onClick(callback)"];
const CAMERA_METHODS = [
  "open()",
  "close()",
  "getVideoElement()",
  "capture()",
  "reset()",
  "setFilter(filter)",
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
      ...COMMON_ELEMENT_METHODS,
      ...(supportsChangeEvent(designType) ? [CHANGE_METHOD] : []),
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
        `page.add(${className.charAt(0).toLowerCase()}${className.slice(1)}1);`,
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

export const PAGE_API_METHODS = ["add(element)", "goTo(pageIdOrName)"];
export const CONSOLE_API_METHODS = ["log(...args)", "warn(...args)", "error(...args)"];
