import { describe, expect, it } from 'vitest'
import { formatFitnessDistance, formatFitnessDuration, formatFitnessDayKey } from '../utils/fitness-format'
import { formatFullCount, formatShortCount } from '../utils/text'
import {
  formatAgoShort,
  formatCompactAge,
  formatFutureRelative,
  formatMonthYear,
  formatNumericDate,
  formatShortDate,
  formatShortDateTime,
} from '../utils/time-format'

const NOW = Date.parse('2026-03-10T12:00:00Z')

describe('count formatters', () => {
  it('formats short counts with billions support', () => {
    expect(formatShortCount(999)).toBe('999')
    expect(formatShortCount(1250)).toBe('1.2k')
    expect(formatShortCount(12_500)).toBe('12k')
    expect(formatShortCount(2_500_000_000)).toBe('2.5b')
  })
  it('formats full counts with grouping and clamps bad input', () => {
    expect(formatFullCount(1234567)).toBe('1,234,567')
    expect(formatFullCount(-5)).toBe('0')
    expect(formatFullCount('abc')).toBe('0')
  })
})

describe('time formatters use a fixed locale', () => {
  it('formats short, month-year and numeric dates', () => {
    expect(formatShortDate('2026-03-04T12:00:00Z')).toBe('Mar 4')
    expect(formatShortDate('2026-03-04T12:00:00Z', { year: true })).toBe('Mar 4, 2026')
    expect(formatMonthYear('2026-03-04T12:00:00Z')).toBe('March 2026')
    expect(formatNumericDate('2026-03-04T12:00:00Z')).toBe('3/4/2026')
    expect(formatShortDate(null, { fallback: '—' })).toBe('—')
    expect(formatShortDateTime('2026-03-04T17:30:00Z', { year: true })).toMatch(/^Mar 4, 2026 · \d{1,2}:30 (AM|PM)$/)
  })
  it('formats compact age, ago and future relative', () => {
    expect(formatCompactAge('2026-03-10T11:59:30Z', NOW)).toBe('30s')
    expect(formatCompactAge('2026-03-10T09:00:00Z', NOW)).toBe('3h')
    expect(formatCompactAge('2026-03-01T12:00:00Z', NOW)).toBe('3/1/2026')
    expect(formatAgoShort('2026-03-10T11:59:55Z', NOW)).toBe('just now')
    expect(formatAgoShort('2026-03-10T11:00:00Z', NOW)).toBe('1h ago')
    expect(formatFutureRelative('2026-03-10T13:00:00Z', NOW)).toBe('soon')
    expect(formatFutureRelative('2026-03-11T12:00:00Z', NOW)).toBe('in 1 day')
    expect(formatFutureRelative('2026-03-15T12:00:00Z', NOW)).toBe('in 5 days')
  })
})

describe('fitness formatters', () => {
  it('formats distance, duration and day keys', () => {
    expect(formatFitnessDistance(1609.34, 'us')).toBe('1.0')
    expect(formatFitnessDistance(5000, 'metric', 2)).toBe('5.00')
    expect(formatFitnessDuration(3900)).toBe('1h 5m')
    expect(formatFitnessDuration(3909, { seconds: true })).toBe('1h 5m 9s')
    expect(formatFitnessDayKey('2026-03-04')).toBe('Mar 4')
  })
})
