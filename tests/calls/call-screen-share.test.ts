import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('screen share session', () => {
  it('publishes the share on a separate screen track and leaves the camera alone', () => {
    const session = read('composables/calls/useCallSession.ts')
    expect(session).toContain("track.contentHint = 'detail'")
    expect(session).toContain('getDisplayMedia')
    expect(session).toContain('track.onended')
    expect(session).toContain("setLocalTrack('screen'")
    expect(session).toContain('localScreenStream')
    expect(session).toContain('remoteScreenStreams')
    expect(session).toContain('Someone is already presenting.')
    expect(session).toContain('screenSharing: true')
    expect(session).toContain('screenSharing: false')
    expect(session).not.toContain('restoreCamera')
    expect(session).not.toContain('cameraWasOnBeforeShare')
  })

  it('negotiates a dedicated screen transceiver so share does not replace camera', () => {
    const transport = read('composables/calls/transport/PeerToPeerCallTransport.ts')
    expect(transport).toContain("addTransceiver('video'")
    expect(transport).toContain('screenTransceiver')
    expect(transport).toContain('screenSender')
    expect(transport).toContain('onRemoteScreenStream')
    expect(transport).toContain("kind === 'screen'")
  })

  it('skips resolution scale-down when the sender track is a screen share', () => {
    const quality = read('composables/calls/useCallQualityManager.ts')
    expect(quality).toContain("contentHint === 'detail'")
    expect(quality).toContain('scaleResolutionDownBy = screenShare ? 1')
    expect(quality).toContain('maintain-resolution')
  })
})

describe('screen share chrome', () => {
  it('hides the share button on coarse pointers and stages the share when someone presents', () => {
    const controls = read('components/app/calls/CallControls.vue')
    expect(controls).toContain('canScreenShare')
    expect(controls).toContain('call-share-screen')
    expect(controls).toContain('isCoarsePointer')

    const tile = read('components/app/calls/CallVideoTile.vue')
    expect(tile).toContain("fit === 'contain' ? 'object-contain'")
    expect(tile).toContain("variant === 'stage'")

    const overlay = read('components/app/calls/CallOverlay.vue')
    expect(overlay).toContain('call-presenting-stage')
    expect(overlay).toContain('call-presenting-filmstrip')
    expect(overlay).toContain('You\'re presenting')
    expect(overlay).toContain('toggleScreenShare')
    expect(overlay).toContain('someoneElsePresenting')
  })
})
