import { describe, expect, it } from 'vitest'
import type { Message } from '~/types/api'
import {
  PILL_MAX_CHARS,
  pickBubbleShape,
  bubbleShapeClass,
} from '~/composables/chat/useChatBubbleShape'

/**
 * `pickBubbleShape` is a pure function that decides whether a chat bubble
 * gets the tighter "pill" shape or the roomier "rect" shape. The tests below
 * cover one branch each — keep them branch-focused so a regression points
 * straight at the broken rule.
 */

function makeMessage(override: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    createdAt: '2026-01-01T00:00:00.000Z',
    body: 'hi',
    conversationId: 'c1',
    sender: {
      id: 'u1',
      username: 'alice',
      displayName: 'Alice',
      avatar: null,
      verifiedStatus: 'none',
      premium: false,
      premiumPlus: false,
      isOrganization: false,
      stewardBadgeEnabled: false,
    } as unknown as Message['sender'],
    reactions: [],
    deletedForMe: false,
    deletedForAll: false,
    editedAt: null,
    replyTo: null,
    media: [],
    ...override,
  }
}

describe('pickBubbleShape', () => {
  it('returns "pill" for a short single-line text message', () => {
    expect(pickBubbleShape(makeMessage({ body: 'hey there' }))).toBe('pill')
  })

  it('returns "pill" at the boundary length (PILL_MAX_CHARS chars exactly)', () => {
    const body = 'a'.repeat(PILL_MAX_CHARS)
    expect(pickBubbleShape(makeMessage({ body }))).toBe('pill')
  })

  it('returns "rect" one character past the pill boundary', () => {
    const body = 'a'.repeat(PILL_MAX_CHARS + 1)
    expect(pickBubbleShape(makeMessage({ body }))).toBe('rect')
  })

  it('returns "rect" for any message containing a newline', () => {
    expect(pickBubbleShape(makeMessage({ body: 'line one\nline two' }))).toBe('rect')
  })

  it('returns "rect" for a message with a reply snippet', () => {
    const replyTo = {
      id: 'm0',
      bodyPreview: 'parent',
      senderUsername: 'bob',
      mediaThumbnailUrl: null,
    } as unknown as Message['replyTo']
    expect(pickBubbleShape(makeMessage({ body: 'short', replyTo }))).toBe('rect')
  })

  it('returns "rect" when the message has any media attachment', () => {
    const media = [{ id: 'media-1', kind: 'image' as const, url: 'x' }] as unknown as Message['media']
    expect(pickBubbleShape(makeMessage({ body: 'short', media }))).toBe('rect')
  })

  it('returns "rect" for a tombstone (deleted for me)', () => {
    expect(pickBubbleShape(makeMessage({ body: 'short', deletedForMe: true }))).toBe('rect')
  })

  it('returns "rect" for a tombstone (deleted for all)', () => {
    expect(pickBubbleShape(makeMessage({ body: '', deletedForAll: true }))).toBe('rect')
  })

  it('returns "rect" for an empty / whitespace-only body', () => {
    expect(pickBubbleShape(makeMessage({ body: '   ' }))).toBe('rect')
    expect(pickBubbleShape(makeMessage({ body: '' }))).toBe('rect')
  })

  it('returns "rect" for a message containing a URL (will render a link preview card)', () => {
    expect(pickBubbleShape(makeMessage({ body: 'https://fandemicapp.com/ < this link' }))).toBe('rect')
    expect(pickBubbleShape(makeMessage({ body: 'http://example.com' }))).toBe('rect')
    // Short URL-only message — still rect because the preview card makes it tall
    expect(pickBubbleShape(makeMessage({ body: 'https://x.co' }))).toBe('rect')
  })
})

describe('bubbleShapeClass', () => {
  it('emits the pill class for a short single-line message', () => {
    const cls = bubbleShapeClass(makeMessage({ body: 'hey' }))
    expect(cls).toContain('rounded-full')
  })

  it('emits the rect class for a multi-line message', () => {
    const cls = bubbleShapeClass(makeMessage({ body: 'line one\nline two' }))
    expect(cls).toContain('rounded-2xl')
  })
})
