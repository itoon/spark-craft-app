import { beforeEach, describe, expect, it } from 'vitest'
import { ProjectOpError, blankProjectState } from '../../app/utils/projectOps'
import {
  applyAgentOp,
  claimEditor,
  getAgentBridge,
  isEditorConnected,
  pushEditorState,
  resetAgentBridgeForTests,
  touchEditor,
  waitForEditorUpdate,
} from '../../server/utils/agentBridge'

const addPage = (name = 'B') => ({ op: 'add_page', args: { name } }) as const

describe('agentBridge', () => {
  beforeEach(() => resetAgentBridgeForTests())

  it('claim by tab B displaces tab A', () => {
    claimEditor('A', blankProjectState('A'), 1000)
    claimEditor('B', blankProjectState('B'), 1000)
    expect(getAgentBridge().tabId).toBe('B')
    const r = pushEditorState('A', getAgentBridge().version, blankProjectState('A2'), 1000)
    expect(r).toMatchObject({ ok: false, reason: 'not_active' })
  })

  it('active push with current baseVersion bumps version and records writer', () => {
    const { version } = claimEditor('A', blankProjectState('A'), 1000)
    const r = pushEditorState('A', version, blankProjectState('A2'), 1000)
    expect(r).toEqual({ ok: true, version: version + 1 })
    expect(getAgentBridge().lastWriter).toBe('editor')
    expect(getAgentBridge().lastWriterTab).toBe('A')
  })

  it('stale push returns the agent state', () => {
    const { version } = claimEditor('A', blankProjectState('A'), 1000)
    applyAgentOp(addPage(), 1000)
    const r = pushEditorState('A', version, blankProjectState('late'), 1000)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('stale')
      expect(r.version).toBe(version + 1)
      expect(r.state?.pages).toHaveLength(2)
    }
  })

  it('applyAgentOp bumps version by 1 and wakes a pending wait', async () => {
    const { version } = claimEditor('A', blankProjectState('A'), 1000)
    const pending = waitForEditorUpdate('A', version, 5000)
    const r = applyAgentOp(addPage(), 1000)
    expect(r.version).toBe(version + 1)
    const update = await pending
    expect(update).toMatchObject({ version: version + 1, active: true })
    expect(getAgentBridge().lastWriter).toBe('agent')
  })

  it('applyAgentOp throws NO_EDITOR when stale or unclaimed', () => {
    expect(() => applyAgentOp(addPage(), 1000)).toThrow(ProjectOpError)
    claimEditor('A', blankProjectState('A'), 1000)
    expect(() => applyAgentOp(addPage(), 1000 + 35_001)).toThrow(
      'ยังไม่มี editor เปิดอยู่ — เปิด http://localhost:3000 ในเบราว์เซอร์ก่อน',
    )
    expect(isEditorConnected(1000 + 35_001)).toBe(false)
  })

  it('touchEditor keeps only the active tab alive', () => {
    claimEditor('A', blankProjectState('A'), 1000)
    touchEditor('B', 30_000)
    expect(isEditorConnected(36_000)).toBe(false)
    touchEditor('A', 30_000)
    expect(isEditorConnected(36_000)).toBe(true)
  })

  it('editor push does not wake the pushing tab', async () => {
    const { version } = claimEditor('A', blankProjectState('A'), 1000)
    const pending = waitForEditorUpdate('A', version, 50)
    pushEditorState('A', version, blankProjectState('A2'), 1000)
    expect(await pending).toBeNull()
  })

  it('waitForEditorUpdate tells a displaced tab active:false', async () => {
    const { version } = claimEditor('A', blankProjectState('A'), 1000)
    const pending = waitForEditorUpdate('A', version, 5000)
    claimEditor('B', blankProjectState('B'), 1000)
    expect(await pending).toMatchObject({ active: false })
  })

  it('a failed op leaves version and state unchanged', () => {
    claimEditor('A', blankProjectState('A'), 1000)
    const before = getAgentBridge().version
    const state = getAgentBridge().state
    expect(() =>
      applyAgentOp({ op: 'delete_page', args: { pageId: 'nope' } }, 1000),
    ).toThrow(ProjectOpError)
    expect(getAgentBridge().version).toBe(before)
    expect(getAgentBridge().state).toBe(state)
  })
})
