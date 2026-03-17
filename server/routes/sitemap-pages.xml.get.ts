/**
 * Static Pages Sitemap — GET /sitemap-pages.xml
 *
 * All public, non-dynamic pages. Higher priority / lower change frequency
 * means Googlebot spends crawl budget on pages that change meaningfully.
 */
const SITE_URL = 'https://menofhunger.com'

const PAGES = [
  { path: '/',              changefreq: 'weekly',  priority: '1.0' },
  { path: '/articles',     changefreq: 'hourly',  priority: '0.9' },
  { path: '/explore',      changefreq: 'hourly',  priority: '0.8' },
  { path: '/leaderboard',  changefreq: 'daily',   priority: '0.7' },
  { path: '/who-to-follow',changefreq: 'daily',   priority: '0.6' },
  { path: '/tiers',        changefreq: 'monthly', priority: '0.6' },
  { path: '/about',        changefreq: 'monthly', priority: '0.6' },
  { path: '/terms',        changefreq: 'yearly',  priority: '0.3' },
  { path: '/privacy',      changefreq: 'yearly',  priority: '0.3' },
]

export default defineEventHandler((event) => {
  const today = new Date().toISOString().slice(0, 10)

  const entries = PAGES.map((p) => urlEntry(`${SITE_URL}${p.path}`, {
    lastmod: today,
    changefreq: p.changefreq,
    priority: p.priority,
  }))

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  return xml
})

function urlEntry(loc: string, opts: { lastmod?: string; changefreq?: string; priority?: string }) {
  const lines = [`  <url>`, `    <loc>${loc}</loc>`]
  if (opts.lastmod)    lines.push(`    <lastmod>${opts.lastmod}</lastmod>`)
  if (opts.changefreq) lines.push(`    <changefreq>${opts.changefreq}</changefreq>`)
  if (opts.priority)   lines.push(`    <priority>${opts.priority}</priority>`)
  lines.push(`  </url>`)
  return lines.join('\n')
}
