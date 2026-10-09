/** YouTube, Rumble, Vimeo, and embed-player link helpers (re-exported from utils/link-utils). */
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

export function getYouTubeEmbedUrl(
  url: string,
  opts?: { autoplay?: boolean; muted?: boolean; origin?: string },
): string | null {
  const info = parseYouTubeUrl(url)
  if (!info) return null

  const params = new URLSearchParams({
    autoplay: opts?.autoplay ? '1' : '0',
    mute: opts?.autoplay && opts?.muted !== false ? '1' : '0',
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
  })
  if (info.startSeconds != null) params.set('start', String(info.startSeconds))
  if (opts?.origin) params.set('origin', opts.origin)

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

export type MediaPreviewKind = 'video' | 'image'

export type MediaPreviewInfo = {
  kind: MediaPreviewKind
  provider: string
}

const VIDEO_PREVIEW_HOSTS: Record<string, string> = {
  'youtube.com': 'YouTube',
  'm.youtube.com': 'YouTube',
  'music.youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'rumble.com': 'Rumble',
  'vimeo.com': 'Vimeo',
  'player.vimeo.com': 'Vimeo',
  'twitch.tv': 'Twitch',
  'clips.twitch.tv': 'Twitch',
  'm.twitch.tv': 'Twitch',
  'streamable.com': 'Streamable',
  'tiktok.com': 'TikTok',
  'vm.tiktok.com': 'TikTok',
  'dailymotion.com': 'Dailymotion',
  'dai.ly': 'Dailymotion',
}

const IMAGE_PREVIEW_HOSTS: Record<string, string> = {
  'imgur.com': 'Imgur',
  'i.imgur.com': 'Imgur',
  'giphy.com': 'Giphy',
  'media.giphy.com': 'Giphy',
  'i.giphy.com': 'Giphy',
  'tenor.com': 'Tenor',
  'media.tenor.com': 'Tenor',
  'i.redd.it': 'Reddit',
  'preview.redd.it': 'Reddit',
}

const DIRECT_IMAGE_PATH = /\.(?:jpe?g|png|gif|webp|avif)$/i

function previewHost(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

/** YouTube, Rumble, Vimeo, Twitch, Imgur, and other common video/image shares. */
export function parseMediaPreviewUrl(url: string): MediaPreviewInfo | null {
  if (parseYouTubeUrl(url)) return { kind: 'video', provider: 'YouTube' }
  const host = previewHost(url)
  if (!host) return null
  if (host.endsWith('.tiktok.com')) return { kind: 'video', provider: 'TikTok' }
  if (VIDEO_PREVIEW_HOSTS[host]) return { kind: 'video', provider: VIDEO_PREVIEW_HOSTS[host] }
  if (IMAGE_PREVIEW_HOSTS[host]) return { kind: 'image', provider: IMAGE_PREVIEW_HOSTS[host] }
  try {
    const path = new URL(url).pathname
    if (DIRECT_IMAGE_PATH.test(path)) return { kind: 'image', provider: host }
  } catch {
    return null
  }
  return null
}

export function vimeoOEmbedRequestUrl(url: string): string | null {
  const host = previewHost(url)
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null
  return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
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

/** Portrait embeds are capped at this height; width follows the encoded aspect. */
export const PORTRAIT_EMBED_MAX_HEIGHT_PX = 480

/**
 * Explicit frame width for a portrait embed. Must NOT use a percentage inside a
 * fit-content parent: `min(100%, …)` is a cyclic percentage there, so the frame
 * shrank to the width of its sibling text until the iframe mounted, then grew.
 */
export function portraitEmbedFrameStyle(width: number, height: number): { width: string; maxWidth: string } {
  const w = Number.isFinite(width) && width > 0 ? width : 9
  const h = Number.isFinite(height) && height > 0 ? height : 16
  return { width: `calc(${PORTRAIT_EMBED_MAX_HEIGHT_PX}px * ${w} / ${h})`, maxWidth: '100%' }
}

/** True when a body link and a server-resolved embed URL refer to the same page. */
export function sameNormalizedUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  try {
    return new URL(a).toString() === new URL(b).toString()
  } catch {
    return false
  }
}

/** Drop autoplay so a cached embed URL stays paused until the viewer starts it. */
export function pausedRumbleEmbedUrl(embedUrl: string): string {
  try {
    const u = new URL(embedUrl)
    u.searchParams.delete('autoplay')
    return u.toString()
  } catch {
    return embedUrl
  }
}

/** Rumble `autoplay=2` is muted autoplay (1 is with sound). */
export function withRumbleAutoplay(
  embedUrl: string,
  opts?: { autoplay?: boolean; muted?: boolean },
): string {
  if (!opts?.autoplay) return embedUrl
  try {
    const u = new URL(embedUrl)
    u.searchParams.set('autoplay', opts.muted === false ? '1' : '2')
    // Third-party embeds need a pub id or Rumble often ignores autoplay.
    if (!u.searchParams.get('pub')) u.searchParams.set('pub', '7a20')
    return u.toString()
  } catch {
    return embedUrl
  }
}

/** Handshake so the YouTube iframe will accept subsequent `command` messages. */
export function youtubeListeningCommand(): string {
  return JSON.stringify({ event: 'listening' })
}

/** YouTube IFrame API mute command. Parent page → embed iframe. */
export function youtubeMuteCommand(muted: boolean): string {
  return JSON.stringify({
    event: 'command',
    func: muted ? 'mute' : 'unMute',
    args: [],
  })
}

/** YouTube IFrame API play command. Used after load when URL autoplay is ignored. */
export function youtubePlayCommand(): string {
  return JSON.stringify({
    event: 'command',
    func: 'playVideo',
    args: [],
  })
}

/** Send a YouTube iframe command after the required `listening` handshake. */
export function postYouTubeIframeCommand(win: Window, commandJson: string): void {
  win.postMessage(youtubeListeningCommand(), '*')
  win.postMessage(commandJson, '*')
}

export function clampMediaVolume(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(1, n))
}

export function mediaVolumeToPercent(n: number): number {
  return Math.round(clampMediaVolume(n) * 100)
}

/** YouTube IFrame API volume is 0–100. */
export function youtubeVolumeCommand(volume01: number): string {
  return JSON.stringify({
    event: 'command',
    func: 'setVolume',
    args: [mediaVolumeToPercent(volume01)],
  })
}

/** Rumble embed mute/unmute. Best-effort — their iframe has no public IFrame API. */
export function rumbleMuteCommand(muted: boolean): { event: string; func: string; args: [] } {
  return {
    event: 'command',
    func: muted ? 'mute' : 'unmute',
    args: [],
  }
}

export function rumbleVolumeCommand(volume01: number): { event: string; func: string; args: [number] } {
  return {
    event: 'command',
    func: 'setVolume',
    args: [mediaVolumeToPercent(volume01)],
  }
}

/** Post a mute command into a Rumble embed without rewriting `iframe.src`. */
export function postRumbleIframeCommand(win: Window, muted: boolean): void {
  const cmd = rumbleMuteCommand(muted)
  win.postMessage(JSON.stringify(cmd), '*')
  win.postMessage(cmd, '*')
}

/** Post a volume command into a Rumble embed without rewriting `iframe.src`. */
export function postRumbleIframeVolume(win: Window, volume01: number): void {
  const cmd = rumbleVolumeCommand(volume01)
  win.postMessage(JSON.stringify(cmd), '*')
  win.postMessage(cmd, '*')
}

/**
 * Best-effort parse of YouTube/Rumble iframe `postMessage` audio state.
 * Iframe players report volume as 0–100; values ≤ 1 are treated as 0–1.
 */
export function parseEmbedPlayerAudio(data: unknown): { volume01?: number; muted?: boolean } | null {
  let payload: unknown = data
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      return null
    }
  }
  if (!payload || typeof payload !== 'object') return null
  const rec = payload as Record<string, unknown>
  const info = (rec.info && typeof rec.info === 'object' ? rec.info : rec) as Record<string, unknown>
  const rawVol = info.volume ?? info.vol
  const rawMuted = info.muted ?? info.isMuted
  const out: { volume01?: number; muted?: boolean } = {}
  if (typeof rawVol === 'number' && Number.isFinite(rawVol)) {
    out.volume01 = rawVol > 1 ? rawVol / 100 : rawVol
  }
  if (typeof rawMuted === 'boolean') out.muted = rawMuted
  if (out.volume01 == null && out.muted == null) return null
  return out
}
