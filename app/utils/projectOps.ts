import type { AppElement, PaletteItem, PersistedEditorState } from '../composables/useEditorStore'
import { usePaletteItems } from '../composables/usePaletteItems'
import { DEFAULT_APP_ICON } from './appIcon'
import { APP_PAGE_ID, getElementEvents, isNonVisualType } from './componentApi'

/** Thrown for invalid edits; the message is Thai and safe to show to the AI/user. */
export class ProjectOpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectOpError'
  }
}

export type ProjectOp =
  | { op: 'new_project'; args: { name: string } }
  | { op: 'add_page'; args: { name: string } }
  | { op: 'rename_page'; args: { pageId: string; name: string } }
  | { op: 'delete_page'; args: { pageId: string } }
  | { op: 'add_element'; args: { pageId: string; type: string; parentId?: string; index?: number; props?: Record<string, unknown> } }
  | { op: 'update_element'; args: { id: string; props: Record<string, unknown> } }
  | { op: 'move_element'; args: { id: string; parentId: string; index?: number } }
  | { op: 'delete_element'; args: { id: string } }
  | { op: 'set_page_code'; args: { pageId: string; code: string } }

export interface OpResult {
  state: PersistedEditorState
  result: Record<string, unknown>
}

export interface ComponentTypeInfo {
  type: string
  label: string
  defaultProps: Record<string, unknown>
  events: string[]
  isContainer: boolean
}

export interface ElementNode {
  id: string
  type: string
  props: Record<string, unknown>
  children: ElementNode[]
}

export interface ProjectSummary {
  projectName: string
  pages: { id: string; name: string; code: string; tree: ElementNode[] }[]
  appElements: ElementNode[]
}

const CONTAINER_DEFAULTS: PaletteItem = {
  type: 'Container',
  label: 'Container',
  icon: 'i-lucide-box',
  defaultWidth: 340,
  defaultHeight: 120,
  defaultProps: { direction: 'col', gap: 16, padding: 16, backgroundColor: 'transparent' },
}

function allPaletteItems(): PaletteItem[] {
  return [...usePaletteItems().flatMap(group => group.items), CONTAINER_DEFAULTS]
}

function findPaletteItem(type: string): PaletteItem | undefined {
  return allPaletteItems().find(item => item.type === type)
}

function isContainerType(type: string) {
  return type === 'Container'
}

function newProjectId(): string {
  return `project_${Date.now().toString(36)}${Math.floor(Math.random() * 0xffffff).toString(36).padStart(5, '0')}`
}

/** Highest number already used per lowercase type across element ids (e.g. page1_button3 -> button: 3) */
function typeCounters(elements: AppElement[]): Record<string, number> {
  const counters: Record<string, number> = {}
  for (const el of elements) {
    const match = el.id.match(/(?:^|_)([a-z0-9]+?)(\d+)$/i)
    if (!match) continue
    const key = match[1]!.toLowerCase()
    const count = Number(match[2])
    if (Number.isFinite(count)) counters[key] = Math.max(counters[key] ?? 0, count)
  }
  return counters
}

function buildRootContainer(pageId: string, elements: AppElement[]): AppElement {
  const n = (typeCounters(elements).container ?? 0) + 1
  return {
    id: `${pageId}_container${n}`,
    pageId,
    type: 'Container',
    x: 0,
    y: 0,
    width: 393,
    height: 852,
    props: { direction: 'col', gap: 16, padding: 16, backgroundColor: 'transparent' },
    parentId: null,
    children: [],
    direction: 'col',
  }
}

export function blankProjectState(name: string, projectId?: string): PersistedEditorState {
  return {
    projectId: projectId ?? newProjectId(),
    projectName: name,
    appIcon: { ...DEFAULT_APP_ICON },
    shareLinkId: null,
    elements: [buildRootContainer('page1', [])],
    pages: [{ id: 'page1', name: 'Page 1' }],
    currentPageId: 'page1',
    activeDeviceId: 'iphone15',
    jsCodeByPage: {},
  }
}

function requirePage(state: PersistedEditorState, pageId: string) {
  const page = state.pages.find(p => p.id === pageId)
  if (!page) throw new ProjectOpError(`ไม่พบหน้า ${pageId}`)
  return page
}

function requireElement(state: PersistedEditorState, id: string): AppElement {
  const el = state.elements.find(e => e.id === id)
  if (!el) throw new ProjectOpError(`ไม่พบ element ${id}`)
  return el
}

function requireName(name: unknown): string {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) throw new ProjectOpError('ชื่อห้ามว่าง')
  return trimmed
}

function rootContainerOf(state: PersistedEditorState, pageId: string): AppElement | undefined {
  return state.elements.find(e => e.pageId === pageId && e.type === 'Container' && e.parentId === null)
}

function isDescendant(state: PersistedEditorState, candidateId: string, ancestorId: string): boolean {
  let cursor = state.elements.find(e => e.id === candidateId)
  while (cursor) {
    if (cursor.id === ancestorId) return true
    const parentId: string | null = cursor.parentId
    cursor = parentId ? state.elements.find(e => e.id === parentId) : undefined
  }
  return false
}

function insertAt(list: string[], id: string, index?: number) {
  if (index === undefined || index >= list.length) list.push(id)
  else list.splice(Math.max(0, index), 0, id)
}

function addPage(state: PersistedEditorState, name: string): OpResult {
  const pageName = requireName(name)
  let n = 1
  while (state.pages.some(p => p.id === `page${n}`)) n++
  const id = `page${n}`
  state.pages.push({ id, name: pageName })
  state.currentPageId = id
  state.elements.push(buildRootContainer(id, state.elements))
  return { state, result: { pageId: id } }
}

function deletePage(state: PersistedEditorState, pageId: string): OpResult {
  requirePage(state, pageId)
  if (state.pages.length <= 1) throw new ProjectOpError('ลบหน้าสุดท้ายไม่ได้ — ต้องมีอย่างน้อย 1 หน้า')
  state.elements = state.elements.filter(el => el.pageId !== pageId)
  delete state.jsCodeByPage[pageId]
  state.pages = state.pages.filter(p => p.id !== pageId)
  if (state.currentPageId === pageId) state.currentPageId = state.pages[0]!.id
  return { state, result: { pageId } }
}

function addElement(state: PersistedEditorState, args: Extract<ProjectOp, { op: 'add_element' }>['args']): OpResult {
  requirePage(state, args.pageId)
  const item = findPaletteItem(args.type)
  if (!item) throw new ProjectOpError(`ไม่รู้จักชนิด element "${args.type}"`)

  const key = item.type.toLowerCase()
  const props = { ...item.defaultProps, ...(args.props ?? {}) }
  const newEl: AppElement = {
    id: '',
    pageId: args.pageId,
    type: item.type,
    x: 0,
    y: 0,
    width: item.defaultWidth,
    height: item.defaultHeight,
    props,
    parentId: null,
    children: [],
    ...(item.defaultProps.direction ? { direction: item.defaultProps.direction as 'row' | 'col' } : {}),
  }

  if (isNonVisualType(item.type)) {
    // App-level: short id that is also the variable name (sound1, sound2...)
    const taken = new Set(state.elements.map(e => e.id))
    let n = 1
    while (taken.has(`${key}${n}`)) n++
    newEl.id = `${key}${n}`
    newEl.pageId = APP_PAGE_ID
    state.elements.push(newEl)
    return { state, result: { id: newEl.id } }
  }

  const rc = rootContainerOf(state, args.pageId) ?? (() => {
    const created = buildRootContainer(args.pageId, state.elements)
    state.elements.push(created)
    return created
  })()
  newEl.id = `${args.pageId}_${key}${(typeCounters(state.elements)[key] ?? 0) + 1}`

  if (item.type === 'Toolbar') {
    // Singleton per page, always at root level: replace any existing one
    const existing = state.elements.filter(e => e.type === 'Toolbar' && e.pageId === args.pageId)
    const gone = new Set(existing.map(e => e.id))
    state.elements = state.elements.filter(e => !gone.has(e.id))
    state.elements.push(newEl)
    return { state, result: { id: newEl.id } }
  }

  let parent = rc
  if (args.parentId !== undefined) {
    const target = state.elements.find(e => e.id === args.parentId)
    if (!target) throw new ProjectOpError(`ไม่พบ element ${args.parentId}`)
    if (!isContainerType(target.type)) throw new ProjectOpError(`${args.parentId} ไม่ใช่ Container จึงใส่ element ข้างในไม่ได้`)
    if (target.pageId !== args.pageId) throw new ProjectOpError(`${args.parentId} อยู่คนละหน้ากับ ${args.pageId}`)
    parent = target
  }
  newEl.parentId = parent.id
  state.elements.push(newEl)
  insertAt(parent.children, newEl.id, args.index)
  return { state, result: { id: newEl.id } }
}

function updateElement(state: PersistedEditorState, id: string, propsPatch: Record<string, unknown>): OpResult {
  const idx = state.elements.findIndex(e => e.id === id)
  if (idx === -1) throw new ProjectOpError(`ไม่พบ element ${id}`)
  const el = state.elements[idx]!
  const { __height, ...rest } = propsPatch
  state.elements[idx] = {
    ...el,
    ...(__height !== undefined ? { height: Number(__height) } : {}),
    props: { ...el.props, ...rest },
  }
  return { state, result: { id } }
}

function moveElement(state: PersistedEditorState, args: Extract<ProjectOp, { op: 'move_element' }>['args']): OpResult {
  const el = requireElement(state, args.id)
  if (el.parentId === null) throw new ProjectOpError(`ย้าย ${args.id} ไม่ได้ — เป็น element ระดับ root`)
  const target = requireElement(state, args.parentId)
  if (!isContainerType(target.type)) throw new ProjectOpError(`${args.parentId} ไม่ใช่ Container`)
  if (target.pageId !== el.pageId) throw new ProjectOpError(`${args.parentId} อยู่คนละหน้ากับ ${args.id}`)
  if (isDescendant(state, target.id, el.id)) throw new ProjectOpError(`ย้าย ${args.id} เข้าไปใน ${args.parentId} ไม่ได้ — เป็นลูกของตัวเอง`)

  const oldParent = state.elements.find(e => e.id === el.parentId)
  if (oldParent) oldParent.children = oldParent.children.filter(cid => cid !== el.id)
  el.parentId = target.id
  insertAt(target.children, el.id, args.index)
  return { state, result: { id: el.id } }
}

function deleteElement(state: PersistedEditorState, id: string): OpResult {
  const el = requireElement(state, id)
  if (el.type === 'Container' && el.parentId === null) {
    throw new ProjectOpError(`ลบ ${id} ไม่ได้ — เป็น Container หลักของหน้า`)
  }
  const doomed = new Set<string>()
  const collect = (elId: string) => {
    doomed.add(elId)
    for (const childId of state.elements.find(e => e.id === elId)?.children ?? []) collect(childId)
  }
  collect(id)
  const parent = el.parentId ? state.elements.find(e => e.id === el.parentId) : undefined
  if (parent) parent.children = parent.children.filter(cid => cid !== id)
  state.elements = state.elements.filter(e => !doomed.has(e.id))
  return { state, result: { id } }
}

export function applyProjectOp(input: PersistedEditorState, op: ProjectOp): OpResult {
  if (op.op === 'new_project') {
    return { state: blankProjectState(requireName(op.args.name)), result: {} }
  }
  const state = structuredClone(input)
  switch (op.op) {
    case 'add_page':
      return addPage(state, op.args.name)
    case 'rename_page': {
      const page = requirePage(state, op.args.pageId)
      page.name = requireName(op.args.name)
      return { state, result: { pageId: page.id } }
    }
    case 'delete_page':
      return deletePage(state, op.args.pageId)
    case 'add_element':
      return addElement(state, op.args)
    case 'update_element':
      return updateElement(state, op.args.id, op.args.props)
    case 'move_element':
      return moveElement(state, op.args)
    case 'delete_element':
      return deleteElement(state, op.args.id)
    case 'set_page_code':
      requirePage(state, op.args.pageId)
      state.jsCodeByPage[op.args.pageId] = op.args.code
      return { state, result: { pageId: op.args.pageId } }
    default:
      throw new ProjectOpError(`ไม่รู้จักคำสั่ง ${(op as { op: string }).op}`)
  }
}

export function listComponentTypes(): ComponentTypeInfo[] {
  return allPaletteItems().map(item => ({
    type: item.type,
    label: item.label,
    defaultProps: structuredClone(item.defaultProps),
    events: getElementEvents(item.type),
    isContainer: isContainerType(item.type),
  }))
}

export function summarizeProject(state: PersistedEditorState): ProjectSummary {
  const byId = new Map(state.elements.map(e => [e.id, e]))
  const toNode = (el: AppElement): ElementNode => ({
    id: el.id,
    type: el.type,
    props: el.props,
    children: el.children.map(cid => byId.get(cid)).filter((c): c is AppElement => !!c).map(toNode),
  })
  return {
    projectName: state.projectName,
    pages: state.pages.map(page => ({
      id: page.id,
      name: page.name,
      code: state.jsCodeByPage[page.id] ?? '',
      tree: state.elements.filter(e => e.pageId === page.id && e.parentId === null).map(toNode),
    })),
    appElements: state.elements.filter(e => e.pageId === APP_PAGE_ID && e.parentId === null).map(toNode),
  }
}
