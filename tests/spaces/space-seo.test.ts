import { describe, expect, it } from 'vitest'
import { computeSpaceSeo, spaceSeoImage } from '../../utils/spaceSeo'

const watchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

const watchParty = {
  title: null as string | null,
  isActive: true,
  scheduledAt: null as string | null,
  mode: 'WATCH_PARTY' as const,
  playbackTitle: 'Conference talk',
  watchPartyUrl: watchUrl,
  ownerUsername: 'john',
  description: null as string | null,
}

describe('computeSpaceSeo', () => {
  it('uses the YouTube playback title when the stored title is null', () => {
    const seo = computeSpaceSeo(watchParty)
    expect(seo.title).toBe('Conference talk by @john')
    expect(seo.description).toContain('Conference talk')
    expect(seo.description).toContain('Watch party in progress')
    expect(seo.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
    expect(seo.twitterCard).toBe('summary_large_image')
    expect(seo.imageAlt).toBe('Conference talk')
  })

  it('keeps a custom title and still uses the YouTube poster', () => {
    const seo = computeSpaceSeo({
      ...watchParty,
      title: 'The Great Debate',
    })
    expect(seo.title).toBe('The Great Debate by @john')
    expect(seo.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
  })

  it('treats the default {username} Space name like no title', () => {
    const seo = computeSpaceSeo({
      ...watchParty,
      title: "john's Space",
    })
    expect(seo.title).toBe('Conference talk by @john')
  })

  it('does not say a watch party is in progress when the space is idle', () => {
    const seo = computeSpaceSeo({
      ...watchParty,
      isActive: false,
    })
    expect(seo.description).not.toContain('in progress')
    expect(seo.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
  })

  it('does not attach a poster for radio or idle rooms', () => {
    expect(
      spaceSeoImage({
        mode: 'RADIO',
        watchPartyUrl: watchUrl,
      }),
    ).toBeNull()
    expect(
      computeSpaceSeo({
        title: "john's Space",
        isActive: false,
        mode: 'NONE',
        ownerUsername: 'john',
        description: null,
      }).image,
    ).toBeNull()
  })
})
