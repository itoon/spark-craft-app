import type { PaletteItem } from "./useEditorStore";

export interface PaletteGroup {
  label: string;
  icon: string;
  items: PaletteItem[];
}

export function usePaletteItems(): PaletteGroup[] {
  return [
    // ── Layout ────────────────────────────────────────────────────────────
    {
      label: "Layout",
      icon: "i-lucide-layout-dashboard",
      items: [
        {
          type: "Toolbar",
          label: "Toolbar",
          icon: "i-lucide-panel-top",
          defaultWidth: 340,
          defaultHeight: 56,
          defaultProps: {
            title: "My App",
            showBack: false,
            ionicColor: "primary",
          },
        },
        {
          type: "List",
          label: "List",
          icon: "i-lucide-list",
          defaultWidth: 300,
          defaultHeight: 168,
          defaultProps: {
            content: [
              { key: "Item 1", value: "item1" },
              { key: "Item 2", value: "item2" },
              { key: "Item 3", value: "item3" },
            ],
            backgroundColor: "#ffffff",
          },
        },
        {
          type: "Separator",
          label: "Separator",
          icon: "i-lucide-minus",
          defaultWidth: 300,
          defaultHeight: 17,
          defaultProps: {
            color: "#e2e8f0",
            thickness: 1,
            paddingTop: 8,
            paddingBottom: 8,
          },
        },
        {
          type: "Spacer",
          label: "Spacer",
          icon: "i-lucide-move-vertical",
          defaultWidth: 300,
          defaultHeight: 50,
          defaultProps: {},
        },
      ],
    },

    // ── Input ─────────────────────────────────────────────────────────────
    {
      label: "Input",
      icon: "i-lucide-mouse-pointer-click",
      items: [
        {
          type: "Button",
          label: "Button",
          icon: "i-lucide-square",
          defaultWidth: 112,
          defaultHeight: 36,
          defaultProps: {
            content: "Button",
            fill: "solid",
            size: "default",
            ionicColor: "primary",
          },
        },
        {
          type: "FloatingActionButton",
          label: "FAB",
          icon: "i-lucide-circle-plus",
          defaultWidth: 56,
          defaultHeight: 56,
          defaultProps: {
            icon: "i-lucide-plus",
            backgroundColor: "#3880ff",
            borderRadius: 28,
            horizontalAlignment: "end",
            verticalAlignment: "bottom",
            edge: false,
          },
        },
        {
          type: "LabelledInput",
          label: "Labelled Input",
          icon: "i-lucide-text-cursor",
          defaultWidth: 220,
          defaultHeight: 56,
          defaultProps: {
            label: "Label",
            placeholder: "Enter value",
            type: "text",
            value: "",
          },
        },
        {
          type: "Input",
          label: "Input",
          icon: "i-lucide-text-cursor-input",
          defaultWidth: 196,
          defaultHeight: 42,
          defaultProps: {
            label: "Label",
            placeholder: "Enter text…",
            type: "text",
            value: "",
          },
        },
        {
          type: "Select",
          label: "Select",
          icon: "i-lucide-chevrons-up-down",
          defaultWidth: 168,
          defaultHeight: 42,
          defaultProps: {
            placeholder: "Select…",
            options: ["Option 1", "Option 2"],
            value: "",
            interface: "popover",
            multiple: false,
          },
        },
        {
          type: "RangeInput",
          label: "Range",
          icon: "i-lucide-sliders-horizontal",
          defaultWidth: 196,
          defaultHeight: 42,
          defaultProps: { min: 0, max: 100, value: 50 },
        },
        {
          type: "DateTimePicker",
          label: "Date Picker",
          icon: "i-lucide-calendar",
          defaultWidth: 196,
          defaultHeight: 42,
          defaultProps: { placeholder: "Select date", value: "" },
        },
        {
          type: "Checkbox",
          label: "Checkbox",
          icon: "i-lucide-check-square",
          defaultWidth: 154,
          defaultHeight: 28,
          defaultProps: {
            label: "Checkbox",
            checked: false,
            labelPlacement: "end",
          },
        },
        {
          type: "RadioButton",
          label: "Radio",
          icon: "i-lucide-circle-dot",
          defaultWidth: 154,
          defaultHeight: 28,
          defaultProps: {
            label: "Option",
            selected: false,
            value: "",
            content: [{ key: "Option", value: "Option" }],
          },
        },
        {
          type: "Toggle",
          label: "Toggle",
          icon: "i-lucide-toggle-left",
          defaultWidth: 220,
          defaultHeight: 56,
          defaultProps: { content: "Label", fontSize: 16, on: false },
        },
      ],
    },

    // ── Display ───────────────────────────────────────────────────────────
    {
      label: "Display",
      icon: "i-lucide-eye",
      items: [
        {
          type: "Heading",
          label: "Heading",
          icon: "i-lucide-heading",
          defaultWidth: 220,
          defaultHeight: 48,
          defaultProps: { content: "Heading", level: 2, color: "#0f172a" },
        },
        {
          type: "TextBox",
          label: "Textarea",
          icon: "i-lucide-text",
          defaultWidth: 260,
          defaultHeight: 88,
          defaultProps: {
            placeholder: "Write something...",
            content: "",
            textAlign: "left",
            wrap: "wrap",
            fontSize: 14,
            color: "#334155",
          },
        },
        {
          type: "Label",
          label: "Label",
          icon: "i-lucide-type",
          defaultWidth: 220,
          defaultHeight: 28,
          defaultProps: { content: "Label", fontSize: 14, color: "#334155" },
        },
        {
          type: "Spinner",
          label: "Spinner",
          icon: "i-lucide-loader",
          defaultWidth: 42,
          defaultHeight: 42,
          defaultProps: {
            color: "#3880ff",
            show: true,
          },
        },
        {
          type: "Image",
          label: "Image",
          icon: "i-lucide-image",
          defaultWidth: 300,
          defaultHeight: 0,
          defaultProps: {
            src: "https://picsum.photos/800/480",
            alt: "placeholder",
            borderRadius: 4,
          },
        },
        {
          type: "Link",
          label: "Link",
          icon: "i-lucide-link",
          defaultWidth: 160,
          defaultHeight: 24,
          defaultProps: { content: "Click here", href: "#", target: "_self" },
        },
      ],
    },

    // ── Plugins ───────────────────────────────────────────────────────────
    {
      label: "Plugins",
      icon: "i-lucide-plug-zap",
      items: [
        {
          type: "Camera",
          label: "Camera",
          icon: "i-lucide-camera",
          defaultWidth: 220,
          defaultHeight: 160,
          defaultProps: {
            open: false,
            title: "Camera",
            filter: "none",
          },
        },
      ],
    },
  ];
}
