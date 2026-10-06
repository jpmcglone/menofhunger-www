/**
 * Groups Sitemap — GET /sitemap-groups.xml
 *
 * Public group landing pages (/g/:slug). Channel content is never listed.
 */
import { escapeSitemapXml as escapeXml } from '../../utils/sitemap'

const SITE_URL = 'https://menofhunger.com'

type GroupRow = { slug?: string | null; name?: string | null; avatarImageUrl?: string | null; coverImageUrl?: string | null; joinPolicy?: string | null }
type Page = { data?: GroupRow[]; pagination?: { nextCursor?: string | null } }

function urlEntry(group: GroupRow): string {
  const slug = (group.slug ?? '').trim()
  if (!slug) return ''
  const lines = ['  <url>', `    <loc>${SITE_URL}/g/${encodeURIComponent(slug)}</loc>`, '    <changefreq>daily</changefreq>', `    <priority>${group.joinPolicy === 'open' ? '0.7' : '0.5'}</priority>`]
  const image = (group.coverImageUrl || group.avatarImageUrl || '').trim()
  if (image) lines.push('    <image:image>', `      <image:loc>${escapeXml(image)}</image:loc>`, `      <image:title>${escapeXml((group.name ?? slug).trim())}</image:title>`, '    </image:image>')
  lines.push('  </url>')
  return lines.join('\n')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'
  const groups = new Map<string, GroupRow>()
  try {
    let cursor: string | undefined
    for (let page = 0; page < 20; page++) {
      const res = await $fetch<Page>(`${apiBase}/groups/explore`, { query: { limit: 60, cursor }, timeout: 8_000 })
      if (!Array.isArray(res?.data)) throw new Error('Invalid group sitemap response')
      for (const group of res.data) if (group.slug) groups.set(group.slug, group)
      cursor = res.pagination?.nextCursor ?? undefined
      if (!cursor) break
    }
  } catch {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    throw createError({ statusCode: 503, statusMessage: 'Group sitemap temporarily unavailable' })
  }
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...[...groups.values()].map(urlEntry).filter(Boolean),
    '</urlset>',
  ].join('\n')
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return xml
})
