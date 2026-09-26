import { describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/tiptap-render-extensions', () => ({
  renderTiptapBodyToHtml: () => '',
}))

import { boardItemHtml, buildBoardFeed, isFeedableBoardThread } from '../server/utils/board-feed'
import type { BoardFeedContext, FeedBoardThread } from '../server/utils/board-feed'

const SITE = 'https://menofhunger.com'

function thread(overrides: Partial<FeedBoardThread> = {}): FeedBoardThread {
  return {
    id: 't1',
    title: 'Why we train <early>',
    url: 'https://example.com/story?a=1&b=2',
    domain: 'example.com',
    tags: ['ask'],
    visibility: 'public',
    viewerCanAccess: true,
    body: 'First line\nsecond line\n\nNew paragraph & more',
    createdAt: '2026-09-26T12:00:00.000Z',
    points: 1,
    commentCount: 3,
    author: { username: 'sam', name: 'Sam Mercer' },
    ...overrides,
  }
}

function ctx(threads: FeedBoardThread[], tag: string | null = null, tagLabel: string | null = null): BoardFeedContext {
  return { site: SITE, tag, tagLabel, threads }
}

describe('isFeedableBoardThread', () => {
  it('keeps only public, readable threads with a date', () => {
    expect(isFeedableBoardThread(thread())).toBe(true)
    expect(isFeedableBoardThread(thread({ visibility: 'verifiedOnly' }))).toBe(false)
    expect(isFeedableBoardThread(thread({ visibility: 'premiumOnly' }))).toBe(false)
    expect(isFeedableBoardThread(thread({ viewerCanAccess: false }))).toBe(false)
    expect(isFeedableBoardThread(thread({ createdAt: null }))).toBe(false)
  })
})

describe('boardItemHtml', () => {
  it('escapes the body, keeps paragraphs, and links the source and the discussion', () => {
    const html = boardItemHtml(thread(), SITE)
    expect(html).toContain('<p>First line<br>second line</p>')
    expect(html).toContain('<p>New paragraph &amp; more</p>')
    expect(html).toContain('Link: <a href="https://example.com/story?a=1&amp;b=2">example.com</a>')
    expect(html).toContain(`<a href="${SITE}/b/t1">Discuss on Men of Hunger</a> · 1 point · 3 comments`)
  })

  it('drops non-http links', () => {
    const html = boardItemHtml(thread({ url: 'javascript:alert(1)' }), SITE)
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('Link:')
  })
})

describe('buildBoardFeed', () => {
  it('RSS items open the discussion and never include gated threads', () => {
    const xml = buildBoardFeed(ctx([thread(), thread({ id: 't2', title: 'Members only', visibility: 'verifiedOnly' })]), 'rss')
    expect(xml).toContain('<title>Board — Men of Hunger</title>')
    expect(xml).toContain(`<atom:link href="${SITE}/b/feed.xml" rel="self"`)
    expect(xml).toContain(`<link>${SITE}/b/t1</link>`)
    expect(xml).toContain(`<comments>${SITE}/b/t1</comments>`)
    expect(xml).toContain('<title>Why we train &lt;early&gt;</title>')
    expect(xml).toContain('<dc:creator>Sam Mercer</dc:creator>')
    expect(xml).toContain('<category>ask</category>')
    expect(xml).not.toContain('Members only')
    expect(xml).not.toContain('/b/t2')
  })

  it('per-tag feeds use the tag label and tag URLs', () => {
    const xml = buildBoardFeed(ctx([thread()], 'ask', 'Ask'), 'rss')
    expect(xml).toContain('<title>Ask — Board on Men of Hunger</title>')
    expect(xml).toContain(`<atom:link href="${SITE}/b/tags/ask/feed.xml" rel="self"`)
    expect(xml).toContain(`<link>${SITE}/b?tags=ask</link>`)
  })

  it('Atom puts the shared link in rel="related"', () => {
    const xml = buildBoardFeed(ctx([thread()]), 'atom')
    expect(xml).toContain(`<link href="${SITE}/b/feed.atom" rel="self"`)
    expect(xml).toContain(`<link href="${SITE}/b/t1" rel="alternate"/>`)
    expect(xml).toContain('<link href="https://example.com/story?a=1&amp;b=2" rel="related"/>')
  })

  it('JSON Feed sets external_url to the shared link', () => {
    const feed = JSON.parse(buildBoardFeed(ctx([thread(), thread({ id: 't3', url: null, domain: null })], 'show'), 'json'))
    expect(feed.feed_url).toBe(`${SITE}/b/tags/show/feed.json`)
    expect(feed.items).toHaveLength(2)
    expect(feed.items[0].url).toBe(`${SITE}/b/t1`)
    expect(feed.items[0].external_url).toBe('https://example.com/story?a=1&b=2')
    expect(feed.items[1].external_url).toBeUndefined()
  })
})
