import { describe, expect, it } from 'vitest'
import { sanitizeAnalyticsProperties } from '../utils/analytics-privacy'

describe('analytics privacy', () => {
  it('redacts URL queries and fragments, including persisted initial attribution', () => {
    expect(sanitizeAnalyticsProperties({ $current_url: 'https://menofhunger.com/search?q=private#token', $set_once: { $initial_referrer: 'https://example.com/?secret=abc', $initial_search_keyword: 'private' }, platform: 'www' })).toEqual({ $current_url: 'https://menofhunger.com/search', $set_once: { $initial_referrer: 'https://example.com/' }, platform: 'www' })
  })
  it('drops private content while retaining funnel properties', () => {
    expect(sanitizeAnalyticsProperties({ query: 'private', phone_masked: '123', email: 'x@y.z', body: 'secret', phase: 'approved', completed_count: 2 })).toEqual({ phase: 'approved', completed_count: 2 })
  })
})
