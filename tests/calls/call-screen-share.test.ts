import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('screen share session', () => {
  it('sets contentHint detail, restores camera on ended, and emits screenSharing', () => {
    const session = read('composables/calls/useCallSession.ts')
    expect(session).toContain("track.contentHint = 'detail'")
    expect(session).toContain('getDisplayMedia')
    expect(session).toContain('track.onended')
    expect(session).toContain('restoreCamera')
    expect(session).toContain('screenSharing: true')
    expect(session).toContain('screenSharing: false')
  })

  it('skips resolution scale-down when the sender track is a screen share', () => {
    const quality = read('composables/calls/useCallQualityManager.ts')
    expect(quality).toContain("contentHint === 'detail'")
    expect(quality).toContain('scaleResolutionDownBy = screenShare ? 1')
    expect(quality).toContain('maintain-resolution')
  })
})

describe('screen share chrome', () => {
  it('hides the share button on coarse pointers and contain-fits shared tiles', () => {
    const controls = read('components/app/calls/CallControls.vue')
    expect(controls).toContain('canScreenShare')
    expect(controls).toContain('call-share-screen')
    expect(controls).toContain('isCoarsePointer')

    const tile = read('components/app/calls/CallVideoTile.vue')
    expect(tile).toContain("fit === 'contain' ? 'object-contain'")
    expect(tile).toContain("You're sharing your screen")

    const overlay = read('components/app/calls/CallOverlay.vue')
    expect(overlay).toContain("p.screenSharing ? 'contain'")
    expect(overlay).toContain('toggleScreenShare')
  })
})
