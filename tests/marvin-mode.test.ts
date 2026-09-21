import { describe, expect, it } from 'vitest'
import {
  marvinModeLabel,
  marvinModeMenuCaption,
  marvinModePickerCaption,
} from '~/utils/marvin-mode'

describe('marvinModeLabel', () => {
  it('uses Standard / Search / Deep for the three paid tiers', () => {
    expect(marvinModeLabel('auto')).toBe('Auto')
    expect(marvinModeLabel('fast')).toBe('Standard')
    expect(marvinModeLabel('regular')).toBe('Search')
    expect(marvinModeLabel('smart')).toBe('Deep')
  })
})

describe('marvin mode captions', () => {
  const costs = { fast: 1, regular: 2, smart: 5 }

  it('marks Standard as no-web in the picker', () => {
    expect(marvinModePickerCaption('auto')).toBe('Picks for you')
    expect(marvinModePickerCaption('fast', costs)).toBe('No web · 1')
    expect(marvinModePickerCaption('regular', costs)).toBe('Web · 2')
    expect(marvinModePickerCaption('smart', costs)).toBe('Think · 5')
  })

  it('uses fuller captions in the chat menu', () => {
    expect(marvinModeMenuCaption('auto')).toBe('Picks for you')
    expect(marvinModeMenuCaption('fast', costs)).toBe('No web · 1 credit')
    expect(marvinModeMenuCaption('regular', costs)).toBe('Web · 2 credits')
    expect(marvinModeMenuCaption('smart', costs)).toBe('More thinking · 5 credits')
  })
})
