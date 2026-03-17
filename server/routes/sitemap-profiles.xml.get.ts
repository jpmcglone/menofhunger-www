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

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry(user: UserRow, today: string): string {
  const username = (user.username ?? '').trim()
  if (!username) return ''
  const loc = `${SITE_URL}/u/${encodeURIComponent(username)}`
  const lastmod = (user.createdAt ?? today).slice(0, 10)

  const lines = [
    `  <url>`,
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
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
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001'

  let users: UserRow[] = []
  try {
    // Top-users endpoint returns the most-followed members — ideal for profile discovery.
    const res = await $fetch<{ data: UserRow[] } | UserRow[]>(`${apiBase}/follows/top-users`, {
      query: { limit: 500 },
      timeout: 8_000,
    })
    const rows = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : [])
    users = rows.filter((u: UserRow) => u?.username)
  } catch {
    // Return valid empty sitemap on API failure.
  }

  const today = new Date().toISOString().slice(0, 10)

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset',
    '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...users.map((u) => urlEntry(u, today)).filter(Boolean),
    '</urlset>',
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  // Profiles change less often; 6-hour CDN cache.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400')
  return xml
})
