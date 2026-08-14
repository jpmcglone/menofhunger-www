import LinkifyIt from 'linkify-it'
import { siteConfig } from '~/config/site'

const linkify = new LinkifyIt()

export type TextLinkMatch = {
  start: number
  end: number
  text: string
  href: string
}

export function extractLinksFromText(text: string): string[] {
  return matchLinksInText(text).map((m) => m.href)
}

/** Ranged http(s) matches for in-text link rendering. Skips javascript: and other schemes. */
export function matchLinksInText(text: string): TextLinkMatch[] {
  const input = (text ?? '').toString()
  const matches = linkify.match(input) ?? []
  const out: TextLinkMatch[] = []
  for (const m of matches) {
    const start = typeof m.index === 'number' ? m.index : -1
    const end = typeof m.lastIndex === 'number' ? m.lastIndex : -1
    if (start < 0 || end <= start) continue
    const href = (m.url ?? '').trim()
    if (!href || !/^https?:\/\//i.test(href)) continue
    out.push({ start, end, text: input.slice(start, end), href })
  }
  return out
}

export function safeUrlHostname(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.hostname || null
  } catch {
    return null
  }
}

export function safeUrlDisplay(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname === '/' ? '' : u.pathname
    return `${host}${path}${u.search ? u.search : ''}`
  } catch {
    return url
  }
}

/**
 * Returns true if the URL belongs to the MoH domain (production or current dev host).
 * Used by link-preview components to render a branded internal card instead of a generic one.
 */
export function isMohUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    try {
      const cfgHost = new URL(siteConfig.url).hostname.toLowerCase()
      if (host === cfgHost || host === `www.${cfgHost}`) return true
    } catch { /* ignore */ }
    if (import.meta.client) {
      const winHost = window.location.hostname.toLowerCase()
      if (winHost && host === winHost) return true
    }
    return false
  } catch {
    return false
  }
}

/** Returns the path+search+hash portion of a URL, or null on parse failure. */
export function mohUrlPath(url: string): string | null {
  try {
    const u = new URL(url)
    return u.pathname + (u.search || '') + (u.hash || '')
  } catch {
    return null
  }
}

// ─── MoH-specific path extractors ────────────────────────────────────────────
// These replace the inline tryExtractLocal* copies in each component.

/** Extracts the post ID from a MoH `/p/:id` URL. */
export function extractMohPostId(url: string): string | null {
  if (!isMohUrl(url)) return null
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    if (parts.length !== 2 || parts[0] !== 'p') return null
    return (parts[1] ?? '').trim() || null
  } catch {
    return null
  }
}

/** Extracts the article ID from a MoH `/a/:id` URL. */
export function extractMohArticleId(url: string): string | null {
  if (!isMohUrl(url)) return null
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    if (parts.length !== 2 || parts[0] !== 'a') return null
    return (parts[1] ?? '').trim() || null
  } catch {
    return null
  }
}

/**
 * Extracts the space ID from a MoH `/spaces/:id` URL.
 * Canonical share links use `/s/:username` — see `extractMohSpaceUsername`.
 */
export function extractMohSpaceId(url: string): string | null {
  if (!isMohUrl(url)) return null
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    if (parts.length !== 2 || parts[0] !== 'spaces') return null
    const id = (parts[1] ?? '').trim()
    return id ? decodeURIComponent(id) : null
  } catch {
    return null
  }
}

/**
 * Extracts the owner username from a MoH `/s/:username` permalink.
 */
export function extractMohSpaceUsername(url: string): string | null {
  if (!isMohUrl(url)) return null
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    if (parts.length !== 2 || parts[0] !== 's') return null
    const username = (parts[1] ?? '').trim()
    return username ? decodeURIComponent(username) : null
  } catch {
    return null
  }
}

/** True when the URL is a MoH space permalink (`/spaces/:id` or `/s/:username`). */
export function isMohSpaceLink(url: string): boolean {
  return Boolean(extractMohSpaceId(url) || extractMohSpaceUsername(url))
}

/** Extracts the username from a MoH `/u/:username` URL. */
export function extractMohUsername(url: string): string | null {
  if (!isMohUrl(url)) return null
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    if (parts.length !== 2 || parts[0] !== 'u') return null
    const username = (parts[1] ?? '').trim()
    return username ? decodeURIComponent(username) : null
  } catch {
    return null
  }
}

export interface YouTubeVideoInfo {
  id: string
  /** True for /shorts/ URLs — display in portrait aspect ratio */
  isShort: boolean
  /** Start offset in seconds (from t= / start= params or the 1h2m3s notation) */
  startSeconds: number | null
}

/** Parse a YouTube timestamp string like "1h2m3s", "2m3s", "90", "90s" into total seconds. */
function parseYouTubeTimestamp(raw: string | null): number | null {
  if (!raw) return null
  const n = Number(raw)
  if (!isNaN(n) && raw.trim() !== '') return n > 0 ? Math.floor(n) : null
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/)
  if (!match) return null
  const h = parseInt(match[1] ?? '0', 10)
  const m = parseInt(match[2] ?? '0', 10)
  const s = parseInt(match[3] ?? '0', 10)
  const total = h * 3600 + m * 60 + s
  return total > 0 ? total : null
}

/** Determine the video ID and metadata from any supported YouTube URL. Returns null for unrecognized shapes. */
export function parseYouTubeUrl(url: string): YouTubeVideoInfo | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()

    let id: string | null = null
    let isShort = false

    if (host === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') {
        id = u.searchParams.get('v')
      } else if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.split('/')[2] ?? null
        isShort = true
      } else if (u.pathname.startsWith('/embed/')) {
        id = u.pathname.split('/')[2] ?? null
      } else if (u.pathname.startsWith('/live/')) {
        id = u.pathname.split('/')[2] ?? null
      }
    }

    if (!id) return null
    // Strip any extra query-string suffix that got attached to the ID
    id = id.split('?')[0] ?? id
    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null

    const rawTimestamp = u.searchParams.get('t') ?? u.searchParams.get('start')
    const startSeconds = parseYouTubeTimestamp(rawTimestamp)

    return { id, isShort, startSeconds }
  } catch {
    return null
  }
}

/** Keyless YouTube oEmbed endpoint for a watch/short/embed URL. */
export function youtubeOEmbedRequestUrl(url: string): string | null {
  const info = parseYouTubeUrl(url)
  if (!info) return null
  return `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(info.id)}&format=json`
}

export function getYouTubeEmbedUrl(url: string, opts?: { autoplay?: boolean }): string | null {
  const info = parseYouTubeUrl(url)
  if (!info) return null

  const params = new URLSearchParams({
    autoplay: opts?.autoplay ? '1' : '0',
    rel: '0',
    playsinline: '1',
  })
  if (info.startSeconds != null) params.set('start', String(info.startSeconds))

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(info.id)}?${params.toString()}`
}

/**
 * Returns poster URLs for a YouTube video: maxres first, hqdefault as fallback.
 * The caller should try maxres and fall back to hqdefault if the image fails to load.
 */
export function getYouTubePosterUrls(url: string): { maxres: string; fallback: string } | null {
  const info = parseYouTubeUrl(url)
  if (!info) return null
  const base = `https://i.ytimg.com/vi/${encodeURIComponent(info.id)}`
  return {
    maxres: `${base}/maxresdefault.jpg`,
    fallback: `${base}/hqdefault.jpg`,
  }
}

/** @deprecated Use getYouTubePosterUrls instead */
export function getYouTubePosterUrl(url: string): string | null {
  return getYouTubePosterUrls(url)?.fallback ?? null
}

export function isRumbleUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    return (u.protocol === 'http:' || u.protocol === 'https:') && host === 'rumble.com'
  } catch {
    return false
  }
}

export function isRumbleShortsUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || host !== 'rumble.com') return false
    // Rumble shorts URLs look like: https://rumble.com/shorts/<id>...
    return u.pathname.toLowerCase().startsWith('/shorts/')
  } catch {
    return false
  }
}

/** True for Pickax post permalinks (`https://pickax.com/post/:id`). */
export function isPickaxPostUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || host !== 'pickax.com') return false
    return /^\/post\/\d+\/?$/i.test(u.pathname)
  } catch {
    return false
  }
}

/** True for X/Twitter post permalinks (`/:handle/status/:id`). */
export function isXPostUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^(?:www|mobile)\./i, '').toLowerCase()
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !['x.com', 'twitter.com'].includes(host)) {
      return false
    }
    return /^\/[^/]+\/status\/\d+(?:\/.*)?$/i.test(u.pathname)
  } catch {
    return false
  }
}

/** True for Substack post permalinks (`https://{subdomain}.substack.com/p/{slug}`). */
export function isSubstackPostUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    if (!host.endsWith('.substack.com')) return false
    const subdomain = host.replace(/\.substack\.com$/, '')
    if (!subdomain || subdomain.includes('.')) return false
    return /^\/p\/[^/]+/.test(u.pathname)
  } catch {
    return false
  }
}

/** True if the post body (with no media) would show a video embed (YouTube or Rumble). */
export function postBodyHasVideoEmbed(body: string, hasMedia: boolean): boolean {
  if (hasMedia) return false
  const links = extractLinksFromText(body)
  const last = links[links.length - 1]
  if (!last) return false
  return Boolean(parseYouTubeUrl(last) || (isRumbleUrl(last) && !isRumbleShortsUrl(last)))
}

