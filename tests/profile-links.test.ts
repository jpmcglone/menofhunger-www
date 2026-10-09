import { describe, expect, it } from 'vitest'
import type { ProfileLinkIcon } from '~/types/api'
import {
  PROFILE_LINK_GLYPHS,
  followerCountLabel,
  formatFollowerCount,
  linksPageJoinHref,
  linksPageOgImagePath,
  linksPagePath,
  profileLinkGlyph,
} from '~/utils/profile-link-icons'
import { buildProfileHeaderLinks } from '~/utils/social-links'
import {
  linksPayload,
  linksSignature,
  moveItem,
  newDraft,
  normalizeLinkUrl,
} from '~/utils/profile-links-editor'
import { buildQrPath } from '~/utils/qr-code'

const ALL_ICONS: ProfileLinkIcon[] = [
  'website', 'x', 'pickax', 'youtube', 'rumble', 'linkedin', 'substack', 'ghost', 'github', 'soundcloud',
  'bandcamp', 'etsy', 'gumroad', 'sketchfab', 'tiktok', 'locals', 'facebook', 'instagram', 'spotify',
]

describe('profile link brand glyphs', () => {
  it('maps every API icon to a glyph', () => {
    expect(Object.keys(PROFILE_LINK_GLYPHS).sort()).toEqual([...ALL_ICONS].sort())
  })

  it('uses Tabler brand icons, the Pickax image, and inline marks where Tabler has none', () => {
    expect(profileLinkGlyph('x')).toEqual({ kind: 'iconify', name: 'tabler:brand-x' })
    expect(profileLinkGlyph('rumble')).toEqual({ kind: 'iconify', name: 'tabler:brand-rumble' })
    expect(profileLinkGlyph('pickax')).toEqual({ kind: 'image', src: '/images/brands/pickax.png' })
    for (const icon of ['substack', 'ghost', 'sketchfab'] as const) {
      const glyph = profileLinkGlyph(icon)
      expect(glyph.kind).toBe('svg')
      if (glyph.kind === 'svg') expect(glyph.path.length).toBeGreaterThan(40)
    }
  })

  it('falls back to the website glyph for unknown, empty, or prototype-key icons', () => {
    const website = profileLinkGlyph('website')
    expect(profileLinkGlyph('myspace')).toEqual(website)
    expect(profileLinkGlyph('')).toEqual(website)
    expect(profileLinkGlyph(null)).toEqual(website)
    expect(profileLinkGlyph(undefined)).toEqual(website)
    expect(profileLinkGlyph('constructor')).toEqual(website)
    expect(profileLinkGlyph('locals')).toEqual(website)
  })
})

describe('follower count formatting', () => {
  it('abbreviates without rounding up across a unit', () => {
    expect(formatFollowerCount(0)).toBe('0')
    expect(formatFollowerCount(999)).toBe('999')
    expect(formatFollowerCount(1000)).toBe('1K')
    expect(formatFollowerCount(1049)).toBe('1K')
    expect(formatFollowerCount(46_949)).toBe('46.9K')
    expect(formatFollowerCount(999_999)).toBe('999.9K')
    expect(formatFollowerCount(1_250_000)).toBe('1.2M')
  })

  it('is safe for bad input and pluralizes the label', () => {
    expect(formatFollowerCount(-5)).toBe('0')
    expect(formatFollowerCount(Number.NaN)).toBe('0')
    expect(followerCountLabel(1)).toBe('1 follower')
    expect(followerCountLabel(46_900)).toBe('46.9K followers')
  })
})

describe('links page URLs', () => {
  it('builds the page, share image, and join links', () => {
    expect(linksPagePath('john')).toBe('/u/john/links')
    expect(linksPageOgImagePath('John')).toBe('/og/links/john.png')
    expect(linksPageJoinHref('JOHN1')).toBe('/login?src=links_page&ref=JOHN1')
  })

  it('omits ref when the owner has no referral code', () => {
    expect(linksPageJoinHref(null)).toBe('/login?src=links_page')
    expect(linksPageJoinHref(undefined)).toBe('/login?src=links_page')
    expect(linksPageJoinHref('  ')).toBe('/login?src=links_page')
  })

  it('encodes the referral code', () => {
    expect(linksPageJoinHref('a b&c')).toBe('/login?src=links_page&ref=a+b%26c')
  })
})

describe('profile header links', () => {
  const links = [
    { id: '1', url: 'https://jpmcglone.com', title: 'jpmcglone.com', host: 'jpmcglone.com', icon: 'website' },
    { id: '2', url: 'https://rumble.com/c/moh', title: 'Men of Hunger on Rumble', host: 'rumble.com', icon: 'rumble' },
  ]

  it('shows connected accounts first, then custom links with brand icons', () => {
    const out = buildProfileHeaderLinks({ xUsername: 'jp', pickaxUsername: 'jp2', links })
    expect(out.map((l) => l.icon)).toEqual(['x', 'pickax', 'website', 'rumble'])
    expect(out[3]).toMatchObject({ display: 'Men of Hunger on Rumble', href: 'https://rumble.com/c/moh' })
    expect(out[0]?.network).toBe('x')
    expect(out[2]?.network).toBeNull()
  })

  it('ignores the deprecated mirror once links are present', () => {
    const out = buildProfileHeaderLinks({ website: 'https://old.example', rumbleUrl: 'https://rumble.com/old', links: [] })
    expect(out).toEqual([])
  })

  it('falls back to legacy fields only when links are absent', () => {
    const out = buildProfileHeaderLinks({
      xUsername: 'jp',
      website: 'https://example.com/me/',
      rumbleUrl: 'https://rumble.com/c/x',
      youtubeUrl: 'javascript:alert(1)',
    })
    expect(out.map((l) => [l.icon, l.display])).toEqual([['x', '@jp'], ['website', 'example.com/me'], ['rumble', 'Rumble']])
  })

  it('never renders a non-http(s) custom link', () => {
    const out = buildProfileHeaderLinks({
      links: [{ id: 'x', url: 'javascript:alert(1)', title: 'bad', host: '', icon: 'website' }],
    })
    expect(out).toEqual([])
  })
})

describe('link editor helpers', () => {
  it('normalizes bare domains and leaves explicit schemes for the API to judge', () => {
    expect(normalizeLinkUrl('  example.com/a ')).toBe('https://example.com/a')
    expect(normalizeLinkUrl('//example.com')).toBe('https://example.com')
    expect(normalizeLinkUrl('http://example.com')).toBe('http://example.com')
    expect(normalizeLinkUrl('javascript:alert(1)')).toBe('javascript:alert(1)')
    expect(normalizeLinkUrl('   ')).toBe('')
  })

  it('moves rows without mutating the input and ignores out-of-range moves', () => {
    const list = ['a', 'b', 'c']
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(list, 2, 1)).toEqual(['a', 'c', 'b'])
    expect(moveItem(list, 0, -1)).toEqual(list)
    expect(moveItem(list, 1, 3)).toEqual(list)
    expect(list).toEqual(['a', 'b', 'c'])
  })

  it('sends the whole list in order, ids only for saved rows, titles only when set', () => {
    const saved = { ...newDraft('example.com', ''), id: 'abc' }
    const fresh = newDraft('https://podcast.example', '  Hungry Men  ')
    expect(linksPayload([fresh, saved])).toEqual({
      links: [
        { url: 'https://podcast.example', title: 'Hungry Men' },
        { id: 'abc', url: 'https://example.com' },
      ],
    })
  })

  it('treats reordering as a change in the signature', () => {
    const a = { id: '1', url: 'https://a.example', title: 'A' }
    const b = { id: '2', url: 'https://b.example', title: 'B' }
    expect(linksSignature([a, b])).not.toBe(linksSignature([b, a]))
    expect(linksSignature([a, { ...b, title: ' B ' }])).toBe(linksSignature([a, b]))
  })
})

describe('QR path', () => {
  it('emits one rectangle per horizontal run of dark modules', () => {
    expect(buildQrPath([[true, true, false, true], [false, false, false, false], [false, true, false, false]])).toBe(
      'M0 0h2v1h-2zM3 0h1v1h-1zM1 2h1v1h-1z',
    )
    expect(buildQrPath([])).toBe('')
  })
})
