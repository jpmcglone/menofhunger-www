/**
 * Global dismiss stack for modals, sheets, and overlays.
 *
 * An overlay registers a close callback while it is open. Whichever overlay is
 * on top of the stack is the one dismissed by:
 *
 *   - Escape
 *   - the browser Back button (Android's system back gesture / button, and
 *     Safari's edge-swipe)
 *   - navigating to another route (all overlays close, not just the top one)
 *
 * Usage in a component:
 *   useOverlayDismiss(openRef, () => myCloseFunction())
 *
 * ## Why Back needs a history entry
 *
 * There is no way to observe the Android back button directly — the only signal
 * is `popstate`, and by the time it fires the browser has already left the
 * current history entry. So while anything is open we keep exactly one throwaway
 * entry alive at the same URL. A back press lands on that entry instead of
 * leaving the page; we close the top overlay and arm a fresh entry if more
 * overlays are still open, so each back press peels off one layer.
 *
 * Dismissing by any other means (Escape, X, backdrop, submit) unwinds the entry
 * with `history.back()`, otherwise the user would be left with a dead back press
 * that appears to do nothing.
 *
 * ## NuxtLink-inside-overlay (the hard case)
 *
 * When a NuxtLink inside an overlay is tapped, two things happen during the same
 * browser event:
 *   1. RouterLink's click handler calls `router.push('/new-route')` (async).
 *   2. The overlay's `@click` sets `open = false`, queueing a Vue watcher that
 *      calls `syncGuard`, which schedules a deferred `unwindGuard → history.back()`.
 *
 * The deferred `history.back()` must not fire when a navigation is in flight —
 * it would pop back to the guard entry (same URL) and undo the navigation.
 *
 * The fix: `router.beforeEach` is the earliest possible hook. When a real route
 * change begins, it immediately sets `guardArmed = false` and cancels any pending
 * unwind timer. By the time the Vue watcher's deferred timer fires, the guard is
 * already disarmed and `history.back()` is skipped.
 *
 * `beforeEach` fires synchronously at the start of the navigation guard pipeline —
 * before any async guards, before `history.pushState`, and before Vue flushes the
 * watcher that schedules the timer. So even if the watcher runs between two guard
 * hops, `guardArmed` is already `false` and no timer is scheduled.
 */

type Closer = () => void

/** Module-level LIFO stack — shared across all component instances. */
const closers: Closer[] = []
let listenersInstalled = false
let routeHookInstalled = false

/** True while a throwaway entry we pushed is the current history entry. */
let guardArmed = false
/** The URL at the time we armed the guard — secondary check inside unwindGuard. */
let guardedPath: string | null = null
/** True while we are popping our own entry, so the resulting popstate is ignored. */
let unwinding = false
/**
 * Pending macro-task that calls unwindGuard(). Held so we can cancel it if the
 * overlay re-opens before the timer fires (e.g. re-opening the sheet immediately).
 */
let unwindTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Breadcrumb for spotting our entries in devtools. Never read back: Vue Router copies
 * the current state forward on its own pushes, so the flag outlives the entry we set it on.
 */
const GUARD_KEY = '_mohOverlayGuard'

function armGuard() {
  if (guardArmed) return
  // Cancel any pending deferred unwind — overlay re-opened before it fired.
  cancelPendingUnwind()
  // Same URL, so Vue Router resolves the resulting popstate as a duplicate navigation and
  // no route change occurs — the entry exists purely to be consumed by a back press.
  // Vue Router's own state fields are preserved so its position tracking stays intact.
  guardedPath = location.pathname + location.search + location.hash
  history.pushState({ ...history.state, [GUARD_KEY]: true }, '')
  guardArmed = true
}

function unwindGuard() {
  if (!guardArmed) return
  // Secondary URL check: if the URL already changed (navigation completed before the
  // macro-task fired), skip history.back() to avoid undoing it.
  const currentPath = location.pathname + location.search + location.hash
  if (guardedPath !== null && currentPath !== guardedPath) {
    guardArmed = false
    guardedPath = null
    return
  }
  guardArmed = false
  guardedPath = null
  unwinding = true
  history.back()
}

/**
 * Called after every stack change. Registering/unregistering happens in a Vue
 * watcher, so by the time this runs the stack reflects the new state.
 */
function syncGuard() {
  if (typeof history === 'undefined') return
  if (closers.length > 0) {
    armGuard()
  } else {
    // Defer history.back() so a NuxtLink tap has time to trigger beforeEach,
    // which clears guardArmed before this timer fires. If no navigation happened
    // (e.g. X / backdrop dismiss), guardArmed stays true and history.back() runs.
    if (unwindTimer === null) {
      unwindTimer = setTimeout(() => {
        unwindTimer = null
        unwindGuard()
      }, 0)
    }
  }
}

function dismissTop() {
  closers[closers.length - 1]?.()
}

function dismissAll() {
  // Snapshot and clear first: each closer unregisters itself on watcher flush,
  // which would otherwise mutate the array mid-iteration.
  const pending = closers.splice(0, closers.length)
  for (let i = pending.length - 1; i >= 0; i--) pending[i]?.()
}

function onGlobalEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (closers.length === 0) return
  // Consume the event so no other handler (bubble or capture) sees this Escape.
  e.stopImmediatePropagation()
  e.preventDefault()
  dismissTop()
}

function onPopState() {
  if (unwinding) {
    unwinding = false
    return
  }
  if (!guardArmed) return
  // The back press consumed our entry rather than navigating.
  guardArmed = false
  guardedPath = null
  cancelPendingUnwind()
  dismissTop()
  // The closer unregisters on watcher flush; re-arm afterwards if any overlay remains.
  void nextTick(syncGuard)
}

function ensureListeners() {
  if (listenersInstalled || typeof document === 'undefined') return
  listenersInstalled = true
  // capture: true so we run before any bubble-phase listeners on window/document.
  document.addEventListener('keydown', onGlobalEscape, { capture: true })
  window.addEventListener('popstate', onPopState)
}

function cancelPendingUnwind() {
  if (unwindTimer !== null) {
    clearTimeout(unwindTimer)
    unwindTimer = null
  }
}

function ensureRouteHook() {
  if (routeHookInstalled) return
  routeHookInstalled = true
  const router = useRouter()
  let lastPath = router.currentRoute.value.fullPath

  // beforeEach fires at the very start of every navigation — before any async
  // guards run and before the Vue watcher flush that schedules the unwind timer.
  // When a real route change begins, immediately disarm the guard so that
  // history.back() is never called on top of a completed navigation.
  router.beforeEach((to) => {
    if (to.fullPath === lastPath) return true
    if (!guardArmed) return true
    guardArmed = false
    guardedPath = null
    cancelPendingUnwind()
    return true
  })

  router.afterEach((to) => {
    // afterEach also fires for the duplicate navigation our own guard entry
    // provokes (popstate to the same URL). Only a real path change should
    // tear overlays down.
    if (to.fullPath === lastPath) return
    lastPath = to.fullPath
    // guardArmed was already cleared in beforeEach. Repeat here as a
    // belt-and-suspenders fallback (e.g. a redirect that bypassed our check).
    guardArmed = false
    guardedPath = null
    dismissAll()
  })
}

/**
 * Register `closeFn` in the global dismiss stack while `active` is truthy.
 * Must be called inside a component setup (uses `watch` + `onBeforeUnmount`).
 */
export function useOverlayDismiss(active: MaybeRefOrGetter<boolean>, closeFn: () => void) {
  if (!import.meta.client) return

  ensureListeners()
  ensureRouteHook()

  function register() {
    // Avoid duplicates for the same function reference.
    if (!closers.includes(closeFn)) closers.push(closeFn)
    syncGuard()
  }

  function unregister() {
    const idx = closers.lastIndexOf(closeFn)
    if (idx === -1) return
    closers.splice(idx, 1)
    syncGuard()
  }

  watch(() => toValue(active), (v) => (v ? register() : unregister()), { immediate: true })
  onBeforeUnmount(unregister)
}
