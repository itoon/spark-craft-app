import type { PaletteItem } from './useEditorStore'

export interface PaletteGroup {
  label: string
  icon: string
  items: PaletteItem[]
}

export function usePaletteItems(): PaletteGroup[] {
  return [
    // ── Layout ────────────────────────────────────────────────────────────
    {
      label: 'Layout',
      icon: 'i-lucide-layout-dashboard',
      items: [
        {
          type: 'Toolbar',
          label: 'Toolbar',
          icon: 'i-lucide-panel-top',
          defaultWidth: 340,
          defaultHeight: 56,
          defaultProps: { title: 'My App', showBack: false, backgroundColor: '#3880ff' },
        },
        {
          type: 'List',
          label: 'List',
          icon: 'i-lucide-list',
          defaultWidth: 300,
          defaultHeight: 168,
          defaultProps: { items: ['Item 1', 'Item 2', 'Item 3'], backgroundColor: '#ffffff' },
        },
        {
          type: 'Separator',
          label: 'Separator',
          icon: 'i-lucide-minus',
          defaultWidth: 200,
          defaultHeight: 14,
          defaultProps: { color: '#e2e8f0', thickness: 1 },
        },
        {
          type: 'Spacer',
          label: 'Spacer',
          icon: 'i-lucide-move-vertical',
          defaultWidth: 40,
          defaultHeight: 28,
          defaultProps: { size: 16 },
        },
      ],
    },

    // ── Input ─────────────────────────────────────────────────────────────
    {
      label: 'Input',
      icon: 'i-lucide-mouse-pointer-click',
      items: [
        {
          type: 'Button',
          label: 'Button',
          icon: 'i-lucide-square',
          defaultWidth: 112,
          defaultHeight: 42,
          defaultProps: { label: 'Button', variant: 'solid', backgroundColor: '#3880ff', borderRadius: 8 },
        },
        {
          type: 'FloatingActionButton',
          label: 'FAB',
          icon: 'i-lucide-circle-plus',
          defaultWidth: 56,
          defaultHeight: 56,
          defaultProps: {
            icon: 'i-lucide-plus',
            backgroundColor: '#3880ff',
            borderRadius: 28,
            horizontalAlignment: 'end',
            verticalAlignment: 'bottom',
            edge: false,
          },
        },
        {
          type: 'LabelledInput',
          label: 'Labelled Input',
          icon: 'i-lucide-text-cursor',
          defaultWidth: 220,
          defaultHeight: 56,
          defaultProps: { label: 'Label', placeholder: 'Enter value', type: 'text', value: '' },
        },
        {
          type: 'Input',
          label: 'Input',
          icon: 'i-lucide-text-cursor-input',
          defaultWidth: 196,
          defaultHeight: 42,
          defaultProps: { placeholder: 'Enter text…', type: 'text', borderRadius: 4, value: '' },
        },
        {
          type: 'RangeInput',
          label: 'Range',
          icon: 'i-lucide-sliders-horizontal',
          defaultWidth: 196,
          defaultHeight: 42,
          defaultProps: { min: 0, max: 100, value: 50 },
        },
        {
          type: 'DateTimePicker',
          label: 'Date Picker',
          icon: 'i-lucide-calendar',
          defaultWidth: 196,
          defaultHeight: 42,
          defaultProps: { placeholder: 'Select date' },
        },
        {
          type: 'Checkbox',
          label: 'Checkbox',
          icon: 'i-lucide-check-square',
          defaultWidth: 154,
          defaultHeight: 28,
          defaultProps: { label: 'Checkbox', checked: false },
        },
        {
          type: 'RadioButton',
          label: 'Radio',
          icon: 'i-lucide-circle-dot',
          defaultWidth: 154,
          defaultHeight: 28,
          defaultProps: { label: 'Option', selected: false },
        },
        {
          type: 'Toggle',
          label: 'Toggle',
          icon: 'i-lucide-toggle-left',
          defaultWidth: 98,
          defaultHeight: 28,
          defaultProps: { label: 'Toggle', on: false },
        },
        {
          type: 'Select',
          label: 'Select',
          icon: 'i-lucide-chevrons-up-down',
          defaultWidth: 168,
          defaultHeight: 42,
          defaultProps: { placeholder: 'Select…', options: ['Option 1', 'Option 2'] },
        },
      ],
    },

    // ── Display ───────────────────────────────────────────────────────────
    {
      label: 'Display',
      icon: 'i-lucide-eye',
      items: [
        {
          type: 'Heading',
          label: 'Heading',
          icon: 'i-lucide-heading',
          defaultWidth: 210,
          defaultHeight: 42,
          defaultProps: { text: 'Heading', level: 1, color: '#0f172a' },
        },
        {
          type: 'TextBox',
          label: 'Text Box',
          icon: 'i-lucide-type',
          defaultWidth: 196,
          defaultHeight: 28,
          defaultProps: { content: 'Text block', fontSize: 14, color: '#334155' },
        },
        {
          type: 'Badge',
          label: 'Badge',
          icon: 'i-lucide-tag',
          defaultWidth: 56,
          defaultHeight: 28,
          defaultProps: { text: 'New', color: '#3880ff' },
        },
        {
          type: 'Spinner',
          label: 'Spinner',
          icon: 'i-lucide-loader',
          defaultWidth: 42,
          defaultHeight: 42,
          defaultProps: { color: '#3880ff' },
        },
        {
          type: 'Image',
          label: 'Image',
          icon: 'i-lucide-image',
          defaultWidth: 168,
          defaultHeight: 112,
          defaultProps: { src: 'https://picsum.photos/160/120', alt: 'placeholder', borderRadius: 4 },
        },
        {
          type: 'Link',
          label: 'Link',
          icon: 'i-lucide-link',
          defaultWidth: 126,
          defaultHeight: 28,
          defaultProps: { text: 'Click here', href: '#', color: '#3880ff' },
        },
        {
          type: 'Video',
          label: 'Video',
          icon: 'i-lucide-film',
          defaultWidth: 252,
          defaultHeight: 140,
          defaultProps: { src: '', poster: '', borderRadius: 4 },
        },
        {
          type: 'Icon',
          label: 'Icon',
          icon: 'i-lucide-star',
          defaultWidth: 42,
          defaultHeight: 42,
          defaultProps: { name: 'i-lucide-star', color: '#3880ff', size: 24 },
        },
      ],
    },
  ]
}
