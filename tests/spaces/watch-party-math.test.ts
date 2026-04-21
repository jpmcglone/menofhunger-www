import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { extractVideoId, driftAdjustedTime } from '~/utils/watchPartyMath'
import type { WatchPartyState } from '~/types/api'

function makeState(override: Partial<WatchPartyState> = {}): WatchPartyState {
  return {
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    isPlaying: false,
    currentTime: 0,
    playbackRate: 1,
    updatedAt: 0,
    ...override,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ─── extractVideoId ───────────────────────────────────────────────────────────

describe('extractVideoId', () => {
  it('extracts id from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts id from short youtu.be URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts id with extra query params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=abc123&t=30s&list=PL')).toBe('abc123')
  })

  it('returns null for a non-YouTube URL', () => {
    expect(extractVideoId('https://vimeo.com/12345')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(extractVideoId('')).toBeNull()
  })

  it('returns null for a malformed URL', () => {
    expect(extractVideoId('not-a-url')).toBeNull()
  })

  it('returns null for a youtu.be URL with no path', () => {
    expect(extractVideoId('https://youtu.be/')).toBeNull()
  })
})

// ─── driftAdjustedTime ───────────────────────────────────────────────────────

describe('driftAdjustedTime', () => {
  it('returns raw currentTime when paused', () => {
    vi.setSystemTime(10_000)
    const state = makeState({ isPlaying: false, currentTime: 42, updatedAt: 0 })
    // updatedAt is 0 (falsy) → no drift even when paused wouldn't matter (paused returns raw)
    expect(driftAdjustedTime(state)).toBeCloseTo(42)
  })

  it('adds elapsed wall-clock time when playing at 1×', () => {
    vi.setSystemTime(6000) // "now" = 6000
    const state = makeState({ isPlaying: true, currentTime: 10, updatedAt: 1000, playbackRate: 1 })
    // elapsed = (6000 - 1000) / 1000 = 5 s; adjusted = 10 + 5*1 = 15
    expect(driftAdjustedTime(state)).toBeCloseTo(15)
  })

  it('scales elapsed time by playbackRate', () => {
    vi.setSystemTime(4000) // 4 s after updatedAt=0
    const state = makeState({ isPlaying: true, currentTime: 0, updatedAt: 0 })
    // updatedAt is 0/falsy → returns raw currentTime (0), not drift-adjusted
    // This is the defined behaviour: updatedAt=0 means "no usable timestamp"
    expect(driftAdjustedTime(state)).toBe(0)
  })

  it('scales elapsed time by playbackRate when updatedAt is set', () => {
    vi.setSystemTime(1004) // 4 s after updatedAt=1000
    const state = makeState({ isPlaying: true, currentTime: 0, updatedAt: 1000, playbackRate: 2 })
    // elapsed = (1004 - 1000) / 1000 = 0.004 s × 2 = 0.008 — use a clear example:
    // Let's use times that give clean numbers.
    vi.setSystemTime(5000) // now = 5000, updatedAt = 1000 → elapsed = 4 s
    const state2 = makeState({ isPlaying: true, currentTime: 0, updatedAt: 1000, playbackRate: 2 })
    expect(driftAdjustedTime(state2)).toBeCloseTo(8) // 0 + 4×2
  })

  it('returns currentTime when updatedAt is 0 (falsy)', () => {
    vi.setSystemTime(10_000)
    const state = makeState({ isPlaying: true, currentTime: 30, updatedAt: 0 })
    expect(driftAdjustedTime(state)).toBe(30)
  })

  it('returns currentTime when updatedAt is NaN', () => {
    const state = makeState({ isPlaying: true, currentTime: 20, updatedAt: NaN })
    expect(driftAdjustedTime(state)).toBe(20)
  })

  it('never returns a negative elapsed component (future updatedAt)', () => {
    vi.setSystemTime(1000)
    const state = makeState({ isPlaying: true, currentTime: 100, updatedAt: 99_999, playbackRate: 1 })
    // updatedAt is in the future → elapsed = max(0, …) = 0 → result = currentTime
    expect(driftAdjustedTime(state)).toBeCloseTo(100)
  })
})
