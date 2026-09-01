import { describe, expect, it } from 'vitest'
import type { CallSession, WsCallsIncomingPayload } from '~/types/api'
import {
  reduceCallsIncoming,
  reduceCallsUpdated,
  remotePeerIds,
  type CallSessionState,
} from '~/composables/calls/callSessionReducer'

const ME = 'me'
const ALICE = 'alice'
const BOB = 'bob'

function session(over: Partial<CallSession> = {}): CallSession {
  return {
    id: 'call1',
    conversationId: 'conv1',
    type: 'video',
    status: 'active',
    startedByUserId: ALICE,
    startedByAdmin: false,
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: null,
    capacity: 2,
    messageId: 'm1',
    participants: [],
    ...over,
  }
}

function participant(userId: string, connectionState: 'connected' | 'reconnecting' = 'connected') {
  return { userId, joinedAt: '2026-01-01T00:00:00.000Z', micEnabled: true, cameraEnabled: true, connectionState }
}

const idle: CallSessionState = { phase: 'idle', call: null, incoming: null }

function incomingPayload(over: Partial<CallSession> = {}): WsCallsIncomingPayload {
  return {
    call: session({ status: 'ringing', participants: [participant(ALICE)], ...over }),
    caller: {
      id: ALICE,
      username: 'alice',
      name: 'Alice',
      premium: true,
      premiumPlus: false,
      isOrganization: false,
      verifiedStatus: 'identity',
      avatarUrl: null,
      orgAffiliations: [],
    },
  }
}

describe('reduceCallsIncoming', () => {
  it('rings an idle tab', () => {
    const next = reduceCallsIncoming(idle, incomingPayload())
    expect(next.phase).toBe('incoming')
    expect(next.incoming?.call.id).toBe('call1')
  })

  it('stays quiet when this tab is already busy', () => {
    const busy: CallSessionState = { phase: 'in_call', call: session({ id: 'other' }), incoming: null }
    expect(reduceCallsIncoming(busy, incomingPayload())).toBe(busy)
  })
})

describe('reduceCallsUpdated — engaged call', () => {
  it('moves outgoing → in_call when the callee connects and reconciles peers', () => {
    const state: CallSessionState = { phase: 'outgoing', call: session({ status: 'ringing', participants: [participant(ME)] }), incoming: null }
    const updated = session({ status: 'active', participants: [participant(ME), participant(ALICE)] })
    const { state: next, effects } = reduceCallsUpdated(state, updated, ME)
    expect(next.phase).toBe('in_call')
    expect(effects).toEqual(expect.arrayContaining([{ type: 'connected' }, { type: 'peers', userIds: [ALICE] }]))
  })

  it('is idempotent: re-applying the same payload yields the same phase and no connected effect', () => {
    const state: CallSessionState = { phase: 'in_call', call: session({ participants: [participant(ME), participant(ALICE)] }), incoming: null }
    const updated = session({ participants: [participant(ME), participant(ALICE)] })
    const a = reduceCallsUpdated(state, updated, ME)
    const b = reduceCallsUpdated(a.state, updated, ME)
    expect(b.state.phase).toBe('in_call')
    expect(b.effects.filter((e) => e.type === 'connected')).toHaveLength(0)
    expect(b.effects).toEqual([{ type: 'peers', userIds: [ALICE] }])
  })

  it('tears down when the call ends', () => {
    const state: CallSessionState = { phase: 'in_call', call: session(), incoming: null }
    const { state: next, effects } = reduceCallsUpdated(state, session({ status: 'ended' }), ME)
    expect(next).toEqual(idle)
    expect(effects).toEqual([{ type: 'ended', reason: 'ended' }])
  })

  it('tears down as "removed" when the server dropped us after grace', () => {
    const state: CallSessionState = { phase: 'in_call', call: session({ participants: [participant(ME), participant(ALICE)] }), incoming: null }
    const { state: next, effects } = reduceCallsUpdated(state, session({ participants: [participant(ALICE)] }), ME)
    expect(next.phase).toBe('idle')
    expect(effects).toEqual([{ type: 'ended', reason: 'removed' }])
  })

  it('keeps reconnecting peers wired (does not drop their connection)', () => {
    const state: CallSessionState = { phase: 'in_call', call: session({ capacity: 4 }), incoming: null }
    const updated = session({ capacity: 4, participants: [participant(ME), participant(ALICE, 'reconnecting'), participant(BOB)] })
    const { effects } = reduceCallsUpdated(state, updated, ME)
    expect(effects).toContainEqual({ type: 'peers', userIds: [ALICE, BOB] })
  })
})

describe('reduceCallsUpdated — ring + multi-tab', () => {
  it('dismisses the ring when the caller cancels', () => {
    const state: CallSessionState = { phase: 'incoming', call: null, incoming: incomingPayload() }
    const { state: next, effects } = reduceCallsUpdated(state, session({ status: 'ended' }), ME)
    expect(next.phase).toBe('idle')
    expect(next.incoming).toBeNull()
    expect(effects).toEqual([{ type: 'dismiss_incoming' }])
  })

  it('dismisses the ring and marks in_call_elsewhere when another tab accepted', () => {
    const state: CallSessionState = { phase: 'incoming', call: null, incoming: incomingPayload() }
    const updated = session({ participants: [participant(ALICE), participant(ME)] })
    const { state: next, effects } = reduceCallsUpdated(state, updated, ME)
    expect(next.phase).toBe('in_call_elsewhere')
    expect(next.call?.id).toBe('call1')
    expect(effects).toEqual([{ type: 'dismiss_incoming' }])
  })

  it('shows in_call_elsewhere on an idle tab when another tab of ours is a participant', () => {
    const { state: next } = reduceCallsUpdated(idle, session({ participants: [participant(ME), participant(ALICE)] }), ME)
    expect(next.phase).toBe('in_call_elsewhere')
  })

  it('returns to idle from in_call_elsewhere when that call ends or we leave it', () => {
    const elsewhere: CallSessionState = { phase: 'in_call_elsewhere', call: session(), incoming: null }
    expect(reduceCallsUpdated(elsewhere, session({ status: 'ended' }), ME).state.phase).toBe('idle')
    expect(reduceCallsUpdated(elsewhere, session({ participants: [participant(ALICE)] }), ME).state.phase).toBe('idle')
  })

  it('ignores updates for our own start/join while the ack is in flight', () => {
    const joining: CallSessionState = { phase: 'joining', call: null, incoming: null }
    const result = reduceCallsUpdated(joining, session({ participants: [participant(ME)] }), ME)
    expect(result.state).toBe(joining)
    expect(result.effects).toEqual([])
  })

  it('ignores unrelated calls entirely', () => {
    const busy: CallSessionState = { phase: 'in_call', call: session({ id: 'mine' }), incoming: null }
    const result = reduceCallsUpdated(busy, session({ id: 'theirs', participants: [participant(ALICE)] }), ME)
    expect(result.state).toBe(busy)
  })
})

describe('remotePeerIds', () => {
  it('excludes self and preserves order', () => {
    expect(remotePeerIds(session({ participants: [participant(BOB), participant(ME), participant(ALICE)] }), ME)).toEqual([BOB, ALICE])
  })
})
