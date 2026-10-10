// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { CallSession, MessageConversation } from '~/types/api'
import { browserCallState } from '~/utils/browser-call'

const conversation = {
  id: 'conversation', type: 'direct', viewerStatus: 'accepted', participants: [{ user: { id: 'viewer' } }],
} as MessageConversation
const call = {
  id: 'call', conversationId: 'conversation', type: 'video', status: 'active', startedByAdmin: true, endedAt: null,
} as CallSession

describe('browser verification call access', () => {
  it('waits without a call and joins an active or ringing admin video call', () => {
    expect(browserCallState(conversation, null, 'viewer')).toBe('waiting')
    expect(browserCallState(conversation, call, 'viewer')).toBe('ready')
    expect(browserCallState(conversation, { ...call, status: 'ringing' }, 'viewer')).toBe('ready')
    expect(browserCallState(conversation, { ...call, status: 'empty' }, 'viewer')).toBe('waiting')
  })

  it('does not expose a join action for an unauthorized or blocked conversation', () => {
    expect(browserCallState(conversation, call, 'another-viewer')).toBe('unavailable')
    expect(browserCallState({ ...conversation, viewerStatus: 'pending' as MessageConversation['viewerStatus'] }, call, 'viewer')).toBe('unavailable')
    expect(browserCallState({ ...conversation, isBlockedWith: true }, call, 'viewer')).toBe('unavailable')
    expect(browserCallState({ ...conversation, type: 'group' }, call, 'viewer')).toBe('unavailable')
  })

  it('rejects ordinary, audio, and mismatched calls even for a member', () => {
    expect(browserCallState(conversation, { ...call, startedByAdmin: false }, 'viewer')).toBe('unavailable')
    expect(browserCallState(conversation, { ...call, type: 'audio' }, 'viewer')).toBe('unavailable')
    expect(browserCallState(conversation, { ...call, conversationId: 'another' }, 'viewer')).toBe('unavailable')
  })

  it('keeps terminal calls closed', () => {
    expect(browserCallState(conversation, { ...call, status: 'ended' }, 'viewer')).toBe('ended')
    expect(browserCallState(conversation, { ...call, endedAt: '2026-10-10T12:00:00Z' }, 'viewer')).toBe('ended')
  })
})
