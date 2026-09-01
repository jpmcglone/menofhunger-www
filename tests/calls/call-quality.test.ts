import { describe, expect, it } from 'vitest'
import {
  AUDIO_ONLY_TIER,
  DOWNGRADE_AFTER_BAD_SAMPLES,
  UPGRADE_AFTER_GOOD_SAMPLES,
  isBadSample,
  nextQualityTier,
  qualityBarsFor,
  sampleFromStatsReport,
  topTierFor,
  VIDEO_QUALITY_TIERS,
  type QualityCounters,
} from '~/composables/calls/callQuality'

function run(samples: boolean[], start = 0, topTier = 0) {
  let tier = start
  let counters: QualityCounters = { bad: 0, good: 0 }
  const changes: number[] = []
  for (const bad of samples) {
    const d = nextQualityTier({ currentTier: tier, counters, bad, topTier })
    tier = d.tier
    counters = d.counters
    if (d.changed) changes.push(d.tier)
  }
  return { tier, counters, changes }
}

describe('quality tiers', () => {
  it('ends in audio-only and the ladder is monotonic in bitrate', () => {
    expect(VIDEO_QUALITY_TIERS[AUDIO_ONLY_TIER]!.active).toBe(false)
    for (let i = 1; i < AUDIO_ONLY_TIER; i++) {
      expect(VIDEO_QUALITY_TIERS[i]!.maxBitrate).toBeLessThan(VIDEO_QUALITY_TIERS[i - 1]!.maxBitrate)
    }
  })

  it('caps the top tier at 540p for 3+ participants', () => {
    expect(topTierFor(1)).toBe(0)
    expect(topTierFor(2)).toBe(1)
    expect(topTierFor(3)).toBe(1)
  })
})

describe('hysteresis', () => {
  it('needs N consecutive bad samples to step down', () => {
    const { tier, changes } = run(Array(DOWNGRADE_AFTER_BAD_SAMPLES - 1).fill(true))
    expect(tier).toBe(0)
    expect(changes).toEqual([])
    expect(run(Array(DOWNGRADE_AFTER_BAD_SAMPLES).fill(true)).tier).toBe(1)
  })

  it('a single good sample resets the bad streak', () => {
    const pattern = [true, true, false, true, true, false, true, true]
    expect(run(pattern).tier).toBe(0)
  })

  it('needs many more good samples to step back up', () => {
    const down = run(Array(DOWNGRADE_AFTER_BAD_SAMPLES).fill(true))
    expect(down.tier).toBe(1)
    const notYet = run(Array(UPGRADE_AFTER_GOOD_SAMPLES - 1).fill(false), 1)
    expect(notYet.tier).toBe(1)
    const up = run(Array(UPGRADE_AFTER_GOOD_SAMPLES).fill(false), 1)
    expect(up.tier).toBe(0)
  })

  it('never upgrades above the ceiling for the current peer count', () => {
    const { tier } = run(Array(UPGRADE_AFTER_GOOD_SAMPLES * 3).fill(false), 2, 1)
    expect(tier).toBe(1)
  })

  it('clamps immediately when the ceiling drops (a third peer joined)', () => {
    const d = nextQualityTier({ currentTier: 0, counters: { bad: 0, good: 0 }, bad: false, topTier: 1 })
    expect(d.tier).toBe(1)
    expect(d.changed).toBe(true)
  })

  it('bottoms out at audio-only', () => {
    const { tier } = run(Array(DOWNGRADE_AFTER_BAD_SAMPLES * 10).fill(true))
    expect(tier).toBe(AUDIO_ONLY_TIER)
  })

  it('resets streaks after every change so tiers do not cascade', () => {
    const { changes } = run(Array(DOWNGRADE_AFTER_BAD_SAMPLES * 2).fill(true))
    expect(changes).toEqual([1, 2])
  })
})

describe('sampling', () => {
  it('flags loss, latency, and bandwidth limitation', () => {
    expect(isBadSample({ fractionLost: 0.1, rttSeconds: 0.05, limitation: null })).toBe(true)
    expect(isBadSample({ fractionLost: 0, rttSeconds: 0.6, limitation: null })).toBe(true)
    expect(isBadSample({ fractionLost: 0, rttSeconds: 0.05, limitation: 'bandwidth' })).toBe(true)
    expect(isBadSample({ fractionLost: 0.01, rttSeconds: 0.08, limitation: 'cpu' })).toBe(false)
    expect(isBadSample({ fractionLost: null, rttSeconds: null, limitation: null })).toBe(false)
  })

  it('extracts the worst video loss / rtt from a stats report', () => {
    const report = [
      { type: 'remote-inbound-rtp', kind: 'video', fractionLost: 0.02, roundTripTime: 0.1 },
      { type: 'remote-inbound-rtp', kind: 'video', fractionLost: 0.08, roundTripTime: 0.3 },
      { type: 'remote-inbound-rtp', kind: 'audio', fractionLost: 0.5 },
      { type: 'candidate-pair', nominated: true, currentRoundTripTime: 0.45 },
      { type: 'outbound-rtp', kind: 'video', qualityLimitationReason: 'bandwidth' },
    ]
    expect(sampleFromStatsReport(report)).toEqual({ fractionLost: 0.08, rttSeconds: 0.45, limitation: 'bandwidth' })
  })

  it('maps tiers to a 0–3 indicator', () => {
    expect(qualityBarsFor(0)).toBe(3)
    expect(qualityBarsFor(1)).toBe(2)
    expect(qualityBarsFor(3)).toBe(1)
    expect(qualityBarsFor(AUDIO_ONLY_TIER)).toBe(0)
  })
})
