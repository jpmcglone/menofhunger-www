import { describe, expect, it } from 'vitest'
import { groupSeo } from '../utils/group-seo'

const base = { slug: 'men-of-hunger', name: 'Men of Hunger', description: 'The official group. Join the chat!', avatarImageUrl: 'https://files/a.png', coverImageUrl: null, memberCount: 52, joinPolicy: 'open' as const }

describe('group share metadata', () => {
  it('describes an open group and canonicalizes to the public group page', () => {
    const seo = groupSeo(base)!
    expect(seo.description).toContain('52 members')
    expect(seo.description).toContain('Open to join')
    expect(seo.canonicalPath).toBe('/g/men-of-hunger')
    expect(seo.twitterCard).toBe('summary')
    expect(seo.imageWidth).toBe(512)
  })
  it('uses a wide cover for a large card and asks approval groups for a request', () => {
    const seo = groupSeo({ ...base, coverImageUrl: 'https://files/c.png', joinPolicy: 'approval', memberCount: 1 })!
    expect(seo.twitterCard).toBe('summary_large_image')
    expect(seo.image).toBe('https://files/c.png')
    expect(seo.description).toContain('1 member.')
    expect(seo.description).toContain('Request to join')
  })
  it('returns nothing for a missing group', () => expect(groupSeo(null)).toBeNull())
})
