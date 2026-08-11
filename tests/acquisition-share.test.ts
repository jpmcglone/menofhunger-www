import { describe, expect, it } from 'vitest'
import {
  appendShareParams,
  groupSharePath,
  groupShareText,
  groupShareUrl,
  postSharePath,
  postShareText,
  postShareUrl,
  weeklyMissionShareText,
} from '~/utils/acquisition-share'

describe('appendShareParams', () => {
  it('returns the input when no params', () => {
    expect(appendShareParams('/p/abc')).toBe('/p/abc')
  })

  it('appends ref and from on a path', () => {
    expect(appendShareParams('/g/dads', { ref: 'JOHN', from: 'john' })).toBe(
      '/g/dads?ref=JOHN&from=john',
    )
  })

  it('appends onto an absolute URL', () => {
    expect(appendShareParams('https://menofhunger.com/p/1', { ref: 'ABC' })).toBe(
      'https://menofhunger.com/p/1?ref=ABC',
    )
  })

  it('omits empty params', () => {
    expect(appendShareParams('/p/1', { ref: '  ', from: null })).toBe('/p/1')
  })
})

describe('postSharePath / postShareUrl', () => {
  it('builds a path with optional ref', () => {
    expect(postSharePath('post-1')).toBe('/p/post-1')
    expect(postSharePath('post-1', 'CODE')).toBe('/p/post-1?ref=CODE')
  })

  it('builds an absolute URL', () => {
    expect(postShareUrl('post-1', 'CODE', 'https://example.com')).toBe(
      'https://example.com/p/post-1?ref=CODE',
    )
  })
})

describe('groupSharePath / groupShareUrl', () => {
  it('builds personalized group links', () => {
    expect(groupSharePath('dads', { ref: 'J', from: 'jp' })).toBe('/g/dads?ref=J&from=jp')
    expect(groupShareUrl('dads', { from: 'jp' }, 'https://example.com')).toBe(
      'https://example.com/g/dads?from=jp',
    )
  })
})

describe('postShareText', () => {
  it('defaults to join-the-conversation', () => {
    expect(postShareText()).toBe('Join the conversation on Men of Hunger.')
  })

  it('mentions reply count when present', () => {
    expect(postShareText({ commentCount: 1 })).toBe(
      'Join the conversation on Men of Hunger (1 reply).',
    )
    expect(postShareText({ commentCount: 12 })).toBe(
      'Join the conversation on Men of Hunger (12 replies).',
    )
  })

  it('uses day-N copy for check-ins with a streak', () => {
    expect(postShareText({ isCheckin: true, streakDays: 5 })).toBe(
      "I'm on day 5 of Men of Hunger — join me.",
    )
  })

  it('falls back to conversation copy for check-in with no streak', () => {
    expect(postShareText({ isCheckin: true, streakDays: 0 })).toBe(
      'Join the conversation on Men of Hunger.',
    )
  })
})

describe('groupShareText / weeklyMissionShareText', () => {
  it('names the group', () => {
    expect(groupShareText('Dads')).toBe('I started Dads — join us on Men of Hunger.')
  })

  it('builds mission invite copy', () => {
    expect(weeklyMissionShareText(3)).toBe(
      "I'm on day 3 of this week's mission on Men of Hunger — join me.",
    )
  })
})
