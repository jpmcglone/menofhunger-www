/**
 * Menus that used to sit in-flow (`absolute` + `top-full` / `bottom-full`)
 * clip inside overflow parents. They must teleport and use useMenuPosition.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function src(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

const menus = [
  'components/app/SearchTypeahead.vue',
  'components/app/BookmarkFolderSelect.vue',
  'components/app/layout/LeftRail.vue',
  'components/app/UserPickerInput.vue',
  'components/app/article/TagInput.vue',
  'components/app/article/ReactionBar.vue',
  'components/app/chat/ChatMarvChatStrip.vue',
]

describe('anchored menus – viewport positioning', () => {
  it.each(menus)('%s teleports the panel and uses useMenuPosition', (path) => {
    const source = src(path)
    expect(source).toContain('<Teleport to="body">')
    expect(source).toContain('useMenuPosition')
    expect(source).toContain('class="fixed z-[2000]')
    expect(source).not.toMatch(/class="[^"]*(?:absolute[^"]*(?:top-full|bottom-full)|(?:top-full|bottom-full)[^"]*absolute)/)
  })

  it('keeps search, bookmarks, and user pickers width-matched or scroll-clamped', () => {
    const search = src('components/app/SearchTypeahead.vue')
    const bookmarks = src('components/app/BookmarkFolderSelect.vue')
    const users = src('components/app/UserPickerInput.vue')
    expect(search).toContain('matchAnchorWidth: true')
    expect(search).toContain('maxHeight: 320')
    expect(bookmarks).toContain('align: \'end\'')
    expect(bookmarks).toContain('maxHeight: 320')
    expect(users).toContain('matchAnchorWidth: true')
    expect(users).toContain('maxHeight: 288')
  })
})
