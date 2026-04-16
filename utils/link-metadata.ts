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

export async function getLinkMetadata(url: string, opts: GetLinkMetadataOptions = {}): Promise<LinkMetadata | null> {
  const key = (url ?? '').trim()
  if (!key) return null

  if (cache.has(key)) return cache.get(key) ?? null
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
          cache.set(key, meta)
          return meta
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
            cache.set(key, meta)
            return meta
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

      const title = parseJinaReaderTitle(md)
      const imageUrl = parseJinaReaderFirstImage(md)

      const meta: LinkMetadata = {
        url: u.toString(),
        title,
        description: null,
        siteName: normalizeText(u.hostname.replace(/^www\./, '')),
        imageUrl,
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
