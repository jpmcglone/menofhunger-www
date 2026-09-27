import { describe, expect, it } from 'vitest'
import { videoSupportsPictureInPicture, youtubePictureInPictureEmbedUrl } from '../utils/media/video-picture-in-picture'

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

describe('youtube picture-in-picture embed', () => {
  it('starts the same video, unmuted, at the current time', () => {
    const src = youtubePictureInPictureEmbedUrl('dQw4w9WgXcQ', 95.4, false, 'https://menofhunger.com')
    expect(src).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?')
    const params = new URL(src!).searchParams
    expect(params.get('autoplay')).toBe('1')
    expect(params.get('mute')).toBe('0')
    expect(params.get('start')).toBe('95')
    expect(params.get('origin')).toBe('https://menofhunger.com')
  })

  it('rejects an id the embed would not accept', () => {
    expect(youtubePictureInPictureEmbedUrl('nope', 0, true, 'https://menofhunger.com')).toBeNull()
  })
})
