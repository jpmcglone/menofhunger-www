/**
 * Picture-in-Picture for a video the member is already watching.
 * Chrome enters this from the media-session `enterpictureinpicture` action
 * when the tab is hidden. Other browsers get a direct request, which they
 * may reject when there is no user gesture.
 */

type WebkitVideo = HTMLVideoElement & {
  webkitSetPresentationMode?: (mode: 'inline' | 'picture-in-picture' | 'fullscreen') => void
  webkitPresentationMode?: string
}

type DocumentPictureInPicture = {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>
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

/** Move a YouTube or Rumble frame into a document Picture-in-Picture window. */
export async function requestEmbedPictureInPicture(frame: HTMLIFrameElement): Promise<boolean> {
  const api = (window as Window & { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture
  if (!api || !frame.isConnected) return false
  const parent = frame.parentElement
  if (!parent) return false
  try {
    const pip = await api.requestWindow({
      width: Math.max(320, frame.clientWidth || 480),
      height: Math.max(180, frame.clientHeight || 270),
    })
    pip.document.body.style.margin = '0'
    pip.document.body.style.background = '#000'
    pip.document.body.append(frame)
    frame.style.width = '100%'
    frame.style.height = '100vh'
    const restore = () => { if (frame.parentElement !== parent) parent.append(frame) }
    pip.addEventListener('pagehide', restore, { once: true })
    return true
  } catch {
    if (frame.parentElement !== parent) parent.append(frame)
    return false
  }
}
