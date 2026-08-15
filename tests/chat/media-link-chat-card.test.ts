import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('media link chat preview', () => {
  it('renders a dedicated card for YouTube, Rumble, and other media hosts', () => {
    const body = read('components/app/chat/ChatMessageRichBody.vue')
    expect(body).toContain('parseMediaPreviewUrl')
    expect(body).toContain('AppChatMediaLinkChatCard')
    expect(body).toContain('mediaPreviewHref')
    expect(body).toMatch(/if \(parseMediaPreviewUrl\(url\)\) return/)
  })

  it('loads posters without an iframe and opens the source in a real tab', () => {
    const card = read('components/app/chat/MediaLinkChatCard.vue')
    expect(card).toContain('getYouTubePosterUrls')
    expect(card).toContain('youtubeOEmbedRequestUrl')
    expect(card).toContain('vimeoOEmbedRequestUrl')
    expect(card).toContain('getLinkMetadata')
    expect(card).toMatch(/<a[\s\S]*:href="href"/)
    expect(card).toContain('target="_blank"')
    expect(card).toContain('rel="noopener noreferrer"')
    expect(card).not.toContain('<iframe')
  })

  it('gives a media-only bubble a real width instead of hugging the timestamp', () => {
    const body = read('components/app/chat/ChatMessageRichBody.vue')
    expect(body).toMatch(/mediaPreviewHref \? 'w-80 max-w-full'/)
  })

  it('keeps the timestamp under the preview, not above it', () => {
    const body = read('components/app/chat/ChatMessageRichBody.vue')
    expect(body).toMatch(/<slot v-if="!hasBlockPreview" name="tail" \/>/)
    expect(body).toMatch(/v-if="hasBlockPreview"[\s\S]*<slot name="tail" \/>/)
    const cardIdx = body.indexOf('AppChatMediaLinkChatCard')
    const afterCardTail = body.indexOf('<slot name="tail" />', cardIdx)
    expect(cardIdx).toBeGreaterThan(0)
    expect(afterCardTail).toBeGreaterThan(cardIdx)
  })

  it('waits for the viewport latch before fetching remote metadata', () => {
    const body = read('components/app/chat/ChatMessageRichBody.vue')
    const card = read('components/app/chat/MediaLinkChatCard.vue')
    expect(body).toMatch(/everVisible && showLinkPreview && mediaPreviewHref/)
    expect(card).toContain('enabled')
    expect(card).toMatch(/!enabled/)
  })
})
