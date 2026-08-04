import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(__dirname, '..')

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8')
}

/**
 * On Android the system Back button/gesture is the universal "dismiss" affordance: it must
 * close the overlay you are looking at rather than navigating the page out from under it.
 * The only way to observe it on the web is to keep a history entry alive to be consumed,
 * which `useOverlayDismiss` centralises for every overlay.
 */
describe('overlay dismissal', () => {
  const composable = read('composables/useOverlayDismiss.ts')

  it('handles Escape, Back, and route changes from one LIFO stack', () => {
    expect(composable).toContain("document.addEventListener('keydown', onGlobalEscape, { capture: true })")
    expect(composable).toContain("window.addEventListener('popstate', onPopState)")
    expect(composable).toContain('router.afterEach')
    // Only the topmost overlay closes on Escape/Back; a route change tears down all of them.
    expect(composable).toContain('function dismissTop()')
    expect(composable).toContain('function dismissAll()')
  })

  it('keeps exactly one throwaway history entry alive while overlays are open', () => {
    expect(composable).toContain('history.pushState')
    expect(composable).toContain('history.back()')
    // Re-arming after a back press is what makes stacked overlays peel off one at a time.
    expect(composable).toContain('void nextTick(syncGuard)')
    // Popping our own entry must not be mistaken for the user pressing Back.
    expect(composable).toContain('if (unwinding) {')
  })

  it('does not pop a history entry the user has already navigated past', () => {
    // A route change buries our entry; calling history.back() then would undo their navigation.
    expect(composable).toMatch(/guardArmed = false\n {4}dismissAll\(\)/)
  })

  it('has replaced the Escape-only composable entirely', () => {
    expect(() => read('composables/useModalEscape.ts')).toThrow()
  })

  it('does not leak overlay popstates into scroll restoration', () => {
    // Our guard entry has the same URL and never navigates. Arming scroll restoration for it
    // would make the next real navigation restore a stale offset instead of resetting to top.
    const plugin = read('plugins/middle-scroll-restore.client.ts')
    expect(plugin).toContain('if (target === lastFullPath) return')
  })

  it('wires every shared overlay primitive into the stack', () => {
    for (const path of [
      'components/app/AppModal.vue',
      'components/app/BottomSheet.vue',
      'components/app/ConfirmDialog.vue',
      'components/app/FormModal.vue',
      'components/app/ReplyModal.vue',
    ]) {
      expect(read(path), path).toContain('useOverlayDismiss(')
    }
  })

  it('leaves no overlay running its own ad-hoc Escape listener', () => {
    for (const path of [
      'components/app/MarvCatchUpModal.vue',
      'components/app/StatusViewDialog.vue',
      'components/app/SharePostDialog.vue',
    ]) {
      const source = read(path)
      expect(source, path).toContain('useOverlayDismiss(')
      expect(source, path).not.toMatch(/addEventListener\(\s*'keydown'/)
    }
  })

  it('leaves no overlay hand-rolling its own history integration', () => {
    // SharePostDialog used to own a private pushState/popstate implementation.
    const share = read('components/app/SharePostDialog.vue')
    expect(share).not.toContain('pushState')
    expect(share).not.toContain('popstate')
  })
})
