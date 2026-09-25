/**
 * OS picture-in-picture for an in-progress call. iOS Safari / Chrome will freeze
 * or drop the tab when the user switches apps; a playing <video> can stay on screen
 * if we request PiP before the page is suspended.
 *
 * Sources register themselves (the on-screen remote tile, plus a CallHost fallback
 * that stays mounted when the overlay is minimized).
 */

type WebkitVideo = HTMLVideoElement & {
  webkitSetPresentationMode?: (mode: 'inline' | 'picture-in-picture' | 'fullscreen') => void
  webkitPresentationMode?: string
}

const sources = new Set<HTMLVideoElement>()

export function registerCallPipSource(el: HTMLVideoElement | null | undefined): () => void {
  if (!el) return () => {}
  sources.add(el)
  return () => {
    sources.delete(el)
  }
}

function hasFrames(el: HTMLVideoElement): boolean {
  return el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && el.videoWidth > 0
}

export function pickCallPipSource(opts: { requireFrames?: boolean } = {}): HTMLVideoElement | null {
  let fallback: HTMLVideoElement | null = null
  for (const el of sources) {
    if (!el.isConnected) continue
    fallback = el
    if (hasFrames(el)) return el
  }
  return opts.requireFrames ? null : fallback
}

function pageIsVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible'
}

/** This element is the one in the OS picture-in-picture window. */
export function isInCallPictureInPicture(el: HTMLVideoElement | null | undefined): boolean {
  if (!el || typeof document === 'undefined') return false
  return document.pictureInPictureElement === el || (el as WebkitVideo).webkitPresentationMode === 'picture-in-picture'
}

export function canUseCallPictureInPicture(): boolean {
  if (typeof document === 'undefined') return false
  if (document.pictureInPictureEnabled) return true
  return typeof (HTMLVideoElement.prototype as WebkitVideo).webkitSetPresentationMode === 'function'
}

export async function enterCallPictureInPicture(): Promise<boolean> {
  if (typeof document === 'undefined') return false
  if (document.pictureInPictureElement) return true
  // A black floating window is worse than none: only float a tile that is showing video.
  const el = pickCallPipSource({ requireFrames: true })
  if (!el) return false
  try {
    if (document.pictureInPictureEnabled && typeof el.requestPictureInPicture === 'function') {
      await el.requestPictureInPicture()
      // A quick app switch can return before the request settles; don't strand the tile in PiP.
      if (pageIsVisible()) await exitCallPictureInPicture()
      return true
    }
  } catch {
    // Not a user gesture, or the stream has no video yet — try the Safari prefix.
  }
  const webkit = el as WebkitVideo
  try {
    if (typeof webkit.webkitSetPresentationMode === 'function') {
      webkit.webkitSetPresentationMode('picture-in-picture')
      return webkit.webkitPresentationMode === 'picture-in-picture'
    }
  } catch {
    return false
  }
  return false
}

export async function exitCallPictureInPicture(): Promise<void> {
  if (typeof document === 'undefined') return
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture()
  } catch {
    // Already left PiP.
  }
  for (const source of sources) {
    const el = source as WebkitVideo
    try {
      if (el.webkitPresentationMode === 'picture-in-picture') el.webkitSetPresentationMode?.('inline')
    } catch {
      // Already inline.
    }
  }
}
