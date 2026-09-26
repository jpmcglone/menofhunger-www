/**
 * RSS 2.0 + Atom 1.0 + JSON Feed 1.1 builders for the Board.
 *
 * Feed policy:
 *  - Public threads only, newest first (feed readers are signed-out viewers and
 *    track items by id, so a reordering "Top" list reads badly).
 *  - Every item links to the discussion. The shared link is in the body and in
 *    the format's "related" slot (Atom rel="related", JSON external_url).
 */

import type { H3Event } from 'h3'
import { escapeXml, cdata, toRfc822 } from './article-feed'
import { WEBSUB_HUB_URL, buildAtomFeed } from './atom-feed'
import { buildJsonFeed } from './json-feed'

export type FeedBoardThread = {
  id: string
  title: string
  url?: string | null
  domain?: string | null
  tags?: string[] | null
  visibility?: string | null
  viewerCanAccess?: boolean | null
  body?: string | null
  createdAt?: string | null
  editedAt?: string | null
  points?: number | null
  commentCount?: number | null
  author?: { username?: string | null, name?: string | null } | null
}

export type BoardFeedFormat = 'rss' | 'atom' | 'json'

export type BoardFeedContext = {
  site: string
  /** Null for the site-wide feed. */
  tag: string | null
  tagLabel: string | null
  threads: FeedBoardThread[]
}

const FEED_LIMIT = 50

const FEED_PATH: Record<BoardFeedFormat, string> = { rss: 'feed.xml', atom: 'feed.atom', json: 'feed.json' }

const CONTENT_TYPE: Record<BoardFeedFormat, string> = {
  rss: 'application/rss+xml; charset=utf-8',
  atom: 'application/atom+xml; charset=utf-8',
  json: 'application/feed+json; charset=utf-8',
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

export function isFeedableBoardThread(t: FeedBoardThread): boolean {
  return Boolean(t?.id && t.title && t.createdAt) && t.visibility === 'public' && t.viewerCanAccess !== false
}

export function boardDiscussionUrl(id: string, site: string): string {
  return `${site}/b/${encodeURIComponent(id)}`
}

function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

function authorName(t: FeedBoardThread): string {
  return (t.author?.name ?? t.author?.username ?? '').trim()
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`
}

/** Escaped HTML: body text, the shared link, and a line pointing to the discussion. */
export function boardItemHtml(t: FeedBoardThread, site: string): string {
  const parts: string[] = []
  const body = (t.body ?? '').trim()
  if (body) {
    for (const para of body.split(/\n{2,}/)) {
      const text = para.trim()
      if (text) parts.push(`<p>${escapeXml(text).replace(/\n/g, '<br>')}</p>`)
    }
  }
  const link = safeHttpUrl(t.url)
  if (link) {
    const label = (t.domain ?? '').trim() || link
    parts.push(`<p>Link: <a href="${escapeXml(link)}">${escapeXml(label)}</a></p>`)
  }
  const comments = Math.max(0, t.commentCount ?? 0)
  const points = Math.max(0, t.points ?? 0)
  parts.push(
    `<p><a href="${escapeXml(boardDiscussionUrl(t.id, site))}">Discuss on Men of Hunger</a>`
    + ` · ${escapeXml(plural(points, 'point', 'points'))} · ${escapeXml(plural(comments, 'comment', 'comments'))}</p>`,
  )
  return parts.join('\n')
}

function summaryText(t: FeedBoardThread): string {
  const body = (t.body ?? '').replace(/\s+/g, ' ').trim()
  if (body) return body.length > 200 ? `${body.slice(0, 199)}…` : body
  return (t.domain ?? '').trim() ? `Link to ${t.domain!.trim()}` : t.title
}

function feedMeta(ctx: BoardFeedContext, format: BoardFeedFormat) {
  const base = ctx.tag ? `${ctx.site}/b/tags/${encodeURIComponent(ctx.tag)}` : `${ctx.site}/b`
  const label = ctx.tagLabel || ctx.tag
  return {
    feedUrl: `${base}/${FEED_PATH[format]}`,
    homePageUrl: ctx.tag ? `${ctx.site}/b?tags=${encodeURIComponent(ctx.tag)}` : `${ctx.site}/b`,
    title: label ? `${label} — Board on Men of Hunger` : 'Board — Men of Hunger',
    description: label
      ? `New public Board posts tagged ${label} on Men of Hunger.`
      : 'New public Board posts on Men of Hunger: links and questions worth discussing.',
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Builders
// ────────────────────────────────────────────────────────────────────────────

function buildRssItem(t: FeedBoardThread, site: string): string {
  const discussion = boardDiscussionUrl(t.id, site)
  const html = boardItemHtml(t, site)
  const lines = ['  <item>']
  lines.push(`    <title>${escapeXml(t.title)}</title>`)
  lines.push(`    <link>${discussion}</link>`)
  lines.push(`    <guid isPermaLink="true">${discussion}</guid>`)
  lines.push(`    <comments>${discussion}</comments>`)
  lines.push(`    <pubDate>${toRfc822(t.createdAt!)}</pubDate>`)
  const author = authorName(t)
  if (author) lines.push(`    <dc:creator>${escapeXml(author)}</dc:creator>`)
  for (const tag of t.tags ?? []) {
    if (tag) lines.push(`    <category>${escapeXml(tag)}</category>`)
  }
  lines.push(`    <description>${cdata(html)}</description>`)
  lines.push(`    <content:encoded>${cdata(html)}</content:encoded>`)
  lines.push('  </item>')
  return lines.join('\n')
}

export function buildBoardFeed(ctx: BoardFeedContext, format: BoardFeedFormat): string {
  const { site } = ctx
  const threads = ctx.threads.filter(isFeedableBoardThread)
  const meta = feedMeta(ctx, format)

  if (format === 'atom') {
    return buildAtomFeed({
      feedUrl: meta.feedUrl,
      alternateUrl: meta.homePageUrl,
      title: meta.title,
      description: meta.description,
      siteUrl: site,
      items: threads.map((t) => ({
        id: boardDiscussionUrl(t.id, site),
        title: t.title,
        url: boardDiscussionUrl(t.id, site),
        relatedUrl: safeHttpUrl(t.url),
        publishedAt: t.createdAt!,
        updatedAt: t.editedAt ?? null,
        authorName: authorName(t) || null,
        contentHtml: boardItemHtml(t, site),
        summary: summaryText(t),
        tags: (t.tags ?? []).filter(Boolean),
      })),
    })
  }

  if (format === 'json') {
    return buildJsonFeed({
      feedUrl: meta.feedUrl,
      homePageUrl: meta.homePageUrl,
      title: meta.title,
      description: meta.description,
      siteUrl: site,
      items: threads.map((t) => ({
        id: boardDiscussionUrl(t.id, site),
        url: boardDiscussionUrl(t.id, site),
        externalUrl: safeHttpUrl(t.url),
        title: t.title,
        publishedAt: t.createdAt!,
        updatedAt: t.editedAt ?? null,
        authorName: authorName(t) || null,
        contentHtml: boardItemHtml(t, site),
        summary: summaryText(t),
        tags: (t.tags ?? []).filter(Boolean),
      })),
    })
  }

  const lastBuildDate = threads.length ? toRfc822(threads[0]!.createdAt!) : toRfc822(new Date().toISOString())
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"',
    '  xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    '  xmlns:atom="http://www.w3.org/2005/Atom"',
    '  xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(meta.title)}</title>`,
    `    <link>${escapeXml(meta.homePageUrl)}</link>`,
    `    <description>${escapeXml(meta.description)}</description>`,
    '    <language>en-us</language>',
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(meta.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    `    <atom:link href="${WEBSUB_HUB_URL}" rel="hub"/>`,
    ...threads.map((t) => {
      try { return buildRssItem(t, site) } catch { return null }
    }).filter(Boolean),
    '  </channel>',
    '</rss>',
  ].join('\n')
}

// ────────────────────────────────────────────────────────────────────────────
// Route handler
// ────────────────────────────────────────────────────────────────────────────

async function loadBoardFeed(event: H3Event, tag: string | null): Promise<BoardFeedContext> {
  const site = getRequestURL(event).origin
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'

  const [threads, tagLabel] = await Promise.all([
    $fetch<{ data: FeedBoardThread[] }>(`${apiBase}/board/threads`, {
      query: { sort: 'new', visibility: 'public', limit: FEED_LIMIT, ...(tag ? { tags: tag } : {}) },
      timeout: 10_000,
    }).then((res) => (Array.isArray(res?.data) ? res.data : [])).catch(() => [] as FeedBoardThread[]),
    tag
      ? $fetch<{ data: { slug: string, label: string }[] }>(`${apiBase}/board/tags`, {
          query: { q: tag, limit: 5 },
          timeout: 5_000,
        }).then((res) => res?.data?.find((t) => t.slug === tag)?.label ?? null).catch(() => null)
      : Promise.resolve(null),
  ])

  return { site, tag, tagLabel, threads }
}

export function defineBoardFeedHandler(format: BoardFeedFormat, opts: { perTag?: boolean } = {}) {
  return defineEventHandler(async (event) => {
    let tag: string | null = null
    if (opts.perTag) {
      tag = (getRouterParam(event, 'tag') ?? '').trim().toLowerCase()
      if (!tag || tag.length > 40 || !/^[a-z0-9][a-z0-9-]*$/.test(tag)) {
        setResponseStatus(event, 404)
        return 'Not found'
      }
    }
    const ctx = await loadBoardFeed(event, tag)
    setResponseHeader(event, 'Content-Type', CONTENT_TYPE[format])
    setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    setResponseHeader(event, 'X-Robots-Tag', 'noindex')
    return buildBoardFeed(ctx, format)
  })
}
