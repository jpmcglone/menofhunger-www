/**
 * Picture-in-Picture for a video the member is already watching.
 * Chrome enters this from the media-session `enterpictureinpicture` action
 * when the tab is hidden. Other browsers get a direct request, which they
 * may reject when there is no user gesture.
 *
 * A YouTube frame cannot be moved into that window: the browser throws the
 * embed away and loads a blank one. Open a new embed there instead.
 */
import { postYouTubeIframeCommand, youtubeMuteCommand, youtubePlayCommand } from '~/utils/link-utils'

type WebkitVideo = HTMLVideoElement & {
  webkitSetPresentationMode?: (mode: 'inline' | 'picture-in-picture' | 'fullscreen') => void
  webkitPresentationMode?: string
}

export function videoSupportsPictureInPicture(el: HTMLVideoElement): boolean {
  if (typeof document === 'undefined' || el.disablePictureInPicture) return false
  if (document.pictureInPictureEnabled && typeof el.requestPictureInPicture === 'function') return true
  return typeof (el as WebkitVideo).webkitSetPresentationMode === 'function'
}

export async function requestVideoPictureInPicture(el: HTMLVideoElement): Promise<boolean> {
  if (!videoSupportsPictureInPicture(el) || el.ended) return false
  if (document.pictureInPictureElement === el) return true
  if (el.paused) {
    try { await el.play() } catch { return false }
  }
  try {
    if (document.pictureInPictureEnabled && typeof el.requestPictureInPicture === 'function') {
      await el.requestPictureInPicture()
      return document.pictureInPictureElement === el
    }
  } catch {
    // The browser refused a gesture-less request. The media-session path may still succeed.
  }
  const webkit = el as WebkitVideo
  try {
    webkit.webkitSetPresentationMode?.('picture-in-picture')
    return webkit.webkitPresentationMode === 'picture-in-picture'
  } catch {
    return false
  }
}

export function youtubePictureInPictureEmbedUrl(videoId: string, startSeconds: number, muted: boolean, origin: string): string | null {
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) return null
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
    origin,
  })
  const start = Math.floor(startSeconds)
  if (start > 0) params.set('start', String(start))
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`
}

type PictureWindow = Window & { document: Document }
type DocumentPictureInPicture = {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<PictureWindow>
  window: PictureWindow | null
}

function pictureInPictureApi(): DocumentPictureInPicture | null {
  return (window as Window & { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture ?? null
}

let opening: Promise<boolean> | null = null

/** Play the same YouTube video in a document Picture-in-Picture window, from the current time. */
export function openYouTubePictureInPicture(options: {
  videoId: string
  startSeconds: number
  muted: boolean
  width?: number
  height?: number
  onClose?: (seconds: number) => void
}): Promise<boolean> {
  const api = pictureInPictureApi()
  const src = youtubePictureInPictureEmbedUrl(options.videoId, options.startSeconds, options.muted, location.origin)
  if (!api || !src) return Promise.resolve(false)
  if (api.window) return Promise.resolve(true)
  if (opening) return opening
  const started = Date.now()
  opening = openYouTubeWindow(api, src, options, started).finally(() => { opening = null })
  return opening
}

async function openYouTubeWindow(
  api: DocumentPictureInPicture,
  src: string,
  options: { startSeconds: number; muted: boolean; width?: number; height?: number; onClose?: (seconds: number) => void },
  started: number,
): Promise<boolean> {
  try {
    const pip = await api.requestWindow({
      width: Math.max(320, Math.round(options.width || 640)),
      height: Math.max(180, Math.round(options.height || 360)),
    })
    const doc = pip.document
    const style = doc.createElement('style')
    style.textContent = 'html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}'
    const referrer = doc.createElement('meta')
    referrer.name = 'referrer'
    referrer.content = 'strict-origin-when-cross-origin'
    doc.head.append(referrer, style)
    const frame = doc.createElement('iframe')
    frame.src = src
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    frame.referrerPolicy = 'strict-origin-when-cross-origin'
    frame.allowFullscreen = true
    frame.title = 'Video'
    frame.addEventListener('load', () => {
      const kick = () => {
        const target = frame.contentWindow
        if (!target) return
        postYouTubeIframeCommand(target, youtubePlayCommand())
        postYouTubeIframeCommand(target, youtubeMuteCommand(options.muted))
      }
      kick()
      pip.setTimeout(kick, 400)
      pip.setTimeout(kick, 1200)
    })
    doc.body.append(frame)
    const fit = () => { frame.style.height = `${pip.innerHeight}px` }
    fit()
    pip.addEventListener('resize', fit)
    pip.addEventListener('pagehide', () => {
      options.onClose?.(options.startSeconds + (Date.now() - started) / 1000)
    }, { once: true })
    return true
  } catch {
    return false
  }
}
