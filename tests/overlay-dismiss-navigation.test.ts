/**
 * Behavioral regression test for the "links inside an overlay don't navigate" bug.
 *
 * Repro (mobile): tap the More tab → bottom sheet opens → tap "Spaces" → the sheet
 * closes but the route never changes (or navigates then immediately goes back).
 *
 * Root cause: `/spaces` and `/check-ins` declare `middleware: ['verified']`. Nuxt
 * registers its global-middleware runner as a `router.beforeEach` hook at router init.
 * `useOverlayDismiss` registers its own `router.beforeEach` lazily (first call), so it
 * is always LATER in the queue. While `verified` awaits `ensureLoaded()`, the deferred
 * unwind timer fires with `guardArmed` still true, calling `history.back()` and
 * cancelling the navigation.
 *
 * Fix: `middleware/00-overlay-guard.global.ts` calls `notifyOverlayNavigationStart()`
 * at the very start of the middleware pipeline (before any async work), disarming the
 * guard synchronously. The mock router below models this realistic hook ordering.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

type RouteLike = { fullPath: string }
type NavigationFailure = { type: number }

const beforeEachHooks: Array<(to: RouteLike) => boolean | void | Promise<boolean | void>> = []
const afterEachHooks: Array<(to: RouteLike, from: RouteLike, failure?: NavigationFailure) => void> = []
const currentRoute = ref<RouteLike>({ fullPath: '/home' })

/**
 * Realistic mock of Nuxt's router guard pipeline:
 * - Hooks run in registration order.
 * - An async "Nuxt middleware" hook is registered FIRST (simulating auth.global /
 *   verified), awaiting several microtasks before continuing.
 * - The overlay's `beforeEach` registers LATE (lazily, on first useOverlayDismiss call).
 * - `middleware/00-overlay-guard.global.ts` is modelled by calling
 *   `notifyOverlayNavigationStart` at the very start of push(), before any hooks run.
 */
const router = {
  currentRoute,
  beforeEach: (fn: (to: RouteLike) => boolean | void | Promise<boolean | void>) => {
    beforeEachHooks.push(fn)
    return () => {}
  },
  afterEach: (fn: (to: RouteLike, from: RouteLike, failure?: NavigationFailure) => void) => {
    afterEachHooks.push(fn)
    return () => {}
  },
  push: async (to: string, { simulateAsyncMiddleware = false } = {}) => {
    const dest = { fullPath: to }
    const from = currentRoute.value

    // Model `00-overlay-guard.global.ts`: the very first thing in the pipeline,
    // synchronously, before any hook runs.
    const { notifyOverlayNavigationStart } = await import('~/composables/useOverlayDismiss')
    notifyOverlayNavigationStart(to)

    if (simulateAsyncMiddleware) {
      // Simulate a slow async Nuxt middleware (e.g. verified awaiting ensureLoaded).
      // The overlay's beforeEach hasn't disarmed anything yet at this point —
      // that's what caused the bug. The global middleware above already disarmed it.
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    }

    // Now run all registered beforeEach hooks in order.
    for (const fn of beforeEachHooks) {
      await fn(dest)
    }

    // finalizeNavigation: URL changes after all guards pass.
    history.pushState({}, '', to)
    currentRoute.value = dest
    for (const fn of afterEachHooks) fn(dest, from)
  },
}

mockNuxtImport('useRouter', () => () => router)

/** Mounts a component that keeps `open` registered in the dismiss stack. */
async function mountOverlay(open: ReturnType<typeof ref<boolean>>, close: () => void) {
  const { useOverlayDismiss } = await import('~/composables/useOverlayDismiss')
  return mount(
    defineComponent({
      setup() {
        useOverlayDismiss(open as never, close)
        return () => h('div')
      },
    }),
  )
}

/** Lets pending microtasks and the deferred macro-task unwind settle. */
async function settle() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 10))
}

describe('useOverlayDismiss – navigation from inside an overlay', () => {
  beforeEach(() => {
    // Reset module state (routeHookInstalled, guardArmed, closers, etc.) so each test
    // gets a fresh useOverlayDismiss with the route hook properly re-installed.
    vi.resetModules()
    beforeEachHooks.length = 0
    afterEachHooks.length = 0
    currentRoute.value = { fullPath: '/home' }
    history.pushState({}, '', '/home')
    vi.restoreAllMocks()
  })

  it('does not cancel navigation when a link inside the overlay is tapped (sync middleware)', async () => {
    const backSpy = vi.spyOn(history, 'back')
    const open = ref(false)
    await mountOverlay(open, () => {
      open.value = false
    })

    // Sheet opens — the back-button guard entry is armed.
    open.value = true
    await nextTick()

    // The NuxtLink tap: router.push starts AND the sheet closes in the same event.
    const navigation = router.push('/articles')
    open.value = false
    await nextTick()

    await navigation
    await settle()

    // The guard must never pop the entry out from under an in-flight navigation.
    expect(backSpy).not.toHaveBeenCalled()
    expect(location.pathname).toBe('/articles')
  })

  it('does not cancel navigation to a route with async middleware (regression: Spaces/Check-ins)', async () => {
    // This is the exact scenario that caused the bug:
    // - Overlay is open, guard is armed.
    // - User taps "Spaces" (a route with verified middleware that awaits).
    // - Sheet @click fires open=false → Vue watcher → deferred unwind timer.
    // - Without the global middleware fix, history.back() would fire DURING the await,
    //   cancelling the navigation.
    const backSpy = vi.spyOn(history, 'back')
    const open = ref(false)
    await mountOverlay(open, () => {
      open.value = false
    })

    open.value = true
    await nextTick()

    // Navigate AND close the sheet simultaneously (same event).
    const navigation = router.push('/spaces', { simulateAsyncMiddleware: true })
    open.value = false
    await nextTick()

    // Let the deferred unwind timer fire — it must be a no-op because the global
    // middleware already disarmed the guard.
    await settle()

    await navigation
    await settle()

    expect(backSpy).not.toHaveBeenCalled()
    expect(location.pathname).toBe('/spaces')
  })

  it('still unwinds the guard entry on a plain dismiss (X / Escape / backdrop)', async () => {
    const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {})
    const open = ref(false)
    await mountOverlay(open, () => {
      open.value = false
    })

    open.value = true
    await nextTick()

    // No navigation — just a dismiss. The throwaway entry must be popped, otherwise the
    // user is left with a back press that appears to do nothing.
    open.value = false
    await settle()

    expect(backSpy).toHaveBeenCalledTimes(1)
    expect(location.pathname).toBe('/home')
  })

  it('does not unwind when the overlay is reopened before the deferred pop runs', async () => {
    const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {})
    const open = ref(false)
    await mountOverlay(open, () => {
      open.value = false
    })

    open.value = true
    await nextTick()
    // Close and immediately reopen within the same macro-task window.
    open.value = false
    open.value = true
    await settle()

    // The guard is still needed, so nothing should have been popped.
    expect(backSpy).not.toHaveBeenCalled()
  })
})
