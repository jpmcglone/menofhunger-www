export type SpotifyContent = { kind: string; id: string; url: string; embedUrl: string; height: number }

/** Only construct player URLs from supported Spotify entities, never provider HTML. */
export function spotifyContent(raw: string | null | undefined): SpotifyContent | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null
    if (!['open.spotify.com', 'play.spotify.com'].includes(url.hostname.toLowerCase())) return null
    let path = url.pathname.replace(/^\/intl-[a-z-]+\//i, '/').replace(/^\/embed\//, '/')
    path = path.replace(/^\/user\/[^/]+\/playlist\//, '/playlist/')
    const match = path.match(/^\/(track|album|artist|playlist|episode|show)\/([a-zA-Z0-9]{22})\/?$/)
    if (!match) return null
    const [, kind, id] = match as [string, string, string]
    const canonical = `https://open.spotify.com/${kind}/${id}`
    return { kind, id, url: canonical, embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator`, height: ['track', 'episode'].includes(kind) ? 152 : 352 }
  } catch { return null }
}

export function isSpotifyShareUrl(raw: string | null | undefined): boolean {
  try {
    const url = new URL(raw ?? '')
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && ['spotify.link', 'spoti.fi'].includes(url.hostname.toLowerCase()) && url.pathname !== '/'
  } catch { return false }
}
