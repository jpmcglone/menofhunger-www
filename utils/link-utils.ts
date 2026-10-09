import LinkifyIt from 'linkify-it'
import { siteConfig } from '~/config/site'

export * from './link/video-embed-links'
import { isRumbleUrl, parseYouTubeUrl } from './link/video-embed-links'

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

/** OG website cards show the registrable host, not the path: "From cbsnews.com". */
export function previewSourceLabel(url: string): string {
  const host = (safeUrlHostname(url) ?? '').replace(/^www\./i, '')
  return host ? `From ${host}` : 'From link'
}

/** Hide the dek when Open Graph sent nothing, or when it just repeats the title. */
export function previewDescription(
  description: string | null | undefined,
  title: string | null | undefined,
): string | null {
  const dek = (description ?? '').trim()
  if (!dek) return null
  const heading = (title ?? '').trim()
  if (heading && dek.localeCompare(heading, undefined, { sensitivity: 'accent' }) === 0) return null
  return dek
}

/** Square and taller images use the 4:5 top crop; wider images stay 16:9. */
export function isPortraitPreviewImage(width: number, height: number): boolean {
  return width > 0 && height >= width
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

