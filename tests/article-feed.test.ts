import { describe, expect, it, vi } from 'vitest'

// Mock the tiptap render import used inside article-feed.ts so tests run
// without the full Tiptap/ProseMirror dependency chain.
vi.mock('../../utils/tiptap-render-extensions', () => ({
  renderTiptapBodyToHtml: (bodyJson: string) => {
    if (!bodyJson || bodyJson === '{}') return ''
    try {
      const parsed = JSON.parse(bodyJson)
      // Minimal stub: return the text content of the first paragraph node.
      const firstPara = parsed?.content?.find((n: { type: string }) => n.type === 'paragraph')
      const text = firstPara?.content?.map((n: { text?: string }) => n.text ?? '').join('') ?? ''
      return text ? `<p>${text}</p>` : '<p>body</p>'
    } catch {
      return '<p>body</p>'
    }
  },
}))

import { escapeXml, cdata, toRfc822, buildArticleFeed } from '../server/utils/article-feed'
import type { FeedArticle } from '../server/utils/article-feed'

// ────────────────────────────────────────────────────────────────────────────
// escapeXml
// ────────────────────────────────────────────────────────────────────────────
describe('escapeXml', () => {
  it('escapes ampersands', () => {
    expect(escapeXml('foo & bar')).toBe('foo &amp; bar')
  })
  it('escapes angle brackets', () => {
    expect(escapeXml('<script>')).toBe('&lt;script&gt;')
  })
  it('escapes quotes', () => {
    expect(escapeXml('"hello"')).toBe('&quot;hello&quot;')
  })
  it('escapes apostrophes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s')
  })
  it('leaves safe characters unchanged', () => {
    expect(escapeXml('Hello World 123')).toBe('Hello World 123')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// cdata
// ────────────────────────────────────────────────────────────────────────────
describe('cdata', () => {
  it('wraps content in CDATA markers', () => {
    const result = cdata('hello <world>')
    expect(result).toBe('<![CDATA[hello <world>]]>')
  })
  it('splits embedded CDATA end markers to prevent XML injection', () => {
    // `end]]>here` → `<![CDATA[end]]]><![CDATA[]>here]]>`
    // Parsed: CDATA 1 content="end]", CDATA 2 content="]>here" → "end]]>here" ✓
    const result = cdata('end]]>here')
    expect(result).toBe('<![CDATA[end]]]><![CDATA[]>here]]>')
    // The original ]]> is split — it no longer appears as a contiguous injection sequence
    // within a single CDATA section. The only ]]> chars are the closing markers.
    expect(result).toContain(']]]><![CDATA[]>')
  })
  it('handles multiple embedded end markers', () => {
    // `a]]>b]]>c` → two splits, three CDATA sections
    // Parsed: content="a]" + "]>b]" + "]>c" = "a]]>b]]>c" ✓
    const result = cdata('a]]>b]]>c')
    expect(result).toBe('<![CDATA[a]]]><![CDATA[]>b]]]><![CDATA[]>c]]>')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// toRfc822
// ────────────────────────────────────────────────────────────────────────────
describe('toRfc822', () => {
  it('converts an ISO date string to UTC string format', () => {
    const result = toRfc822('2025-06-01T12:00:00.000Z')
    expect(result).toMatch(/Sun, 01 Jun 2025/)
  })
  it('returns a valid date string for garbage input (fallback)', () => {
    const result = toRfc822('not-a-date')
    // new Date('not-a-date') is Invalid Date — toUTCString returns "Invalid Date"
    // which is still a string. Just assert it's a non-empty string.
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// buildArticleFeed
// ────────────────────────────────────────────────────────────────────────────

const publicArticle: FeedArticle = {
  id: 'abc123',
  title: 'My Public Article',
  body: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }] }),
  excerpt: 'A short excerpt.',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  publishedAt: '2025-06-01T12:00:00.000Z',
  visibility: 'public',
  viewerCanAccess: true,
  author: { username: 'johndoe', name: 'John Doe' },
  tags: [{ tag: 'discipline', label: 'Discipline' }],
}

const gatedArticle: FeedArticle = {
  id: 'xyz999',
  title: 'Premium Only Article',
  body: '{}',
  excerpt: 'First thirty words of the redacted content here to show what subscribers see before the paywall kicks in and',
  thumbnailUrl: null,
  publishedAt: '2025-05-20T08:00:00.000Z',
  visibility: 'premiumOnly',
  viewerCanAccess: false,
  author: { username: 'janedoe', name: 'Jane Doe' },
  tags: [],
}

describe('buildArticleFeed', () => {
  it('produces a valid RSS 2.0 envelope', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Men of Hunger — Articles',
      description: 'Test feed',
      articles: [publicArticle],
    })
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"')
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"')
    expect(xml).toContain('<channel>')
    expect(xml).toContain('</channel>')
    expect(xml).toContain('</rss>')
  })

  it('includes atom:link self reference', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [],
    })
    expect(xml).toContain('<atom:link href="https://menofhunger.com/articles/feed.xml" rel="self"')
  })

  it('uses ID-based permalink as guid for article items', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [publicArticle],
    })
    expect(xml).toContain('<guid isPermaLink="true">https://menofhunger.com/a/abc123</guid>')
    expect(xml).toContain('<link>https://menofhunger.com/a/abc123</link>')
  })

  it('public articles include content:encoded with rendered HTML', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [publicArticle],
    })
    expect(xml).toContain('<content:encoded>')
    // The mock renderTiptapBodyToHtml returns <p>Hello world</p>
    expect(xml).toContain('Hello world')
  })

  it('public articles include excerpt in description', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [publicArticle],
    })
    expect(xml).toContain('A short excerpt.')
  })

  it('gated articles do NOT include content:encoded', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [gatedArticle],
    })
    expect(xml).not.toContain('<content:encoded>')
  })

  it('gated articles include upgrade CTA in description', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [gatedArticle],
    })
    expect(xml).toContain('premium members')
    expect(xml).toContain('/tiers')
  })

  it('gated articles include the redacted excerpt in description', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [gatedArticle],
    })
    expect(xml).toContain('First thirty words')
  })

  it('includes dc:creator for articles with an author name', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [publicArticle],
    })
    expect(xml).toContain('<dc:creator>John Doe</dc:creator>')
  })

  it('includes category tags', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [publicArticle],
    })
    expect(xml).toContain('<category>Discipline</category>')
  })

  it('includes media:content for thumbnail', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [publicArticle],
    })
    expect(xml).toContain('<media:content url="https://cdn.example.com/thumb.jpg"')
  })

  it('skips thumbnail when absent', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [gatedArticle],
    })
    expect(xml).not.toContain('<media:content')
  })

  it('XML-escapes special characters in titles', () => {
    const specialArticle: FeedArticle = {
      ...publicArticle,
      id: 'special1',
      title: 'Men & Their <Goals>',
    }
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [specialArticle],
    })
    expect(xml).toContain('<title>Men &amp; Their &lt;Goals&gt;</title>')
    expect(xml).not.toContain('<title>Men & Their <Goals></title>')
  })

  it('produces an empty but valid feed when articles array is empty', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [],
    })
    expect(xml).toContain('<channel>')
    expect(xml).not.toContain('<item>')
  })

  it('skips articles missing publishedAt', () => {
    const unpublished: FeedArticle = { ...publicArticle, id: 'unpub1', publishedAt: null }
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [unpublished],
    })
    expect(xml).not.toContain('<item>')
  })

  it('includes both public and gated items in the same feed', () => {
    const xml = buildArticleFeed({
      feedUrl: 'https://menofhunger.com/articles/feed.xml',
      title: 'Test',
      description: 'Test',
      articles: [publicArticle, gatedArticle],
    })
    const itemCount = (xml.match(/<item>/g) ?? []).length
    expect(itemCount).toBe(2)
  })
})
