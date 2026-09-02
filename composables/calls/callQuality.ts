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
  /** Chrome `outbound-rtp.targetBitrate` (bps): what congestion control is letting the encoder use. */
  targetBitrate: number | null
}

/** Below this share of our own `maxBitrate` cap, a `bandwidth` limitation is the network's doing. */
export const BANDWIDTH_LIMITED_RATIO = 0.6

/** Skip samples this long after a peer connects: BWE starts low and ramps, which reads as "bandwidth". */
export const QUALITY_WARMUP_MS = 8_000

/**
 * `capBitrate` is the tier's own `maxBitrate`. Chrome reports `qualityLimitationReason:
 * 'bandwidth'` whenever the encoder wants more than its target — including when *we* set that
 * cap — so without the comparison every tier below the top reads as bad and the ladder only
 * ever goes down.
 */
export function isBadSample(s: QualitySample, capBitrate: number | null = null): boolean {
  if (s.fractionLost !== null && s.fractionLost > 0.05) return true
  if (s.rttSeconds !== null && s.rttSeconds > 0.4) return true
  if (s.limitation === 'bandwidth') {
    if (s.targetBitrate === null || capBitrate === null || capBitrate <= 0) return false
    return s.targetBitrate < capBitrate * BANDWIDTH_LIMITED_RATIO
  }
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

export type IcePathKind = 'turn' | 'stun' | 'direct'

/** Either side on a relay → TURN; else srflx/prflx → STUN; else host → Direct. */
export function classifyIceTypes(
  localType: string | null | undefined,
  remoteType: string | null | undefined,
): IcePathKind | null {
  const types = [localType, remoteType].map((t) => t?.toLowerCase()).filter((t): t is string => Boolean(t))
  if (types.length === 0) return null
  if (types.some((t) => t === 'relay')) return 'turn'
  if (types.some((t) => t === 'srflx' || t === 'prflx')) return 'stun'
  if (types.some((t) => t === 'host')) return 'direct'
  return null
}

export function icePathLabel(kind: IcePathKind | null | undefined): string | null {
  if (kind === 'turn') return 'TURN'
  if (kind === 'stun') return 'STUN'
  if (kind === 'direct') return 'Direct'
  return null
}

/** Selected ICE pair type from a `getStats()` report. */
export function icePathFromStats(report: Iterable<Record<string, unknown>>): IcePathKind | null {
  const stats = [...report]
  const byId = new Map<string, Record<string, unknown>>()
  for (const s of stats) {
    if (typeof s.id === 'string') byId.set(s.id, s)
  }
  const pair = stats.find(
    (s) => s.type === 'candidate-pair' && (s.nominated === true || s.state === 'succeeded'),
  )
  if (!pair) return null
  const local = typeof pair.localCandidateId === 'string' ? byId.get(pair.localCandidateId) : undefined
  const remote = typeof pair.remoteCandidateId === 'string' ? byId.get(pair.remoteCandidateId) : undefined
  return classifyIceTypes(
    typeof local?.candidateType === 'string' ? local.candidateType : null,
    typeof remote?.candidateType === 'string' ? remote.candidateType : null,
  )
}

/** Pull the fields we care about out of a `getStats()` report for one peer connection. */
export function sampleFromStatsReport(report: Iterable<Record<string, unknown>>): QualitySample {
  let fractionLost: number | null = null
  let rttSeconds: number | null = null
  let limitation: string | null = null
  let targetBitrate: number | null = null

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
      const target = stat.targetBitrate
      if (typeof target === 'number' && Number.isFinite(target)) targetBitrate = target
    }
  }

  return { fractionLost, rttSeconds, limitation, targetBitrate }
}
