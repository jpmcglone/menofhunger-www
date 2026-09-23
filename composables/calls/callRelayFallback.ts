import { selectedIcePairs, type IcePathKind } from './callQuality'
import type { RtcIceServer } from '~/types/api'

/**
 * WebRTC keeps a working direct (STUN) path even when that path is lossy. A long-distance
 * home ↔ cellular route can drop packets that Cloudflare's relay network would carry
 * cleanly, so a sustained lossy or slow STUN path is moved onto TURN for that peer only.
 * Mirrors iOS `RelayFallback`.
 */

/** Consecutive troubled ~2s samples on a STUN path before moving it to the relay. */
export const RELAY_AFTER_TROUBLED_SAMPLES = 5
/** The relay must be the selected path by then, or we return to normal ICE. */
export const RELAY_CONFIRM_MS = 12_000

export type PathSample = { fractionLost: number | null; rttSeconds: number | null }

/** Loss or delay a relay can fix. Bandwidth limits are not: the same uplink feeds both paths. */
export function isPathTrouble(s: PathSample): boolean {
  return (s.fractionLost !== null && s.fractionLost > 0.05) || (s.rttSeconds !== null && s.rttSeconds > 0.4)
}

/** Host paths share a LAN, and relayed paths are already on TURN; only STUN paths count. */
export function nextRelayStreak(streak: number, path: IcePathKind | null, trouble: boolean): number {
  return path === 'stun' && trouble ? streak + 1 : 0
}

export function hasRelayServer(servers: RtcIceServer[]): boolean {
  return servers.some((s) => s.urls.some((u) => /^turns?:/i.test(u)))
}

/** Loss on any outgoing stream (audio-only calls have no video report) and the selected pair's RTT. */
export function pathSampleFromStats(stats: Record<string, unknown>[]): PathSample {
  const selected = new Set(selectedIcePairs(stats))
  let fractionLost: number | null = null
  let rttSeconds: number | null = null
  for (const stat of stats) {
    if (stat.type === 'remote-inbound-rtp') {
      const fl = stat.fractionLost
      if (typeof fl === 'number' && Number.isFinite(fl)) fractionLost = Math.max(fractionLost ?? 0, fl)
      const rtt = stat.roundTripTime
      if (typeof rtt === 'number' && Number.isFinite(rtt)) rttSeconds = Math.max(rttSeconds ?? 0, rtt)
    } else if (stat.type === 'candidate-pair' && selected.has(stat)) {
      const rtt = stat.currentRoundTripTime
      if (typeof rtt === 'number' && Number.isFinite(rtt)) rttSeconds = Math.max(rttSeconds ?? 0, rtt)
    }
  }
  return { fractionLost, rttSeconds }
}
