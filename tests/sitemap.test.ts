import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { escapeSitemapXml, loadSitemapArticles, sitemapDate } from '../utils/sitemap'

mockNuxtImport('useRuntimeConfig', () => () => ({ apiBaseUrl: 'https://api.example/v1' }))

const publicArticle = { id: 'article-1', title: 'One', visibility: 'public' }

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

describe('public sitemap discovery', () => {
  it('follows cursors, deduplicates, and never emits restricted articles', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({
      data: [publicArticle, { id: 'private', visibility: 'premiumOnly' }], pagination: { nextCursor: 'page-2' },
    }).mockResolvedValueOnce({ data: [publicArticle, { ...publicArticle, id: 'article-2' }], pagination: { nextCursor: null } })
    expect((await loadSitemapArticles(fetchPage)).map((row) => row.id)).toEqual(['article-1', 'article-2'])
    expect(fetchPage.mock.calls).toEqual([[undefined], ['page-2']])
  })

  it('fails safely when pagination repeats or the API fails', async () => {
    await expect(loadSitemapArticles(async () => ({ data: [], pagination: { nextCursor: 'same' } }))).rejects.toThrow('did not advance')
    await expect(loadSitemapArticles(async () => { throw new Error('Unavailable') })).rejects.toThrow('Unavailable')
  })

  it('escapes XML and only uses real valid modification dates', () => {
    expect(escapeSitemapXml('a&b<"c">')).toBe('a&amp;b&lt;&quot;c&quot;&gt;')
    expect(sitemapDate(null)).toBeNull()
    expect(sitemapDate('invalid')).toBeNull()
    expect(sitemapDate('2026-09-06')).toBe('2026-09-06T00:00:00.000Z')
  })

  it('requests supported public article parameters and returns a retryable error on upstream failure', async () => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    const headers = vi.fn()
    vi.stubGlobal('setResponseHeader', headers)
    vi.stubGlobal('createError', (error: unknown) => error)
    const fetch = vi.fn().mockResolvedValue({ data: [publicArticle] })
    vi.stubGlobal('$fetch', fetch)
    const handler = (await import('../server/routes/sitemap-articles.xml.get')).default
    expect(await handler({} as never)).toContain('/a/article-1')
    expect(fetch).toHaveBeenCalledWith('https://api.example/v1/articles', {
      query: { limit: 50, sort: 'new', visibility: 'public', cursor: undefined }, timeout: 10_000,
    })
    fetch.mockRejectedValue(new Error('Temporary outage'))
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 503 })
    expect(headers).toHaveBeenCalledWith({}, 'Cache-Control', 'no-store')
  })

  it('requests the supported profile page size and fails safely instead of publishing an empty sitemap', async () => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    const headers = vi.fn()
    vi.stubGlobal('setResponseHeader', headers)
    vi.stubGlobal('createError', (error: unknown) => error)
    const fetch = vi.fn().mockResolvedValue({ data: [{ username: 'john' }] })
    vi.stubGlobal('$fetch', fetch)
    const handler = (await import('../server/routes/sitemap-profiles.xml.get')).default
    const xml = await handler({} as never)
    expect(xml).toContain('/u/john')
    expect(xml).not.toContain('<lastmod>')
    expect(fetch).toHaveBeenCalledWith('https://api.example/v1/follows/top-users', { query: { limit: 50 }, timeout: 8_000 })
    fetch.mockResolvedValue({ error: 'Malformed upstream response' })
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 503 })
    fetch.mockRejectedValue(new Error('Temporary outage'))
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 503 })
    expect(headers).toHaveBeenCalledWith({}, 'Cache-Control', 'no-store')
  })
})
