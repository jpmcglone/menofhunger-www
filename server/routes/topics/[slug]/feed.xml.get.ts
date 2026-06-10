/**
 * Per-Topic Articles RSS Feed — GET /topics/:slug/feed.xml
 */
import { buildArticleFeed } from '../../../utils/article-feed'
import type { FeedArticle } from '../../../utils/article-feed'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  if (!slug) { setResponseStatus(event, 404); return 'Not found' }

  const site = getRequestURL(event).origin
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'
  const s = encodeURIComponent(slug)

  let articles: FeedArticle[] = []
  try {
    const res = await $fetch<{ data: FeedArticle[] }>(`${apiBase}/articles`, {
      query: { tag: slug, limit: 50, sort: 'new', includeRestricted: true },
      timeout: 10_000,
    })
    articles = Array.isArray(res?.data) ? res.data : []
  } catch { /* return empty feed on API failure */ }

  const label = articles[0]?.tags?.find((t) => t.tag === slug)?.label ?? slug

  const xml = buildArticleFeed({
    feedUrl: `${site}/topics/${s}/feed.xml`,
    alternateUrl: `${site}/topics/${s}`,
    title: `${label} — Articles on Men of Hunger`,
    description: `Articles about ${label} on Men of Hunger.`,
    siteUrl: site,
    articles,
  })

  setResponseHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex')
  return xml
})
