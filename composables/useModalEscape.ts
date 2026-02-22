/**
 * Global Escape-key stack for modals, sheets, and overlays.
 *
 * Each open overlay registers a "close" callback here. When the user presses
 * Escape, ONLY the topmost registered closer is called (LIFO). The event is
 * then stopped so no other registered handler — or the browser default — fires.
 *
 * Usage in a component:
 *   useModalEscape(openRef, () => myCloseFunction())
 */

// Module-level stack — shared across all component instances.
const _closers: Array<() => void> = []
let _listenerInstalled = false

function _onGlobalEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (_closers.length === 0) return
  // Consume the event so no other handler (bubble or capture) sees this Escape.
  e.stopImmediatePropagation()
  e.preventDefault()
  const fn = _closers[_closers.length - 1]!
  fn()
}

function _ensureListener() {
  if (_listenerInstalled || typeof document === 'undefined') return
  // capture: true so we run before any bubble-phase listeners on window/document.
  document.addEventListener('keydown', _onGlobalEscape, { capture: true })
  _listenerInstalled = true
}

/**
 * Register `closeFn` in the global Escape stack while `active` is truthy.
 * Must be called inside a component setup (uses `watch` + `onBeforeUnmount`).
 */
export function useModalEscape(active: MaybeRefOrGetter<boolean>, closeFn: () => void) {
  if (!import.meta.client) return

  _ensureListener()

  function register() {
    // Avoid duplicates for the same function reference.
    if (!_closers.includes(closeFn)) _closers.push(closeFn)
  }

  function unregister() {
    const idx = _closers.lastIndexOf(closeFn)
    if (idx !== -1) _closers.splice(idx, 1)
  }

  watch(() => toValue(active), (v) => (v ? register() : unregister()), { immediate: true })
  onBeforeUnmount(unregister)
}
