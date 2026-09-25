import { describe, expect, it } from 'vitest'
import { callVideoFit } from '~/composables/calls/callVideoFit'

const PORTRAIT_PHONE = 9 / 16
const LANDSCAPE_WEBCAM = 16 / 9

describe('callVideoFit', () => {
  it('fills when the sender and the tile agree on orientation', () => {
    expect(callVideoFit({ requested: 'contain', videoAspect: LANDSCAPE_WEBCAM, tileAspect: 1.9 })).toBe('cover')
    expect(callVideoFit({ requested: 'contain', videoAspect: PORTRAIT_PHONE, tileAspect: 0.5 })).toBe('cover')
  })

  it('shows the whole frame across orientations so nobody gets cropped', () => {
    // iPhone held upright, desktop window landscape — and the reverse after they rotate.
    expect(callVideoFit({ requested: 'contain', videoAspect: PORTRAIT_PHONE, tileAspect: 1.8 })).toBe('contain')
    expect(callVideoFit({ requested: 'contain', videoAspect: LANDSCAPE_WEBCAM, tileAspect: 0.46 })).toBe('contain')
    // Same orientation but a big shape gap (16:9 into a 4:3-ish tile) also contains.
    expect(callVideoFit({ requested: 'contain', videoAspect: LANDSCAPE_WEBCAM, tileAspect: 1.3 })).toBe('contain')
  })

  it('never crops a screen share or the presenting stage, whatever the shape', () => {
    expect(callVideoFit({ requested: 'cover', screenSharing: true, videoAspect: 1.6, tileAspect: 1.6 })).toBe('contain')
    expect(callVideoFit({ requested: 'contain', stage: true, videoAspect: 1.78, tileAspect: 1.78 })).toBe('contain')
  })

  it('keeps self-views filled and waits for real dimensions before filling a remote', () => {
    expect(callVideoFit({ requested: 'cover', videoAspect: PORTRAIT_PHONE, tileAspect: 1.8 })).toBe('cover')
    expect(callVideoFit({ requested: 'contain', videoAspect: 0, tileAspect: 1.8 })).toBe('contain')
  })
})
