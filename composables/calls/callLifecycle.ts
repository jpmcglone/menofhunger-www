/** First live video track id — remount the <video> when it changes (Safari letterboxes otherwise). */
export function callVideoAttachKey(stream: MediaStream | null | undefined): string {
  if (!stream) return 'none'
  const ids = stream.getVideoTracks().map((t) => t.id)
  return ids.length ? ids.join(',') : 'novideo'
}
