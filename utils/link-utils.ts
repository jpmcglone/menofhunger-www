import LinkifyIt from 'linkify-it'

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

