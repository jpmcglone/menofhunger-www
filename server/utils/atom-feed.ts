/**
 * Atom 1.0 feed builder — used for both articles and posts.
 *
 * Atom spec: https://www.rfc-editor.org/rfc/rfc4287
 * WebSub hub link (rel="hub") is included in every feed.
 *
 * Usage:
 *   import { buildAtomFeed, type AtomFeedItem } from '../utils/atom-feed'
 */

export const WEBSUB_HUB_URL = 'https://pubsubhubbub.appspot.com/publish'

const CANONICAL_SITE = 'https://menofhunger.com'

// ────────────────────────────────────────────────────────────────────────────
// Generic feed item type (maps from Article or FeedPost)
// ────────────────────────────────────────────────────────────────────────────

export type AtomFeedItem = {
  /** Permanent identifier — usually the full permalink URL. */
  id: string
  /** Human-readable title. For posts without titles, derive from body. */
  title: string
  /** Full permalink URL. */
  url: string
  /** ISO-8601 published date. */
  publishedAt: string
  /** ISO-8601 last-modified date (falls back to publishedAt). */
  updatedAt?: string | null
  /** Author display name. */
  authorName?: string | null
  /** HTML body (for public/accessible items). Omit or empty for gated. */
  contentHtml?: string
  /** Plain-text summary / excerpt. */
  summary?: string
  /** Tag labels (display form). */
  tags?: string[]
  /** Thumbnail URL for media:content. */
  imageUrl?: string | null
  /** True when the item is gated and content is stripped. */
  isGated?: boolean
}

export type BuildAtomFeedOptions = {
  feedUrl: string
  alternateUrl: string
  title: string
  description?: string
  items: AtomFeedItem[]
  /** Request origin — used for author URI. Defaults to canonical production URL. */
  siteUrl?: string
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function atomCdata(content: string): string {
  return `<![CDATA[${content.replace(/]]>/g, ']]]><![CDATA[]>')}]]>`
}

/** Normalise to an ISO 8601 datetime with 'Z' suffix (required by Atom). */
function toIso(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Entry builder
// ────────────────────────────────────────────────────────────────────────────

function buildEntry(item: AtomFeedItem): string {
  const published = toIso(item.publishedAt)
  const updated = item.updatedAt ? toIso(item.updatedAt) : published

  const lines: string[] = ['  <entry>']
  lines.push(`    <id>${escXml(item.id)}</id>`)
  lines.push(`    <title type="text">${escXml(item.title)}</title>`)
  lines.push(`    <link href="${escXml(item.url)}" rel="alternate"/>`)
  lines.push(`    <published>${published}</published>`)
  lines.push(`    <updated>${updated}</updated>`)

  if (item.authorName) {
    lines.push(`    <author><name>${escXml(item.authorName)}</name></author>`)
  }

  for (const tag of item.tags ?? []) {
    if (tag) lines.push(`    <category term="${escXml(tag.toLowerCase())}" label="${escXml(tag)}"/>`)
  }

  if (item.imageUrl) {
    lines.push(`    <media:content url="${escXml(item.imageUrl)}" medium="image"/>`)
  }

  if (item.isGated) {
    const summary = item.summary ? item.summary.trim() : ''
    lines.push(`    <summary type="text">${escXml(summary || 'Members-only content.')}</summary>`)
  } else {
    if (item.summary) {
      lines.push(`    <summary type="text">${escXml(item.summary.trim())}</summary>`)
    }
    if (item.contentHtml) {
      lines.push(`    <content type="html">${atomCdata(item.contentHtml)}</content>`)
    }
  }

  lines.push('  </entry>')
  return lines.join('\n')
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/** Build a complete Atom 1.0 XML document string. */
export function buildAtomFeed(opts: BuildAtomFeedOptions): string {
  const { feedUrl, alternateUrl, title, description, items } = opts
  const site = opts.siteUrl ?? CANONICAL_SITE

  const validItems = items.filter((i) => i.id && i.title && i.publishedAt)
  const latestDate = validItems.length > 0
    ? toIso(validItems[0]!.publishedAt)
    : new Date().toISOString()

  const entries = validItems.map((i) => {
    try { return buildEntry(i) } catch { return null }
  }).filter(Boolean)

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom"',
    '      xmlns:media="http://search.yahoo.com/mrss/">',
    `  <title>${escXml(title)}</title>`,
    `  <link href="${escXml(alternateUrl)}" rel="alternate"/>`,
    `  <link href="${escXml(feedUrl)}" rel="self" type="application/atom+xml"/>`,
    `  <link href="${WEBSUB_HUB_URL}" rel="hub"/>`,
    `  <id>${escXml(feedUrl)}</id>`,
    `  <updated>${latestDate}</updated>`,
    `  <author><name>${escXml(site.replace('https://', '').replace('http://', ''))}</name><uri>${site}</uri></author>`,
    ...(description ? [`  <subtitle>${escXml(description)}</subtitle>`] : []),
    ...entries,
    '</feed>',
  ].join('\n')
}
