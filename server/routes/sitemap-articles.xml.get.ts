/**
 * Articles Sitemap — GET /sitemap-articles.xml
 *
 * All public articles with image:image entries so Google can surface them
 * in Google Discover and image search as well as web search.
 *
 * Uses the image sitemap extension:
 * https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */
const SITE_URL = 'https://menofhunger.com'

import { escapeSitemapXml as escapeXml, loadSitemapArticles, sitemapDate, type SitemapArticle as ArticleRow, type SitemapArticlePage } from '../../utils/sitemap'

function urlEntry(article: ArticleRow): string {
  const lastmod = sitemapDate(article.editedAt ?? article.publishedAt ?? article.createdAt)
  const loc = `${SITE_URL}/a/${encodeURIComponent(article.id)}`
  const thumb = (article.thumbnailUrl ?? '').trim()
  const title = escapeXml((article.title ?? '').trim())

  const lines = [
    `  <url>`,
    `    <loc>${loc}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    `    <changefreq>weekly</changefreq>`,
    `    <priority>0.8</priority>`,
  ]

  if (thumb) {
    const authorLabel = (article.author?.name ?? article.author?.username ?? '').trim()
    lines.push(`    <image:image>`)
    lines.push(`      <image:loc>${escapeXml(thumb)}</image:loc>`)
    if (title) lines.push(`      <image:title>${title}</image:title>`)
    if (authorLabel) lines.push(`      <image:caption>${escapeXml(authorLabel)}</image:caption>`)
    lines.push(`    </image:image>`)
  }

  lines.push(`  </url>`)
  return lines.join('\n')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'

  let articles: ArticleRow[] = []
  try {
    articles = await loadSitemapArticles((cursor) => $fetch<SitemapArticlePage>(`${apiBase}/articles`, {
      query: { limit: 50, sort: 'new', visibility: 'public', cursor },
      timeout: 10_000,
    }))
  } catch {
    // A transient API failure must not advertise that all article URLs disappeared.
    setResponseHeader(event, 'Cache-Control', 'no-store')
    throw createError({ statusCode: 503, statusMessage: 'Article sitemap temporarily unavailable' })
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset',
    '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...articles.map((a) => urlEntry(a)),
    '</urlset>',
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  // Fresh content: 1-hour CDN cache, 24-hour stale-while-revalidate.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return xml
})
