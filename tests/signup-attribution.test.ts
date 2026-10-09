import { describe, expect, it } from 'vitest'
import {
  ATTRIBUTION_TTL_MS,
  isAttributionFresh,
  parseStoredAttribution,
  readAttributionFromVisit,
  referrerHostFrom,
} from '~/utils/signup-attribution'

const base = { path: '/', referrer: '', ownHost: 'menofhunger.com' }

describe('signup attribution', () => {
  it('captures src, utm params, landing path and external referrer host', () => {
    const out = readAttributionFromVisit({
      ...base,
      path: '/bring-one-man',
      referrer: 'https://t.co/abc',
      query: { src: 'newsletter', utm_source: 'x', utm_medium: 'email', utm_campaign: 'bring-one-man' },
    })
    expect(out).toEqual({
      src: 'newsletter',
      utmSource: 'x',
      utmMedium: 'email',
      utmCampaign: 'bring-one-man',
      landingPath: '/bring-one-man',
      referrerHost: 't.co',
    })
  })

  it('returns null for a plain direct visit and ignores own-host referrers', () => {
    expect(readAttributionFromVisit({ ...base, query: {} })).toBeNull()
    expect(referrerHostFrom('https://menofhunger.com/p/1', 'menofhunger.com')).toBe('')
  })

  it('treats a ref-only visit as a signal', () => {
    expect(readAttributionFromVisit({ ...base, query: { ref: 'JOHN' } })?.landingPath).toBe('/')
  })

  it('attributes a bare visit to a public links page as links_page', () => {
    expect(readAttributionFromVisit({ ...base, path: '/u/john/links', query: {} })).toEqual({
      src: 'links_page',
      landingPath: '/u/john/links',
    })
    expect(readAttributionFromVisit({ ...base, path: '/u/john/links/', query: {} })?.src).toBe('links_page')
  })

  it('lets an explicit src or campaign win over the links page default', () => {
    expect(readAttributionFromVisit({ ...base, path: '/u/john/links', query: { src: 'newsletter' } })?.src).toBe('newsletter')
  })

  it('does not treat other profile paths as links page visits', () => {
    expect(readAttributionFromVisit({ ...base, path: '/u/john', query: {} })).toBeNull()
    expect(readAttributionFromVisit({ ...base, path: '/u/john/links/extra', query: {} })).toBeNull()
    expect(readAttributionFromVisit({ ...base, path: '/u/john/posts', query: {} })).toBeNull()
  })

  it('expires stored attribution after 30 days', () => {
    const stored = parseStoredAttribution(JSON.stringify({ src: 'x-mhq', capturedAt: 1000 }))
    expect(isAttributionFresh(stored, 1000 + ATTRIBUTION_TTL_MS - 1)).toBe(true)
    expect(isAttributionFresh(stored, 1000 + ATTRIBUTION_TTL_MS)).toBe(false)
    expect(parseStoredAttribution('not json')).toBeNull()
  })
})
