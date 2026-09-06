export function escapeSitemapXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export type SitemapArticle = {
  id: string
  title: string
  visibility?: string
  thumbnailUrl?: string | null
  publishedAt?: string | null
  editedAt?: string | null
  createdAt?: string | null
  author?: { name?: string | null; username?: string | null }
}

export type SitemapArticlePage = { data: SitemapArticle[]; pagination?: { nextCursor?: string | null } }

/** Follow the public endpoint's real cursor contract, without sharing viewer cookies. */
export async function loadSitemapArticles(fetchPage: (cursor?: string) => Promise<SitemapArticlePage>): Promise<SitemapArticle[]> {
  const rows = new Map<string, SitemapArticle>()
  const cursors = new Set<string>()
  let cursor: string | undefined
  for (let page = 0; page < 100; page++) {
    const response = await fetchPage(cursor)
    if (!Array.isArray(response.data)) throw new Error('Invalid article sitemap response')
    for (const article of response.data) {
      if (article.id && article.visibility === 'public') rows.set(article.id, article)
    }
    const next = response.pagination?.nextCursor
    if (!next) return [...rows.values()]
    if (cursors.has(next)) throw new Error('Article sitemap cursor did not advance')
    cursors.add(next)
    cursor = next
  }
  throw new Error('Article sitemap requires another sitemap shard')
}

export function sitemapDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}
