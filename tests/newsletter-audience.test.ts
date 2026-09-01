import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultAudienceFilter, summarizeAudienceFilters } from '../utils/newsletter-audience'

describe('newsletter audience filters', () => {
  it('summarizes stacked filters for the admin list', () => {
    expect(summarizeAudienceFilters([])).toBe('members with a confirmed email')
    expect(
      summarizeAudienceFilters([
        defaultAudienceFilter('inactive'),
        { type: 'joined', cmp: 'atLeast', amount: 6, unit: 'months' },
        { type: 'tier', min: 'verified' },
      ]),
    ).toBe('away 30 days · members 6 months+ · verified+')
  })

  it('editor counts the live filter set and can add every kind', () => {
    const page = readFileSync(resolve(process.cwd(), 'pages/admin/newsletters/[id].vue'), 'utf8')
    const editor = readFileSync(
      resolve(process.cwd(), 'components/admin/NewsletterAudienceFilters.vue'),
      'utf8',
    )
    expect(page).toMatch(/\/admin\/newsletters\/audience-count/)
    expect(page).toMatch(/AdminNewsletterAudienceFilters/)
    expect(editor).toMatch(/Haven't opened the app/)
    expect(editor).toMatch(/Members for at least/)
    expect(editor).toMatch(/Joined in the last/)
    expect(editor).toMatch(/Verified or greater/)
    expect(editor).toMatch(/Premium or greater/)
    expect(editor).toMatch(/No check-in in/)
  })
})
