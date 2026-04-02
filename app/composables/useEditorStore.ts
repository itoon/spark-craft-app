import { ref, computed } from 'vue'

export type EditorMode = 'design' | 'block' | 'code'

export interface Page {
  id: string
  name: string
}

export interface AppElement {
  id: string
  pageId: string
  type: string
  // x/y are only meaningful for root-level containers; children use flex layout
  x: number
  y: number
  width: number
  height: number
  props: Record<string, unknown>
  // Tree structure
  parentId: string | null   // null = root level
  children: string[]        // ordered child IDs (only containers use this meaningfully)
  direction?: 'row' | 'col' // only used when type is RowContainer or ColContainer
}

export interface PaletteItem {
  type: string
  label: string
  icon: string
  defaultWidth: number
  defaultHeight: number
  defaultProps: Record<string, unknown>
}

// Container types — these can hold children
const CONTAINER_TYPES = new Set(['RowContainer', 'ColContainer'])

function isContainer(type: string) {
  return CONTAINER_TYPES.has(type)
}

// Singleton refs — shared across all component instances on the client
const mode = ref<EditorMode>('design')
const selectedElementId = ref<string | null>(null)
const elements = ref<AppElement[]>([])

const pages = ref<Page[]>([
  { id: 'page1', name: 'Page 1' }
])
const currentPageId = ref<string>('page1')

const isPreviewOpen = ref(false)
const isRunning = ref(false)
const activeDeviceId = ref<string>('iphone15')

// Shared JS code state (written in Code tab, executed in Run mode)
const jsCode = ref<string>('')
const jsCodeInitialized = ref(false)

// 'ios' for iPhone devices, 'android' for Android device
const activePlatform = computed<'ios' | 'android'>(() =>
  activeDeviceId.value === 'android' ? 'android' : 'ios'
)

// Per-type counter so IDs read like page1_button1, page1_toolbar1, etc.
const typeCounters: Record<string, number> = {}

function generateId(type: string): string {
  const key = type.toLowerCase()
  typeCounters[key] = (typeCounters[key] ?? 0) + 1
  return `${currentPageId.value}_${key}${typeCounters[key]}`
}

const selectedElement = computed(() =>
  elements.value.find(el => el.id === selectedElementId.value) ?? null
)

// Returns only the top-level containers (parentId === null) for the CURRENT page
const rootContainers = computed(() =>
  elements.value.filter(el => el.parentId === null && el.pageId === currentPageId.value)
)

function setMode(newMode: EditorMode) {
  mode.value = newMode
}

function selectElement(id: string | null) {
  selectedElementId.value = id
  // If an element is selected, ensure we are in a mode that shows properties
  // or focus the design panel as requested by user.
  if (id && mode.value === 'block') {
    mode.value = 'design'
  }
}

// Returns the parent Container element of a given element id, or null
function getContainerOf(id: string): AppElement | null {
  const el = elements.value.find(e => e.id === id)
  if (!el || el.parentId === null) return null
  return elements.value.find(e => e.id === el.parentId) ?? null
}

function getRootContainers(): AppElement[] {
  return elements.value.filter(el => el.parentId === null && el.pageId === currentPageId.value)
}

// Creates a new container at root level and returns it.
// Used when the canvas is empty or nothing is selected and the user adds an element.
function _createRootContainer(direction: 'row' | 'col' = 'row'): AppElement {
  const offset = rootContainers.value.length * 8
  const type = direction === 'row' ? 'RowContainer' : 'ColContainer'
  const container: AppElement = {
    id: generateId(type),
    pageId: currentPageId.value,
    type,
    x: 8 + offset,
    y: 8 + offset,
    width: 340,
    height: 60,
    props: {
      direction,
      gap: 8,
      padding: 8,
      backgroundColor: 'transparent',
    },
    parentId: null,
    children: [],
    direction,
  }
  elements.value.push(container)
  return container
}

// Smart placement logic per the container-first rules:
//
// Case A — item is a RowContainer or ColContainer:
//   - If targetId points to a container → add as nested container inside it
//   - Otherwise → add at root level
//
// Case B — regular element:
//   1. targetId points to a container        → add inside that container
//   2. targetId points to a non-container    → add as sibling in same parent container
//   3. no selection / nothing on canvas      → auto-create root RowContainer, add inside it
function addElement(item: PaletteItem, targetId?: string): AppElement {
  const newEl: AppElement = {
    id: generateId(item.type),
    pageId: currentPageId.value,
    type: item.type,
    x: 0,
    y: 0,
    width: item.defaultWidth,
    height: item.defaultHeight,
    props: { ...item.defaultProps },
    parentId: null,
    children: [],
    ...(item.defaultProps.direction
      ? { direction: item.defaultProps.direction as 'row' | 'col' }
      : {}),
  }

  const resolvedTarget = targetId ?? selectedElementId.value ?? null

  // Toolbar is always a singleton at root level per page — remove any existing one first
  if (item.type === 'Toolbar') {
    const existing = elements.value.find(e => e.type === 'Toolbar' && e.pageId === currentPageId.value)
    if (existing) deleteElement(existing.id)
    _addAtRoot(newEl)
    selectedElementId.value = newEl.id
    return newEl
  }

  if (isContainer(item.type)) {
    // Container palette items
    if (resolvedTarget) {
      const targetEl = elements.value.find(e => e.id === resolvedTarget)
      if (targetEl && isContainer(targetEl.type)) {
        // Nest inside the targeted container
        newEl.parentId = targetEl.id
        elements.value.push(newEl)
        targetEl.children.push(newEl.id)
      } else if (targetEl && !isContainer(targetEl.type) && targetEl.parentId) {
        // Target is a non-container child — nest in same parent
        const parent = elements.value.find(e => e.id === targetEl.parentId)
        if (parent) {
          newEl.parentId = parent.id
          elements.value.push(newEl)
          parent.children.push(newEl.id)
        } else {
          _addAtRoot(newEl)
        }
      } else {
        _addAtRoot(newEl)
      }
    } else {
      _addAtRoot(newEl)
    }
  } else {
    // Regular (non-container) element
    if (resolvedTarget) {
      const targetEl = elements.value.find(e => e.id === resolvedTarget)
      if (targetEl && isContainer(targetEl.type)) {
        // Add inside the selected container
        newEl.parentId = targetEl.id
        elements.value.push(newEl)
        targetEl.children.push(newEl.id)
      } else if (targetEl && !isContainer(targetEl.type) && targetEl.parentId) {
        // Add as sibling in same parent container
        const parent = elements.value.find(e => e.id === targetEl.parentId)
        if (parent && isContainer(parent.type)) {
          newEl.parentId = parent.id
          elements.value.push(newEl)
          parent.children.push(newEl.id)
        } else {
          _autoCreateAndAdd(newEl)
        }
      } else {
        // Selected element is a root container of unknown type or something else
        _autoCreateAndAdd(newEl)
      }
    } else {
      // Nothing selected — auto-create a root RowContainer and add inside it
      _autoCreateAndAdd(newEl)
    }
  }

  selectedElementId.value = newEl.id
  return newEl
}

// Places a new element at root level with stagger offset
function _addAtRoot(el: AppElement) {
  const offset = rootContainers.value.length * 8
  el.x = 8 + offset
  el.y = 8 + offset
  el.parentId = null
  elements.value.push(el)
}

// Auto-creates a root RowContainer then nests the element inside it
function _autoCreateAndAdd(el: AppElement) {
  const container = _createRootContainer('row')
  el.parentId = container.id
  elements.value.push(el)
  container.children.push(el.id)
  // Select the container so next additions go into the same container
  selectedElementId.value = container.id
}

// Explicitly add a container (from palette) at root or nested
function addContainer(direction: 'row' | 'col', targetId?: string): AppElement {
  const paletteItem: PaletteItem = {
    type: direction === 'row' ? 'RowContainer' : 'ColContainer',
    label: direction === 'row' ? 'Row Container' : 'Col Container',
    icon: direction === 'row' ? 'i-lucide-rows-3' : 'i-lucide-columns-3',
    defaultWidth: direction === 'row' ? 340 : 180,
    defaultHeight: direction === 'row' ? 60 : 120,
    defaultProps: {
      direction,
      gap: 8,
      padding: 8,
      backgroundColor: 'transparent',
    },
  }
  return addElement(paletteItem, targetId)
}

function updateElement(id: string, patch: Partial<AppElement>) {
  const idx = elements.value.findIndex(el => el.id === id)
  if (idx !== -1) {
    elements.value[idx] = { ...elements.value[idx], ...patch } as AppElement
  }
}

function updateElementProps(id: string, propsPatch: Record<string, unknown>) {
  const idx = elements.value.findIndex(el => el.id === id)
  if (idx !== -1) {
    elements.value[idx] = {
      ...elements.value[idx],
      props: { ...elements.value[idx].props, ...propsPatch },
    } as AppElement
  }
}

// Recursively deletes an element and all its descendants
function deleteElement(id: string) {
  const el = elements.value.find(e => e.id === id)
  if (!el) return

  // Remove children first (recursively)
  for (const childId of [...el.children]) {
    deleteElement(childId)
  }

  // Remove from parent's children list
  if (el.parentId) {
    const parent = elements.value.find(e => e.id === el.parentId)
    if (parent) {
      parent.children = parent.children.filter(cid => cid !== id)
    }
  }

  elements.value = elements.value.filter(e => e.id !== id)

  if (selectedElementId.value === id) {
    selectedElementId.value = null
  }
}

// Move a child from index `from` to index `to` within a container's children array
function reorderChildren(containerId: string, from: number, to: number) {
  const el = elements.value.find(e => e.id === containerId)
  if (!el) return
  const children = [...el.children]
  const [moved] = children.splice(from, 1)
  children.splice(to, 0, moved)
  el.children = children
}

function togglePreview() {
  isPreviewOpen.value = !isPreviewOpen.value
}

function setRunning(val: boolean) {
  isRunning.value = val
}

function setActiveDevice(id: string) {
  activeDeviceId.value = id
}

function setJsCode(code: string) {
  jsCode.value = code
  jsCodeInitialized.value = true
}

function markJsCodeInitialized() {
  jsCodeInitialized.value = true
}

// ── Page Management ───────────────────────────────────────────────────────

function addPage() {
  const id = `page${pages.value.length + 1}`
  pages.value.push({
    id,
    name: `Page ${pages.value.length + 1}`
  })
  currentPageId.value = id
  selectedElementId.value = null
}

function switchPage(id: string) {
  currentPageId.value = id
  selectedElementId.value = null
}

function deletePage(id: string) {
  if (pages.value.length <= 1) return // Keep at least one page
  
  // Delete all elements on this page
  elements.value = elements.value.filter(el => el.pageId !== id)
  
  const idx = pages.value.findIndex(p => p.id === id)
  if (idx !== -1) {
    pages.value.splice(idx, 1)
    if (currentPageId.value === id) {
      currentPageId.value = pages.value[0].id
    }
  }
  selectedElementId.value = null
}

function renamePage(id: string, name: string) {
  const page = pages.value.find(p => p.id === id)
  if (page) {
    page.name = name
  }
}

export function useEditorStore() {
  return {
    // State (readonly refs — mutate only through actions)
    mode,
    selectedElementId,
    elements,
    pages,
    currentPageId,
    isPreviewOpen,
    isRunning,
    activeDeviceId,
    activePlatform,
    jsCode,
    jsCodeInitialized,
    // Derived
    selectedElement,
    rootContainers,
    // Actions
    setMode,
    selectElement,
    addElement,
    addContainer,
    updateElement,
    updateElementProps,
    deleteElement,
    togglePreview,
    setRunning,
    setActiveDevice,
    setJsCode,
    markJsCodeInitialized,
    addPage,
    switchPage,
    deletePage,
    renamePage,
    reorderChildren,
    // Helpers
    getContainerOf,
    getRootContainers,
    isContainer,
  }
}
