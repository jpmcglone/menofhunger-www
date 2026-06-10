/**
 * Global Articles RSS Feed — GET /articles/feed.xml
 * Autodiscovered via <link rel="alternate"> in nuxt.config.ts.
 */
import { buildArticleFeed } from '../../../server/utils/article-feed'
import type { FeedArticle } from '../../../server/utils/article-feed'

export default defineEventHandler(async (event) => {
  const site = getRequestURL(event).origin
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'

  let articles: FeedArticle[] = []
  try {
    const res = await $fetch<{ data: FeedArticle[] }>(`${apiBase}/articles`, {
      query: { limit: 50, sort: 'new', includeRestricted: true },
      timeout: 10_000,
    })
    articles = Array.isArray(res?.data) ? res.data : []
  } catch { /* return empty feed on API failure */ }

  const xml = buildArticleFeed({
    feedUrl: `${site}/articles/feed.xml`,
    alternateUrl: `${site}/articles`,
    title: 'Men of Hunger — Articles',
    description: 'Articles from Men of Hunger — a trusted community for men who want measurable progress in life.',
    siteUrl: site,
    articles,
  })

  setResponseHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex')
  return xml
})
