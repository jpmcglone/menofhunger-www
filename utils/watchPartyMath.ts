import type { WatchPartyState } from '~/types/api'

/**
 * Extract the YouTube video ID from a URL (both youtu.be and watch?v= forms).
 * Returns null when the URL is invalid or has no recognisable ID.
 */
export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0] ?? ''
      return id || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return v
      // /live/VIDEO_ID, /embed/VIDEO_ID, /shorts/VIDEO_ID
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length >= 2 && ['live', 'embed', 'shorts', 'v'].includes(parts[0]!)) {
        return parts[1] || null
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Where playback should be if it advanced smoothly since `from`.
 * Used to detect owner scrub jumps (Live DVR / VOD) vs natural time progress.
 */
export function expectedPlaybackTime(from: {
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  atMs: number
}, nowMs: number): number {
  if (!from.isPlaying) return from.currentTime
  const elapsedSec = Math.max(0, (nowMs - from.atMs) / 1000)
  return from.currentTime + elapsedSec * (from.playbackRate || 1)
}

/** True when `actualTime` is far enough from the expected timeline to count as a seek. */
export function isSeekJump(expectedTime: number, actualTime: number, thresholdSec = 1.25): boolean {
  return Math.abs(actualTime - expectedTime) > thresholdSec
}

/**
 * Return the drift-adjusted current time for a WatchPartyState.
 *
 * The server stores raw currentTime + the timestamp (updatedAt) when it
 * received the owner's control event. It does NOT pre-adjust currentTime
 * before broadcasting, so the client is responsible for the full elapsed
 * calculation. This keeps things correct for both real-time broadcasts
 * (updatedAt ≈ now, elapsed ≈ RTT) and delayed join responses (updatedAt
 * could be many seconds old).
 */
export function driftAdjustedTime(state: WatchPartyState): number {
  if (!state.isPlaying) return state.currentTime
  const updatedAtMs = Number(state.updatedAt)
  if (!updatedAtMs || !isFinite(updatedAtMs)) return state.currentTime
  const elapsedSec = Math.max(0, (Date.now() - updatedAtMs) / 1000)
  return state.currentTime + elapsedSec * state.playbackRate
}
