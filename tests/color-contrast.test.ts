import { describe, expect, it } from 'vitest'
import { contrastRatio, pickTextColorForBg, relativeLuminance } from '../utils/color-contrast'
import { primaryPaletteToCssVars, PRIMARY_VERIFIED_BLUE } from '../utils/theme-tint'

describe('button contrast', () => {
  it('uses WCAG luminance rather than a brightness threshold', () => {
    expect(relativeLuminance('#000')).toBe(0)
    expect(relativeLuminance('#fff')).toBe(1)
    expect(contrastRatio('#000', '#fff')).toBe(21)
    expect(pickTextColorForBg('#c45b00')).toBe('#000000')
  })
  it('selects a foreground with at least 4.5:1 contrast for representative sRGB fills', () => {
    for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
      const fill = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
      expect(contrastRatio(fill, pickTextColorForBg(fill))).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('calculates labels against each actual PrimeVue interaction fill', () => {
    const css = primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, 'html')
    for (const [state, shade] of [['', 500], ['hover-', 600], ['active-', 700]] as const) {
      expect(css).toContain(`--p-button-primary-${state}color:${pickTextColorForBg(PRIMARY_VERIFIED_BLUE[shade])}`)
    }
  })
})
