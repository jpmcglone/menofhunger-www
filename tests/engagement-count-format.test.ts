import { describe, expect, it } from 'vitest'
import { formatShortCount } from '~/utils/text'
describe('engagement count labels', () => {
  it.each([[0, '0'], [1, '1'], [999, '999'], [1000, '1k'], [1250, '1.2k'], [999999, '999k'], [1000000, '1m'], [2100000000, '2.1b'], [Number.MAX_SAFE_INTEGER, '999t']])('keeps %s compact', (value, expected) => {
    expect(formatShortCount(value as number)).toBe(expected)
  })
  it('handles invalid counts', () => {
    expect(formatShortCount(NaN)).toBe('0')
    expect(formatShortCount(-1)).toBe('0')
  })
})
