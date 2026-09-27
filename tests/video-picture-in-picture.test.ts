import { describe, expect, it } from 'vitest'
import { videoSupportsPictureInPicture } from '../utils/media/video-picture-in-picture'

describe('video picture-in-picture', () => {
  it('asks for picture-in-picture only when the browser exposes it', () => {
    const el = document.createElement('video') as HTMLVideoElement
    Object.defineProperty(el, 'requestPictureInPicture', { value: () => Promise.resolve() })
    Object.defineProperty(document, 'pictureInPictureEnabled', { configurable: true, value: true })
    expect(videoSupportsPictureInPicture(el)).toBe(true)
    el.disablePictureInPicture = true
    expect(videoSupportsPictureInPicture(el)).toBe(false)
  })
})
