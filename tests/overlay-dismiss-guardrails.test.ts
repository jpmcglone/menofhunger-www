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
    expect(composable).toContain('router.beforeEach')
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
    // afterEach still dismisses overlays and belt-and-suspenders clears guardArmed.
    expect(composable).toContain('router.afterEach')
    expect(composable).toContain('dismissAll()')
  })

  it('disarms the guard in beforeEach so NuxtLink clicks inside an overlay navigate correctly', () => {
    // Root cause: when a NuxtLink inside a bottom sheet is tapped:
    //   1. router.push('/new-route') fires — navigation guard pipeline starts.
    //   2. The overlay's @click sets open=false → Vue watcher → syncGuard → deferred timer.
    //
    // Previously the timer's unwindGuard() relied on afterEach setting guardArmed=false.
    // In practice this race could go either way: navigation cancelled (never got to articles)
    // or navigation completed then reversed (loaded articles, then went back).
    //
    // Fix: router.beforeEach fires at the very start of every navigation, synchronously,
    // before any async guards. It immediately sets guardArmed=false and cancels the timer.
    // By the time the timer would fire, guardArmed is already false → history.back() skipped.
    const beforeIdx = composable.indexOf('router.beforeEach')
    expect(beforeIdx).toBeGreaterThan(-1)
    const beforeEnd = composable.indexOf('\n  })', beforeIdx + 10)
    const beforeBody = composable.slice(beforeIdx, beforeEnd)
    expect(beforeBody).toContain('guardArmed = false')
    expect(beforeBody).toContain('cancelPendingUnwind()')
  })

  it('keeps history.back() deferred so X/backdrop dismissals still clean up the guard entry', () => {
    // When an overlay closes WITHOUT navigation (X / Escape / backdrop), no beforeEach fires.
    // guardArmed stays true and the deferred timer must still call history.back() to pop the
    // throwaway entry — otherwise the user's next back press appears to do nothing.
    expect(composable).toContain('unwindTimer')
    expect(composable).toContain('setTimeout(')
    const syncIdx = composable.indexOf('function syncGuard()')
    const syncEnd = composable.indexOf('\n}', syncIdx + 10)
    const syncBody = composable.slice(syncIdx, syncEnd)
    expect(syncBody).toContain('unwindTimer')
    expect(syncBody).toContain('setTimeout(')
  })

  it('cancels a pending unwind when the back button fires first', () => {
    // If history.back() is pending in a timer and the user presses the physical Back
    // button (which consumes the guard entry via popstate), the timer must be cancelled
    // to avoid a double-back that looks like an extra navigation to the previous page.
    const popIdx = composable.indexOf('function onPopState()')
    const popEnd = composable.indexOf('\n}', popIdx + 10)
    const popBody = composable.slice(popIdx, popEnd)
    expect(popBody).toContain('cancelPendingUnwind()')
  })

  it('belt-and-suspenders: unwindGuard skips history.back() if the URL already changed', () => {
    // Even if beforeEach fires late or is bypassed, the secondary URL check in unwindGuard
    // ensures history.back() is never called when the URL has already moved on.
    expect(composable).toContain('guardedPath')
    const armIdx = composable.indexOf('function armGuard()')
    const armBody = composable.slice(armIdx, composable.indexOf('\n}', armIdx + 10))
    expect(armBody).toContain('guardedPath =')
    const unwindIdx = composable.indexOf('function unwindGuard()')
    const unwindEnd = composable.indexOf('\n}', unwindIdx + 10)
    const unwindBody = composable.slice(unwindIdx, unwindEnd)
    expect(unwindBody).toContain('currentPath !== guardedPath')
    // history.back() must come AFTER the URL check, not before
    const compareIdx = unwindBody.indexOf('currentPath !== guardedPath')
    const backCallIdx = unwindBody.indexOf('  history.back()')
    expect(compareIdx).toBeGreaterThan(-1)
    expect(backCallIdx).toBeGreaterThan(-1)
    expect(compareIdx).toBeLessThan(backCallIdx)
  })

  it('exports notifyOverlayNavigationStart for the global middleware to call', () => {
    // The global middleware (00-overlay-guard.global.ts) needs to call this function
    // synchronously at the start of every navigation so the guard is disarmed before
    // any async Nuxt middleware runs.
    expect(composable).toContain('export function notifyOverlayNavigationStart(')
    expect(composable).toContain('cancelPendingUnwind()')
  })

  it('has 00-overlay-guard.global.ts wired as global middleware', () => {
    // The middleware must synchronously call notifyOverlayNavigationStart so the
    // guard is disarmed before any async Nuxt middleware (e.g. verified) awaits.
    // It must be a defineNuxtRouteMiddleware so Nuxt runs it alphabetically first.
    // It must also guard execution client-side only (import.meta.client) since
    // history/DOM are not available on the server — reviewed manually or in CI.
    const guard = read('middleware/00-overlay-guard.global.ts')
    expect(guard).toContain('notifyOverlayNavigationStart')
    expect(guard).toContain('defineNuxtRouteMiddleware')
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
