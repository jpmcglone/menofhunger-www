import { describe, expect, it } from 'vitest'
import {
  ANON_VIEW_ID_MAX_LEN,
  ANON_VIEW_ID_MIN_LEN,
  generateAnonViewId,
  isValidAnonViewId,
} from '../utils/anon-view-id'

describe('anon view id', () => {
  it('matches the API sanitizer so logged-out permalink views are accepted', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateAnonViewId()
      expect(isValidAnonViewId(id)).toBe(true)
      expect(id.length).toBeGreaterThanOrEqual(ANON_VIEW_ID_MIN_LEN)
      expect(id.length).toBeLessThanOrEqual(ANON_VIEW_ID_MAX_LEN)
      expect(id.startsWith('anon_')).toBe(true)
    }
  })

  it('rejects empty, short, and punctuated identities the API would drop', () => {
    expect(isValidAnonViewId(null)).toBe(false)
    expect(isValidAnonViewId('')).toBe(false)
    expect(isValidAnonViewId('anon_short')).toBe(false)
    expect(isValidAnonViewId('anon_has.dot.chars')).toBe(false)
    expect(isValidAnonViewId('anon_has space')).toBe(false)
  })
})
