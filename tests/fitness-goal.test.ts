import { describe, expect, it } from 'vitest'
import { effectiveGoalStartKg, goalProgressPercent } from '../utils/fitness-goal'

describe('effectiveGoalStartKg', () => {
  it('uses the stored start when present', () => {
    expect(effectiveGoalStartKg(90, 100)).toBe(90)
  })
  it('falls back to the oldest log', () => {
    expect(effectiveGoalStartKg(null, 100)).toBe(100)
    expect(effectiveGoalStartKg(0, 100)).toBe(100)
  })
})

describe('goalProgressPercent', () => {
  it('is zero without a start', () => {
    expect(goalProgressPercent({ startKg: null, targetKg: 86, currentKg: 110 })).toBe(0)
  })
  it('measures travel from start toward the target', () => {
    expect(goalProgressPercent({ startKg: 110, targetKg: 86, currentKg: 98 })).toBe(50)
  })
})
