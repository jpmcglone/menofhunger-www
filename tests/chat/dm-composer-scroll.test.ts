import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dm = readFileSync(
  resolve(process.cwd(), 'components/app/DmComposer.vue'),
  'utf8',
)
const styled = readFileSync(
  resolve(process.cwd(), 'components/app/StyledTextarea.vue'),
  'utf8',
)

describe('DM composer field scroll', () => {
  it('scrolls the contenteditable, not a parent wrapper', () => {
    expect(dm).toContain('.dm-composer-textarea-scroll :deep(.moh-styled-textarea-editor)')
    expect(dm).toMatch(/max-height:\s*160px/)
    expect(dm).toMatch(/overflow-y:\s*auto/)
    expect(dm).toContain('-webkit-overflow-scrolling: touch')
    expect(dm).toContain('overscroll-behavior: contain')
    expect(dm).toContain('is-capped')
    expect(dm).toMatch(/\.is-capped[^{]*\{[^}]*height:\s*160px/)
    expect(dm).not.toMatch(/dm-composer-textarea-scroll w-full overflow-y-auto/)
  })

  it('keeps the caret in the scrollport after each edit, except during IME', () => {
    expect(styled).toContain('keepCaretInScrollport')
    expect(styled).toContain('isEditorAlive')
    expect(styled).toContain('ed.commands.scrollIntoView()')
    const keep = styled.slice(styled.indexOf('function keepCaretInScrollport'))
    expect(keep).toMatch(/ed\.view\.composing/)
    expect(keep.indexOf('isEditorAlive')).toBeLessThan(keep.indexOf('scrollIntoView'))
    expect(keep.indexOf('composing')).toBeLessThan(keep.indexOf('scrollIntoView'))
  })
})
