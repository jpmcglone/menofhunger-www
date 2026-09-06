import { describe, expect, it } from 'vitest'
import { presencePlatforms } from '../utils/presence-platforms'
describe('online platform labels', () => {
  it('deduplicates and keeps the display stable across connection order', () => {
    expect(presencePlatforms(['web', 'ios', 'web', 'IOS']).map(p => p.label)).toEqual(['iOS', 'Web'])
  })
  it('does not claim a platform for bots, missing data, or unknown clients', () => {
    expect(presencePlatforms(undefined)).toEqual([])
    expect(presencePlatforms(['unknown'])).toEqual([])
  })
  it('shows Android only when actually reported by the API', () => {
    expect(presencePlatforms(['android']).map(p => p.icon)).toEqual(['platformAndroid'])
  })
})
