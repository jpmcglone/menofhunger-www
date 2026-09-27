/**
 * Picture-in-Picture for an uploaded video the member is already watching.
 * Chrome enters this from the media-session `enterpictureinpicture` action
 * when the tab is hidden. Other browsers get a direct request, which they
 * may reject when there is no user gesture.
 *
 * Embedded players stay in the page. Moving a YouTube frame into this window
 * replaces it, and coming back would seek.
 */

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

