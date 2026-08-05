/**
 * Behavioral regression test for the "links inside an overlay don't navigate" bug.
 *
 * Repro (mobile): tap the More tab → bottom sheet opens → tap "Articles" → the sheet
 * closes but the route never changes (or navigates then immediately goes back).
 *
 * Cause: a NuxtLink tap does two things in the same browser event:
 *   1. RouterLink calls `router.push('/articles')`. Vue Router runs its guard pipeline.
 *   2. The sheet's `@click` sets `open = false`, queueing the Vue watcher inside
 *      `useOverlayDismiss` that unwinds the back-button guard entry.
 *
 * If `history.back()` fires while the navigation is in flight (or after it completes),
 * the guard entry gets popped and the navigation is cancelled or reversed.
 *
 * Fix: `router.beforeEach` is called synchronously at the very start of every navigation,
 * before async guards run. It immediately sets `guardArmed = false` and cancels any
 * pending unwind timer. By the time the timer fires, the guard is already disarmed.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

type RouteLike = { fullPath: string }

const beforeEachHooks: Array<(to: RouteLike) => boolean | void> = []
const afterEachHooks: Array<(to: RouteLike) => void> = []
const currentRoute = ref<RouteLike>({ fullPath: '/home' })

/**
 * Mimics Vue Router 4: beforeEach fires synchronously at the start of push(),
 * afterEach fires after all guards and pushState have completed.
 */
const router = {
  currentRoute,
  beforeEach: (fn: (to: RouteLike) => boolean | void) => {
    beforeEachHooks.push(fn)
    return () => {}
  },
  afterEach: (fn: (to: RouteLike) => void) => {
    afterEachHooks.push(fn)
    return () => {}
  },
  push: async (to: string) => {
    // beforeEach runs synchronously at the start of navigation.
    const dest = { fullPath: to }
    for (const fn of beforeEachHooks) fn(dest)
    // Guard pipeline hops (async — navigation guards, resolve, enter guards…).
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    // finalizeNavigation: URL changes after all guards pass.
    history.pushState({}, '', to)
    currentRoute.value = dest
    for (const fn of afterEachHooks) fn(dest)
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
    beforeEachHooks.length = 0
    afterEachHooks.length = 0
    currentRoute.value = { fullPath: '/home' }
    history.pushState({}, '', '/home')
    vi.restoreAllMocks()
  })

  it('does not cancel navigation when a link inside the overlay is tapped', async () => {
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
