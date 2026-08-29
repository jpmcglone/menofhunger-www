import { describe, expect, it } from 'vitest'
import { averageStepsPerDay } from '../utils/fitness-week'

describe('averageStepsPerDay', () => {
  it('ignores days with no data and needs two counted days', () => {
    expect(averageStepsPerDay([
      { stepsCount: 8000 },
      { stepsCount: null },
      { stepsCount: 0 },
    ])).toBeNull()

    expect(averageStepsPerDay([
      { stepsCount: 8000 },
      { stepsCount: null },
      { stepsCount: 10000 },
      { stepsCount: 0 },
    ])).toBe(9000)
  })
})
