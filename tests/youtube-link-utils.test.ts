/**
 * Guardrail tests for YouTube URL parsing in link-utils.
 */
import { describe, it, expect } from 'vitest'
import { parseYouTubeUrl, getYouTubeEmbedUrl, getYouTubePosterUrls } from '../utils/link-utils'

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
