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
 */

type Closer = () => void

/** Module-level LIFO stack — shared across all component instances. */
const closers: Closer[] = []
let listenersInstalled = false
let routeHookInstalled = false

/** True while a throwaway entry we pushed is the current history entry. */
let guardArmed = false
/** The URL at the time we armed the guard — used to detect in-overlay navigation. */
let guardedPath: string | null = null
/** True while we are popping our own entry, so the resulting popstate is ignored. */
let unwinding = false

/**
 * Breadcrumb for spotting our entries in devtools. Never read back: Vue Router copies
 * the current state forward on its own pushes, so the flag outlives the entry we set it on.
 */
const GUARD_KEY = '_mohOverlayGuard'

function armGuard() {
  if (guardArmed) return
  // Same URL, so Vue Router resolves the resulting popstate as a duplicate navigation and
  // no route change occurs — the entry exists purely to be consumed by a back press.
  // Vue Router's own state fields are preserved so its position tracking stays intact.
  guardedPath = location.pathname + location.search + location.hash
  history.pushState({ ...history.state, [GUARD_KEY]: true }, '')
  guardArmed = true
}

function unwindGuard() {
  if (!guardArmed) return
  // If the URL changed since we armed (a NuxtLink inside the overlay navigated before the
  // watcher could fire), don't call history.back() — that would undo their navigation.
  // The afterEach hook already cleared guardArmed for this case; this guard protects against
  // the race where the Vue flush:pre watcher runs before afterEach completes.
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
  if (closers.length > 0) armGuard()
  else unwindGuard()
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

function ensureRouteHook() {
  if (routeHookInstalled) return
  routeHookInstalled = true
  const router = useRouter()
  let lastPath = router.currentRoute.value.fullPath
  router.afterEach((to) => {
    // afterEach also fires for the duplicate navigation our own guard entry
    // provokes. Only a real path change should tear overlays down.
    if (to.fullPath === lastPath) return
    lastPath = to.fullPath
    // The guard entry is now buried behind the page the user navigated to.
    // Popping it would undo their navigation, so forget it instead of unwinding.
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
