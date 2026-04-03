import LinkifyIt from 'linkify-it'
import { siteConfig } from '~/config/site'

const linkify = new LinkifyIt()

export function extractLinksFromText(text: string): string[] {
  const input = (text ?? '').toString()
  const matches = linkify.match(input) ?? []
  const out: string[] = []
  for (const m of matches) {
    const url = (m.url ?? '').trim()
    if (!url) continue
    if (!/^https?:\/\//i.test(url)) continue
    out.push(url)
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
 * Extracts the space ID from a MoH `/spaces/:id` or `/s/:id` URL.
 * The `/s/` short alias is treated identically to `/spaces/`.
 */
export function extractMohSpaceId(url: string): string | null {
  if (!isMohUrl(url)) return null
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    if (parts[0] !== 'spaces' && parts[0] !== 's') return null
    const id = (parts[1] ?? '').trim()
    return id ? decodeURIComponent(id) : null
  } catch {
    return null
  }
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

export function getYouTubeEmbedUrl(url: string, opts?: { autoplay?: boolean }): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()

    let id: string | null = null

    if (host === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v')
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] ?? null
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] ?? null
    }

    if (!id) return null
    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null

    const params = new URLSearchParams({
      autoplay: opts?.autoplay ? '1' : '0',
      modestbranding: '1',
      rel: '0',
      playsinline: '1',
    })
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params.toString()}`
  } catch {
    return null
  }
}

export function getYouTubePosterUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()

    let id: string | null = null
    if (host === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v')
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] ?? null
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] ?? null
    }

    if (!id) return null
    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`
  } catch {
    return null
  }
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

/** True if the post body (with no media) would show a video embed (YouTube or Rumble). */
export function postBodyHasVideoEmbed(body: string, hasMedia: boolean): boolean {
  if (hasMedia) return false
  const links = extractLinksFromText(body)
  const last = links[links.length - 1]
  if (!last) return false
  return Boolean(getYouTubeEmbedUrl(last) || (isRumbleUrl(last) && !isRumbleShortsUrl(last)))
}

