import { describe, expect, it } from 'vitest'
import { isOwnUserProfilePath } from '~/config/routes'

describe('isOwnUserProfilePath', () => {
  it('matches the member’s profile and nested tabs', () => {
    expect(isOwnUserProfilePath('/u/john', 'john')).toBe(true)
    expect(isOwnUserProfilePath('/u/John/posts', 'john')).toBe(true)
    expect(isOwnUserProfilePath('/u/john?tab=media', 'John')).toBe(true)
  })

  it('ignores other profiles and non-profile routes', () => {
    expect(isOwnUserProfilePath('/u/jack', 'john')).toBe(false)
    expect(isOwnUserProfilePath('/home', 'john')).toBe(false)
    expect(isOwnUserProfilePath('/u/john', null)).toBe(false)
  })
})
