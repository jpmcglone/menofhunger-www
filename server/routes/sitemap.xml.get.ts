/**
 * Sitemap Index — GET /sitemap.xml
 *
 * Points search engines to the three sub-sitemaps:
 *  • /sitemap-pages.xml    — static marketing + listing pages
 *  • /sitemap-articles.xml — all public articles (with image entries)
 *  • /sitemap-profiles.xml — top user profile pages
 */
export default defineEventHandler((event) => {
  const SITE_URL = 'https://menofhunger.com'
  const now = new Date().toISOString().slice(0, 10)

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entry(`${SITE_URL}/sitemap-pages.xml`, now),
    entry(`${SITE_URL}/sitemap-articles.xml`, now),
    entry(`${SITE_URL}/sitemap-profiles.xml`, now),
    '</sitemapindex>',
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return xml
})

function entry(loc: string, lastmod: string) {
  return `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`
}
