import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('scripture verse presentation', () => {
  it('uses the anchored popover on desktop and the shared bottom sheet on mobile', () => {
    const source = readFromRepo('components/app/ScriptureVersePopover.vue')

    expect(source).toMatch(/<Popover v-if="isDesktopHydrated"/)
    expect(source).toMatch(/<AppBottomSheet[\s\S]*v-if="isMobileHydrated"/)
    expect(source).toMatch(/useHydratedMediaQuery\('\(max-width: 767px\)'\)/)
    expect(source).toMatch(/useHydratedMediaQuery\('\(min-width: 768px\)'\)/)
  })

  it('re-anchors and reloads when either the target or reference changes', () => {
    const source = readFromRepo('components/app/ScriptureVersePopover.vue')

    expect(source).toMatch(/\[\(\) => props\.target, \(\) => props\.reference, isMobileHydrated, isDesktopHydrated\]/)
    expect(source).toMatch(/popoverRef\.value\.hide\(\)[\s\S]*popoverRef\.value\.show\(/)
    expect(source).toMatch(/const sequence = \+\+loadSequence/)
    expect(source).toMatch(/sequence !== loadSequence \|\| props\.reference !== reference/)
  })

  it('matches the compact iOS header, divider, and numbered verse layout', () => {
    const popover = readFromRepo('components/app/ScriptureVersePopover.vue')
    const card = readFromRepo('components/app/ScriptureVerseCard.vue')
    const list = readFromRepo('components/app/ScriptureVerseList.vue')

    for (const source of [popover, card]) {
      expect(source).toMatch(/items-baseline justify-between/)
      expect(source).toMatch(/border-t border-gray-200\/80/)
      expect(source).not.toMatch(/<sup/)
    }
    expect(list).toMatch(/grid-cols-\[auto_1fr\]/)
    expect(list).not.toMatch(/<sup/)
  })

  it('caps the feed card at three verses and opens the reader on tap', () => {
    const card = readFromRepo('components/app/ScriptureVerseCard.vue')
    const preview = readFromRepo('utils/scripture-preview.ts')

    expect(preview).toMatch(/SCRIPTURE_PEEK_VERSE_LIMIT = 3/)
    expect(card).toMatch(/peek/)
    expect(card).toMatch(/data-post-row-interactive/)
    expect(card).toMatch(/<AppScriptureVersePopover/)
  })

  it('bounds the overlay and scrolls long passages instead of growing without limit', () => {
    const popover = readFromRepo('components/app/ScriptureVersePopover.vue')

    expect(popover).toMatch(/max-h-\[min\(22rem,55vh\)\]/)
    expect(popover).toMatch(/overflow-y-auto/)
    expect(popover).toMatch(/max-h-\[min\(85dvh,100%\)\]/)
    expect(popover).toMatch(/overscroll-contain/)
  })

  it('keeps the shared bottom-sheet header customizable without changing existing callers', () => {
    const source = readFromRepo('components/app/BottomSheet.vue')

    expect(source).toMatch(/<slot name="header" :close="close" :title-id="titleId">/)
    expect(source).toMatch(/<\/header>\s*<\/slot>/)
  })
})

describe('primary app navigation order', () => {
  it('puts Chat before Notifications in the first four primary destinations', () => {
    const source = readFromRepo('composables/useAppNav.ts')
    const home = source.indexOf("key: 'home'")
    const explore = source.indexOf("key: 'explore'")
    const messages = source.indexOf("key: 'messages'")
    const notifications = source.indexOf("key: 'notifications'")

    expect(home).toBeGreaterThan(-1)
    expect(home).toBeLessThan(explore)
    expect(explore).toBeLessThan(messages)
    expect(messages).toBeLessThan(notifications)
    expect(source).toMatch(/items\.slice\(0, 4\)/)
  })
})
