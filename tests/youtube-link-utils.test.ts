/**
 * Guardrail tests for YouTube URL parsing in link-utils.
 */
import { describe, it, expect } from 'vitest'
import { parseYouTubeUrl, getYouTubeEmbedUrl, getYouTubePosterUrls, youtubeOEmbedRequestUrl, parseMediaPreviewUrl, vimeoOEmbedRequestUrl } from '../utils/link-utils'

const VIDEO_ID = 'dQw4w9WgXcQ'

describe('parseYouTubeUrl — URL shapes', () => {
  it('handles youtu.be short links', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${VIDEO_ID}`)?.id).toBe(VIDEO_ID)
  })

  it('handles youtube.com/watch?v=', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${VIDEO_ID}`)?.id).toBe(VIDEO_ID)
  })

  it('handles m.youtube.com/watch?v=', () => {
    expect(parseYouTubeUrl(`https://m.youtube.com/watch?v=${VIDEO_ID}`)?.id).toBe(VIDEO_ID)
  })

  it('handles /shorts/ URLs', () => {
    const info = parseYouTubeUrl(`https://www.youtube.com/shorts/${VIDEO_ID}`)
    expect(info?.id).toBe(VIDEO_ID)
    expect(info?.isShort).toBe(true)
  })

  it('handles /live/ URLs', () => {
    const info = parseYouTubeUrl(`https://www.youtube.com/live/${VIDEO_ID}`)
    expect(info?.id).toBe(VIDEO_ID)
    expect(info?.isShort).toBe(false)
  })

  it('handles /embed/ URLs', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/embed/${VIDEO_ID}`)?.id).toBe(VIDEO_ID)
  })

  it('marks non-short videos as isShort=false', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${VIDEO_ID}`)?.isShort).toBe(false)
  })

  it('returns null for unrecognised URLs', () => {
    expect(parseYouTubeUrl('https://vimeo.com/123456')).toBeNull()
    expect(parseYouTubeUrl('https://youtube.com/')).toBeNull()
    expect(parseYouTubeUrl('not-a-url')).toBeNull()
  })

  it('rejects IDs that are too short or contain invalid chars', () => {
    expect(parseYouTubeUrl('https://youtu.be/abc')).toBeNull()
    expect(parseYouTubeUrl('https://youtu.be/../../etc/passwd')).toBeNull()
  })
})

describe('parseYouTubeUrl — timestamps', () => {
  it('parses plain-seconds t= param', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${VIDEO_ID}?t=90`)?.startSeconds).toBe(90)
  })

  it('parses 1h2m3s notation', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${VIDEO_ID}?t=1h2m3s`)?.startSeconds).toBe(3723)
  })

  it('parses m30s notation', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${VIDEO_ID}?t=2m30s`)?.startSeconds).toBe(150)
  })

  it('parses start= query param', () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${VIDEO_ID}&start=45`)?.startSeconds).toBe(45)
  })

  it('returns null startSeconds when no timestamp', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${VIDEO_ID}`)?.startSeconds).toBeNull()
  })

  it('returns null startSeconds for t=0', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${VIDEO_ID}?t=0`)?.startSeconds).toBeNull()
  })
})

describe('getYouTubeEmbedUrl', () => {
  it('uses youtube-nocookie.com domain', () => {
    const url = getYouTubeEmbedUrl(`https://youtu.be/${VIDEO_ID}`)
    expect(url).toContain('youtube-nocookie.com')
  })

  it('defaults to autoplay=0', () => {
    const url = getYouTubeEmbedUrl(`https://youtu.be/${VIDEO_ID}`)
    expect(url).toContain('autoplay=0')
  })

  it('sets autoplay=1 when requested', () => {
    const url = getYouTubeEmbedUrl(`https://youtu.be/${VIDEO_ID}`, { autoplay: true })
    expect(url).toContain('autoplay=1')
  })

  it('appends start= when URL has a timestamp', () => {
    const url = getYouTubeEmbedUrl(`https://youtu.be/${VIDEO_ID}?t=90`)
    expect(url).toContain('start=90')
  })

  it('does not include modestbranding param', () => {
    const url = getYouTubeEmbedUrl(`https://youtu.be/${VIDEO_ID}`)
    expect(url).not.toContain('modestbranding')
  })

  it('sets rel=0', () => {
    const url = getYouTubeEmbedUrl(`https://youtu.be/${VIDEO_ID}`)
    expect(url).toContain('rel=0')
  })

  it('returns null for non-YouTube URLs', () => {
    expect(getYouTubeEmbedUrl('https://vimeo.com/123456')).toBeNull()
  })
})

describe('youtubeOEmbedRequestUrl', () => {
  it('builds the public oEmbed URL from a watch link', () => {
    expect(youtubeOEmbedRequestUrl(`https://youtu.be/${VIDEO_ID}`)).toBe(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${VIDEO_ID}&format=json`,
    )
    expect(youtubeOEmbedRequestUrl('https://example.com')).toBeNull()
  })
})

describe('getYouTubePosterUrls', () => {
  it('returns both maxres and fallback URLs', () => {
    const urls = getYouTubePosterUrls(`https://youtu.be/${VIDEO_ID}`)
    expect(urls?.maxres).toContain('maxresdefault.jpg')
    expect(urls?.fallback).toContain('hqdefault.jpg')
  })

  it('includes the video ID in both URLs', () => {
    const urls = getYouTubePosterUrls(`https://youtu.be/${VIDEO_ID}`)
    expect(urls?.maxres).toContain(VIDEO_ID)
    expect(urls?.fallback).toContain(VIDEO_ID)
  })

  it('returns null for non-YouTube URLs', () => {
    expect(getYouTubePosterUrls('https://example.com')).toBeNull()
  })
})

describe('parseMediaPreviewUrl', () => {
  it('classifies common video and image hosts', () => {
    expect(parseMediaPreviewUrl(`https://youtu.be/${VIDEO_ID}`)).toEqual({ kind: 'video', provider: 'YouTube' })
    expect(parseMediaPreviewUrl('https://rumble.com/v123-hello.html')).toEqual({ kind: 'video', provider: 'Rumble' })
    expect(parseMediaPreviewUrl('https://vimeo.com/123456')).toEqual({ kind: 'video', provider: 'Vimeo' })
    expect(parseMediaPreviewUrl('https://www.twitch.tv/videos/123')).toEqual({ kind: 'video', provider: 'Twitch' })
    expect(parseMediaPreviewUrl('https://i.imgur.com/abc.jpg')).toEqual({ kind: 'image', provider: 'Imgur' })
    expect(parseMediaPreviewUrl('https://cdn.example.com/shot.webp')).toEqual({ kind: 'image', provider: 'cdn.example.com' })
    expect(parseMediaPreviewUrl('https://example.com/article')).toBeNull()
  })
})

describe('vimeoOEmbedRequestUrl', () => {
  it('builds the public oEmbed URL', () => {
    expect(vimeoOEmbedRequestUrl('https://vimeo.com/123456')).toBe(
      'https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F123456',
    )
    expect(vimeoOEmbedRequestUrl('https://youtube.com/watch?v=abc')).toBeNull()
  })
})
