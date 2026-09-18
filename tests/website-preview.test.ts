import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('generic website preview cards', () => {
  it('posts, chat, and composer share the Open Graph card', () => {
    const card = read('components/app/WebsitePreviewCard.vue')
    const post = read('components/app/post/PostRowLinkPreview.vue')
    const chat = read('components/app/chat/ChatMessageRichBody.vue')
    const composer = read('components/app/composer/LinkPreview.vue')
    expect(card).toContain('sourceLabel')
    expect(card).toContain('previewDescription')
    expect(card).toContain('aspect-[4/5]')
    expect(card).toContain('aspect-video')
    expect(card).toContain('object-top')
    expect(card).toContain('Remove preview')
    expect(card).not.toContain('tabler:external-link')
    expect(post).toContain('AppWebsitePreviewCard')
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
