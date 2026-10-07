import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { crosspostOptions, xAdvancedPublishingSupported, xWeightedLength, xContainsLink } from '~/utils/crosspost'
import type { CrosspostDraft } from '~/utils/crosspost'

function draft(overrides: Partial<CrosspostDraft> = {}): CrosspostDraft {
  return {
    visibility: 'public',
    body: 'hello',
    mediaCount: 0,
    mediaAllUploadedImages: true,
    hasPoll: false,
    isReply: false,
    isQuote: false,
    isCheckin: false,
    scheduled: false,
    ...overrides,
  }
}

describe('x weighted length', () => {
  it('matches the API vectors', () => {
    expect(xWeightedLength('hello')).toBe(5)
    expect(xWeightedLength('🎉')).toBe(2)
    expect(xWeightedLength('你好')).toBe(4)
    expect(xWeightedLength('https://menofhunger.com/p/abc')).toBe(23)
    expect(xWeightedLength('hi https://x.com')).toBe(26)
  })
})

describe('crosspost options', () => {
  it('offers a link and a full post when the post fits', () => {
    expect(crosspostOptions(draft(), 'x').modes).toEqual(['native'])
    expect(crosspostOptions(draft(), 'pickax').modes).toEqual(['link', 'native'])
  })

  it('explains X restrictions while preserving Pickax link fallback', () => {
    expect(crosspostOptions(draft({ hasPoll: true }), 'x')).toMatchObject({ modes: [], blockedReason: 'Polls cannot be posted to X.' })
    expect(crosspostOptions(draft({ mediaCount: 1, mediaAllUploadedImages: false }), 'pickax').modes).toEqual(['link'])
    expect(crosspostOptions(draft({ body: 'a'.repeat(281) }), 'x').modes).toEqual([])
    expect(crosspostOptions(draft({ body: 'a'.repeat(281) }), 'pickax').modes).toEqual(['link', 'native'])
    expect(crosspostOptions(draft({ body: '🎉'.repeat(141) }), 'x').blockedReason).toContain('280 characters')
  })

  it('hides destinations that cannot take even a link', () => {
    expect(crosspostOptions(draft({ visibility: 'onlyMe' }), 'x').modes).toEqual([])
    expect(crosspostOptions(draft({ isReply: true }), 'pickax').modes).toEqual([])
    expect(crosspostOptions(draft({ groupId: 'g' }), 'x').modes).toEqual([])
  })

  it('sends a crosspost object from the composer', () => {
    const src = [
      readFileSync(resolve(process.cwd(), 'components/app/PostComposer.vue'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'composables/composer/useComposerSubmit.ts'), 'utf8'),
    ].join('\n')
    expect(src).toContain('snapshot.crosspost')
    expect(src).toContain('...(Object.keys(crosspost).length ? { crosspost } : {})')
  })
})

describe('X link accounting and scheduling', () => {
  it('counts both explicit URLs and domains that X can linkify', () => {
    expect(xContainsLink('see https://example.com')).toBe(true)
    expect(xContainsLink('see example.com/path')).toBe(true)
    expect(xContainsLink('ordinary words')).toBe(false)
  })
  it('keeps destination selection available for scheduled public posts', () => {
    expect(crosspostOptions(draft({ scheduled: true }), 'pickax').modes).toEqual(['link', 'native'])
  })
})

it.each([false, true])('applies native-only X rules with scheduled=%s', scheduled => {
  for (const body of ['https://example.com', 'hello example.com/path', 'www.example.com', '例子.中国', 'münchen.de']) {
    expect(crosspostOptions(draft({ body, scheduled }), 'x')).toMatchObject({ modes: [], blockedReason: 'Remove any links to post to X.' })
    expect(crosspostOptions(draft({ body, scheduled }), 'pickax').modes).toEqual(['link', 'native'])
  }
  expect(crosspostOptions(draft({ scheduled }), 'x').modes).toEqual(['native'])
  expect(crosspostOptions(draft({ scheduled, hasPoll: true }), 'pickax').modes).toEqual(['link'])
  expect(crosspostOptions(draft({ scheduled, mediaCount: 1, mediaAllUploadedImages: false }), 'x').blockedReason).toContain('videos and GIFs')
  expect(crosspostOptions(draft({ scheduled, mediaCount: 5 }), 'x').blockedReason).toContain('4 photos')
})

describe('advanced X publishing', () => {
  it('stays hidden until thread publishing is supported for this account', () => {
    expect(xAdvancedPublishingSupported(undefined)).toBe(false)
    expect(xAdvancedPublishingSupported([{ provider: 'x', action: 'thread', state: 'awaiting_permission', requiredScopes: [], unitCostMicros: null, billingUnit: 'unknown', priceVersion: null, reason: null }])).toBe(false)
    expect(xAdvancedPublishingSupported([{ provider: 'x', action: 'thread', state: 'supported', requiredScopes: [], unitCostMicros: 1, billingUnit: 'request', priceVersion: 'v1', reason: null }])).toBe(true)
  })
})
