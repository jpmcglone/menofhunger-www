import { afterEach, describe, expect, it } from 'vitest'
import { callVideoAttachKey } from '~/composables/calls/callLifecycle'
import { pickCallPipSource, registerCallPipSource } from '~/composables/calls/callPictureInPicture'

describe('callVideoAttachKey', () => {
  it('changes when the live video track is replaced', () => {
    const stream = {
      getVideoTracks: () => [{ id: 'cam-front' }],
    } as unknown as MediaStream
    const flipped = {
      getVideoTracks: () => [{ id: 'cam-back' }],
    } as unknown as MediaStream
    expect(callVideoAttachKey(null)).toBe('none')
    expect(callVideoAttachKey(stream)).toBe('cam-front')
    expect(callVideoAttachKey(flipped)).toBe('cam-back')
    expect(callVideoAttachKey(stream)).not.toBe(callVideoAttachKey(flipped))
  })
})

describe('call picture-in-picture sources', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('prefers a connected video that already has frames', () => {
    const empty = document.createElement('video')
    const ready = document.createElement('video')
    document.body.append(empty, ready)
    Object.defineProperty(ready, 'readyState', { value: HTMLMediaElement.HAVE_CURRENT_DATA })
    Object.defineProperty(ready, 'videoWidth', { value: 640 })
    const unregEmpty = registerCallPipSource(empty)
    const unregReady = registerCallPipSource(ready)
    expect(pickCallPipSource()).toBe(ready)
    unregEmpty()
    unregReady()
  })
})
