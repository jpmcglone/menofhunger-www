import { describe, expect, it } from 'vitest'
import { gatedPostBodyPreview } from '~/utils/text'

describe('gatedPostBodyPreview', () => {
  it('returns empty when fewer than minWords', () => {
    expect(gatedPostBodyPreview('one two three', 10)).toBe('')
  })

  it('returns truncated preview when enough words', () => {
    const body = 'one two three four five six seven eight nine ten eleven'
    expect(gatedPostBodyPreview(body, 10, 22)).toBe('one two three four fiv…')
  })

  it('matches API-style short post (no preview)', () => {
    expect(gatedPostBodyPreview('Hello world', 10)).toBe('')
  })
})
