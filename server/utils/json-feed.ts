/**
 * JSON Feed 1.1 builder — used for both articles and posts.
 *
 * Spec: https://www.jsonfeed.org/version/1.1/
 * WebSub hub is advertised via the top-level `hubs` array.
 *
 * Usage:
 *   import { buildJsonFeed, type JsonFeedItem } from '../utils/json-feed'
 */

import { WEBSUB_HUB_URL } from './atom-feed'

const CANONICAL_SITE = 'https://menofhunger.com'

// ────────────────────────────────────────────────────────────────────────────
// Generic feed item type (maps from Article or FeedPost)
// ────────────────────────────────────────────────────────────────────────────

export type JsonFeedItem = {
  /** Permanent identifier — usually the full permalink URL. */
  id: string
  /** Full permalink URL. */
  url: string
  /** Human-readable title. */
  title?: string
  /** ISO-8601 published date. */
  publishedAt: string
  /** ISO-8601 last-modified date (falls back to publishedAt). */
  updatedAt?: string | null
  /** Author display name. */
  authorName?: string | null
  /** HTML body (for public/accessible items). */
  contentHtml?: string
  /** Plain-text summary / excerpt. */
  summary?: string
  /** Tag labels (display form). */
  tags?: string[]
  /** Thumbnail URL. */
  imageUrl?: string | null
  /** True when the item is gated and content is stripped. */
  isGated?: boolean
}

export type BuildJsonFeedOptions = {
  feedUrl: string
  homePageUrl: string
  title: string
  description?: string
  items: JsonFeedItem[]
  /** Request origin — used for author URLs. Defaults to canonical production URL. */
  siteUrl?: string
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/** Build a JSON Feed 1.1 document. Returns a JSON string. */
export function buildJsonFeed(opts: BuildJsonFeedOptions): string {
  const { feedUrl, homePageUrl, title, description, items } = opts
  const site = opts.siteUrl ?? CANONICAL_SITE

  const validItems = items.filter((i) => i.id && i.publishedAt)

  const feedItems = validItems.map((item) => {
    const base: Record<string, unknown> = {
      id: item.id,
      url: item.url,
      date_published: item.publishedAt,
    }
    if (item.title) base.title = item.title
    if (item.updatedAt) base.date_modified = item.updatedAt
    if (item.authorName) base.authors = [{ name: item.authorName, url: `${site}/u/${item.authorName}` }]
    if (item.tags?.length) base.tags = item.tags
    if (item.imageUrl) base.image = item.imageUrl

    if (item.isGated) {
      base.summary = item.summary ?? 'Members-only content.'
      // content_html is intentionally omitted for gated items
    } else {
      if (item.summary) base.summary = item.summary
      if (item.contentHtml) base.content_html = item.contentHtml
    }

    return base
  })

  const feed: Record<string, unknown> = {
    version: 'https://jsonfeed.org/version/1.1',
    title,
    home_page_url: homePageUrl,
    feed_url: feedUrl,
    authors: [{ name: 'Men of Hunger', url: site }],
    hubs: [{ type: 'WebSub', url: WEBSUB_HUB_URL }],
    items: feedItems,
  }
  if (description) feed.description = description

  return JSON.stringify(feed, null, 2)
}
