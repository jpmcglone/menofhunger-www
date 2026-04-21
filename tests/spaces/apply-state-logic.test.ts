/**
 * Tests for the applyState decision tree and related sync logic.
 *
 * We extract the pure logic (drift calc, seek-decision, video-swap detection)
 * from SpaceYouTubePlayer.vue and test it in isolation. This avoids having to
 * load the YouTube IFrame API (browser-only) while still pinning every sync
 * scenario.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { extractVideoId, driftAdjustedTime } from '~/utils/watchPartyMath'
import type { WatchPartyState } from '~/types/api'

const VIEWER_DRIFT_TOLERANCE_S = 5

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/**
 * Minimal mirror of the shouldSeek decision inside applyState.
 * Returns true when the viewer/replaced-owner tab should seek to the
 * drift-adjusted position for the given state.
 */
function shouldSeek(opts: {
  hasSyncedInitially: boolean
  state: WatchPartyState
  playerCurrentTime: number
}): boolean {
  const { hasSyncedInitially, state, playerCurrentTime } = opts
  const adjusted = driftAdjustedTime(state)
  const drift = Math.abs(playerCurrentTime - adjusted)
  return !hasSyncedInitially || !state.isPlaying || drift > VIEWER_DRIFT_TOLERANCE_S
}

/**
 * Mirror of the applyState guard: active primary owner should not apply remote state.
 * Replaced owner tabs SHOULD apply it (they follow the room like viewers).
 */
function shouldApplyState(opts: { isOwner: boolean; isReplacedOwner: boolean }): boolean {
  const { isOwner, isReplacedOwner } = opts
  if (isOwner && !isReplacedOwner) return false
  return true
}

/**
 * Mirror of the video-swap detection inside applyState.
 * Returns true when the video ID from the incoming state differs from the
 * currently loaded ID (i.e., loadVideoById should be called).
 */
function videoChanged(opts: { currentVideoId: string | null; stateVideoUrl: string }): boolean {
  const incomingId = extractVideoId(opts.stateVideoUrl)
  return Boolean(incomingId && incomingId !== opts.currentVideoId)
}

// ─── shouldApplyState ─────────────────────────────────────────────────────────

describe('applyState guard (owner vs. viewer)', () => {
  it('applies for a viewer (not owner)', () => {
    expect(shouldApplyState({ isOwner: false, isReplacedOwner: false })).toBe(true)
  })

  it('blocks for the active primary owner', () => {
    expect(shouldApplyState({ isOwner: true, isReplacedOwner: false })).toBe(false)
  })

  it('applies for a replaced owner tab (mirrors viewer behavior)', () => {
    expect(shouldApplyState({ isOwner: true, isReplacedOwner: true })).toBe(true)
  })
})

// ─── shouldSeek ───────────────────────────────────────────────────────────────

describe('shouldSeek decision', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('always seeks on first sync', () => {
    // updatedAt=0 is falsy → driftAdjustedTime returns raw currentTime=30; drift=0; but hasSyncedInitially=false forces seek
    const state = makeState({ isPlaying: true, currentTime: 30, updatedAt: 0 })
    expect(shouldSeek({ hasSyncedInitially: false, state, playerCurrentTime: 30 })).toBe(true)
  })

  it('always seeks when paused (exact position required)', () => {
    const state = makeState({ isPlaying: false, currentTime: 60, updatedAt: 0 })
    // Even if player is exactly at 60 s, a pause event must seek.
    expect(shouldSeek({ hasSyncedInitially: true, state, playerCurrentTime: 60 })).toBe(true)
  })

  it('does NOT seek when playing and drift is within tolerance', () => {
    vi.setSystemTime(2000) // now = 2000
    // adjusted = 10 + (2000-1000)/1000*1 = 10 + 1 = 11; player at 11.2 → drift = 0.2 < 5
    const state = makeState({ isPlaying: true, currentTime: 10, updatedAt: 1000, playbackRate: 1 })
    expect(shouldSeek({ hasSyncedInitially: true, state, playerCurrentTime: 11.2 })).toBe(false)
  })

  it('seeks when playing and drift exceeds tolerance', () => {
    vi.setSystemTime(2000) // now = 2000
    // adjusted = 10 + (2000-1000)/1000*1 = 11; player at 20 → drift = 9 > 5
    const state = makeState({ isPlaying: true, currentTime: 10, updatedAt: 1000, playbackRate: 1 })
    expect(shouldSeek({ hasSyncedInitially: true, state, playerCurrentTime: 20 })).toBe(true)
  })

  it('accounts for playbackRate in drift calculation', () => {
    vi.setSystemTime(3000) // now = 3000
    // adjusted = 0 + (3000-1000)/1000*2 = 0 + 4 = 4; player at 4.5 → drift = 0.5 < 5
    const state = makeState({ isPlaying: true, currentTime: 0, updatedAt: 1000, playbackRate: 2 })
    expect(shouldSeek({ hasSyncedInitially: true, state, playerCurrentTime: 4.5 })).toBe(false)
  })
})

// ─── videoChanged ─────────────────────────────────────────────────────────────

describe('video-swap detection', () => {
  it('returns true when the video URL has a new ID', () => {
    expect(videoChanged({
      currentVideoId: 'dQw4w9WgXcQ',
      stateVideoUrl: 'https://www.youtube.com/watch?v=newVideo123',
    })).toBe(true)
  })

  it('returns false when the video ID is unchanged', () => {
    expect(videoChanged({
      currentVideoId: 'dQw4w9WgXcQ',
      stateVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })).toBe(false)
  })

  it('returns true when currentVideoId is null (first load)', () => {
    expect(videoChanged({
      currentVideoId: null,
      stateVideoUrl: 'https://www.youtube.com/watch?v=firstVideo',
    })).toBe(true)
  })

  it('returns false when the URL is empty/invalid', () => {
    expect(videoChanged({
      currentVideoId: 'dQw4w9WgXcQ',
      stateVideoUrl: '',
    })).toBe(false)
  })

  it('handles youtu.be short URLs', () => {
    expect(videoChanged({
      currentVideoId: 'dQw4w9WgXcQ',
      stateVideoUrl: 'https://youtu.be/anotherVideo',
    })).toBe(true)
  })
})

// ─── Drift-adjusted time edge cases ──────────────────────────────────────────

describe('driftAdjustedTime applied in sync scenarios', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('late joiner receives state from 30 s ago and lands at the correct position', () => {
    vi.setSystemTime(31_000) // now = 31000; updatedAt = 1000 → elapsed = 30 s
    const state = makeState({ isPlaying: true, currentTime: 100, updatedAt: 1000, playbackRate: 1 })
    // adjusted = 100 + 30*1 = 130 s
    const adjusted = driftAdjustedTime(state)
    expect(adjusted).toBeCloseTo(130)
    // Because hasSyncedInitially is false, shouldSeek returns true regardless.
    expect(shouldSeek({ hasSyncedInitially: false, state, playerCurrentTime: 0 })).toBe(true)
  })

  it('paused join: player gets EXACT pause position, no drift added', () => {
    vi.setSystemTime(10_000)
    const state = makeState({ isPlaying: false, currentTime: 77, updatedAt: 1000 })
    expect(driftAdjustedTime(state)).toBe(77) // paused → no drift
  })

  it('1.5× playback rate drifts 1.5 s per wall-clock second', () => {
    vi.setSystemTime(11_000) // now = 11000; updatedAt = 1000 → elapsed = 10 s
    const state = makeState({ isPlaying: true, currentTime: 0, updatedAt: 1000, playbackRate: 1.5 })
    expect(driftAdjustedTime(state)).toBeCloseTo(15) // 0 + 10*1.5
  })
})

// ─── URL-change watcher: guard (active primary vs. replaced owner) ─────────────

describe('URL-change watcher guard', () => {
  it('active primary owner should trigger loadNewVideoIfNeeded + sendControl', () => {
    // A replaced tab or viewer should NOT do this.
    const activeOwnerShouldAct = (isOwner: boolean, isReplacedOwner: boolean) =>
      isOwner && !isReplacedOwner

    expect(activeOwnerShouldAct(true, false)).toBe(true)  // primary owner → act
    expect(activeOwnerShouldAct(true, true)).toBe(false)  // replaced → skip
    expect(activeOwnerShouldAct(false, false)).toBe(false) // viewer → skip
  })
})
