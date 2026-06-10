/**
 * Global Articles JSON Feed — GET /articles/feed.json
 * Autodiscovered via <link rel="alternate" type="application/feed+json"> in nuxt.config.ts.
 */
import { buildArticleJsonFeed } from '../../../server/utils/article-feed'
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

  const json = buildArticleJsonFeed({
    feedUrl: `${site}/articles/feed.json`,
    homePageUrl: `${site}/articles`,
    title: 'Men of Hunger — Articles',
    description: 'Articles from Men of Hunger — a trusted community for men who want measurable progress in life.',
    siteUrl: site,
    articles,
  })

  setResponseHeader(event, 'Content-Type', 'application/feed+json; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex')
  return json
})
