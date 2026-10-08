import { describe, expect, it } from 'vitest'
import { formatCompact, formatCount, formatCurrency, formatPercent } from '../utils/number-format'

describe('number-format', () => {
  it('formatCount groups with en-US separators', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(1234)).toBe('1,234')
    expect(formatCount(1234567.891)).toBe('1,234,567.891')
    expect(formatCount(-9876)).toBe('-9,876')
  })
  it('formatCompact switches notation at the threshold', () => {
    expect(formatCompact(1234)).toBe('1.2K')
    expect(formatCompact(1500000)).toBe('1.5M')
    expect(formatCompact(999, { compactFrom: 1000 })).toBe('999')
    expect(formatCompact(12345, { compactFrom: 10000 })).toBe('12.3K')
  })
  it('formatCurrency defaults to USD', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
    expect(formatCurrency(1234.5, { maximumFractionDigits: 0 })).toBe('$1,235')
  })
  it('formatPercent formats a ratio', () => {
    expect(formatPercent(0.256)).toBe('26%')
    expect(formatPercent(0.256, 1)).toBe('25.6%')
  })
})

import { formatClockTime, formatLocaleDate, formatLocaleDateTime, formatLocaleTime } from '../utils/time-format'

describe('time-format locale helpers (match the inline calls they replaced)', () => {
  const iso = '2026-03-05T15:07:09Z'
  const date = new Date(iso)
  it('formatLocaleDate', () => {
    const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const
    expect(formatLocaleDate(iso, opts)).toBe(date.toLocaleDateString('en-US', opts))
    expect(formatLocaleDate(iso, opts)).toBe('Mar 5')
  })
  it('formatLocaleDateTime', () => {
    const opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' } as const
    expect(formatLocaleDateTime(date, opts)).toBe('Mar 5, 3:07 PM')
  })
  it('formatLocaleTime and formatClockTime', () => {
    expect(formatLocaleTime(date, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })).toBe('3:07 PM')
    expect(formatClockTime(null)).toBe('')
    expect(formatClockTime(iso)).toBe(date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
  })
})
