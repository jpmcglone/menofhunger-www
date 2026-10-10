import { describe, expect, it } from 'vitest'
import { createSoundArrivalGate, notificationSoundFor } from '~/utils/sound-policy'

describe('notification sound families', () => {
  it('keeps DM events separate from the bell, including group conversations', () => {
    expect(notificationSoundFor({ kind: 'message' })).toBeNull()
    expect(notificationSoundFor({ kind: 'message', subjectGroupId: 'g' })).toBeNull()
  })
  it('uses related group activity cues for feed, replies, mentions, and membership', () => {
    for (const kind of ['community_group_post', 'community_group_invite_received', 'group_join_request']) {
      expect(notificationSoundFor({ kind })).toBe('group-activity')
    }
    expect(notificationSoundFor({ kind: 'comment', subjectGroupId: 'g' })).toBe('group-activity')
    expect(notificationSoundFor({ kind: 'mention', post: { communityGroupId: 'g' } })).toBe('group-activity')
    expect(notificationSoundFor({ kind: 'comment' })).toBe('notification')
    expect(notificationSoundFor({ kind: 'crew_member_joined' })).toBe('notification')
  })
  it('prioritizes Board context over other notification subjects', () => {
    expect(notificationSoundFor({ kind: 'comment', boardThreadId: 't', subjectGroupId: 'g' })).toBe('board-activity')
    expect(notificationSoundFor({ kind: 'boost', boardThreadId: 't' })).toBe('board-activity')
    expect(notificationSoundFor({ kind: 'follow' })).toBe('notification')
  })
})

describe('sound arrival gate', () => {
  const now = Date.parse('2026-10-09T12:00:00Z')
  it('announces a fresh event once and drops malformed, future, and backlog events', () => {
    const claim = createSoundArrivalGate()
    expect(claim('n1', new Date(now).toISOString(), now)).toBe(true)
    expect(claim('n1', new Date(now).toISOString(), now)).toBe(false)
    expect(claim('n2', new Date(now - 15_001).toISOString(), now)).toBe(false)
    expect(claim('n3', new Date(now + 5_001).toISOString(), now)).toBe(false)
    expect(claim('n4', 'invalid', now)).toBe(false)
    expect(claim('', new Date(now).toISOString(), now)).toBe(false)
  })
})
