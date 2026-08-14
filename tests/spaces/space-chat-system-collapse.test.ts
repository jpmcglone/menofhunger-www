import { describe, expect, it } from 'vitest'
import type { SpaceChatMessage } from '~/types/api'
import {
  collapseAdjacentSpaceChatSystemMessages,
  spaceChatSystemBody,
} from '~/utils/space-chat-system-collapse'

function sys(
  id: string,
  userId: string,
  firstEvent: 'join' | 'leave',
  lastEvent: 'join' | 'leave' = firstEvent,
  username = 'notjohn',
): SpaceChatMessage {
  return {
    id,
    spaceId: 'space-1',
    kind: 'system',
    system: { firstEvent, lastEvent, userId, username },
    body: spaceChatSystemBody(firstEvent, lastEvent, `@${username}`),
    createdAt: `2026-08-14T13:00:0${id}.000Z`,
    sender: null,
  }
}

function userMsg(id: string): SpaceChatMessage {
  return {
    id,
    spaceId: 'space-1',
    kind: 'user',
    body: 'hello',
    createdAt: `2026-08-14T13:00:0${id}.000Z`,
    sender: {
      id: 'u-notjohn',
      username: 'notjohn',
      premium: false,
      premiumPlus: false,
      isOrganization: false,
      verifiedStatus: 'none',
      stewardBadgeEnabled: true,
    },
  }
}

describe('collapseAdjacentSpaceChatSystemMessages', () => {
  it('merges leave then join for the same person into left and joined', () => {
    const out = collapseAdjacentSpaceChatSystemMessages([
      sys('1', 'u-john', 'join', 'join', 'john'),
      userMsg('2'),
      sys('3', 'u-notjohn', 'leave'),
      sys('4', 'u-notjohn', 'join'),
    ])
    expect(out.map((m) => m.body)).toEqual([
      '@john has joined the chat',
      'hello',
      '@notjohn has left and joined the chat',
    ])
    expect(out[2]).toMatchObject({
      kind: 'system',
      system: { firstEvent: 'leave', lastEvent: 'join', userId: 'u-notjohn' },
    })
  })

  it('keeps only the last verb when first and last match', () => {
    const out = collapseAdjacentSpaceChatSystemMessages([
      sys('1', 'u-notjohn', 'join'),
      sys('2', 'u-notjohn', 'join'),
    ])
    expect(out).toHaveLength(1)
    expect(out[0]?.body).toBe('@notjohn has joined the chat')
  })

  it('does not merge system lines for different people', () => {
    const out = collapseAdjacentSpaceChatSystemMessages([
      sys('1', 'u-john', 'leave', 'leave', 'john'),
      sys('2', 'u-notjohn', 'join'),
    ])
    expect(out.map((m) => m.body)).toEqual([
      '@john has left the chat',
      '@notjohn has joined the chat',
    ])
  })

  it('collapses a join/leave/join run to just joined (first and last match)', () => {
    const out = collapseAdjacentSpaceChatSystemMessages([
      sys('1', 'u-notjohn', 'join'),
      sys('2', 'u-notjohn', 'leave'),
      sys('3', 'u-notjohn', 'join'),
    ])
    expect(out).toHaveLength(1)
    expect(out[0]?.body).toBe('@notjohn has joined the chat')
  })

  it('does not merge across a user message', () => {
    const out = collapseAdjacentSpaceChatSystemMessages([
      sys('1', 'u-notjohn', 'join'),
      userMsg('2'),
      sys('3', 'u-notjohn', 'leave'),
    ])
    expect(out.map((m) => m.body)).toEqual([
      '@notjohn has joined the chat',
      'hello',
      '@notjohn has left the chat',
    ])
  })

  it('treats join-then-leave after they already chatted as a leave', () => {
    const out = collapseAdjacentSpaceChatSystemMessages([
      userMsg('1'),
      sys('2', 'u-notjohn', 'join'),
      sys('3', 'u-notjohn', 'leave'),
    ])
    expect(out.map((m) => m.body)).toEqual([
      'hello',
      '@notjohn has left the chat',
    ])
    expect(out[1]).toMatchObject({
      kind: 'system',
      system: { firstEvent: 'leave', lastEvent: 'leave', userId: 'u-notjohn' },
    })
  })

  it('rewrites a single joined-and-left payload after they already chatted', () => {
    const out = collapseAdjacentSpaceChatSystemMessages([
      userMsg('1'),
      sys('2', 'u-notjohn', 'join', 'leave'),
    ])
    expect(out.map((m) => m.body)).toEqual([
      'hello',
      '@notjohn has left the chat',
    ])
  })

  it('drops a reconnect join when they never left', () => {
    const out = collapseAdjacentSpaceChatSystemMessages([
      userMsg('1'),
      sys('2', 'u-notjohn', 'join'),
    ])
    expect(out.map((m) => m.body)).toEqual(['hello'])
  })

  it('still shows joined and left for a bounce with no prior presence', () => {
    const out = collapseAdjacentSpaceChatSystemMessages([
      sys('1', 'u-notjohn', 'join'),
      sys('2', 'u-notjohn', 'leave'),
    ])
    expect(out.map((m) => m.body)).toEqual(['@notjohn has joined and left the chat'])
  })
})
