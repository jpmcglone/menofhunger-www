import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  clipboardHasPlainText,
  isComposerMediaType,
  isComposerVideoType,
} from '~/composables/composer/types'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('composer media type helpers', () => {
  it('accepts images and the video types the picker already allows', () => {
    expect(isComposerMediaType('image/png')).toBe(true)
    expect(isComposerMediaType('image/gif')).toBe(true)
    expect(isComposerVideoType('video/mp4')).toBe(true)
    expect(isComposerVideoType('video/quicktime')).toBe(true)
    expect(isComposerMediaType('video/webm')).toBe(true)
    expect(isComposerMediaType('text/plain')).toBe(false)
  })

  it('treats a clipboard with plain text as text, not an image paste', () => {
    const dt = {
      getData: (type: string) => (type === 'text/plain' ? 'copied paragraph' : ''),
    }
    expect(clipboardHasPlainText(dt)).toBe(true)
    expect(clipboardHasPlainText({ getData: () => '   ' })).toBe(false)
  })
})

describe('paste and drop reach the TipTap editor', () => {
  it('StyledTextarea claims file paste/drop so media is not swallowed by the editor', () => {
    const source = readFromRepo('components/app/StyledTextarea.vue')
    expect(source).toMatch(/handlePaste\(_view, event\)/)
    expect(source).toMatch(/handleDrop\(_view, event\)/)
    expect(source).toMatch(/emit\('media-files', files\)/)
    expect(source).toMatch(/clipboardHasPlainText/)
    expect(source).toMatch(/dragover:/)
  })

  it('chat and post composers ingest editor media-files', () => {
    const chat = readFromRepo('components/app/DmComposer.vue')
    const post = readFromRepo('components/app/PostComposer.vue')
    expect(chat).toMatch(/@media-files="\(files\) => ingestMediaFiles\(files, 'paste'\)"/)
    expect(post).toMatch(/@media-files="\(files\) => ingestMediaFiles\(files, 'paste'\)"/)
    expect(chat).toMatch(/@paste\.capture="onComposerPaste"/)
    expect(post).toMatch(/@paste\.capture="onComposerPaste"/)
    expect(chat).toMatch(/@drop\.prevent="onComposerDrop"/)
    expect(post).toMatch(/@drop\.prevent="onComposerDrop"/)
  })
})
