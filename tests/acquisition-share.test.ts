import { describe, expect, it } from 'vitest'
import {
  appendShareParams,
  articleShareUrl,
  inviteShareUrl,
  profileShareUrl,
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
      '/g/dads?ref=JOHN&src=invite&from=john',
    )
  })

  it('appends onto an absolute URL', () => {
    expect(appendShareParams('https://menofhunger.com/p/1', { ref: 'ABC' })).toBe(
      'https://menofhunger.com/p/1?ref=ABC&src=invite',
    )
  })

  it('omits empty params', () => {
    expect(appendShareParams('/p/1', { ref: '  ', from: null })).toBe('/p/1')
  })
})

describe('postSharePath / postShareUrl', () => {
  it('builds a path with optional ref', () => {
    expect(postSharePath('post-1')).toBe('/p/post-1')
    expect(postSharePath('post-1', 'CODE')).toBe('/p/post-1?ref=CODE&src=invite')
  })

  it('builds an absolute URL', () => {
    expect(postShareUrl('post-1', 'CODE', 'https://example.com')).toBe(
      'https://example.com/p/post-1?ref=CODE&src=invite',
    )
  })
})

describe('groupSharePath / groupShareUrl', () => {
  it('builds personalized group links', () => {
    expect(groupSharePath('dads', { ref: 'J', from: 'jp' })).toBe('/g/dads?ref=J&src=invite&from=jp')
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

describe('invite-tagged share URLs', () => {
  it('builds article, profile and site-root links with ref and src=invite', () => {
    expect(articleShareUrl('a1', 'CODE', 'https://x.test')).toBe('https://x.test/a/a1?ref=CODE&src=invite')
    expect(profileShareUrl('@john', 'CODE', 'https://x.test')).toBe('https://x.test/u/john?ref=CODE&src=invite')
    expect(inviteShareUrl('CODE', 'https://x.test/')).toBe('https://x.test/?ref=CODE&src=invite')
  })

  it('leaves links untouched without a ref', () => {
    expect(articleShareUrl('a1', null, 'https://x.test')).toBe('https://x.test/a/a1')
  })
})
