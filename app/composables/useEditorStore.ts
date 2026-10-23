import { ref, computed, watch } from 'vue'

import { DEFAULT_APP_ICON, normalizeAppIcon, type AppIcon } from '../utils/appIcon'

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
  direction?: 'row' | 'col' // only used when type is Container
}

export interface PaletteItem {
  type: string
  label: string
  icon: string
  defaultWidth: number
  defaultHeight: number
  defaultProps: Record<string, unknown>
}

export interface PersistedEditorState {
  projectId: string
  projectName: string
  /** Home-screen icon for the APK (older saves don't have it) */
  appIcon?: AppIcon
  shareLinkId: string | null
  elements: AppElement[]
  pages: Page[]
  currentPageId: string
  activeDeviceId: string
  jsCodeByPage: Record<string, string>
}

// Container types — these can hold children
const CONTAINER_TYPES = new Set(['Container'])

function isContainer(type: string) {
  return CONTAINER_TYPES.has(type)
}

// Singleton refs — shared across all component instances on the client
const mode = ref<EditorMode>('design')
const selectedElementId = ref<string | null>(null)
const elements = ref<AppElement[]>([])
const projectId = ref<string>('')
const projectName = ref<string>('Untitled Project')
const appIcon = ref<AppIcon>({ ...DEFAULT_APP_ICON })
const shareLinkId = ref<string | null>(null)

const pages = ref<Page[]>([
  { id: 'page1', name: 'Page 1' }
])
const currentPageId = ref<string>('page1')

const isPreviewOpen = ref(false)
const isRunning = ref(false)
const elementSnapshot = ref<AppElement[] | null>(null)
const activeDeviceId = ref<string>('iphone15')

// Per-page JS code — keyed by pageId
const jsCodeByPage = ref<Record<string, string>>({})

// Writable computed: reads/writes code for the current page only
const jsCode = computed<string>({
  get: () => jsCodeByPage.value[currentPageId.value] ?? '',
  set: (val: string) => { jsCodeByPage.value[currentPageId.value] = val },
})

const jsCodeInitialized = ref(false)

// 'ios' for iPhone devices, 'android' for Android device
const activePlatform = computed<'ios' | 'android'>(() =>
  activeDeviceId.value === 'android' ? 'android' : 'ios'
)

// Per-type counter so IDs read like page1_button1, page1_toolbar1, etc.
const typeCounters: Record<string, number> = {}
/** Creator mode workspace (kept for backward compatibility). */
export const DEFAULT_WORKSPACE_KEY = 'codecraft-current-project-v1'
/** Remembers which workspace (creator or a lesson) was open last. */
const ACTIVE_WORKSPACE_KEY = 'codecraft-active-workspace'
// Each lesson has its own saved project so switching never destroys work.
const storageKey = ref<string>(DEFAULT_WORKSPACE_KEY)
let persistenceInitialized = false

function safeStorage(): Storage | null {
  try {
    return import.meta.client ? window.localStorage : null
  } catch {
    return null
  }
}

function generateProjectId(timestamp = Date.now(), random = Math.random()): string {
  return `project_${timestamp.toString(36)}${Math.floor(random * 0xffffff).toString(36).padStart(5, '0')}`
}

function resetTypeCounters() {
  for (const key of Object.keys(typeCounters)) {
    delete typeCounters[key]
  }
}

function syncTypeCountersFromElements(nextElements: AppElement[]) {
  resetTypeCounters()
  for (const el of nextElements) {
    const match = el.id.match(/_([a-z0-9]+?)(\d+)$/i)
    if (!match) continue
    const [, rawType, rawCount] = match
    const key = rawType.toLowerCase()
    const count = Number(rawCount)
    if (Number.isFinite(count)) {
      typeCounters[key] = Math.max(typeCounters[key] ?? 0, count)
    }
  }
}

function buildRootContainer(pageId: string): AppElement {
  typeCounters.container = (typeCounters.container ?? 0) + 1
  return {
    id: `${pageId}_container${typeCounters.container}`,
    pageId,
    type: 'Container',
    x: 0,
    y: 0,
    width: 393,
    height: 852,
    props: {
      direction: 'col',
      gap: 16,
      padding: 16,
      backgroundColor: 'transparent',
    },
    parentId: null,
    children: [],
    direction: 'col',
  }
}

function buildPersistedState(): PersistedEditorState {
  return {
    projectId: projectId.value,
    projectName: projectName.value,
    appIcon: appIcon.value,
    shareLinkId: shareLinkId.value,
    // While Run mode is active, elements hold runtime values; save the design instead
    elements: elementSnapshot.value ?? elements.value,
    pages: pages.value,
    currentPageId: currentPageId.value,
    activeDeviceId: activeDeviceId.value,
    jsCodeByPage: jsCodeByPage.value,
  }
}

export function serializeEditorState(): PersistedEditorState {
  return JSON.parse(JSON.stringify(buildPersistedState())) as PersistedEditorState
}

export function applyPersistedEditorState(state: Partial<PersistedEditorState>) {
  if (!Array.isArray(state.elements) || !Array.isArray(state.pages) || !state.currentPageId) {
    return false
  }

  projectId.value = typeof state.projectId === 'string' && state.projectId
    ? state.projectId
    : generateProjectId()
  projectName.value = typeof state.projectName === 'string' && state.projectName
    ? state.projectName
    : 'Untitled Project'
  appIcon.value = normalizeAppIcon(state.appIcon)
  shareLinkId.value = typeof state.shareLinkId === 'string' ? state.shareLinkId : null
  elements.value = state.elements
  pages.value = state.pages
  currentPageId.value = state.currentPageId
  activeDeviceId.value =
    typeof state.activeDeviceId === 'string' && state.activeDeviceId ? state.activeDeviceId : 'iphone15'
  jsCodeByPage.value = state.jsCodeByPage ?? {}
  selectedElementId.value = null
  isPreviewOpen.value = false
  isRunning.value = false
  elementSnapshot.value = null
  jsCodeInitialized.value = Object.keys(jsCodeByPage.value).length > 0
  syncTypeCountersFromElements(elements.value)

  if (!elements.value.find((el) => el.pageId === currentPageId.value && el.parentId === null && el.type === 'Container')) {
    elements.value.push(buildRootContainer(currentPageId.value))
  }

  return true
}

export function resetEditorStoreForTests() {
  persistenceInitialized = false
  createBlankProject({ keepProjectId: false })
}

function persistProject() {
  const ls = safeStorage()
  if (!ls) return
  try {
    ls.setItem(storageKey.value, JSON.stringify(buildPersistedState()))
  } catch {
    // Quota / private mode — the editor keeps working in memory.
  }
}

function createBlankProject(options?: { keepProjectId?: boolean }) {
  const nextProjectId = options?.keepProjectId ? projectId.value || generateProjectId() : generateProjectId()
  resetTypeCounters()
  mode.value = 'design'
  selectedElementId.value = null
  projectId.value = nextProjectId
  projectName.value = 'Untitled Project'
  appIcon.value = { ...DEFAULT_APP_ICON }
  shareLinkId.value = null
  pages.value = [{ id: 'page1', name: 'Page 1' }]
  currentPageId.value = 'page1'
  isPreviewOpen.value = false
  isRunning.value = false
  elementSnapshot.value = null
  activeDeviceId.value = 'iphone15'
  jsCodeByPage.value = {}
  jsCodeInitialized.value = false
  elements.value = [buildRootContainer('page1')]
}

function loadPersistedProject() {
  const ls = safeStorage()
  if (!ls) return false
  const raw = ls.getItem(storageKey.value)
  if (!raw) return false

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedEditorState>
    return applyPersistedEditorState(parsed)
  } catch {
    return false
  }
}

function initializePersistence() {
  if (!import.meta.client || persistenceInitialized) return
  persistenceInitialized = true

  const savedKey = safeStorage()?.getItem(ACTIVE_WORKSPACE_KEY)
  if (savedKey) storageKey.value = savedKey

  const loaded = loadPersistedProject()
  if (!loaded && elements.value.length === 0) {
    createBlankProject({ keepProjectId: false })
  }

  watch(
    [projectId, projectName, appIcon, shareLinkId, elements, pages, currentPageId, activeDeviceId, jsCodeByPage],
    () => {
      persistProject()
    },
    { deep: true }
  )
}

function generateId(type: string): string {
  const key = type.toLowerCase()
  typeCounters[key] = (typeCounters[key] ?? 0) + 1
  return `${currentPageId.value}_${key}${typeCounters[key]}`
}

const selectedElement = computed(() =>
  elements.value.find(el => el.id === selectedElementId.value) ?? null
)

// Returns only the top-level Container for the CURRENT page
const rootContainer = computed(() =>
  elements.value.find(el => el.parentId === null && el.type === 'Container' && el.pageId === currentPageId.value)
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

function getRootContainer(): AppElement | undefined {
  return elements.value.find(el => el.parentId === null && el.type === 'Container' && el.pageId === currentPageId.value)
}

// Creates a new container at root level and returns it.
function _createRootContainer(): AppElement {
  const container = buildRootContainer(currentPageId.value)
  elements.value.push(container)
  return container
}

// Smart placement logic per the container-first rules:
//
// Case A — item is a Container:
//   - If targetId points to a container → add as nested container inside it
//   - Otherwise → add at root level
//
// Case B — regular element:
//   1. targetId points to a container        → add inside that container
//   2. targetId points to a non-container    → add as sibling in same parent container
//   3. no selection / nothing on canvas      → auto-create root Container, add inside it
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

  // Ensure root container exists for the current page
  let rc = getRootContainer()
  if (!rc) rc = _createRootContainer()

  // Toolbar is always a singleton at root level per page — remove any existing one first
  if (item.type === 'Toolbar') {
    const existing = elements.value.find(e => e.type === 'Toolbar' && e.pageId === currentPageId.value)
    if (existing) deleteElement(existing.id)
    _addAtRoot(newEl)
    selectedElementId.value = newEl.id
    return newEl
  }

  // Regular element placement
  if (resolvedTarget) {
    const targetEl = elements.value.find(e => e.id === resolvedTarget)
    if (targetEl && isContainer(targetEl.type)) {
      newEl.parentId = targetEl.id
      elements.value.push(newEl)
      targetEl.children.push(newEl.id)
    } else if (targetEl && !isContainer(targetEl.type) && targetEl.parentId) {
      // Add as sibling in the same parent if it exists, else root container
      const parent = elements.value.find(e => e.id === targetEl.parentId)
      if (parent) {
        newEl.parentId = parent.id
        elements.value.push(newEl)
        parent.children.push(newEl.id)
      } else {
        newEl.parentId = rc.id
        elements.value.push(newEl)
        rc.children.push(newEl.id)
      }
    } else {
      newEl.parentId = rc.id
      elements.value.push(newEl)
      rc.children.push(newEl.id)
    }
  } else {
    // Nothing selected — add directly to root container
    newEl.parentId = rc.id
    elements.value.push(newEl)
    rc.children.push(newEl.id)
  }

  selectedElementId.value = newEl.id
  return newEl
}

// Places a new element at root level (like Toolbar)
function _addAtRoot(el: AppElement) {
  el.x = 0
  el.y = 0
  el.parentId = null
  elements.value.push(el)
}

// Auto-creates a root vertical Container then nests the element inside it
function _autoCreateAndAdd(el: AppElement) {
  const container = _createRootContainer()
  el.parentId = container.id
  elements.value.push(el)
  container.children.push(el.id)
  // Select the container so next additions go into the same container
  selectedElementId.value = container.id
}

// Explicitly add a container (from palette) at root or nested
function addContainer(targetId?: string): AppElement {
  const paletteItem: PaletteItem = {
    type: 'Container',
    label: 'Container',
    icon: 'i-lucide-box',
    defaultWidth: 340,
    defaultHeight: 120,
    defaultProps: {
      direction: 'col',
      gap: 16,
      padding: 16,
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
    const el = elements.value[idx]!
    const { __height, ...rest } = propsPatch
    elements.value[idx] = {
      ...el,
      ...(__height !== undefined ? { height: Number(__height) } : {}),
      props: { ...el.props, ...rest },
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
  if (!el || !el.children) return
  const children = [...el.children]
  const moved = children.splice(from, 1)[0]
  if (moved === undefined) return
  children.splice(to, 0, moved)
  el.children = children
}

function togglePreview() {
  isPreviewOpen.value = !isPreviewOpen.value
}

function setRunning(val: boolean) {
  if (val) {
    // Take snapshot of current state before running logic
    elementSnapshot.value = JSON.parse(JSON.stringify(elements.value))
  } else if (elementSnapshot.value) {
    // Restore original state when stopping
    elements.value = JSON.parse(JSON.stringify(elementSnapshot.value))
    elementSnapshot.value = null
    selectedElementId.value = null
  }
  isRunning.value = val
}

function setActiveDevice(id: string) {
  activeDeviceId.value = id
}

function setProjectName(name: string) {
  projectName.value = name.trim() || 'Untitled Project'
}

function setAppIcon(icon: AppIcon) {
  appIcon.value = normalizeAppIcon(icon)
}

function setShareLinkId(id: string | null) {
  shareLinkId.value = id
}

function saveProject() {
  persistProject()
}

function newProject() {
  createBlankProject()
  persistProject()
}

/**
 * Save the current project, then open another workspace (creator project or a
 * lesson project). A workspace that was never opened starts blank.
 */
function switchWorkspace(key: string, options: { projectName?: string } = {}) {
  if (key === storageKey.value) return
  persistProject()
  storageKey.value = key
  try {
    safeStorage()?.setItem(ACTIVE_WORKSPACE_KEY, key)
  } catch {
    // ignore
  }
  const loaded = loadPersistedProject()
  if (!loaded) {
    createBlankProject()
    if (options.projectName) projectName.value = options.projectName
  }
  persistProject()
}

/** Throw away a workspace's saved project (used by "start lesson over"). */
function resetWorkspace(key: string, options: { projectName?: string } = {}) {
  try {
    safeStorage()?.removeItem(key)
  } catch {
    // ignore
  }
  if (key === storageKey.value) {
    createBlankProject()
    if (options.projectName) projectName.value = options.projectName
    persistProject()
  }
}

function setJsCode(code: string) {
  jsCodeByPage.value[currentPageId.value] = code
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
  
  // Auto-create root Container for the new page
  _createRootContainer()
}

function switchPage(id: string) {
  currentPageId.value = id
  selectedElementId.value = null
}

function deletePage(id: string) {
  if (pages.value.length <= 1) return // Keep at least one page
  
  // Delete all elements on this page
  elements.value = elements.value.filter(el => el.pageId !== id)

  // Delete per-page code
  delete jsCodeByPage.value[id]

  const idx = pages.value.findIndex(p => p.id === id)
  if (idx !== -1) {
    pages.value.splice(idx, 1)
    if (currentPageId.value === id) {
      currentPageId.value = pages.value[0]!.id
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
    projectId,
    projectName,
    appIcon,
    shareLinkId,
    pages,
    currentPageId,
    isPreviewOpen,
    isRunning,
    /** Design-time elements captured when Run started (null when not running) */
    elementSnapshot,
    activeDeviceId,
    activePlatform,
    jsCode,
    jsCodeByPage,
    jsCodeInitialized,
    // Derived
    selectedElement,
    rootContainer,
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
    setProjectName,
    setAppIcon,
    setShareLinkId,
    saveProject,
    newProject,
    switchWorkspace,
    resetWorkspace,
    storageKey,
    setJsCode,
    markJsCodeInitialized,
    addPage,
    switchPage,
    deletePage,
    renamePage,
    reorderChildren,
    // Helpers
    getContainerOf,
    getRootContainer,
    isContainer,
  }
}

if (projectId.value === '') {
  projectId.value = generateProjectId()
}

if (import.meta.client) {
  initializePersistence()
}

if (elements.value.length === 0 && !import.meta.client) {
  createBlankProject({ keepProjectId: true })
}
