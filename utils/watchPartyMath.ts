import type { WatchPartyState } from '~/types/api'

/**
 * Extract the YouTube video ID from a URL (both youtu.be and watch?v= forms).
 * Returns null when the URL is invalid or has no recognisable ID.
 */
export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null
    return u.searchParams.get('v') || null
  } catch {
    return null
  }
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
