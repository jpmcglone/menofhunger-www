/** Dev-facing call media breadcrumbs. Filter the console by `[moh-call]`. */

export type CallMediaTrackInfo = {
  id: string
  kind: string
  enabled: boolean
  muted: boolean
  readyState: string
} | null

export function callMediaTrackInfo(track: MediaStreamTrack | null | undefined): CallMediaTrackInfo {
  if (!track) return null
  return {
    id: track.id,
    kind: track.kind,
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
  }
}

export function callMediaTransceiverInfo(t: RTCRtpTransceiver | null | undefined) {
  if (!t) return null
  return {
    mid: t.mid,
    dir: t.direction,
    current: t.currentDirection,
    send: callMediaTrackInfo(t.sender.track),
    recv: callMediaTrackInfo(t.receiver.track),
  }
}

/** `m=` kinds in SDP order — the 2-vs-3 mismatch maps camera onto screen. */
export function callMediaSdpMLines(sdp?: string | null): string[] {
  if (!sdp) return []
  return [...sdp.matchAll(/^m=(\S+)/gm)].map((m) => m[1] ?? '')
}

export function callMediaLog(event: string, details: Record<string, unknown> = {}): void {
  if (!import.meta.client) return
  // warn (not info): eslint allows warn/error, and this is the filter string for Console.app / Chrome.
  console.warn(`[moh-call] ${event}`, details)
}
