import { describe, expect, it } from 'vitest'
import { isCheckinOpen, nextCheckinBoundary } from '../utils/checkin-schedule'

describe('Eastern check-in schedule', () => {
  it.each([
    ['2026-09-07T20:59:59.999Z', false, '2026-09-07T21:00:00.000Z'],
    ['2026-09-07T21:00:00.000Z', true, '2026-09-08T04:00:00.000Z'],
    ['2026-09-08T03:59:59.999Z', true, '2026-09-08T04:00:00.000Z'],
    ['2026-09-08T04:00:00.000Z', false, '2026-09-08T21:00:00.000Z'],
    ['2026-03-08T06:00:00.000Z', false, '2026-03-08T21:00:00.000Z'],
    ['2026-11-01T05:00:00.000Z', false, '2026-11-01T22:00:00.000Z'],
  ])('handles %s, including DST', (date, open, boundary) => {
    expect(isCheckinOpen(new Date(date))).toBe(open)
    expect(new Date(nextCheckinBoundary(new Date(date))).toISOString()).toBe(boundary)
  })
})
