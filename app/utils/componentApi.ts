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
  Searchbar: "Searchbar",
  RangeInput: "Range",
  DateTimePicker: "DatePicker",
  Checkbox: "Checkbox",
  RadioButton: "Radio",
  Toggle: "Toggle",
  Select: "Select",
  Heading: "Heading",
  Label: "Label",
  TextBox: "Textarea",
  Badge: "Badge",
  Chip: "Chip",
  Spinner: "Spinner",
  Image: "Image",
  Camera: "Camera",
  Link: "Link",
  Video: "Video",
  List: "List",
  Card: "Card",
  Segment: "Segment",
  Separator: "Separator",
  Spacer: "Spacer",
  Container: "Container",
};

const EXTRA_DEFAULT_PROPS: Record<string, Record<string, unknown>> = {
  Searchbar: { placeholder: "Search...", value: "", backgroundColor: "#ffffff" },
  Segment: { options: ["Option 1", "Option 2"], selected: "Option 1", color: "#3880ff" },
  Badge: { text: "Badge", color: "#3880ff" },
  Chip: { label: "Chip", color: "#3880ff", outline: false },
  Video: { src: "", title: "Video" },
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
      ...(designType === "Camera" ? CAMERA_METHODS : []),
      ...(designType === "Toolbar" ? TOOLBAR_METHODS : []),
      ...(designType === "Spinner" ? SPINNER_METHODS : []),
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
