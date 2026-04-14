import type { AppElement } from './useEditorStore'
import { getComponentClassMap } from '../utils/componentApi'

export interface ConsoleEntry {
  type: 'log' | 'error' | 'warn' | 'success'
  message: string
}

export interface RuntimeExecutionEvent {
  step: number
  type: 'add' | 'update' | 'navigate' | 'log'
  message: string
  elementId?: string
  elementType?: string
  propName?: string
  value?: unknown
  pageRef?: string
  logType?: ConsoleEntry['type']
}

export interface CameraCaptureResult {
  dataUrl: string
  save(filename?: string): Promise<void>
  toString(): string
}

/** A live element instance returned from student code */
export interface ElementInstance {
  __el: AppElement
  __onClick: (() => void) | null
  __onBackClick?: (() => void) | null
  backButton?: {
    onClick(cb: () => void): unknown
  }
  show?(): ElementInstance
  hide?(): ElementInstance
  getVideoElement?(): HTMLVideoElement | null
  capture?(): Promise<CameraCaptureResult>
  reset?(): ElementInstance
  setFilter?(filter: string): ElementInstance
  onClick(cb: () => void): ElementInstance
  toString(): string
  valueOf(): unknown
}

export interface RuntimeResult {
  pageElements: AppElement[]
  /** Instances in page order — carry onClick handlers */
  instances: ElementInstance[]
  logs: ConsoleEntry[]
  events: RuntimeExecutionEvent[]
}

export interface RuntimeState {
  pageElements: AppElement[]
  instances: ElementInstance[]
}

export const TOOLBAR_BACK_BUTTON_CLICK_SUFFIX = '::backButton'

export function buildToolbarBackButtonClickId(id: string) {
  return `${id}${TOOLBAR_BACK_BUTTON_CLICK_SUFFIX}`
}

export function isToolbarBackButtonClickId(id: string) {
  return id.endsWith(TOOLBAR_BACK_BUTTON_CLICK_SUFFIX)
}

export function getToolbarIdFromBackButtonClickId(id: string) {
  return isToolbarBackButtonClickId(id)
    ? id.slice(0, -TOOLBAR_BACK_BUTTON_CLICK_SUFFIX.length)
    : id
}

// ── Class name map ─────────────────────────────────────────────────────────
export const ELEMENT_CLASS_MAP: Record<string, string> = getComponentClassMap()

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
  onLog?: (entry: ConsoleEntry) => void,
  onEvent?: (event: RuntimeExecutionEvent) => void
): RuntimeResult {
  const logs: ConsoleEntry[] = []
  const pageElements: AppElement[] = []
  const instances: ElementInstance[] = []
  const events: RuntimeExecutionEvent[] = []
  let step = 0

  function pushEvent(event: Omit<RuntimeExecutionEvent, 'step'>) {
    const nextEvent: RuntimeExecutionEvent = {
      step: ++step,
      ...event,
    }
    events.push(nextEvent)
    onEvent?.(nextEvent)
  }

  function pushLog(entry: ConsoleEntry) {
    logs.push(entry)
    pushEvent({
      type: 'log',
      message: entry.message,
      logType: entry.type,
    })
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

  // ── Camera filter presets ─────────────────────────────────────────────
  const CAMERA_FILTER_PRESETS: Record<string, string> = {
    none:       'none',
    grayscale:  'grayscale(100%)',
    sepia:      'sepia(100%)',
    invert:     'invert(100%)',
    blur:       'blur(4px)',
    brightness: 'brightness(160%)',
    contrast:   'contrast(160%)',
    saturate:   'saturate(200%)',
    vintage:    'sepia(50%) contrast(120%) brightness(90%)',
    warm:       'sepia(30%) saturate(140%) brightness(110%)',
    cool:       'hue-rotate(180deg) saturate(150%)',
  }

  function resolveCameraFilter(filter: string | undefined | null): string {
    if (!filter || filter === 'none') return 'none'
    return CAMERA_FILTER_PRESETS[filter] ?? filter
  }

  function getCameraVideoElement(id: string): HTMLVideoElement | null {
    if (!import.meta.client) return null
    return document.querySelector(
      `[data-codecraft-camera-video-id="${id}"]`
    ) as HTMLVideoElement | null
  }

  function waitForVideoReady(video: HTMLVideoElement) {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup()
        reject(new Error('Camera preview timed out before a frame was available.'))
      }, 4000)

      const handleReady = () => {
        cleanup()
        resolve()
      }
      const handleError = () => {
        cleanup()
        reject(new Error('Camera preview is not ready yet.'))
      }
      const cleanup = () => {
        window.clearTimeout(timeoutId)
        video.removeEventListener('loadeddata', handleReady)
        video.removeEventListener('canplay', handleReady)
        video.removeEventListener('error', handleError)
      }

      video.addEventListener('loadeddata', handleReady, { once: true })
      video.addEventListener('canplay', handleReady, { once: true })
      video.addEventListener('error', handleError, { once: true })
    })
  }

  function buildCameraCaptureResult(
    element: AppElement,
    dataUrl: string
  ): CameraCaptureResult {
    return {
      dataUrl,
      async save(filename?: string) {
        if (!import.meta.client) return
        const safeName = filename?.trim() || `${element.id}-${Date.now()}.png`
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = safeName
        document.body.appendChild(link)
        link.click()
        link.remove()
        pushEvent({
          type: 'log',
          message: `Save capture ${safeName}`,
          elementId: element.id,
          elementType: element.type,
        })
      },
      toString() {
        return dataUrl
      },
    }
  }

  // ── Base element class ────────────────────────────────────────────────
  class BaseEl implements ElementInstance {
    __el: AppElement
    __onClick: (() => void) | null = null
    __onBackClick: (() => void) | null = null

    constructor(id: string, className: string) {
      this.__el = getEl(id, className)

      for (const propName of Object.keys(this.__el.props)) {
        if (propName in this) continue
        Object.defineProperty(this, propName, {
          get: () => this.__el.props[propName],
          set: (val) => {
            this.__el.props[propName] = val
            pushEvent({
              type: 'update',
              message: `${this.__el.id}.${propName} = ${String(val)}`,
              elementId: this.__el.id,
              elementType: this.__el.type,
              propName,
              value: val,
            })
            onUpdate?.(this.__el.id, { [propName]: val })
          },
          configurable: true,
          enumerable: true,
        })
      }

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
            pushEvent({
              type: 'update',
              message: `${this.__el.id}.${mapped} = ${String(val)}`,
              elementId: this.__el.id,
              elementType: this.__el.type,
              propName: mapped,
              value: val,
            })
            // Sync back to store for UI reactivity
            if (onUpdate) {
              onUpdate(this.__el.id, { [mapped]: val })
            }
          },
          configurable: true,
          enumerable: true,
        })
      }

      if (className === 'Toolbar') {
        const backButton = {
          onClick: (cb: () => void) => {
            this.__onBackClick = cb
            return backButton
          },
        }
        Object.defineProperty(this, 'backButton', {
          value: backButton,
          configurable: true,
          enumerable: true,
        })
      }
    }

    /** Maps generic property names like 'text' to the specific prop used by the element type */
    _mapProp(prop: string): string {
      const p = this.__el.props
      if (prop === 'content') {
        if ('content' in p) return 'content'
        if ('items' in p) return 'items'
      }
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

    open(): this {
      this.__el.props.open = true
      pushEvent({
        type: 'update',
        message: `${this.__el.id}.open = true`,
        elementId: this.__el.id,
        elementType: this.__el.type,
        propName: 'open',
        value: true,
      })
      onUpdate?.(this.__el.id, { open: true })
      return this
    }

    close(): this {
      this.__el.props.open = false
      pushEvent({
        type: 'update',
        message: `${this.__el.id}.open = false`,
        elementId: this.__el.id,
        elementType: this.__el.type,
        propName: 'open',
        value: false,
      })
      onUpdate?.(this.__el.id, { open: false })
      return this
    }

    show(): this {
      this.__el.props.show = true
      pushEvent({
        type: 'update',
        message: `${this.__el.id}.show = true`,
        elementId: this.__el.id,
        elementType: this.__el.type,
        propName: 'show',
        value: true,
      })
      onUpdate?.(this.__el.id, { show: true })
      return this
    }

    hide(): this {
      this.__el.props.show = false
      pushEvent({
        type: 'update',
        message: `${this.__el.id}.show = false`,
        elementId: this.__el.id,
        elementType: this.__el.type,
        propName: 'show',
        value: false,
      })
      onUpdate?.(this.__el.id, { show: false })
      return this
    }

    getVideoElement(): HTMLVideoElement | null {
      if (this.__el.type !== 'Camera') {
        throw new Error(`${this.__el.type} does not support getVideoElement()`)
      }
      return getCameraVideoElement(this.__el.id)
    }

    async capture(): Promise<CameraCaptureResult> {
      if (this.__el.type !== 'Camera') {
        throw new Error(`${this.__el.type} does not support capture()`)
      }

      const video = this.getVideoElement()
      if (!video) {
        throw new Error(
          `Camera ${this.__el.id} is not ready. Add it to the page and call open() first.`
        )
      }

      await waitForVideoReady(video)

      const width = video.videoWidth || this.__el.width || 640
      const height = video.videoHeight || this.__el.height || 480
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Unable to create a canvas for camera capture.')
      }

      const cssFilter = resolveCameraFilter(this.__el.props.filter as string | undefined)
      if (cssFilter && cssFilter !== 'none') {
        (context as CanvasRenderingContext2D & { filter: string }).filter = cssFilter
      }
      context.drawImage(video, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/png')

      // Freeze the camera display with the captured frame
      this.__el.props.frozenFrame = dataUrl
      onUpdate?.(this.__el.id, { frozenFrame: dataUrl })

      pushEvent({
        type: 'log',
        message: `Capture ${this.__el.type} ${this.__el.id}`,
        elementId: this.__el.id,
        elementType: this.__el.type,
      })

      return buildCameraCaptureResult(this.__el, dataUrl)
    }

    reset(): this {
      if (this.__el.type !== 'Camera') {
        throw new Error(`${this.__el.type} does not support reset()`)
      }
      this.__el.props.frozenFrame = null
      pushEvent({
        type: 'update',
        message: `${this.__el.id}.reset()`,
        elementId: this.__el.id,
        elementType: this.__el.type,
        propName: 'frozenFrame',
        value: null,
      })
      onUpdate?.(this.__el.id, { frozenFrame: null })
      return this
    }

    setFilter(filter: string): this {
      if (this.__el.type !== 'Camera') {
        throw new Error(`${this.__el.type} does not support setFilter()`)
      }
      const resolved = resolveCameraFilter(filter)
      this.__el.props.filter = filter
      pushEvent({
        type: 'update',
        message: `${this.__el.id}.setFilter('${filter}') → ${resolved}`,
        elementId: this.__el.id,
        elementType: this.__el.type,
        propName: 'filter',
        value: filter,
      })
      onUpdate?.(this.__el.id, { filter })
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
  const Label         = make('Label')
  const TextBox       = make('TextBox')
  const Textarea      = make('TextBox')
  const Badge         = make('Badge')
  const Chip          = make('Chip')
  const Spinner       = make('Spinner')
  const Image         = make('Image')
  const Camera        = make('Camera')
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
          pushEvent({
            type: 'add',
            message: `Add ${ancestor.type} ${ancestor.id}`,
            elementId: ancestor.id,
            elementType: ancestor.type,
          })
        }
      }
      if (!pageElements.find(e => e.id === el.__el.id)) {
        pageElements.push(el.__el)
        instances.push(el)
        pushEvent({
          type: 'add',
          message: `Add ${el.__el.type} ${el.__el.id}`,
          elementId: el.__el.id,
          elementType: el.__el.type,
        })
      }
      pushLog({ type: 'log', message: `Added ${el.__el.type}  ←  ${el.__el.id}` })
    },
    goTo(pageRef: string) {
      if (typeof pageRef !== 'string' || !pageRef.trim()) {
        throw new TypeError('page.goTo() expects a page id or page name string')
      }
      pushEvent({
        type: 'navigate',
        message: `Navigate to ${pageRef}`,
        pageRef,
      })
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
      'Heading','Label','TextBox','Textarea','Badge','Chip','Spinner',
      'Image','Camera','Link','Video','List','Card','Segment',
      'Separator','Spacer','Container',
      'page','console',
      `"use strict";\n${code}`
    )(
      Toolbar,Button,FAB,Input,LabelledInput,Searchbar,
      Range,DatePicker,Checkbox,Radio,Toggle,Select,
      Heading,Label,TextBox,Textarea,Badge,Chip,Spinner,
      Image,Camera,Link,Video,List,Card,Segment,
      Separator,Spacer,Container,
      page,console
    )
    pushLog({ type: 'success', message: `Done — ${pageElements.length} element(s) on page` })
  } catch (err: unknown) {
    pushLog({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }

  return { pageElements, instances, logs, events }
}
