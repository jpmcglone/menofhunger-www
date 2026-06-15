import { describe, expect, it } from 'vitest'
import { assembleBirthdate, splitBirthdate } from '../utils/birthdate'

describe('splitBirthdate', () => {
  it('splits a valid YYYY-MM-DD string', () => {
    expect(splitBirthdate('2000-03-15')).toEqual({ mm: '03', dd: '15', yyyy: '2000' })
  })

  it('returns empty strings for an empty value', () => {
    expect(splitBirthdate('')).toEqual({ mm: '', dd: '', yyyy: '' })
  })

  it('returns empty strings for a malformed value', () => {
    expect(splitBirthdate('March 15 2000')).toEqual({ mm: '', dd: '', yyyy: '' })
    expect(splitBirthdate('15-03-2000')).toEqual({ mm: '', dd: '', yyyy: '' })
  })
})

describe('assembleBirthdate', () => {
  it('assembles a valid date', () => {
    expect(assembleBirthdate('03', '15', '2000')).toBe('2000-03-15')
  })

  it('zero-pads single-digit month and day', () => {
    expect(assembleBirthdate('3', '5', '1990')).toBe('1990-03-05')
  })

  it('returns "" for an impossible date (Feb 31)', () => {
    expect(assembleBirthdate('02', '31', '2000')).toBe('')
  })

  it('returns "" for an impossible date (month 13)', () => {
    expect(assembleBirthdate('13', '01', '2000')).toBe('')
  })

  it('returns "" for partial input', () => {
    expect(assembleBirthdate('', '15', '2000')).toBe('')
    expect(assembleBirthdate('03', '', '2000')).toBe('')
    expect(assembleBirthdate('03', '15', '')).toBe('')
    expect(assembleBirthdate('03', '15', '200')).toBe('')
  })

  it('returns "" for out-of-range day (0)', () => {
    expect(assembleBirthdate('01', '00', '2000')).toBe('')
  })

  it('round-trips with splitBirthdate', () => {
    const original = '1985-11-22'
    const { mm, dd, yyyy } = splitBirthdate(original)
    expect(assembleBirthdate(mm, dd, yyyy)).toBe(original)
  })
})
