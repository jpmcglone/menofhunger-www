import { describe, expect, it } from 'vitest'
import sprite from '../public/icons/moh.svg?raw'
import catalog from '../design/icon-catalog.json'
import mark from '../design/marv-mark.json'
import { userActionColor } from '../utils/user-tier'

describe('shared icon library', () => {
  it('provides a distinct default and selected symbol for every semantic icon', () => {
    for (const key of Object.keys(catalog)) {
      expect(sprite).toContain(`id="${key}-default"`)
      expect(sprite).toContain(`id="${key}-selected"`)
    }
    expect(catalog.share.selectedTreatment).toBe('bold')
    expect(catalog.home.selectedTreatment).toBe('fill')
  })

  it('preserves MARV segmentation while changing loader weight without changing the viewBox', () => {
    expect(mark.viewBox).toBe('0 0 24 24')
    expect(mark.shapes.standard.map(segment => segment.role)).toEqual(mark.shapes.loading.map(segment => segment.role))
    expect(mark.shapes.standard).toHaveLength(5)
    expect(mark.shapes.loading[0]?.d).not.toEqual(mark.shapes.standard[0]?.d)
  })

  it('resolves acting-user colors independently of post visibility', () => {
    expect(userActionColor({ isOrganization: true, premium: true })).toBe('var(--moh-org)')
    expect(userActionColor({ premium: true })).toBe('var(--moh-premium)')
    expect(userActionColor({ verifiedStatus: 'verified' })).toBe('var(--moh-verified)')
    expect(userActionColor(null)).toBe('var(--moh-text)')
  })
})
