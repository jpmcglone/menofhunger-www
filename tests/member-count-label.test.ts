import { describe, expect, it } from 'vitest'
import { memberCountLabel } from '~/utils/member-count-label'

describe('memberCountLabel', () => {
  it('formats singular and plural member counts', () => {
    expect(memberCountLabel(1)).toBe('1 member')
    expect(memberCountLabel(1_234)).toBe('1,234 members')
    expect(memberCountLabel(0)).toBe('0 members')
  })

  it('omits unavailable counts', () => {
    expect(memberCountLabel(undefined)).toBeNull()
    expect(memberCountLabel(null)).toBeNull()
  })
})
