/**
 * Guardrail tests for YouTube URL parsing in link-utils.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseYouTubeUrl, getYouTubeEmbedUrl, getYouTubePosterUrls, youtubeOEmbedRequestUrl, parseMediaPreviewUrl, vimeoOEmbedRequestUrl, withRumbleAutoplay, youtubeMuteCommand, youtubeListeningCommand, youtubeVolumeCommand, postYouTubeIframeCommand, rumbleMuteCommand, rumbleVolumeCommand, postRumbleIframeCommand, postRumbleIframeVolume, parseEmbedPlayerAudio, clampMediaVolume, mediaVolumeToPercent, portraitEmbedFrameStyle, sameNormalizedUrl } from '../utils/link-utils'

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
    expect(url).toContain('mute=1')
    expect(url).toContain('enablejsapi=1')
  })

  it('can request unmuted autoplay', () => {
    const url = getYouTubeEmbedUrl(`https://youtu.be/${VIDEO_ID}`, { autoplay: true, muted: false })
    expect(url).toContain('mute=0')
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

describe('withRumbleAutoplay', () => {
  it('leaves the URL unchanged when autoplay is off', () => {
    const src = 'https://rumble.com/embed/v123abc/'
    expect(withRumbleAutoplay(src)).toBe(src)
    expect(withRumbleAutoplay(src, { autoplay: false })).toBe(src)
  })

  it('sets muted autoplay=2 and keeps existing query params', () => {
    const url = withRumbleAutoplay('https://rumble.com/embed/v123abc/?pub=7a20', { autoplay: true })
    expect(url).toContain('autoplay=2')
    expect(url).toContain('pub=7a20')
  })

  it('adds a pub id when missing so Rumble honors autoplay', () => {
    const url = withRumbleAutoplay('https://rumble.com/embed/v123abc/', { autoplay: true })
    expect(url).toContain('autoplay=2')
    expect(url).toContain('pub=7a20')
  })

  it('sets autoplay=1 when unmuted', () => {
    const url = withRumbleAutoplay('https://rumble.com/embed/v123abc/', { autoplay: true, muted: false })
    expect(url).toContain('autoplay=1')
  })

  it('builds a YouTube IFrame mute command', () => {
    expect(JSON.parse(youtubeMuteCommand(true))).toMatchObject({ func: 'mute' })
    expect(JSON.parse(youtubeMuteCommand(false))).toMatchObject({ func: 'unMute' })
  })

  it('handshakes before sending a YouTube iframe command', () => {
    const posted: string[] = []
    const win = { postMessage: (data: string) => { posted.push(data) } } as unknown as Window
    postYouTubeIframeCommand(win, youtubeMuteCommand(false))
    expect(JSON.parse(youtubeListeningCommand())).toEqual({ event: 'listening' })
    expect(posted).toEqual([youtubeListeningCommand(), youtubeMuteCommand(false)])
  })

  it('returns the original string when the URL is invalid', () => {
    expect(withRumbleAutoplay('not-a-url', { autoplay: true })).toBe('not-a-url')
  })

  it('posts a Rumble mute command without touching src', () => {
    expect(rumbleMuteCommand(true)).toEqual({ event: 'command', func: 'mute', args: [] })
    expect(rumbleMuteCommand(false)).toEqual({ event: 'command', func: 'unmute', args: [] })
    const posted: unknown[] = []
    const win = { postMessage: (data: unknown) => { posted.push(data) } } as unknown as Window
    postRumbleIframeCommand(win, false)
    expect(posted).toEqual([JSON.stringify(rumbleMuteCommand(false)), rumbleMuteCommand(false)])
  })

  it('maps shared 0–1 volume to YouTube/Rumble 0–100 commands', () => {
    expect(clampMediaVolume(1.4)).toBe(1)
    expect(clampMediaVolume(-0.2)).toBe(0)
    expect(mediaVolumeToPercent(0.42)).toBe(42)
    expect(JSON.parse(youtubeVolumeCommand(0.4))).toMatchObject({ func: 'setVolume', args: [40] })
    expect(rumbleVolumeCommand(0.4)).toEqual({ event: 'command', func: 'setVolume', args: [40] })
    const posted: unknown[] = []
    const win = { postMessage: (data: unknown) => { posted.push(data) } } as unknown as Window
    postRumbleIframeVolume(win, 0.4)
    expect(posted).toEqual([JSON.stringify(rumbleVolumeCommand(0.4)), rumbleVolumeCommand(0.4)])
  })

  it('parses iframe player audio messages', () => {
    expect(parseEmbedPlayerAudio({ event: 'infoDelivery', info: { volume: 40, muted: false } })).toEqual({
      volume01: 0.4,
      muted: false,
    })
    expect(parseEmbedPlayerAudio(JSON.stringify({ volume: 0.25, muted: true }))).toEqual({
      volume01: 0.25,
      muted: true,
    })
    expect(parseEmbedPlayerAudio('not-json')).toBeNull()
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

describe('portraitEmbedFrameStyle', () => {
  it('sizes the frame from the encoded aspect with a px height cap, never a cyclic percentage', () => {
    expect(portraitEmbedFrameStyle(1080, 1920)).toEqual({ width: 'calc(480px * 1080 / 1920)', maxWidth: '100%' })
    expect(portraitEmbedFrameStyle(9, 16).width).toBe('calc(480px * 9 / 16)')
    expect(portraitEmbedFrameStyle(0, -1)).toEqual(portraitEmbedFrameStyle(9, 16))
    expect(portraitEmbedFrameStyle(1080, 1920).width).not.toContain('%')
  })
})

describe('sameNormalizedUrl', () => {
  it('matches body links against server-normalized URLs', () => {
    expect(sameNormalizedUrl('https://rumble.com/v6abc12-run.html', 'https://rumble.com/v6abc12-run.html')).toBe(true)
    expect(sameNormalizedUrl('HTTPS://Rumble.com/v6abc12-run.html', 'https://rumble.com/v6abc12-run.html')).toBe(true)
    expect(sameNormalizedUrl('https://rumble.com/a.html', 'https://rumble.com/b.html')).toBe(false)
    expect(sameNormalizedUrl(null, 'https://rumble.com/a.html')).toBe(false)
    expect(sameNormalizedUrl('not a url', 'https://rumble.com/a.html')).toBe(false)
  })
})

describe('PostRowLinkPreview portrait video chrome', () => {
  it('sizes portrait Rumble and Shorts from the post payload at their final width', () => {
    const src = readFileSync(resolve(process.cwd(), 'components/app/post/PostRowLinkPreview.vue'), 'utf8')
    const postRow = readFileSync(resolve(process.cwd(), 'components/app/PostRow.vue'), 'utf8')
    expect(src).toContain('isRumblePortrait')
    expect(src).toContain(':style="videoFrameStyle"')
    expect(src).toContain('portraitEmbedFrameStyle')
    // The old shrink-to-fit frame + percentage box made portrait Rumble start tiny and grow.
    expect(src).not.toContain('w-fit max-w-full')
    expect(src).not.toContain('min(100%, calc(480px')
    // Server-cached embed seeds the size before any /link-metadata round trip.
    expect(src).toContain('videoEmbed?: PostVideoEmbed | null')
    expect(src).toContain('rumbleEmbedFromPost')
    expect(src).toContain('peekLinkMetadata')
    expect(src).not.toContain('rumbleEmbedInfo.value = null')
    expect(postRow).toContain(':video-embed="postView.videoEmbed ?? null"')
    expect(src).toContain('v-if="desiredVideoSrc"')
    expect(src).toContain(':key="embedPlayerKey"')
    expect(src).not.toContain(':key="desiredVideoSrc"')
    expect(src).toContain('scheduleYoutubeMuteSync')
    expect(src).toContain('postYouTubeIframeCommand')
    expect(src).toContain('postRumbleIframeCommand')
    expect(src).toContain('postRumbleIframeVolume')
    expect(src).toContain('youtubeVolumeCommand')
    expect(src).toContain('appWideVolume')
    expect(src).toContain('applyEmbedAudio')
    expect(src).toContain('muted: true')
    expect(src).not.toContain('muted: !appWideSoundOn.value')
  })
})
