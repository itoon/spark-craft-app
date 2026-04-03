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
          type: 'Card',
          label: 'Card',
          icon: 'i-lucide-rectangle-horizontal',
          defaultWidth: 300,
          defaultHeight: 120,
          defaultProps: { title: 'Card Title', subtitle: 'Subtitle', backgroundColor: '#ffffff' },
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
          type: 'Segment',
          label: 'Segment',
          icon: 'i-lucide-rows-3',
          defaultWidth: 280,
          defaultHeight: 40,
          defaultProps: { options: ['Tab 1', 'Tab 2', 'Tab 3'], selected: 0, color: '#3880ff' },
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
          defaultProps: { label: 'Button', fill: 'solid', backgroundColor: '#3880ff', borderRadius: 8 },
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
          type: 'Searchbar',
          label: 'Searchbar',
          icon: 'i-lucide-search',
          defaultWidth: 220,
          defaultHeight: 44,
          defaultProps: { placeholder: 'Search', value: '', backgroundColor: '#f4f5f8' },
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
          type: 'Select',
          label: 'Select',
          icon: 'i-lucide-chevrons-up-down',
          defaultWidth: 168,
          defaultHeight: 42,
          defaultProps: { placeholder: 'Select…', options: ['Option 1', 'Option 2'], value: '', interface: 'popover' },
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
          defaultProps: { placeholder: 'Select date', value: '' },
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
      ],
    },

    // ── Display ───────────────────────────────────────────────────────────
    {
      label: 'Display',
      icon: 'i-lucide-eye',
      items: [
        {
          type: 'Badge',
          label: 'Badge',
          icon: 'i-lucide-tag',
          defaultWidth: 56,
          defaultHeight: 28,
          defaultProps: { text: 'New', color: '#3880ff' },
        },
        {
          type: 'Chip',
          label: 'Chip',
          icon: 'i-lucide-pill',
          defaultWidth: 96,
          defaultHeight: 32,
          defaultProps: { label: 'Chip', color: '#3880ff', outline: false },
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
