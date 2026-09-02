import { describe, expect, it, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  describeMediaError,
  videoConstraints,
  MOBILE_VIDEO_CONSTRAINTS,
  DEFAULT_VIDEO_CONSTRAINTS,
} from '~/composables/calls/useCallDevices'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('describeMediaError', () => {
  it('tells the user to allow camera in browser settings when blocked', () => {
    expect(describeMediaError({ name: 'NotAllowedError' }, 'camera')).toMatch(/blocked/i)
    expect(describeMediaError({ name: 'NotAllowedError' }, 'camera')).toMatch(/browser settings/i)
  })

  it('does not call a constraint failure "not found"', () => {
    expect(describeMediaError({ name: 'OverconstrainedError' }, 'camera')).not.toMatch(/not found/i)
  })
})

describe('videoConstraints', () => {
  it('asks phones for a modest front camera, not 720p 16:9', () => {
    const c = videoConstraints({ audio: false, video: true }, true)
    expect(c.width).toEqual(MOBILE_VIDEO_CONSTRAINTS.width)
    expect(c.aspectRatio).toBeUndefined()
    expect(c.facingMode).toEqual({ ideal: 'user' })
  })

  it('keeps the desktop 720p ladder when not coarse', () => {
    const c = videoConstraints({ audio: false, video: true }, false)
    expect(c.width).toEqual(DEFAULT_VIDEO_CONSTRAINTS.width)
    expect(c.aspectRatio).toEqual(DEFAULT_VIDEO_CONSTRAINTS.aspectRatio)
  })
})

describe('call chrome wiring', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hides the desktop device picker on coarse pointers', () => {
    const src = read('components/app/calls/CallControls.vue')
    expect(src).toContain('showDevicePicker')
    expect(src).toContain('isCoarsePointer')
    expect(src).toContain('Choose microphone, camera, or speaker')
  })

  it('surfaces camera errors on the overlay, not only a toast under it', () => {
    const overlay = read('components/app/calls/CallOverlay.vue')
    expect(overlay).toContain('cameraError')
    const toast = read('components/app/ToastStack.vue')
    expect(toast).toContain('z-[10050]')
  })
})
