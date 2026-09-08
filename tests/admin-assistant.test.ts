import { describe, expect, it } from 'vitest'
import { adminReviewFields } from '../utils/admin-assistant'

describe('admin action review', () => {
  it('renders newsletter paragraphs as readable text without interpreting HTML', () => {
    const bodyJson = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>untrusted</script>' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Next paragraph' }] }] })
    expect(adminReviewFields(JSON.stringify({ bodyJson, ctaLabel: null }))).toEqual([{ label: 'Body', value: '<script>untrusted</script>\n\nNext paragraph' }, { label: 'Cta Label', value: 'None' }])
  })
  it('makes false, zero and explicit clearing visible', () => {
    expect(adminReviewFields('{"disabled":false,"credits":0,"adminNote":null}')).toEqual([{ label: 'Disabled', value: 'No' }, { label: 'Credits', value: '0' }, { label: 'Admin Note', value: 'None' }])
  })
})

describe('publishing review', () => {
  it('shows the requested audience in readable language', () => {
    expect(adminReviewFields('{"visibility":"verifiedOnly"}')).toEqual([{ label: 'Visibility', value: 'Verified only' }])
  })
  it('shows one-time schedules in their timezone without unused recurring defaults', () => {
    const fields = adminReviewFields(JSON.stringify({ schedule: { frequency: 'once', at: '2026-09-08T01:21:00.000Z', time: '08:00', weekday: 1, timeZone: 'America/New_York' } }))
    expect(fields[0]!.value).toBe('Once · Sep 7, 2026, 9:21 PM · America/New_York')
    expect(fields[0]!.value).not.toContain('08:00')
    expect(adminReviewFields('{"schedule":{"frequency":"once"}}')[0]!.value).toContain('As soon as')
  })
})
