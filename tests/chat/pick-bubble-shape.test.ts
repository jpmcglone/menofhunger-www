import { describe, expect, it } from 'vitest'
import type { Message } from '~/types/api'
import {
  PILL_MAX_EMS,
  PILL_MAX_EMS_WITH_META,
  estimateTextEms,
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
    } as unknown as Message['sender'],
    kind: 'text',
    call: null,
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

  it('returns "pill" for a body that lands right under the width budget', () => {
    const body = 'a'.repeat(Math.floor(PILL_MAX_EMS / estimateTextEms('a')))
    expect(estimateTextEms(body)).toBeLessThanOrEqual(PILL_MAX_EMS)
    expect(pickBubbleShape(makeMessage({ body }))).toBe('pill')
  })

  it('returns "rect" once the body crosses the width budget', () => {
    const body = 'a'.repeat(Math.ceil(PILL_MAX_EMS / estimateTextEms('a')) + 1)
    expect(estimateTextEms(body)).toBeGreaterThan(PILL_MAX_EMS)
    expect(pickBubbleShape(makeMessage({ body }))).toBe('rect')
  })

  it('measures width, not length — wide glyphs lose the pill sooner than narrow ones', () => {
    // Same character count, very different rendered width.
    const narrow = 'l'.repeat(36)
    const wide = 'W'.repeat(36)
    expect(pickBubbleShape(makeMessage({ body: narrow }))).toBe('pill')
    expect(pickBubbleShape(makeMessage({ body: wide }))).toBe('rect')
  })

  it('returns "rect" for any message containing a newline', () => {
    expect(pickBubbleShape(makeMessage({ body: 'line one\nline two' }))).toBe('rect')
  })

  it('returns "pill" for a short caption even when media or a reply sit beside it', () => {
    const replyTo = {
      id: 'm0',
      bodyPreview: 'parent',
      senderUsername: 'bob',
      mediaThumbnailUrl: null,
    } as unknown as Message['replyTo']
    const media = [{ id: 'media-1', kind: 'image' as const, url: 'x' }] as unknown as Message['media']
    expect(pickBubbleShape(makeMessage({ body: 'Come on video', media }))).toBe('pill')
    expect(pickBubbleShape(makeMessage({ body: 'short', replyTo }))).toBe('pill')
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

  it('returns "rect" for a scheme-less www host that still unfurls a preview', () => {
    expect(pickBubbleShape(makeMessage({ body: 'Test www.google.com' }))).toBe('rect')
    expect(pickBubbleShape(makeMessage({ body: 'Test www.menofhunger.com' }))).toBe('rect')
  })
})

describe('bubbleShapeClass', () => {
  it('emits the pill class for a short single-line message', () => {
    const cls = bubbleShapeClass(makeMessage({ body: 'hey' }))
    expect(cls).toContain('rounded-full')
    expect(cls).toContain('w-fit')
  })

  it('emits the rect class for a multi-line message', () => {
    const cls = bubbleShapeClass(makeMessage({ body: 'line one\nline two' }))
    expect(cls).toContain('rounded-2xl')
  })

  it('emits the rect class for a scheme-less www host with a preview card', () => {
    const cls = bubbleShapeClass(makeMessage({ body: 'Test www.google.com' }))
    expect(cls).toContain('rounded-2xl')
    expect(cls).not.toContain('rounded-full')
  })
})

describe('estimateTextEms', () => {
  it('orders glyphs by rendered width rather than counting them', () => {
    expect(estimateTextEms('lllll')).toBeLessThan(estimateTextEms('aaaaa'))
    expect(estimateTextEms('aaaaa')).toBeLessThan(estimateTextEms('WWWWW'))
  })

  it('keeps the pill for a single-line message that a raw 28-char cap rejected', () => {
    // ChatMessageListRow applies PILL_MAX_EMS_WITH_META when the timestamp is
    // rendered inline. This body is 29 characters, so the old length cap
    // dropped it to a rect even though it renders comfortably on one line.
    const body = 'btw group chats work here too'
    expect(body.length).toBeGreaterThan(28)
    expect(pickBubbleShape(makeMessage({ body }))).toBe('pill')
    expect(estimateTextEms(body)).toBeLessThanOrEqual(PILL_MAX_EMS_WITH_META)
  })

  it('still denies the pill to a same-length body made of wide glyphs', () => {
    const body = 'MMM WWWWW MMMMM WWWW MMMM WWW'
    expect(body.length).toBe(29)
    expect(estimateTextEms(body)).toBeGreaterThan(PILL_MAX_EMS_WITH_META)
  })
})
