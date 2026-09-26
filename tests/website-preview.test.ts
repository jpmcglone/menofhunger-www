import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('generic website preview cards', () => {
  it('posts and the composer use the fixed-shape link card; chat keeps the Open Graph card', () => {
    const linkCard = read('components/app/LinkCard.vue')
    const post = read('components/app/post/PostRowLinkPreview.vue')
    const chat = read('components/app/chat/ChatMessageRichBody.vue')
    const composer = read('components/app/composer/LinkPreview.vue')
    expect(linkCard).toContain('h-[112px]')
    expect(linkCard).toContain('Remove preview')
    expect(post).toContain('AppLinkCard')
    expect(post).not.toContain('AppWebsitePreviewCard')
    expect(post).toContain(':description="linkMeta?.description"')
    expect(chat).toContain('AppWebsitePreviewCard')
    expect(chat).toContain(':description="linkMeta?.description"')
    expect(composer).toContain('dismissible')
    expect(composer).toContain('preview-only')
  })

  it('keeps custom unfurls on their own cards', () => {
    const post = read('components/app/post/PostRowLinkPreview.vue')
    expect(post).toContain('AppSpotifyEmbed')
    expect(post).toContain('AppXPostPreviewCard')
    expect(post).toContain('AppSubstackPostCard')
    expect(post).toContain('youtubeEmbedUrl')
  })
})
