import { onBeforeUnmount } from 'vue'

/**
 * Observe a dynamic set of "rows" (each identified by a stable string id) and
 * call `onVisible(id, visible)` whenever a row enters or leaves the viewport.
 *
 * Use this when:
 *   - You have a long list (10s–1000s of rows) and want to do something only
 *     for rows the user can actually see (subscribe to presence, lazy-fetch
 *     metadata, etc.).
 *   - You want a SINGLE shared `IntersectionObserver` for the whole list —
 *     not one per row — so the observer cost stays O(1) regardless of list
 *     size.
 *
 * Usage from a parent component:
 * ```ts
 * const observer = useViewportIdsObserver({
 *   onVisible: (id, visible) => emit('row-visible', id, visible),
 *   rootMargin: '100px 0px',
 * })
 *
 * // In the template, on each row's root element:
 * <div :ref="observer.bindRow(c.id)" />
 * ```
 *
 * Internals:
 *   - The observer is created EAGERLY in setup (synchronously, on the
 *     client). This is critical: Vue invokes `:ref` function callbacks
 *     during the patch phase, BEFORE `onMounted` fires. If the observer
 *     were created in `onMounted`, the first batch of rows would mount,
 *     fire their refs against a null observer, and never get observed
 *     (since stable function refs don't re-fire on subsequent renders).
 *   - `bindRow(id)` returns a STABLE function reference per id. Vue treats
 *     identical function refs as the same binding, so re-renders don't
 *     thrash observe/unobserve. The same closure also handles row
 *     unmount (Vue calls it with `null`) and row replacement.
 *   - On unmount the composable broadcasts `onVisible(id, false)` for every
 *     still-observed row so the consumer can release any per-id resources
 *     (e.g. presence subscriptions).
 *   - Tested in `tests/chat/use-viewport-ids-observer.test.ts`.
 */
export interface ViewportIdsObserverOptions {
  /** Called when a row enters or leaves the viewport. */
  onVisible: (id: string, visible: boolean) => void
  /** Forwarded to `IntersectionObserver` constructor. Defaults to '0px'. */
  rootMargin?: string
  /** Forwarded to `IntersectionObserver` constructor. Defaults to `0`. */
  threshold?: number | number[]
  /** Forwarded to `IntersectionObserver` constructor. Defaults to `null`. */
  root?: Element | Document | null
}

export interface ViewportIdsObserverHandle {
  /**
   * Returns a stable `:ref` callback for the row identified by `id`. Pass it
   * directly to Vue's `:ref="..."`; the function reference is cached per id
   * so re-renders don't trigger observe/unobserve churn.
   *
   * The callback accepts whatever Vue passes (Element, ComponentPublicInstance,
   * or null) and resolves to the underlying DOM element automatically. If you
   * pass it as `:ref` on a NuxtLink the underlying `<a>` is observed.
   */
  bindRow: (id: string) => (raw: unknown) => void
  /**
   * Force-tear-down the observer and broadcast `onVisible(id, false)` for
   * every row still being tracked. Normally you don't need to call this — it
   * runs automatically in `onBeforeUnmount`. Exposed so tests can drive
   * teardown explicitly.
   */
  teardown: () => void
}

function extractEl(raw: unknown): Element | null {
  if (raw == null) return null
  if (raw instanceof Element) return raw
  const maybe = (raw as { $el?: unknown }).$el
  return maybe instanceof Element ? maybe : null
}

export function useViewportIdsObserver(
  options: ViewportIdsObserverOptions,
): ViewportIdsObserverHandle {
  // Eagerly create the observer on the client (synchronously, in setup).
  // SSR-safe: skip when `IntersectionObserver` isn't defined.
  let observer: IntersectionObserver | null = null

  // id → DOM element currently observed (if any).
  const observedElById = new Map<string, Element>()
  // Reverse lookup: when the IntersectionObserver fires we need O(1) id resolution.
  const idByEl = new WeakMap<Element, string>()
  // Cache of stable per-id `:ref` functions (so Vue doesn't re-bind on each render).
  const refByid = new Map<string, (raw: unknown) => void>()

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = idByEl.get(entry.target)
          if (id) options.onVisible(id, entry.isIntersecting)
        }
      },
      {
        root: options.root ?? null,
        rootMargin: options.rootMargin ?? '0px',
        threshold: options.threshold ?? 0,
      },
    )
  }

  function unobserveRow(id: string) {
    const prev = observedElById.get(id)
    if (!prev) return
    observer?.unobserve(prev)
    idByEl.delete(prev)
    observedElById.delete(id)
    options.onVisible(id, false)
  }

  function observeRow(id: string, el: Element) {
    if (!observer) return
    if (observedElById.get(id) === el) return
    // Re-mount (different element for the same id) — clean the old slot first
    // so the consumer sees a clean visible→hidden→visible transition.
    if (observedElById.has(id)) unobserveRow(id)
    observedElById.set(id, el)
    idByEl.set(el, id)
    observer.observe(el)
  }

  function bindRow(id: string): (raw: unknown) => void {
    let fn = refByid.get(id)
    if (fn) return fn
    fn = (raw: unknown) => {
      const el = extractEl(raw)
      if (el) {
        observeRow(id, el)
      } else {
        // Vue called us with `null` → row unmounted. Drop the cached ref so
        // the slot doesn't leak across reuses.
        unobserveRow(id)
        refByid.delete(id)
      }
    }
    refByid.set(id, fn)
    return fn
  }

  function teardown() {
    for (const id of [...observedElById.keys()]) {
      unobserveRow(id)
    }
    refByid.clear()
    observer?.disconnect()
    observer = null
  }

  onBeforeUnmount(teardown)

  return { bindRow, teardown }
}
