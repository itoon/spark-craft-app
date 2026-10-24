import { describe, expect, it } from 'vitest'
import { APP_PAGE_ID } from '../../app/utils/componentApi'
import {
  ProjectOpError,
  applyProjectOp,
  blankProjectState,
  listComponentTypes,
  summarizeProject,
  type ProjectOp,
} from '../../app/utils/projectOps'
import type { PersistedEditorState } from '../../app/composables/useEditorStore'

function run(state: PersistedEditorState, ...ops: ProjectOp[]) {
  let current = state
  let last: Record<string, unknown> = {}
  for (const op of ops) {
    const r = applyProjectOp(current, op)
    current = r.state
    last = r.result
  }
  return { state: current, result: last }
}
const el = (s: PersistedEditorState, id: string) => s.elements.find(e => e.id === id)!
const add = (pageId: string, type: string, extra: Record<string, unknown> = {}): ProjectOp =>
  ({ op: 'add_element', args: { pageId, type, ...extra } }) as ProjectOp

describe('blankProjectState', () => {
  it('builds one page with a root container', () => {
    const s = blankProjectState('Test')
    expect(s.pages).toEqual([{ id: 'page1', name: 'Page 1' }])
    expect(s.elements).toHaveLength(1)
    expect(s.elements[0]).toMatchObject({ id: 'page1_container1', type: 'Container', parentId: null, pageId: 'page1' })
    expect(s.currentPageId).toBe('page1')
    expect(s.projectName).toBe('Test')
  })
})

describe('pages', () => {
  it('add_page uses the first free pageN and creates a root container', () => {
    const base = run(blankProjectState('T'), { op: 'add_page', args: { name: 'B' } }, { op: 'add_page', args: { name: 'C' } }).state
    const removed = run(base, { op: 'delete_page', args: { pageId: 'page2' } }).state
    const { state, result } = run(removed, { op: 'add_page', args: { name: 'D' } })
    expect(result.pageId).toBe('page2')
    expect(state.pages.map(p => p.id)).toEqual(['page1', 'page3', 'page2'])
    expect(state.elements.some(e => e.pageId === 'page2' && e.parentId === null && e.type === 'Container')).toBe(true)
  })

  it('rename_page rejects an empty name', () => {
    expect(() => run(blankProjectState('T'), { op: 'rename_page', args: { pageId: 'page1', name: '  ' } })).toThrow(ProjectOpError)
    expect(run(blankProjectState('T'), { op: 'rename_page', args: { pageId: 'page1', name: 'Home' } }).state.pages[0]!.name).toBe('Home')
  })

  it('delete_page removes elements and code, keeps one page, moves current page', () => {
    let s = run(blankProjectState('T'), { op: 'add_page', args: { name: 'B' } }).state
    s = run(s, add('page2', 'Button'), { op: 'set_page_code', args: { pageId: 'page2', code: 'x' } }).state
    expect(s.currentPageId).toBe('page2')
    const after = run(s, { op: 'delete_page', args: { pageId: 'page2' } }).state
    expect(after.elements.every(e => e.pageId !== 'page2')).toBe(true)
    expect(after.jsCodeByPage.page2).toBeUndefined()
    expect(after.currentPageId).toBe('page1')
    expect(() => run(after, { op: 'delete_page', args: { pageId: 'page1' } })).toThrow(ProjectOpError)
  })
})

describe('add_element', () => {
  it('adds to the root container with palette defaults merged', () => {
    const base = blankProjectState('T')
    const a = run(base, add('page1', 'Button', { props: { text: 'Hi' } }))
    expect(a.result.id).toBe('page1_button1')
    expect(el(a.state, 'page1_button1').parentId).toBe('page1_container1')
    expect(el(a.state, 'page1_button1').props.text).toBe('Hi')
    expect(Object.keys(el(a.state, 'page1_button1').props).length).toBeGreaterThan(1)
    const b = run(a.state, add('page1', 'Button'))
    expect(b.result.id).toBe('page1_button2')
    const c = run(b.state, add('page1', 'Button', { index: 0 }))
    expect(el(c.state, 'page1_container1').children[0]).toBe(c.result.id)
  })

  it('rejects unknown type, non-container parent, other-page parent', () => {
    const s = run(blankProjectState('T'), add('page1', 'Button'), { op: 'add_page', args: { name: 'B' } }).state
    expect(() => run(s, add('page1', 'Nope'))).toThrow(/Nope/)
    expect(() => run(s, add('page1', 'Label', { parentId: 'page1_button1' }))).toThrow(ProjectOpError)
    expect(() => run(s, add('page1', 'Label', { parentId: 'page2_container1' }))).toThrow(ProjectOpError)
  })

  it('keeps a single Toolbar per page at root, the newest', () => {
    const s = run(blankProjectState('T'), add('page1', 'Toolbar'), add('page1', 'Toolbar')).state
    const bars = s.elements.filter(e => e.type === 'Toolbar')
    expect(bars).toHaveLength(1)
    expect(bars[0]!.parentId).toBeNull()
    expect(bars[0]!.id).toBe('page1_toolbar2')
  })

  it('puts Sound at app level with short ids', () => {
    const a = run(blankProjectState('T'), add('page1', 'Sound'))
    expect(a.result.id).toBe('sound1')
    expect(el(a.state, 'sound1')).toMatchObject({ pageId: APP_PAGE_ID, parentId: null })
    expect(run(a.state, add('page1', 'Sound')).result.id).toBe('sound2')
  })
})

describe('update / move / delete / code', () => {
  it('update_element merges props', () => {
    const s = run(blankProjectState('T'), add('page1', 'Button', { props: { a: 1, b: 2 } })).state
    const u = run(s, { op: 'update_element', args: { id: 'page1_button1', props: { b: 3 } } }).state
    expect(el(u, 'page1_button1').props).toMatchObject({ a: 1, b: 3 })
    expect(() => run(s, { op: 'update_element', args: { id: 'zzz', props: {} } })).toThrow(ProjectOpError)
  })

  it('move_element reparents at index and guards cycles/roots', () => {
    let s = run(blankProjectState('T'), add('page1', 'Container'), add('page1', 'Button'), add('page1', 'Label')).state
    s = run(s, add('page1', 'Button', { parentId: 'page1_container2' })).state
    const m = run(s, { op: 'move_element', args: { id: 'page1_button1', parentId: 'page1_container2', index: 0 } }).state
    expect(el(m, 'page1_container1').children).not.toContain('page1_button1')
    expect(el(m, 'page1_container2').children).toEqual(['page1_button1', 'page1_button2'])
    expect(el(m, 'page1_button1').parentId).toBe('page1_container2')
    const nested = run(s, add('page1', 'Container', { parentId: 'page1_container2' })).state
    expect(() => run(nested, { op: 'move_element', args: { id: 'page1_container2', parentId: 'page1_container3' } })).toThrow(ProjectOpError)
    expect(() => run(s, { op: 'move_element', args: { id: 'page1_container1', parentId: 'page1_container2' } })).toThrow(ProjectOpError)
  })

  it('delete_element removes descendants and parent link; root throws', () => {
    const s = run(blankProjectState('T'), add('page1', 'Container'), add('page1', 'Button', { parentId: 'page1_container2' })).state
    const d = run(s, { op: 'delete_element', args: { id: 'page1_container2' } }).state
    expect(d.elements.map(e => e.id)).toEqual(['page1_container1'])
    expect(el(d, 'page1_container1').children).toEqual([])
    expect(() => run(s, { op: 'delete_element', args: { id: 'page1_container1' } })).toThrow(ProjectOpError)
  })

  it('set_page_code sets code and rejects unknown page', () => {
    const s = run(blankProjectState('T'), { op: 'set_page_code', args: { pageId: 'page1', code: 'a()' } }).state
    expect(s.jsCodeByPage.page1).toBe('a()')
    expect(() => run(s, { op: 'set_page_code', args: { pageId: 'nope', code: '' } })).toThrow(ProjectOpError)
  })
})

describe('purity and summaries', () => {
  it('does not mutate its input', () => {
    const base = run(blankProjectState('T'), add('page1', 'Container'), add('page1', 'Button')).state
    const before = structuredClone(base)
    const ops: ProjectOp[] = [
      { op: 'add_page', args: { name: 'B' } },
      add('page1', 'Toolbar'),
      { op: 'update_element', args: { id: 'page1_button1', props: { x: 1 } } },
      { op: 'move_element', args: { id: 'page1_button1', parentId: 'page1_container2' } },
      { op: 'delete_element', args: { id: 'page1_button1' } },
      { op: 'set_page_code', args: { pageId: 'page1', code: 'z' } },
      { op: 'rename_page', args: { pageId: 'page1', name: 'Q' } },
    ]
    for (const op of ops) applyProjectOp(base, op)
    expect(base).toEqual(before)
  })

  it('listComponentTypes exposes events and container flag', () => {
    const types = listComponentTypes()
    expect(types.find(t => t.type === 'Button')!.events).toContain('onClick')
    expect(types.find(t => t.type === 'Container')!.isContainer).toBe(true)
  })

  it('summarizeProject nests children in order', () => {
    const s = run(blankProjectState('T'), add('page1', 'Button'), add('page1', 'Label', { index: 0 }), add('page1', 'Sound')).state
    const sum = summarizeProject(s)
    expect(sum.projectName).toBe('T')
    expect(sum.pages[0]!.tree[0]!.children.map(c => c.id)).toEqual(['page1_label1', 'page1_button1'])
    expect(sum.appElements.map(e => e.id)).toEqual(['sound1'])
  })
})
