import type { AppElement } from './useEditorStore'

export interface ConsoleEntry {
  type: 'log' | 'error' | 'warn' | 'success'
  message: string
}

/** A live element instance returned from student code */
export interface ElementInstance {
  __el: AppElement
  __onClick: (() => void) | null
  onClick(cb: () => void): ElementInstance
  toString(): string
  valueOf(): unknown
}

export interface RuntimeResult {
  pageElements: AppElement[]
  /** Instances in page order — carry onClick handlers */
  instances: ElementInstance[]
  logs: ConsoleEntry[]
}

export interface RuntimeState {
  pageElements: AppElement[]
  instances: ElementInstance[]
}

// ── Class name map ─────────────────────────────────────────────────────────
export const ELEMENT_CLASS_MAP: Record<string, string> = {
  Toolbar:              'Toolbar',
  Button:               'Button',
  FloatingActionButton: 'FAB',
  Input:                'Input',
  LabelledInput:        'LabelledInput',
  Searchbar:            'Searchbar',
  RangeInput:           'Range',
  DateTimePicker:       'DatePicker',
  Checkbox:             'Checkbox',
  RadioButton:          'Radio',
  Toggle:               'Toggle',
  Select:               'Select',
  Heading:              'Heading',
  TextBox:              'Textarea',
  Badge:                'Badge',
  Chip:                 'Chip',
  Spinner:              'Spinner',
  Image:                'Image',
  Link:                 'Link',
  Video:                'Video',
  List:                 'List',
  Card:                 'Card',
  Segment:              'Segment',
  Separator:            'Separator',
  Spacer:               'Spacer',
  Container:            'Container',
}

/** camelCase variable from ID, e.g. page1_button1 → button1 */
export function varNameFromId(id: string): string {
  const parts = id.split('_')
  return parts[parts.length - 1] ?? id
}

/** Auto-generate scaffold code from current elements */
export function buildScaffold(elements: AppElement[]): string {
  if (elements.length === 0) {
    return [
      '// No elements on canvas yet.',
      '// Go to Design mode and add some elements first.',
    ].join('\n')
  }

  const lines: string[] = ['// --- Connect elements to the page ---', '']

  // Toolbar first
  const ordered = [
    ...elements.filter(e => e.type === 'Toolbar'),
    ...elements.filter(e => e.type !== 'Toolbar' && e.type !== 'Container'),
  ]

  for (const el of ordered) {
    const cls = ELEMENT_CLASS_MAP[el.type] ?? el.type
    const varName = varNameFromId(el.id)
    lines.push(`var ${varName} = new ${cls}('${el.id}');`)
    lines.push(`page.add(${varName});`)
    lines.push('')
  }

  // Example onClick on the last button-like element
  const btn = [...elements].reverse().find(e => e.type === 'Button')
  if (btn) {
    const varName = varNameFromId(btn.id)
    lines.push(`// --- Add interactions ---`)
    lines.push(`${varName}.onClick(() => {`)
    lines.push(`    console.log('${varName} clicked!');`)
    lines.push(`});`)
    lines.push('')
  }

  return lines.join('\n')
}

export function syncRuntimeElementProps(
  runtime: RuntimeState,
  id: string,
  propsPatch: Record<string, unknown>
): RuntimeState {
  const pageElements = runtime.pageElements.map((el) =>
    el.id === id
      ? {
          ...el,
          props: { ...el.props, ...propsPatch },
        }
      : el
  )

  const instances = runtime.instances.map((instance) => {
    if (instance.__el.id !== id) return instance

    instance.__el = {
      ...instance.__el,
      props: { ...instance.__el.props, ...propsPatch },
    }
    return instance
  })

  return { pageElements, instances }
}

// ── Execute student code ───────────────────────────────────────────────────
export function executeCode(
  code: string,
  allElements: AppElement[],
  onUpdate?: (id: string, props: Record<string, any>) => void,
  onNavigate?: (pageRef: string) => void,
  onLog?: (entry: ConsoleEntry) => void
): RuntimeResult {
  const logs: ConsoleEntry[] = []
  const pageElements: AppElement[] = []
  const instances: ElementInstance[] = []

  function pushLog(entry: ConsoleEntry) {
    logs.push(entry)
    onLog?.(entry)
  }

  // Look up element by ID, throw descriptive error if missing
  function getEl(id: string, className: string): AppElement {
    const el = allElements.find(e => e.id === id)
    if (!el) {
      const avail = allElements.map(e => `'${e.id}'`).join(', ')
      throw new Error(
        `${className}('${id}'): ID not found.\nAvailable: ${avail || '(none — add elements in Design mode)'}`
      )
    }
    return el
  }

  function collectContainerAncestors(element: AppElement): AppElement[] {
    const ancestors: AppElement[] = []
    let parentId = element.parentId

    while (parentId) {
      const parent = allElements.find(e => e.id === parentId)
      if (!parent) break
      if (parent.type === 'Container') {
        ancestors.unshift(parent)
      }
      parentId = parent.parentId
    }

    return ancestors
  }

  // ── Base element class ────────────────────────────────────────────────
  class BaseEl implements ElementInstance {
    __el: AppElement
    __onClick: (() => void) | null = null

    constructor(id: string, className: string) {
      this.__el = getEl(id, className)

      // Proxy-like property access for common props
      const commonProps = ['text', 'value', 'label', 'content', 'src', 'title', 'placeholder']
      for (const propName of commonProps) {
        Object.defineProperty(this, propName, {
          get: () => {
            const mapped = this._mapProp(propName)
            return this.__el.props[mapped]
          },
          set: (val) => {
            const mapped = this._mapProp(propName)
            // Update local ref immediately for synchronous logic
            this.__el.props[mapped] = val
            // Sync back to store for UI reactivity
            if (onUpdate) {
              onUpdate(this.__el.id, { [mapped]: val })
            }
          },
          configurable: true,
          enumerable: true,
        })
      }
    }

    /** Maps generic property names like 'text' to the specific prop used by the element type */
    _mapProp(prop: string): string {
      const p = this.__el.props
      if (prop === 'text') {
        if ('text' in p) return 'text'
        if ('label' in p) return 'label'
        if ('content' in p) return 'content'
        if ('title' in p) return 'title'
      }
      if (prop === 'value') {
        if ('value' in p) return 'value'
        // Fallback to text properties for value access
        if ('text' in p) return 'text'
        if ('label' in p) return 'label'
      }
      return prop
    }

    onClick(cb: () => void): this {
      this.__onClick = cb
      return this
    }

    /** Returns the element's most meaningful "value" for use in expressions */
    valueOf(): unknown {
      const p = this.__el.props
      return p.value ?? p.content ?? p.label ?? p.text ?? p.placeholder ?? `[${this.__el.type}]`
    }

    toString(): string {
      return String(this.valueOf())
    }
  }

  const make = (cls: string) =>
    class extends BaseEl { constructor(id: string) { super(id, cls) } }

  const Toolbar       = make('Toolbar')
  const Button        = make('Button')
  const FAB           = make('FAB')
  const Input         = make('Input')
  const LabelledInput = make('LabelledInput')
  const Searchbar     = make('Searchbar')
  const Range         = make('Range')
  const DatePicker    = make('DatePicker')
  const Checkbox      = make('Checkbox')
  const Radio         = make('Radio')
  const Toggle        = make('Toggle')
  const Select        = make('Select')
  const Heading       = make('Heading')
  const TextBox       = make('TextBox')
  const Textarea      = make('TextBox')
  const Badge         = make('Badge')
  const Chip          = make('Chip')
  const Spinner       = make('Spinner')
  const Image         = make('Image')
  const Link          = make('Link')
  const Video         = make('Video')
  const List          = make('List')
  const Card          = make('Card')
  const Segment       = make('Segment')
  const Separator     = make('Separator')
  const Spacer        = make('Spacer')
  const Container     = make('Container')

  // ── page object ───────────────────────────────────────────────────────
  const page = {
    add(el: BaseEl) {
      if (!(el instanceof BaseEl)) {
        throw new TypeError('page.add() expects an element created with new ClassName(id)')
      }
      for (const ancestor of collectContainerAncestors(el.__el)) {
        if (!pageElements.find(e => e.id === ancestor.id)) {
          pageElements.push(ancestor)
        }
      }
      if (!pageElements.find(e => e.id === el.__el.id)) {
        pageElements.push(el.__el)
        instances.push(el)
      }
      pushLog({ type: 'log', message: `Added ${el.__el.type}  ←  ${el.__el.id}` })
    },
    goTo(pageRef: string) {
      if (typeof pageRef !== 'string' || !pageRef.trim()) {
        throw new TypeError('page.goTo() expects a page id or page name string')
      }
      pushLog({ type: 'log', message: `Navigate → ${pageRef}` })
      onNavigate?.(pageRef)
    },
  }

  // ── Sandboxed console ─────────────────────────────────────────────────
  const console = {
    log:   (...a: unknown[]) => pushLog({ type: 'log',  message: a.map(String).join(' ') }),
    warn:  (...a: unknown[]) => pushLog({ type: 'warn', message: a.map(String).join(' ') }),
    error: (...a: unknown[]) => pushLog({ type: 'error',message: a.map(String).join(' ') }),
  }

  // ── Execute ───────────────────────────────────────────────────────────
  try {
    // eslint-disable-next-line no-new-func
    new Function(
      'Toolbar','Button','FAB','Input','LabelledInput','Searchbar',
      'Range','DatePicker','Checkbox','Radio','Toggle','Select',
      'Heading','TextBox','Textarea','Badge','Chip','Spinner',
      'Image','Link','Video','List','Card','Segment',
      'Separator','Spacer','Container',
      'page','console',
      `"use strict";\n${code}`
    )(
      Toolbar,Button,FAB,Input,LabelledInput,Searchbar,
      Range,DatePicker,Checkbox,Radio,Toggle,Select,
      Heading,TextBox,Textarea,Badge,Chip,Spinner,
      Image,Link,Video,List,Card,Segment,
      Separator,Spacer,Container,
      page,console
    )
    pushLog({ type: 'success', message: `Done — ${pageElements.length} element(s) on page` })
  } catch (err: unknown) {
    pushLog({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }

  return { pageElements, instances, logs }
}
