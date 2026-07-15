import { isPickaxPostUrl } from '~/utils/link-utils'

export type LinkMetadata = {
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
  siteName: string | null
}

export type GetLinkMetadataOptions = {
  signal?: AbortSignal
}

const cache = new Map<string, LinkMetadata | null>()
const inFlight = new Map<string, Promise<LinkMetadata | null>>()

function normalizeText(v: string | null | undefined): string | null {
  const s = (v ?? '').trim()
  return s ? s : null
}

/** OG/microlink alone is not enough for a deliberate Pickax post card. */
function isEnrichedPickaxMeta(meta: LinkMetadata): boolean {
  const img = (meta.imageUrl ?? '').toLowerCase()
  const site = (meta.siteName ?? '').trim()
  const body = (meta.description ?? '').trim()
  const title = (meta.title ?? '').trim()
  return Boolean(body && title && !/posted\.?$/i.test(title) && (
    img.includes('img.pickax.com') ||
    site.startsWith('@') ||
    /^pickax(?:\.com)?$/i.test(site)
  ))
}

function isAbortError(e: unknown): boolean {
  const name = (e as { name?: string } | null | undefined)?.name
  return name === 'AbortError' || name === 'TimeoutError'
}

type MicrolinkResponse = {
  status: 'success' | 'error'
  data?: {
    url?: string
    title?: string
    description?: string
    publisher?: string
    author?: string
    image?: { url?: string } | { url?: string }[]
  }
}

function microlinkEndpoint(targetUrl: string): string {
  const u = new URL('https://api.microlink.io/')
  u.searchParams.set('url', targetUrl)
  // Keep response small.
  u.searchParams.set('screenshot', 'false')
  return u.toString()
}

function parseJinaReaderTitle(md: string): string | null {
  const m = (md ?? '').toString().match(/^\s*Title:\s*(.+)\s*$/m)
  return normalizeText(m?.[1])
}

function parseJinaReaderFirstImage(md: string): string | null {
  const m = (md ?? '').toString().match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i)
  return normalizeText(m?.[1])
}

function isPickaxGatedMarkdown(md: string): boolean {
  const text = (md ?? '').toString()
  const signals = [
    /Own your audience\.\s*Post without algorithms/i,
    /Email\s*\*/,
    /Password\s*\*/,
    /Free to join\.\s*No algorithms/i,
    /No algorithms or shadow bans/i,
    /Anti-Robot check/i,
  ]
  let hits = 0
  for (const re of signals) {
    if (re.test(text)) hits++
    if (hits >= 2) return true
  }
  return false
}

function parsePickaxBodyFromJina(md: string): string | null {
  if (isPickaxGatedMarkdown(md)) return null
  const marker = /Markdown Content:\s*/i.exec(md)
  const section = marker?.index != null ? md.slice(marker.index + marker[0].length) : md
  const author = section.match(
    /\[!\[[^\]]*\]\((https:\/\/img\.pickax\.com\/[^)\s]+)\)\]\((https:\/\/(?:www\.)?pickax\.com\/[^)\s]+)\)/i,
  )
  const beforeAuthor = author?.index != null
    ? section.slice(0, author.index).replace(/^\s*Warning:.*$/gim, '').trim()
    : ''
  const bodyStart = author?.index != null && !beforeAuthor
    ? section.slice(author.index + author[0].length)
    : section
  const nextReply = bodyStart.search(
    /\[!\[[^\]]*\]\(https:\/\/img\.pickax\.com\/user-[^)\s]+\)\]\(https:\/\/(?:www\.)?pickax\.com\/[^)\s]+\)/i,
  )
  const body = (nextReply >= 0 ? bodyStart.slice(0, nextReply) : bodyStart)
    .replace(/^\s*(?:Title|URL Source|Markdown Content):.*$/gim, '')
    .replace(/^\s*Warning:.*$/gim, '')
    .replace(/\[([^\]]+)\]\(https?:\/\/(?:www\.)?pickax\.com\/[^)\s]+\)/gi, '$1')
    .replace(/^\s*\u00ad\s*$/gm, '')
    .trim()
  return normalizeText(body)
}

export async function getLinkMetadata(url: string, opts: GetLinkMetadataOptions = {}): Promise<LinkMetadata | null> {
  const key = (url ?? '').trim()
  if (!key) return null

  if (cache.has(key)) {
    const cached = cache.get(key) ?? null
    if (!(isPickaxPostUrl(key) && cached && !isEnrichedPickaxMeta(cached))) {
      return cached
    }
    cache.delete(key)
  }
  if (inFlight.has(key)) return await inFlight.get(key)!

  const job = (async () => {
    // Default: cache failures too, so we don't hammer the proxy.
    cache.set(key, null)

    try {
      const u = new URL(key)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null

      // Prefer backend endpoint first so we reuse the shared DB cache.
      // Third-party proxies (Microlink, Jina Reader) are best-effort fallbacks.
      try {
        if (!import.meta.client) throw new Error('client-only')
        const { apiFetchData } = useApiClient()
        const data = await apiFetchData<LinkMetadata | null>('/link-metadata', {
          method: 'GET',
          query: { url: u.toString() },
          signal: opts.signal,
          mohDedupe: true,
        })
        if (data) {
          const meta: LinkMetadata = {
            url: normalizeText(data.url) ?? u.toString(),
            title: normalizeText(data.title),
            description: normalizeText(data.description),
            siteName: normalizeText(data.siteName),
            imageUrl: normalizeText(data.imageUrl),
          }
          // Weak Pickax OG (favicon / "X posted") — keep trying client enrichers.
          if (!(isPickaxPostUrl(meta.url) && !isEnrichedPickaxMeta(meta))) {
            cache.set(key, meta)
            return meta
          }
        }
      } catch (e: unknown) {
        if (isAbortError(e)) {
          cache.delete(key)
          return null
        }
        // Fall through to third-party fallbacks.
      }

      // Best-effort client-side fallbacks when the backend returns nothing:
      // 1) Microlink (popular metadata API; returns OG/Twitter reliably).
      // 2) Jina Reader (gives us at least a title + some images for many sites).
      try {
        const r = await fetch(microlinkEndpoint(u.toString()), { method: 'GET', signal: opts.signal })
        if (r.ok) {
          const json = (await r.json()) as MicrolinkResponse
          if (json?.status === 'success' && json.data) {
            const img =
              Array.isArray(json.data.image) ? json.data.image?.[0]?.url : (json.data.image as { url?: string } | undefined)?.url
            const meta: LinkMetadata = {
              url: normalizeText(json.data.url) ?? u.toString(),
              title: normalizeText(json.data.title),
              description: normalizeText(json.data.description),
              siteName: normalizeText(json.data.publisher) ?? normalizeText(json.data.author),
              imageUrl: normalizeText(img),
            }
            if (!(isPickaxPostUrl(meta.url) && !isEnrichedPickaxMeta(meta))) {
              cache.set(key, meta)
              return meta
            }
            // Weak Pickax microlink — fall through to Jina for avatar/handle.
          }
        }
      } catch (e: unknown) {
        if (isAbortError(e)) {
          cache.delete(key)
          return null
        }
        // Fall through to Jina Reader.
      }

      const proxied = `https://r.jina.ai/${u.toString()}`
      const res = await fetch(proxied, { method: 'GET', signal: opts.signal })
      if (!res.ok) return null
      const md = await res.text()

      // Jina can return Pickax's signup/auth wall instead of the post content.
      if (isPickaxPostUrl(u.toString()) && isPickaxGatedMarkdown(md)) return null

      const title = parseJinaReaderTitle(md)
      const imageUrl = parseJinaReaderFirstImage(md)

      let meta: LinkMetadata = {
        url: u.toString(),
        title,
        description: null,
        siteName: normalizeText(u.hostname.replace(/^www\./, '')),
        imageUrl,
      }

      if (isPickaxPostUrl(u.toString())) {
        const author = md.match(
          /!\[[^\]]*\]\((https:\/\/img\.pickax\.com\/[^)\s]+)\)\]\((https:\/\/(?:www\.)?pickax\.com\/([^)/\s?#]+))\)/i,
        )
        const avatarUrl = normalizeText(author?.[1] ?? null) ?? imageUrl
        const username = normalizeText(author?.[3] ?? null)
        const handle =
          username && !/^(post|api|login|signup|settings|top-users)$/i.test(username)
            ? `@${username}`
            : null
        const authorName = title?.replace(/\s+posted\.?$/i, '').trim() || title
        meta = {
          url: u.toString(),
          title: normalizeText(authorName),
          description: parsePickaxBodyFromJina(md),
          siteName: handle ?? meta.siteName,
          imageUrl: avatarUrl?.includes('img.pickax.com') ? avatarUrl : null,
        }
      }

      cache.set(key, meta)
      return meta
    } catch (e: unknown) {
      if (isAbortError(e)) {
        cache.delete(key)
        return null
      }
      return null
    }
  })()

  inFlight.set(key, job)
  try {
    return await job
  } finally {
    inFlight.delete(key)
  }
}
