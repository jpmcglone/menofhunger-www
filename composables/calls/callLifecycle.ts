/**
 * pagehide also fires on iOS when the user switches apps, takes a phone call, or
 * the browser snapshots the tab. WebRTC pages usually cannot enter bfcache, so
 * `event.persisted` is false even though the user is coming back. Hanging up there
 * is what made reconnect feel impossible.
 *
 * beforeunload is the desktop "this tab is actually closing" signal.
 */
export function shouldHangUpCallOnPageLifecycle(type: 'pagehide' | 'beforeunload'): boolean {
  return type === 'beforeunload'
}

/** First live video track id — remount the <video> when it changes (Safari letterboxes otherwise). */
export function callVideoAttachKey(stream: MediaStream | null | undefined): string {
  if (!stream) return 'none'
  const ids = stream.getVideoTracks().map((t) => t.id)
  return ids.length ? ids.join(',') : 'novideo'
}
