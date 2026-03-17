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

type ArticleRow = {
  id: string
  title: string
  thumbnailUrl?: string | null
  publishedAt?: string | null
  editedAt?: string | null
  createdAt?: string | null
  author?: { name?: string | null; username?: string | null }
  readingTimeMinutes?: number | null
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry(article: ArticleRow, today: string): string {
  const lastmod = (article.editedAt ?? article.publishedAt ?? article.createdAt ?? today).slice(0, 10)
  const loc = `${SITE_URL}/a/${encodeURIComponent(article.id)}`
  const thumb = (article.thumbnailUrl ?? '').trim()
  const title = escapeXml((article.title ?? '').trim())

  const lines = [
    `  <url>`,
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
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
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001'

  let articles: ArticleRow[] = []
  try {
    const res = await $fetch<{ data: ArticleRow[] }>(`${apiBase}/articles`, {
      query: { limit: 5000, sort: 'newest', visibility: 'public' },
      timeout: 10_000,
    })
    articles = Array.isArray(res?.data) ? res.data : []
  } catch {
    // Return a valid but empty sitemap if the API is down — never 500.
  }

  const today = new Date().toISOString().slice(0, 10)

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset',
    '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...articles.map((a) => urlEntry(a, today)),
    '</urlset>',
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  // Fresh content: 1-hour CDN cache, 24-hour stale-while-revalidate.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return xml
})
