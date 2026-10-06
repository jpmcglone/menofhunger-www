import { describe, expect, it } from 'vitest'
import { splitTextByMentionsDisplay } from '~/utils/mention-autocomplete'

describe('&group shortcuts', () => {
  it('splits &slug and @username into their own segments', () => {
    const segments = splitTextByMentionsDisplay('Hey @ann join &nxr-club today')
    expect(segments.find(s => s.group)?.group).toEqual({ raw: '&nxr-club', slug: 'nxr-club' })
    expect(segments.find(s => s.mention)?.mention?.username).toBe('ann')
  })
  it('lowercases the slug', () => {
    expect(splitTextByMentionsDisplay('&NXR')[0]?.group?.slug).toBe('nxr')
  })
  it('ignores ampersands in ordinary text', () => {
    for (const text of ['R&D budget', 'Tom & Jerry', 'a &amp; b', 'x&y']) {
      expect(splitTextByMentionsDisplay(text).some(s => s.group)).toBe(false)
    }
  })
})
