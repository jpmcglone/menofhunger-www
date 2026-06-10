/**
 * RSS 2.0 + Atom 1.0 + JSON Feed 1.1 builders for Men of Hunger articles.
 *
 * Feed policy:
 *  - Public articles  → full HTML in <content:encoded> (CDATA)
 *  - Gated articles   → teaser: redacted excerpt + upgrade CTA; no body content
 *
 * RSS 2.0 extensions used:
 *  - content:encoded  (http://purl.org/rss/1.0/modules/content/)
 *  - atom:link        (http://www.w3.org/2005/Atom) — self + WebSub hub links
 *  - media:content    (http://search.yahoo.com/mrss/) — thumbnail images
 *  - dc:creator       (http://purl.org/dc/elements/1.1/)
 *
 * Callers should pass `siteUrl: getRequestURL(event).origin` so feeds work correctly
 * in dev (localhost) as well as in production.
 */

// Must use a relative path so Nitro bundles the shared extension factory.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – relative path from server/utils → utils/
import { renderTiptapBodyToHtml } from '../../utils/tiptap-render-extensions'
import { buildAtomFeed, WEBSUB_HUB_URL } from './atom-feed'
import type { AtomFeedItem } from './atom-feed'
import { buildJsonFeed } from './json-feed'
import type { JsonFeedItem } from './json-feed'

/** Canonical production URL — used as fallback when callers don't provide siteUrl. */
const CANONICAL_SITE = 'https://menofhunger.com'

// ────────────────────────────────────────────────────────────────────────────
// Types (mirror the Article / ArticleAuthor / ArticleTag shapes from types/api.ts)
// Kept local so this file has no cross-boundary TS import.
// ────────────────────────────────────────────────────────────────────────────

export type FeedArticle = {
  id: string
  title: string
  slug?: string | null
  body?: string | null
  excerpt?: string | null
  thumbnailUrl?: string | null
  publishedAt?: string | null
  editedAt?: string | null
  visibility?: string | null
  viewerCanAccess?: boolean | null
  author?: {
    username?: string | null
    name?: string | null
  } | null
  tags?: Array<{ tag: string; label: string }> | null
}

export type BuildFeedOptions = {
  /** Full URL of this feed (used for atom:link self). */
  feedUrl: string
  /** HTML page URL for the channel <link> element. Defaults to `${siteUrl}/articles`. */
  alternateUrl?: string
  /** Channel title shown in feed readers. */
  title: string
  /** Channel description. */
  description: string
  /** Articles to include — already fetched and ordered. */
  articles: FeedArticle[]
  /**
   * Origin of the current request (e.g. "https://menofhunger.com" or "http://localhost:3000").
   * Used for item permalink and upgrade-CTA link generation.
   * Defaults to the canonical production URL when omitted.
   */
  siteUrl?: string
}

// ────────────────────────────────────────────────────────────────────────────
// XML helpers
// ────────────────────────────────────────────────────────────────────────────

/** Escape text for XML attribute / element content. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Wrap content in a CDATA section, escaping any embedded CDATA end markers.
 * The only illegal sequence inside CDATA is `]]>` — split it across two sections.
 *
 * Strategy: `]]>` → `]` (closes CDATA 1) + `]>` (opens CDATA 2).
 * Replacement in context: `]]>` → `]]]><![CDATA[]>`
 * Example:  `end]]>here` → `<![CDATA[end]]]><![CDATA[]>here]]>`
 * Parsing:  CDATA 1 content = `end]`, CDATA 2 content = `]>here` → combined `end]]>here` ✓
 */
export function cdata(content: string): string {
  return `<![CDATA[${content.replace(/]]>/g, ']]]><![CDATA[]>')}]]>`
}

/** Convert an ISO-8601 date string to RFC-822 format required by RSS 2.0. */
export function toRfc822(iso: string): string {
  try {
    return new Date(iso).toUTCString()
  } catch {
    return new Date().toUTCString()
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Item rendering
// ────────────────────────────────────────────────────────────────────────────

function buildItem(article: FeedArticle, site: string): string {
  const link = `${site}/a/${encodeURIComponent(article.id)}`
  const title = escapeXml((article.title ?? '').trim() || 'Untitled')
  const authorName = (article.author?.name ?? article.author?.username ?? '').trim()
  const pubDate = article.publishedAt ? toRfc822(article.publishedAt) : toRfc822(new Date().toISOString())
  const isGated = article.viewerCanAccess === false

  const lines: string[] = ['  <item>']
  lines.push(`    <title>${title}</title>`)
  lines.push(`    <link>${link}</link>`)
  lines.push(`    <guid isPermaLink="true">${link}</guid>`)
  lines.push(`    <pubDate>${pubDate}</pubDate>`)

  if (authorName) {
    lines.push(`    <dc:creator>${escapeXml(authorName)}</dc:creator>`)
  }

  for (const t of article.tags ?? []) {
    if (t.label) lines.push(`    <category>${escapeXml(t.label)}</category>`)
  }

  if (article.thumbnailUrl) {
    const thumb = article.thumbnailUrl.trim()
    if (thumb) {
      lines.push(`    <media:content url="${escapeXml(thumb)}" medium="image"/>`)
    }
  }

  if (isGated) {
    // Teaser description — API has already redacted the excerpt to ~30 words.
    const visibility = article.visibility === 'premiumOnly' ? 'premium' : 'verified'
    const teaser = (article.excerpt ?? '').trim()
    const gatedNote = `This article is for ${visibility} members. Join at ${site}/tiers`
    const descText = teaser ? `${teaser}\n\n${gatedNote}` : gatedNote
    lines.push(`    <description>${cdata(descText)}</description>`)
  } else {
    // Full content
    const excerpt = (article.excerpt ?? '').trim()
    if (excerpt) {
      lines.push(`    <description>${cdata(excerpt)}</description>`)
    }

    const bodyHtml = renderTiptapBodyToHtml(article.body ?? '{}')
    if (bodyHtml) {
      lines.push(`    <content:encoded>${cdata(bodyHtml)}</content:encoded>`)
    }
  }

  lines.push('  </item>')
  return lines.join('\n')
}

// ────────────────────────────────────────────────────────────────────────────
// Shared converter (Article → generic feed item types)
// ────────────────────────────────────────────────────────────────────────────

function articleToAtomItem(article: FeedArticle, site: string): AtomFeedItem {
  const url = `${site}/a/${encodeURIComponent(article.id)}`
  const isGated = article.viewerCanAccess === false
  return {
    id: url,
    title: (article.title ?? 'Untitled').trim(),
    url,
    publishedAt: article.publishedAt ?? new Date().toISOString(),
    updatedAt: article.editedAt ?? article.publishedAt ?? null,
    authorName: article.author?.name ?? article.author?.username ?? null,
    contentHtml: (!isGated && article.body && article.body !== '{}')
      ? renderTiptapBodyToHtml(article.body)
      : undefined,
    summary: isGated
      ? `${(article.excerpt ?? '').trim()}\n\nMembers-only content. Join at ${site}/tiers`.trim()
      : (article.excerpt ?? undefined),
    tags: article.tags?.map((t) => t.label).filter(Boolean) ?? [],
    imageUrl: article.thumbnailUrl ?? null,
    isGated,
  }
}

function articleToJsonItem(article: FeedArticle, site: string): JsonFeedItem {
  const url = `${site}/a/${encodeURIComponent(article.id)}`
  const isGated = article.viewerCanAccess === false
  return {
    id: url,
    url,
    title: (article.title ?? 'Untitled').trim(),
    publishedAt: article.publishedAt ?? new Date().toISOString(),
    updatedAt: article.editedAt ?? article.publishedAt ?? null,
    authorName: article.author?.name ?? article.author?.username ?? null,
    contentHtml: (!isGated && article.body && article.body !== '{}')
      ? renderTiptapBodyToHtml(article.body)
      : undefined,
    summary: isGated
      ? `Members-only content. Join at ${site}/tiers`
      : (article.excerpt ?? undefined),
    tags: article.tags?.map((t) => t.label).filter(Boolean) ?? [],
    imageUrl: article.thumbnailUrl ?? null,
    isGated,
  }
}

export type BuildArticleAtomOptions = {
  feedUrl: string
  alternateUrl: string
  title: string
  description?: string
  articles: FeedArticle[]
  siteUrl?: string
}

/** Build a complete Atom 1.0 XML document for an articles feed. */
export function buildArticleAtomFeed(opts: BuildArticleAtomOptions): string {
  const site = opts.siteUrl ?? CANONICAL_SITE
  const valid = opts.articles.filter((a) => a.id && a.title && a.publishedAt)
  return buildAtomFeed({
    feedUrl: opts.feedUrl,
    alternateUrl: opts.alternateUrl,
    title: opts.title,
    description: opts.description,
    siteUrl: site,
    items: valid.map((a) => articleToAtomItem(a, site)),
  })
}

export type BuildArticleJsonFeedOptions = {
  feedUrl: string
  homePageUrl: string
  title: string
  description?: string
  articles: FeedArticle[]
  siteUrl?: string
}

/** Build a JSON Feed 1.1 document for an articles feed. */
export function buildArticleJsonFeed(opts: BuildArticleJsonFeedOptions): string {
  const site = opts.siteUrl ?? CANONICAL_SITE
  const valid = opts.articles.filter((a) => a.id && a.title && a.publishedAt)
  return buildJsonFeed({
    feedUrl: opts.feedUrl,
    homePageUrl: opts.homePageUrl,
    title: opts.title,
    description: opts.description,
    siteUrl: site,
    items: valid.map((a) => articleToJsonItem(a, site)),
  })
}

// ────────────────────────────────────────────────────────────────────────────
// RSS 2.0
// ────────────────────────────────────────────────────────────────────────────

/** Build a complete RSS 2.0 XML document string. */
export function buildArticleFeed(opts: BuildFeedOptions): string {
  const { feedUrl, title, description, articles } = opts
  const site = opts.siteUrl ?? CANONICAL_SITE
  const channelLink = opts.alternateUrl ?? `${site}/articles`

  const validArticles = articles.filter(
    (a) => a.id && a.title && !a.title.trim().match(/^\s*$/) && a.publishedAt,
  )

  const items = validArticles.map((a) => {
    try {
      return buildItem(a, site)
    } catch {
      return null
    }
  }).filter(Boolean)

  const lastBuildDate = validArticles.length > 0
    ? toRfc822(validArticles[0]!.publishedAt!)
    : toRfc822(new Date().toISOString())

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"',
    '  xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    '  xmlns:atom="http://www.w3.org/2005/Atom"',
    '  xmlns:media="http://search.yahoo.com/mrss/"',
    '  xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${channelLink}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    '    <language>en-us</language>',
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>`,
    `    <atom:link href="${WEBSUB_HUB_URL}" rel="hub"/>`,
    ...items,
    '  </channel>',
    '</rss>',
  ].join('\n')
}
