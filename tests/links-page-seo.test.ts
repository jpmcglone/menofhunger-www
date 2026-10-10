import { describe, expect, it } from 'vitest'
import { linksPageSeo } from '../utils/links-page-seo'
import type { LinksPage } from '../types/api'

const page: LinksPage = {
  user: {
    id: 'u1', username: 'john', name: 'John McGlone', bio: 'Building a trusted community.',
    locationDisplay: 'Virginia', verifiedStatus: 'identity', isOrganization: false,
    premium: false, premiumPlus: false, avatarUrl: 'https://images.example/john.png',
  },
  connectedAccounts: [{ network: 'x', handle: 'jp', url: 'https://x.com/jp', followerCount: 123 }],
  links: [
    { id: 'l1', url: 'https://podcast.example', title: 'A friend’s podcast', host: 'podcast.example', icon: 'website' },
    { id: 'l2', url: 'https://john.example', title: 'My site', host: 'john.example', icon: 'website' },
  ],
  recent: [
    { kind: 'post', id: 'p1', title: null, excerpt: 'Show up every day.', createdAt: '2026-10-08T12:00:00Z' },
    { kind: 'article', id: 'a1', title: 'Building discipline', excerpt: 'An excerpt', createdAt: '2026-10-07T12:00:00Z' },
  ],
  referralCode: 'PRIVATE_ATTRIBUTION',
}

describe('public links-page metadata', () => {
  it('describes the visible profile and content with canonical artwork dimensions', () => {
    const seo = linksPageSeo(page, 'JoHn')
    expect(seo.title).toBe('John McGlone (@john) · Links')
    expect(seo.description).toContain('Building a trusted community.')
    expect(seo.description).toContain('links, connected accounts, recent posts')
    expect(seo.description.length).toBeLessThanOrEqual(180)
    expect(seo.canonicalPath).toBe('/u/john/links')
    expect(seo.image).toBe('/og/links/john.png?v=2')
    expect([seo.imageWidth, seo.imageHeight]).toEqual([1200, 630])
    expect(seo.webPageType).toBe('ProfilePage')
    expect(seo.noindex).toBe(false)
  })

  it('identifies only the connected accounts as the owner and preserves visible list order', () => {
    const seo = linksPageSeo(page, 'john')
    const entity = seo.jsonLdGraph[0]!
    expect(entity).toMatchObject({ '@type': 'Person', '@id': seo.mainEntityId, name: 'John McGlone', sameAs: ['https://x.com/jp'] })
    const links = seo.jsonLdGraph.find((node) => node.name === 'Links')!
    expect(links.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, url: 'https://podcast.example', name: 'A friend’s podcast' },
      { '@type': 'ListItem', position: 2, url: 'https://john.example', name: 'My site' },
    ])
    const recent = seo.jsonLdGraph.find((node) => node.name === 'Recent on Men of Hunger')!
    expect(recent.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, url: 'https://menofhunger.com/p/p1', name: 'Show up every day.' },
      { '@type': 'ListItem', position: 2, url: 'https://menofhunger.com/a/a1', name: 'Building discipline' },
    ])
    const serialized = JSON.stringify(seo)
    expect(serialized).not.toContain('PRIVATE_ATTRIBUTION')
    expect(serialized).not.toContain('interactionStatistic')
    expect(serialized).not.toContain('dateModified')
  })

  it('supports organization profiles and missing optional fields without inventing content', () => {
    const seo = linksPageSeo({ ...page, user: { ...page.user, isOrganization: true, name: null, bio: null, avatarUrl: null }, links: [], connectedAccounts: [], recent: [] }, 'john')
    expect(seo.title).toBe('@john · Links')
    expect(seo.description).toBe("@john's links page on Men of Hunger.")
    expect(seo.jsonLdGraph).toHaveLength(1)
    expect(seo.jsonLdGraph[0]).toMatchObject({ '@type': 'Organization' })
    expect(seo.jsonLdGraph[0]).not.toHaveProperty('sameAs')
    expect(seo.jsonLdGraph[0]).not.toHaveProperty('image')
  })

  it('bounds long biography snippets and hides unavailable profiles from indexing', () => {
    expect(linksPageSeo({ ...page, user: { ...page.user, bio: 'Long biography. '.repeat(80) } }, 'john').description.length).toBeLessThanOrEqual(180)
    const missing = linksPageSeo(null, 'MISSING')
    expect(missing).toMatchObject({ title: 'Page not available', canonicalPath: '/u/missing/links', noindex: true, ogType: 'website', webPageType: 'WebPage', jsonLdGraph: [] })
    expect(missing).not.toHaveProperty('mainEntityId')
    expect(missing).not.toHaveProperty('image')
  })
})
