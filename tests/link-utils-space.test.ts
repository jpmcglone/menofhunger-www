import { describe, expect, it, vi } from 'vitest'

vi.mock('~/config/site', () => ({
  siteConfig: { url: 'https://menofhunger.com' },
}))

import {
  extractMohSpaceId,
  extractMohSpaceUsername,
  extractMohUsername,
  isMohSpaceLink,
  matchLinksInText,
  extractLinksFromText,
  previewSourceLabel,
  previewDescription,
  isPortraitPreviewImage,
} from '~/utils/link-utils'

describe('space link extractors', () => {
  it('extracts space id only from /spaces/:id', () => {
    expect(extractMohSpaceId('https://menofhunger.com/spaces/clxyz123')).toBe('clxyz123')
    expect(extractMohSpaceId('https://menofhunger.com/s/jp')).toBeNull()
  })

  it('extracts username only from /s/:username', () => {
    expect(extractMohSpaceUsername('https://menofhunger.com/s/jp')).toBe('jp')
    expect(extractMohSpaceUsername('https://menofhunger.com/s/Some_User')).toBe('Some_User')
    expect(extractMohSpaceUsername('https://menofhunger.com/spaces/clxyz123')).toBeNull()
  })

  it('detects either form as a space link', () => {
    expect(isMohSpaceLink('https://menofhunger.com/s/jp')).toBe(true)
    expect(isMohSpaceLink('https://menofhunger.com/spaces/clxyz123')).toBe(true)
    expect(isMohSpaceLink('https://menofhunger.com/u/jp')).toBe(false)
  })
})

describe('profile link extractors', () => {
  it('extracts username from /u/:username', () => {
    expect(extractMohUsername('https://menofhunger.com/u/john')).toBe('john')
    expect(extractMohUsername('https://www.menofhunger.com/u/Some_User')).toBe('Some_User')
    expect(extractMohUsername('https://menofhunger.com/u/john?ref=x')).toBe('john')
    expect(extractMohUsername('https://menofhunger.com/s/john')).toBeNull()
    expect(extractMohUsername('https://example.com/u/john')).toBeNull()
  })
})

describe('matchLinksInText', () => {
  it('returns ranged http(s) matches with a normalized href', () => {
    const body = 'watch https://youtu.be/abc123 tonight'
    const matches = matchLinksInText(body)
    expect(matches).toHaveLength(1)
    expect(matches[0]?.text).toBe('https://youtu.be/abc123')
    expect(matches[0]?.href).toBe('https://youtu.be/abc123')
    expect(body.slice(matches[0]!.start, matches[0]!.end)).toBe(matches[0]?.text)
  })

  it('skips non-http schemes', () => {
    expect(matchLinksInText('go javascript:alert(1) now')).toEqual([])
  })

  it('keeps extractLinksFromText as the href list', () => {
    const body = 'see https://example.com and also example.org/x'
    expect(extractLinksFromText(body)).toEqual(matchLinksInText(body).map((m) => m.href))
  })
})

describe('previewSourceLabel', () => {
  it('uses the host without www or path', () => {
    expect(previewSourceLabel('https://www.cbsnews.com/us/')).toBe('From cbsnews.com')
    expect(previewSourceLabel('https://theatlantic.com/ideas/attention-is-the-work/')).toBe(
      'From theatlantic.com',
    )
  })

  it('falls back when the URL cannot be parsed', () => {
    expect(previewSourceLabel('not a url')).toBe('From link')
  })
})

describe('previewDescription', () => {
  it('hides empty copy and titles that just repeat', () => {
    expect(previewDescription(null, 'John McGlone')).toBeNull()
    expect(previewDescription('   ', 'John McGlone')).toBeNull()
    expect(previewDescription('John McGlone', 'john mcglone')).toBeNull()
  })

  it('keeps a distinct Open Graph dek', () => {
    expect(previewDescription(
      'Husband, father, and the man behind Men of Hunger.',
      'John McGlone',
    )).toBe('Husband, father, and the man behind Men of Hunger.')
  })
})

describe('isPortraitPreviewImage', () => {
  it('treats square and tall images as portrait', () => {
    expect(isPortraitPreviewImage(1200, 675)).toBe(false)
    expect(isPortraitPreviewImage(640, 640)).toBe(true)
    expect(isPortraitPreviewImage(800, 1200)).toBe(true)
    expect(isPortraitPreviewImage(0, 1200)).toBe(false)
  })
})
