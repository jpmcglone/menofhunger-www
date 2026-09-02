import { describe, expect, it, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  describeMediaError,
  videoConstraints,
  MOBILE_VIDEO_CONSTRAINTS,
  DEFAULT_VIDEO_CONSTRAINTS,
  shouldStartCallWithCamera,
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

describe('shouldStartCallWithCamera', () => {
  it('starts camera only for the person who placed a video call', () => {
    expect(shouldStartCallWithCamera(true, false)).toBe(true)
    expect(shouldStartCallWithCamera(true, true)).toBe(false)
    expect(shouldStartCallWithCamera(false, false)).toBe(false)
    expect(shouldStartCallWithCamera(false, true)).toBe(false)
  })

  it('asks for facing-only first when flipping (no device id)', () => {
    const src = read('composables/calls/useCallDevices.ts')
    expect(src).toContain('facingOnly, sized')
    expect(src).toContain('req.videoDeviceId')
  })

  it('join/accept acquires audio only', () => {
    const session = read('composables/calls/useCallSession.ts')
    expect(session).toContain('acquireForCall(session.type, true)')
    expect(session).toContain('await acquireForCall(type)')
  })
})

describe('self-view chrome', () => {
  it('rounds the floating self-view wrapper so its shadow is not a sharp rect', () => {
    const overlay = read('components/app/calls/CallOverlay.vue')
    expect(overlay).toMatch(/ref="pipEl"[\s\S]*rounded-2xl/)
    expect(overlay).toContain('shadow-xl')
  })

  it('mirrors the wrapper, remounts the video on track change, and clips WebKit', () => {
    const tile = read('components/app/calls/CallVideoTile.vue')
    expect(tile).toContain('callVideoAttachKey')
    expect(tile).toContain(':key="attachKey"')
    expect(tile).toContain("mirrored && fit !== 'contain' ? 'scale-x-[-1]'")
    expect(tile).toMatch(/scale-x-\[-1\][\s\S]*<video/)
    expect(tile).not.toMatch(/<video[^>]*scale-x-\[-1\]/)
    expect(tile).toContain('clip-path: inset(0 round 1rem)')
    expect(tile).toContain('webkit-playsinline')
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
