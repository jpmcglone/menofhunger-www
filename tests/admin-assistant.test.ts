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
