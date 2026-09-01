/**
 * Pure quality-tier logic for outgoing video. Kept free of WebRTC objects so the
 * hysteresis can be unit tested; `useCallQualityManager` wires it to real senders.
 */

export type VideoQualityTier = {
  label: string
  maxBitrate: number
  maxFramerate: number
  scaleResolutionDownBy: number
  /** false → stop sending video entirely (audio-only). Audio always keeps flowing. */
  active: boolean
}

/** 720p30 → 540p24 → 360p15 → 240p12 → audio-only. Index is the tier. */
export const VIDEO_QUALITY_TIERS: readonly VideoQualityTier[] = [
  { label: '720p', maxBitrate: 1_500_000, maxFramerate: 30, scaleResolutionDownBy: 1, active: true },
  { label: '540p', maxBitrate: 900_000, maxFramerate: 24, scaleResolutionDownBy: 4 / 3, active: true },
  { label: '360p', maxBitrate: 500_000, maxFramerate: 15, scaleResolutionDownBy: 2, active: true },
  { label: '240p', maxBitrate: 250_000, maxFramerate: 12, scaleResolutionDownBy: 3, active: true },
  { label: 'audio only', maxBitrate: 0, maxFramerate: 0, scaleResolutionDownBy: 1, active: false },
]

export const AUDIO_ONLY_TIER = VIDEO_QUALITY_TIERS.length - 1

/** Consecutive bad samples before stepping down. Samples are ~2s apart. */
export const DOWNGRADE_AFTER_BAD_SAMPLES = 3
/** Consecutive good samples before stepping back up (slow to recover, fast to protect audio). */
export const UPGRADE_AFTER_GOOD_SAMPLES = 10

/**
 * With 3–4 peers every participant uploads N-1 streams, so the ceiling drops to 540p
 * to keep total upstream in a range home connections can sustain.
 */
export function topTierFor(peerCount: number): number {
  return peerCount >= 2 ? 1 : 0
}

export type QualitySample = {
  /** Fraction of our outgoing video packets the peer reported lost (0..1). */
  fractionLost: number | null
  /** Round-trip time to the peer in seconds. */
  rttSeconds: number | null
  /** Chrome/Firefox `outbound-rtp.qualityLimitationReason`. */
  limitation: string | null
}

export function isBadSample(s: QualitySample): boolean {
  if (s.fractionLost !== null && s.fractionLost > 0.05) return true
  if (s.rttSeconds !== null && s.rttSeconds > 0.4) return true
  if (s.limitation === 'bandwidth') return true
  return false
}

export type QualityCounters = { bad: number; good: number }

export type QualityDecision = {
  tier: number
  counters: QualityCounters
  changed: boolean
}

/**
 * Hysteresis step. Bad and good streaks reset each other so a single flicker never
 * bounces the tier; any change resets both streaks so we settle before moving again.
 */
export function nextQualityTier(params: {
  currentTier: number
  counters: QualityCounters
  bad: boolean
  topTier: number
}): QualityDecision {
  const { bad, topTier } = params
  const current = Math.max(topTier, Math.min(AUDIO_ONLY_TIER, params.currentTier))
  let { bad: badStreak, good: goodStreak } = params.counters

  if (bad) {
    badStreak += 1
    goodStreak = 0
  } else {
    goodStreak += 1
    badStreak = 0
  }

  if (badStreak >= DOWNGRADE_AFTER_BAD_SAMPLES && current < AUDIO_ONLY_TIER) {
    return { tier: current + 1, counters: { bad: 0, good: 0 }, changed: true }
  }
  if (goodStreak >= UPGRADE_AFTER_GOOD_SAMPLES && current > topTier) {
    return { tier: current - 1, counters: { bad: 0, good: 0 }, changed: true }
  }
  // Peer count dropped and the ceiling rose/fell: clamp immediately.
  const changed = current !== params.currentTier
  return { tier: current, counters: { bad: badStreak, good: goodStreak }, changed }
}

/** Coarse 0–3 indicator for the UI (3 = great). */
export function qualityBarsFor(tier: number): 0 | 1 | 2 | 3 {
  if (tier <= 0) return 3
  if (tier <= 1) return 2
  if (tier <= 3) return 1
  return 0
}

/** Pull the fields we care about out of a `getStats()` report for one peer connection. */
export function sampleFromStatsReport(report: Iterable<Record<string, unknown>>): QualitySample {
  let fractionLost: number | null = null
  let rttSeconds: number | null = null
  let limitation: string | null = null

  for (const stat of report) {
    const type = stat.type
    if (type === 'remote-inbound-rtp' && stat.kind === 'video') {
      const fl = stat.fractionLost
      if (typeof fl === 'number' && Number.isFinite(fl)) fractionLost = Math.max(fractionLost ?? 0, fl)
      const rtt = stat.roundTripTime
      if (typeof rtt === 'number' && Number.isFinite(rtt)) rttSeconds = Math.max(rttSeconds ?? 0, rtt)
    } else if (type === 'candidate-pair' && (stat.nominated === true || stat.state === 'succeeded')) {
      const rtt = stat.currentRoundTripTime
      if (typeof rtt === 'number' && Number.isFinite(rtt)) rttSeconds = rttSeconds === null ? rtt : Math.max(rttSeconds, rtt)
    } else if (type === 'outbound-rtp' && stat.kind === 'video') {
      const reason = stat.qualityLimitationReason
      if (typeof reason === 'string' && reason !== 'none') limitation = reason
    }
  }

  return { fractionLost, rttSeconds, limitation }
}
