import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  isNavActive,
  isViewingSpacePage,
  navCompactModePath,
  shouldInterceptSameNavClick,
} from '../../config/routes'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('space layout', () => {
  it('keeps Spaces highlighted on a permalink but still navigates to the lobby', () => {
    expect(isNavActive({ currentPath: '/s/john', to: '/spaces' })).toBe(true)
    const plain = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 }
    const shift = { ...plain, shiftKey: true }
    expect(shouldInterceptSameNavClick({ currentPath: '/s/john', to: '/spaces', event: plain })).toBe(false)
    expect(shouldInterceptSameNavClick({ currentPath: '/s/john', to: '/spaces', event: shift })).toBe(false)
    expect(shouldInterceptSameNavClick({ currentPath: '/spaces', to: '/spaces', event: plain })).toBe(true)
    expect(shouldInterceptSameNavClick({ currentPath: '/spaces', to: '/spaces', event: shift })).toBe(false)
    const rail = readFromRepo('components/app/layout/LeftRail.vue')
    const tabs = readFromRepo('components/app/TabBar.vue')
    expect(rail).toMatch(/shouldInterceptSameNavClick/)
    expect(tabs).toMatch(/shouldInterceptSameNavClick/)
  })

  it('auto-collapses the left nav on space permalinks, not the lobby', () => {
    expect(navCompactModePath('/s/alice')).toBe(true)
    expect(navCompactModePath('/spaces')).toBe(false)
    expect(navCompactModePath('/spaces/')).toBe(false)
  })

  it('auto-collapses the left nav on admin analytics', () => {
    expect(navCompactModePath('/admin/analytics')).toBe(true)
    expect(navCompactModePath('/admin')).toBe(false)
    expect(navCompactModePath('/admin/users')).toBe(false)
  })

  it('widens the right rail only while live chat is showing', () => {
    const css = readFromRepo('assets/css/main.css')
    const rail = readFromRepo('components/app/layout/RightRail.vue')
    const layout = readFromRepo('layouts/app.vue')

    expect(css).toMatch(/--moh-right-rail-w:\s*20rem/)
    expect(css).toMatch(/--moh-right-rail-chat-w:\s*24rem/)
    expect(rail).toMatch(/showRadioChat \? 'w-\[var\(--moh-right-rail-chat-w\)\]' : 'w-\[var\(--moh-right-rail-w\)\]'/)
    expect(layout).toMatch(/showRadioChat \? 'w-\[var\(--moh-right-rail-chat-w\)\]' : 'w-\[var\(--moh-right-rail-w\)\]'/)
    expect(layout).toMatch(/_navCompactModeBase\.value \|\| Boolean\(selectedSpaceId\.value\)/)
  })

  it('keeps live-chat hover actions on the text line and media left-aligned', () => {
    const row = readFromRepo('components/app/radio/RadioLiveChatMessageRow.vue')
    expect(row).toMatch(/flex items-center gap-1/)
    expect(row).toMatch(/flex h-5 w-5 items-center justify-center/)
    expect(row).toMatch(/block rounded-lg max-w-\[280px\].*object-left/)
    expect(row).toMatch(/mt-0\.5 flex flex-wrap gap-1/)
    expect(row).toMatch(/hasExtras\.value \? 'rounded-lg px-2 py-1\.5 -mx-2'/)
    expect(readFromRepo('components/app/radio/RadioLiveChatMessageList.vue')).toMatch(/space-y-2\.5/)
  })

  it('hides bar floats only while viewing that space page', () => {
    expect(isViewingSpacePage('/s/john', 'john')).toBe(true)
    expect(isViewingSpacePage('/s/John', 'john')).toBe(true)
    expect(isViewingSpacePage('/home', 'john')).toBe(false)
    expect(isViewingSpacePage('/s/other', 'john')).toBe(false)
    const reactions = readFromRepo('composables/useSpaceReactions.ts')
    expect(reactions).toMatch(/variant === 'bar' && isViewingSpacePage\(/)
  })

  it('makes the whole lobby space row a real link, with share staying a button', () => {
    const row = readFromRepo('components/app/AppSpaceRow.vue')
    expect(row).toMatch(/absolute inset-0 z-\[1\]/)
    expect(row).toMatch(/isInteractiveTarget/)
    expect(row).toMatch(/onRowClick/)
    expect(row).toMatch(/onRowAuxClick/)
    expect(row).toMatch(/@click\.stop\.prevent/)
    expect(row).not.toMatch(/@click="onEnterSpace"/)
  })

  it('puts reactions above a wrapping presence grid', () => {
    const page = readFromRepo('pages/s/[username].vue')
    const reactionsIdx = page.indexOf('v-for="r in reactions"')
    const gridIdx = page.indexOf('grid-cols-[repeat(auto-fill,2.5rem)]')
    expect(reactionsIdx).toBeGreaterThan(-1)
    expect(gridIdx).toBeGreaterThan(reactionsIdx)
    expect(page).toMatch(/max-h-52/)
    expect(page).toMatch(/overscroll-contain/)
  })

  it('tracks a space page view once per space', () => {
    const page = readFromRepo('pages/s/[username].vue')
    const helper = readFromRepo('composables/usePostHog.ts')
    expect(helper).toMatch(/\$posthog\?\.capture/)
    expect(page).toMatch(/capture\('space_viewed'/)
    expect(page).toMatch(/viewedSpaceId/)
  })

  it('overlays expanded owner controls instead of pushing the player down', () => {
    const panel = readFromRepo('components/SpaceOwnerPanel.vue')
    const page = readFromRepo('pages/s/[username].vue')
    expect(panel).toMatch(/absolute inset-x-0 top-full z-30/)
    expect(panel).toMatch(/aria-expanded/)
    expect(panel).toMatch(/rounded-xl border moh-border p-4 moh-bg/)
    expect(panel).not.toMatch(/invisible pointer-events-none/)
    expect(panel).toMatch(/id="space-owner-type"/)
    expect(panel).toMatch(/<Select/)
    expect(panel).not.toMatch(/<select[\s>]/)
    expect(panel).toMatch(/\(optional\)/)
    expect(panel).toMatch(/discardLabel: 'Discard'/)
    expect(panel).toMatch(/async function applyAll/)
    expect(panel).not.toMatch(/onModeSelect/)
    expect(page).toMatch(/v-if="isOwner" class="moh-gutter-x pb-2"/)
    expect(page).toMatch(/flex items-start justify-center/)
    expect(page).toMatch(/WATCH_PARTY' && space\?\.watchPartyUrl/)
    expect(page).toMatch(/tabler:device-tv/)
    expect(page).toMatch(/No video set yet/)
    expect(page).toMatch(/shrink-0 pb-2/)
  })
})
