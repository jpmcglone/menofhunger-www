/**
 * RSS 2.0 + Atom 1.0 + JSON Feed 1.1 feed builders for Men of Hunger posts.
 *
 * Feed policy:
 *  - Public posts → body in <content:encoded> / <content> / content_html
 *  - Gated posts  → ~22-char redacted teaser + upgrade note
 *
 * Posts don't have titles, so we generate one from the body.
 */

import { escapeXml, cdata, toRfc822 } from './article-feed'
import { WEBSUB_HUB_URL, buildAtomFeed } from './atom-feed'
import type { AtomFeedItem } from './atom-feed'
import { buildJsonFeed } from './json-feed'
import type { JsonFeedItem } from './json-feed'

const CANONICAL_SITE = 'https://menofhunger.com'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type FeedPostItem = {
  id: string
  body?: string | null
  createdAt?: string | null
  visibility?: string | null
  viewerCanAccess?: boolean | null
  author?: {
    username?: string | null
    name?: string | null
  } | null
  hashtags?: string[] | null
}

export type BuildPostFeedOptions = {
  feedUrl: string
  title: string
  description: string
  posts: FeedPostItem[]
  /** Request origin — defaults to canonical production URL. */
  siteUrl?: string
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Generate a title from post body (first line up to 80 chars). */
export function postTitle(body: string | null | undefined): string {
  if (!body) return 'Post'
  const firstLine = body.split('\n')[0]?.trim() ?? ''
  if (!firstLine) return 'Post'
  return firstLine.length > 80 ? firstLine.slice(0, 77) + '…' : firstLine
}

function postLink(id: string, site: string): string {
  return `${site}/p/${encodeURIComponent(id)}`
}

// ────────────────────────────────────────────────────────────────────────────
// RSS 2.0
// ────────────────────────────────────────────────────────────────────────────

function buildPostItem(post: FeedPostItem, site: string): string {
  const link = postLink(post.id, site)
  const title = escapeXml(postTitle(post.body))
  const authorName = (post.author?.name ?? post.author?.username ?? '').trim()
  const pubDate = post.createdAt ? toRfc822(post.createdAt) : toRfc822(new Date().toISOString())
  const isGated = post.viewerCanAccess === false

  const lines: string[] = ['  <item>']
  lines.push(`    <title>${title}</title>`)
  lines.push(`    <link>${link}</link>`)
  lines.push(`    <guid isPermaLink="true">${link}</guid>`)
  lines.push(`    <pubDate>${pubDate}</pubDate>`)

  if (authorName) {
    lines.push(`    <dc:creator>${escapeXml(authorName)}</dc:creator>`)
  }

  for (const tag of post.hashtags ?? []) {
    if (tag) lines.push(`    <category>${escapeXml(tag)}</category>`)
  }

  if (isGated) {
    const visibility = post.visibility === 'premiumOnly' ? 'premium' : 'verified'
    const descText = `This post is for ${visibility} members. Join at ${site}/tiers`
    lines.push(`    <description>${cdata(descText)}</description>`)
  } else {
    const body = (post.body ?? '').trim()
    if (body) {
      lines.push(`    <description>${cdata(body)}</description>`)
      lines.push(`    <content:encoded>${cdata(body)}</content:encoded>`)
    }
  }

  lines.push('  </item>')
  return lines.join('\n')
}

/** Build a complete RSS 2.0 XML document for a posts feed. */
export function buildPostRssFeed(opts: BuildPostFeedOptions): string {
  const { feedUrl, title, description, posts } = opts
  const site = opts.siteUrl ?? CANONICAL_SITE

  const validPosts = posts.filter((p) => p.id && p.createdAt)
  const items = validPosts.map((p) => {
    try { return buildPostItem(p, site) } catch { return null }
  }).filter(Boolean)

  const lastBuildDate = validPosts.length > 0
    ? toRfc822(validPosts[0]!.createdAt!)
    : toRfc822(new Date().toISOString())

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"',
    '  xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    '  xmlns:atom="http://www.w3.org/2005/Atom"',
    '  xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${site}</link>`,
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

// ────────────────────────────────────────────────────────────────────────────
// Atom 1.0
// ────────────────────────────────────────────────────────────────────────────

export type BuildPostAtomOptions = {
  feedUrl: string
  alternateUrl: string
  title: string
  description?: string
  posts: FeedPostItem[]
  siteUrl?: string
}

function postToAtomItem(post: FeedPostItem, site: string): AtomFeedItem {
  const url = postLink(post.id, site)
  const isGated = post.viewerCanAccess === false
  const body = (post.body ?? '').trim()

  return {
    id: url,
    title: postTitle(post.body),
    url,
    publishedAt: post.createdAt ?? new Date().toISOString(),
    authorName: post.author?.name ?? post.author?.username ?? null,
    contentHtml: (!isGated && body) ? body : undefined,
    summary: isGated
      ? `This post is for ${post.visibility === 'premiumOnly' ? 'premium' : 'verified'} members. Join at ${site}/tiers`
      : (body.length > 200 ? body.slice(0, 200) + '…' : body),
    tags: post.hashtags?.filter(Boolean) ?? [],
    isGated,
  }
}

/** Build a complete Atom 1.0 XML document for a posts feed. */
export function buildPostAtomFeed(opts: BuildPostAtomOptions): string {
  const site = opts.siteUrl ?? CANONICAL_SITE
  return buildAtomFeed({
    feedUrl: opts.feedUrl,
    alternateUrl: opts.alternateUrl,
    title: opts.title,
    description: opts.description,
    siteUrl: site,
    items: opts.posts
      .filter((p) => p.id && p.createdAt)
      .map((p) => postToAtomItem(p, site)),
  })
}

// ────────────────────────────────────────────────────────────────────────────
// JSON Feed 1.1
// ────────────────────────────────────────────────────────────────────────────

export type BuildPostJsonFeedOptions = {
  feedUrl: string
  homePageUrl: string
  title: string
  description?: string
  posts: FeedPostItem[]
  siteUrl?: string
}

function postToJsonItem(post: FeedPostItem, site: string): JsonFeedItem {
  const url = postLink(post.id, site)
  const isGated = post.viewerCanAccess === false
  const body = (post.body ?? '').trim()

  return {
    id: url,
    url,
    title: postTitle(post.body),
    publishedAt: post.createdAt ?? new Date().toISOString(),
    authorName: post.author?.name ?? post.author?.username ?? null,
    contentHtml: (!isGated && body) ? body : undefined,
    summary: isGated
      ? `Members-only. Join at ${site}/tiers`
      : (body.length > 200 ? body.slice(0, 200) + '…' : body),
    tags: post.hashtags?.filter(Boolean) ?? [],
    isGated,
  }
}

/** Build a JSON Feed 1.1 document for a posts feed. */
export function buildPostJsonFeed(opts: BuildPostJsonFeedOptions): string {
  const site = opts.siteUrl ?? CANONICAL_SITE
  return buildJsonFeed({
    feedUrl: opts.feedUrl,
    homePageUrl: opts.homePageUrl,
    title: opts.title,
    description: opts.description,
    siteUrl: site,
    items: opts.posts
      .filter((p) => p.id && p.createdAt)
      .map((p) => postToJsonItem(p, site)),
  })
}
