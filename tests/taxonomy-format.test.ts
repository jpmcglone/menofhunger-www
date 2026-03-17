import { describe, expect, it } from 'vitest'
import { formatHashtagLabel, formatTaxonomyLabel } from '../utils/taxonomy-format'

describe('taxonomy format helpers', () => {
  it('formatTaxonomyLabel preserves plain taxonomy labels without hash prefix', () => {
    expect(formatTaxonomyLabel('Stoicism')).toBe('Stoicism')
  })

  it('formatHashtagLabel always returns a single leading hash', () => {
    expect(formatHashtagLabel('discipline')).toBe('#discipline')
    expect(formatHashtagLabel('##discipline')).toBe('#discipline')
  })
})
