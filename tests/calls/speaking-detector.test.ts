import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  INITIAL_SPEAKING,
  SPEAKING_ENTER,
  SPEAKING_EXIT,
  SPEAKING_FULL,
  SPEAKING_HOLD_MS,
  reduceSpeaking,
  rmsLevel,
  speakingIntensity,
  speakingRingAlphas,
  type SpeakingTrack,
} from '~/composables/calls/speakingDetector'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

function feed(levels: Array<[level: number, at: number]>, start: SpeakingTrack = INITIAL_SPEAKING) {
  let track = start
  const flips: Array<[boolean, number]> = []
  for (const [level, at] of levels) {
    const next = reduceSpeaking(track, level, at)
    if (next.speaking !== track.speaking) flips.push([next.speaking, at])
    track = next
  }
  return { track, flips }
}

describe('reduceSpeaking hysteresis', () => {
  it('thresholds are ordered so a level between them cannot bounce the state', () => {
    expect(SPEAKING_EXIT).toBeLessThan(SPEAKING_ENTER)
  })

  it('stays quiet below ENTER and flips on the first loud sample', () => {
    const { track, flips } = feed([
      [0.005, 0],
      [SPEAKING_ENTER - 0.001, 100],
      [SPEAKING_ENTER, 200],
    ])
    expect(flips).toEqual([[true, 200]])
    expect(track.lastLoudAt).toBe(200)
  })

  it('holds through short pauses and only drops after HOLD_MS of quiet', () => {
    const { flips } = feed([
      [0.1, 0],
      [0.0, 100], // syllable gap
      [0.0, 200],
      [0.1, 300], // talking again → hold window restarts
      [0.0, 400],
      [0.0, 300 + SPEAKING_HOLD_MS - 1], // not yet
      [0.0, 300 + SPEAKING_HOLD_MS], // now
    ])
    expect(flips).toEqual([
      [true, 0],
      [false, 300 + SPEAKING_HOLD_MS],
    ])
  })

  it('a level between EXIT and ENTER keeps a speaker speaking but never starts one', () => {
    const between = (SPEAKING_ENTER + SPEAKING_EXIT) / 2
    expect(reduceSpeaking(INITIAL_SPEAKING, between, 0).speaking).toBe(false)
    const speaking: SpeakingTrack = { speaking: true, lastLoudAt: 0 }
    const next = reduceSpeaking(speaking, between, 5000)
    expect(next.speaking).toBe(true)
    expect(next.lastLoudAt).toBe(5000)
  })

  it('returns the same object when nothing changed (cheap === checks in the poller)', () => {
    expect(reduceSpeaking(INITIAL_SPEAKING, 0, 10)).toBe(INITIAL_SPEAKING)
    const speaking: SpeakingTrack = { speaking: true, lastLoudAt: 100 }
    expect(reduceSpeaking(speaking, 0, 150)).toBe(speaking)
  })
})

describe('speakingIntensity', () => {
  it('is 0 when quiet and 1 at the full-loud ceiling', () => {
    expect(speakingIntensity(0.4, false)).toBe(0)
    expect(speakingIntensity(SPEAKING_EXIT, true)).toBe(0)
    expect(speakingIntensity(SPEAKING_FULL, true)).toBe(1)
    expect(speakingIntensity(SPEAKING_FULL + 0.2, true)).toBe(1)
    expect(speakingIntensity((SPEAKING_EXIT + SPEAKING_FULL) / 2, true)).toBeCloseTo(0.5)
  })

  it('reveals the second and third rings as volume climbs', () => {
    expect(speakingRingAlphas(0)).toEqual([0, 0, 0])
    expect(speakingRingAlphas(0.2)[0]).toBeCloseTo(0.2)
    expect(speakingRingAlphas(0.2)[1]).toBe(0)
    expect(speakingRingAlphas(0.5)[1]).toBeGreaterThan(0)
    expect(speakingRingAlphas(0.5)[2]).toBe(0)
    expect(speakingRingAlphas(1)[2]).toBeCloseTo(1)
  })
})

describe('rmsLevel', () => {
  it('is 0 for silence and the amplitude for a square wave', () => {
    expect(rmsLevel(new Float32Array(0))).toBe(0)
    expect(rmsLevel(new Float32Array(64))).toBe(0)
    expect(rmsLevel(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5)
  })
})

describe('speaking ring wiring', () => {
  it('the monitor lives with the transport and feeds a per-user map the tiles read', () => {
    const session = read('composables/calls/useCallSession.ts')
    expect(session).toContain('speakingMonitor = new SpeakingMonitor(')
    expect(session).toContain('speakingMonitor?.setStream(userId, stream)')
    // Muted peers never ring, whatever the analyser hears.
    expect(session).toContain('speakingMonitor?.setMuted(p.userId, !p.micEnabled)')
    // Torn down with the call, and the map is cleared so no ring lingers.
    const teardown = session.slice(session.indexOf('function teardown('), session.indexOf('function clearSocketDownTimer('))
    expect(teardown).toContain('speakingMonitor?.destroy()')
    expect(teardown).toContain('speakingIds.value = {}')

    const overlay = read('components/app/calls/CallOverlay.vue')
    expect(overlay).toContain(':speaking-level="speakingIds[p.userId] ?? 0"')
    expect(overlay).toContain(':speaking-level="selfSpeaking"')

    const tile = read('components/app/calls/CallVideoTile.vue')
    expect(tile).toContain('speakingRingAlphas')
    expect(tile).toContain('moh-speak-ring-3')
    expect(tile).toContain('prefers-reduced-motion: reduce')
    expect(tile).toContain('userTierColorVar')
    expect(tile).toContain('var(--moh-link)')
  })
})
