export type RumbleEmbedInfo = {
  src: string
  width: number
  height: number
  thumbnailUrl: string | null
}

const embedCache = new Map<string, RumbleEmbedInfo | null>()

function normalizeRumbleHost(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase()
}

function normalizeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = normalizeRumbleHost(u.hostname)
    if (host !== 'rumble.com') return null
    if (!u.pathname.startsWith('/embed/')) return null

    // Ensure the embed path ends with a trailing slash (Rumble embed URLs commonly do).
    if (!u.pathname.endsWith('/')) u.pathname = `${u.pathname}/`
    u.protocol = 'https:'
    return u.toString()
  } catch {
    return null
  }
}

function extractIframeSrc(html: string): string | null {
  const s = (html ?? '').toString()
  const m = s.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i)
  return m?.[1] ?? null
}

async function fetchTextWithFallback(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { method: 'GET' })
    if (!r.ok) return null
    return await r.text()
  } catch {
    // CORS/network failure: try a public CORS proxy that returns raw content.
    // NOTE: This is best-effort. If this proxy is down, we fall back to no embed.
    try {
      const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
      const r2 = await fetch(proxied, { method: 'GET' })
      if (!r2.ok) return null
      return await r2.text()
    } catch {
      return null
    }
  }
}

/**
 * Resolve a Rumble page URL to an embeddable iframe src.
 *
 * Why:
 * - Rumble embeds commonly require publisher params (`pub=...`) and sometimes
 *   the embed ID isn't trivially derivable from the page URL.
 * - Their oEmbed endpoint returns the correct iframe HTML.
 */
export async function resolveRumbleEmbedInfo(inputUrl: string): Promise<RumbleEmbedInfo | null> {
  const raw = (inputUrl ?? '').trim()
  if (!raw) return null

  if (embedCache.has(raw)) return embedCache.get(raw) ?? null
  embedCache.set(raw, null)

  try {
    const u = new URL(raw)
    const host = normalizeRumbleHost(u.hostname)
    if (host !== 'rumble.com') return null

    // If the user already pasted an embed URL, just normalize it.
    const directEmbed = normalizeEmbedUrl(u.toString())
    if (directEmbed) {
      const info: RumbleEmbedInfo = { src: directEmbed, width: 854, height: 480, thumbnailUrl: null }
      embedCache.set(raw, info)
      return info
    }

    // Use Rumble's oEmbed to get the correct iframe.
    const endpoint = new URL('https://rumble.com/api/Media/oembed.json')
    endpoint.searchParams.set('url', u.toString())

    const txt = await fetchTextWithFallback(endpoint.toString())
    if (!txt) return null

    const parsed = JSON.parse(txt) as Partial<{ html: string; width: number; height: number; thumbnail_url: string }>
    const src = extractIframeSrc(parsed?.html ?? '')
    const normalized = src ? normalizeEmbedUrl(src) : null
    if (!normalized) {
      embedCache.set(raw, null)
      return null
    }
    const w = typeof parsed.width === 'number' && Number.isFinite(parsed.width) ? Math.max(1, Math.floor(parsed.width)) : 854
    const h = typeof parsed.height === 'number' && Number.isFinite(parsed.height) ? Math.max(1, Math.floor(parsed.height)) : 480
    const thumb = typeof parsed.thumbnail_url === 'string' ? parsed.thumbnail_url.trim() : ''
    const info: RumbleEmbedInfo = { src: normalized, width: w, height: h, thumbnailUrl: thumb || null }
    embedCache.set(raw, info)
    return info
  } catch {
    return null
  }
}

