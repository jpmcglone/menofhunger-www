import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { composeShareText } from '~/utils/share-text'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('composeShareText', () => {
  it('puts the shared URL in the body so link preview still works', () => {
    expect(composeShareText({ url: 'https://youtu.be/abc' })).toBe('https://youtu.be/abc')
    expect(composeShareText({ title: 'Watch this', url: 'https://youtu.be/abc' }))
      .toBe('Watch this\nhttps://youtu.be/abc')
    expect(composeShareText({
      title: 'https://youtu.be/abc',
      text: 'https://youtu.be/abc',
      url: 'https://youtu.be/abc',
    })).toBe('https://youtu.be/abc')
  })
})

describe('web share target', () => {
  it('declares share_target on the installed PWA manifest', () => {
    const manifest = readFromRepo('public/site.webmanifest')
    expect(manifest).toContain('"share_target"')
    expect(manifest).toContain('"/share"')
    expect(manifest).toContain('multipart/form-data')
    expect(manifest).toContain('image/*')
  })

  it('auth-gates /share and opens the existing composer or chat', () => {
    const page = readFromRepo('pages/share.vue')
    expect(page).toContain("layout: 'app'")
    expect(page).toContain('ssr: false')
    expect(page).toContain('MOH_OPEN_COMPOSER_KEY')
    expect(page).toContain('openShare')
    expect(page).toContain("navigateTo('/home', { replace: true })")
  })

  it('composer open options accept staged files and a group destination', () => {
    const keys = readFromRepo('utils/injection-keys.ts')
    const layout = readFromRepo('composables/layout/useAppLayoutComposer.ts')
    const overlay = readFromRepo('components/app/layout/ComposerModalOverlay.vue')
    const composer = readFromRepo('components/app/PostComposer.vue')
    expect(keys).toContain('initialFiles?: File[]')
    expect(keys).toContain('communityGroupId?: string')
    expect(layout).toContain('composerInitialFiles')
    expect(overlay).toContain(':initial-files="composerInitialFiles"')
    expect(composer).toContain('ingestMediaFiles(files, \'picker\')')
    expect(composer).toContain('handoff-chat')
  })

  it('visibility picker and send-via-chat support the Chat destination', () => {
    const picker = readFromRepo('components/app/composer/VisibilityPicker.vue')
    const send = readFromRepo('composables/useSendViaChat.ts')
    expect(picker).toContain('showsChat')
    expect(picker).toContain('select-chat')
    expect(send).toContain('openShare')
    expect(send).toContain('uploadShareFiles')
  })
})
