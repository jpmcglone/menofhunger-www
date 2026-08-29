import { describe, expect, it } from 'vitest'
import { indexAlongWidth, layoutSparkline, nearestPointIndex } from '../utils/fitness-chart'

describe('nearestPointIndex', () => {
  it('returns the closest x', () => {
    expect(nearestPointIndex([0, 10, 20], 14)).toBe(1)
    expect(nearestPointIndex([0, 10, 20], 19)).toBe(2)
    expect(nearestPointIndex([], 4)).toBeNull()
  })
})

describe('layoutSparkline', () => {
  it('builds a line and area for two or more samples', () => {
    const laid = layoutSparkline([
      { value: 4, at: 0 },
      { value: 8, at: 10 },
    ])
    expect(laid.points).toHaveLength(2)
    expect(laid.linePath.startsWith('M ')).toBe(true)
    expect(laid.areaPath.endsWith('Z')).toBe(true)
  })

  it('returns empty for a single sample', () => {
    expect(layoutSparkline([{ value: 4, at: 0 }]).points).toEqual([])
  })
})

describe('indexAlongWidth', () => {
  it('maps a pointer into equal columns', () => {
    expect(indexAlongWidth(7, 0, 70)).toBe(0)
    expect(indexAlongWidth(7, 69, 70)).toBe(6)
    expect(indexAlongWidth(7, 10, 70)).toBe(1)
    expect(indexAlongWidth(0, 10, 70)).toBeNull()
  })
})
