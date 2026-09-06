/**
 * Profiles Sitemap — GET /sitemap-profiles.xml
 *
 * Top user profiles so Googlebot can discover member pages, building
 * indexed depth for the community and E-E-A-T signals for the site.
 */
const SITE_URL = 'https://menofhunger.com'

type UserRow = {
  username?: string | null
  name?: string | null
  avatarUrl?: string | null
  createdAt?: string | null
}

import { escapeSitemapXml as escapeXml } from '../../utils/sitemap'

function urlEntry(user: UserRow): string {
  const username = (user.username ?? '').trim()
  if (!username) return ''
  const loc = `${SITE_URL}/u/${encodeURIComponent(username)}`

  const lines = [
    `  <url>`,
    `    <loc>${loc}</loc>`,
    `    <changefreq>weekly</changefreq>`,
    `    <priority>0.6</priority>`,
  ]

  const avatar = (user.avatarUrl ?? '').trim()
  if (avatar) {
    const label = (user.name ?? username).trim()
    lines.push(`    <image:image>`)
    lines.push(`      <image:loc>${escapeXml(avatar)}</image:loc>`)
    lines.push(`      <image:title>${escapeXml(label)}</image:title>`)
    lines.push(`    </image:image>`)
  }

  lines.push(`  </url>`)
  return lines.join('\n')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'

  let users: UserRow[] = []
  try {
    // Top-users endpoint returns the most-followed members — ideal for profile discovery.
    const res = await $fetch<{ data: UserRow[] } | UserRow[]>(`${apiBase}/follows/top-users`, {
      query: { limit: 50 },
      timeout: 8_000,
    })
    const rows = Array.isArray(res) ? res : res?.data
    if (!Array.isArray(rows)) throw new Error('Invalid profile sitemap response')
    users = rows.filter((u: UserRow) => u?.username)
  } catch {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    throw createError({ statusCode: 503, statusMessage: 'Profile sitemap temporarily unavailable' })
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset',
    '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...users.map((u) => urlEntry(u)).filter(Boolean),
    '</urlset>',
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  // Profiles change less often; 6-hour CDN cache.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400')
  return xml
})
