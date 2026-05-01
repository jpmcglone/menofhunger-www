import { onBeforeUnmount } from 'vue'

/**
 * A small reducer for the "subscribe to interest in N entities, but only
 * while at least one observer cares" pattern.
 *
 * The chat page uses this to drive presence subscriptions: each visible
 * conversation row says "I care about this userId"; when the row scrolls off
 * the same row says "I no longer care". Multiple rows can care about the
 * same userId at the same time (the same partner can appear in several
 * conversations) so we refcount and only emit add/remove on the 0↔1 edges.
 *
 * Pending adds and pending removes are coalesced per animation frame so a
 * fast scroll-through doesn't spam the gateway with single-id batches.
 *
 * The contract is:
 *   - Call `setVisible(id, true)` when an id becomes visible.
 *   - Call `setVisible(id, false)` when it stops being visible.
 *   - The composable calls `add(ids[])` once per id when its refcount goes
 *     0→1, and `remove(ids[])` once per id when it goes 1→0, with both
 *     coalesced into the next animation frame.
 *   - On unmount the composable cancels any pending flush and calls
 *     `remove([...everything still subscribed])` exactly once.
 *
 * Tested in `tests/chat/use-refcounted-interest.test.ts`.
 */
export interface RefcountedInterestOptions {
  /** Called once per coalesced flush with all ids that just went 0→1. */
  add: (ids: string[]) => void
  /** Called once per coalesced flush with all ids that just went 1→0. */
  remove: (ids: string[]) => void
  /**
   * Inject a custom scheduler — useful for tests. Defaults to
   * `requestAnimationFrame` on the client and a microtask on the server.
   * Must return a handle that `cancelHandle` understands.
   */
  schedule?: (cb: () => void) => unknown
  /** Cancel a handle returned by `schedule`. */
  cancelHandle?: (handle: unknown) => void
}

export interface RefcountedInterestHandle {
  /** Bump or drop the refcount for `id`. No-op for the empty string. */
  setVisible: (id: string, visible: boolean) => void
  /**
   * Snapshot of the current refcount table (for tests). Don't mutate.
   */
  refcount: ReadonlyMap<string, number>
  /**
   * Flush pending adds/removes immediately (skipping the animation frame).
   * Useful in tests; safe to call from prod code if you really need
   * synchronous behavior.
   */
  flushNow: () => void
  /**
   * Force-tear-down: cancels any pending flush, then calls `remove(...)`
   * with every id currently held. Runs automatically on `onBeforeUnmount`.
   */
  teardown: () => void
}

function defaultSchedule(cb: () => void): unknown {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(cb)
  }
  return setTimeout(cb, 0)
}

function defaultCancel(handle: unknown): void {
  if (handle == null) return
  if (typeof cancelAnimationFrame !== 'undefined') {
    try { cancelAnimationFrame(handle as number) } catch { /* ignore */ }
  }
  try { clearTimeout(handle as ReturnType<typeof setTimeout>) } catch { /* ignore */ }
}

export function useRefcountedInterest(
  options: RefcountedInterestOptions,
): RefcountedInterestHandle {
  const refcount = new Map<string, number>()
  const pendingAdds = new Set<string>()
  const pendingRemoves = new Set<string>()
  let flushHandle: unknown = null

  const schedule = options.schedule ?? defaultSchedule
  const cancelHandle = options.cancelHandle ?? defaultCancel

  function flushNow() {
    if (flushHandle != null) {
      cancelHandle(flushHandle)
      flushHandle = null
    }
    if (pendingAdds.size) {
      const adds = [...pendingAdds]
      pendingAdds.clear()
      options.add(adds)
    }
    if (pendingRemoves.size) {
      const removes = [...pendingRemoves]
      pendingRemoves.clear()
      options.remove(removes)
    }
  }

  function scheduleFlush() {
    if (flushHandle != null) return
    flushHandle = schedule(() => {
      flushHandle = null
      flushNow()
    })
  }

  function setVisible(id: string, visible: boolean) {
    if (!id) return
    const prev = refcount.get(id) ?? 0
    const next = visible ? prev + 1 : Math.max(0, prev - 1)

    if (next === 0) refcount.delete(id)
    else refcount.set(id, next)

    // Only the 0↔1 edges need to talk to the gateway. If we're flipping
    // an already-pending add/remove, cancel it instead of emitting twice.
    if (prev === 0 && next === 1) {
      if (pendingRemoves.has(id)) pendingRemoves.delete(id)
      else pendingAdds.add(id)
      scheduleFlush()
    } else if (prev === 1 && next === 0) {
      if (pendingAdds.has(id)) pendingAdds.delete(id)
      else pendingRemoves.add(id)
      scheduleFlush()
    }
  }

  function teardown() {
    if (flushHandle != null) {
      cancelHandle(flushHandle)
      flushHandle = null
    }
    // Anything in `pendingAdds` was never actually sent to the consumer, so
    // we don't owe it a `remove`. Drop those ids from the teardown set; the
    // remaining ids are everything we actually committed to the gateway.
    const toRemove: string[] = []
    for (const id of refcount.keys()) {
      if (!pendingAdds.has(id)) toRemove.push(id)
    }
    refcount.clear()
    pendingAdds.clear()
    pendingRemoves.clear()
    if (toRemove.length) options.remove(toRemove)
  }

  onBeforeUnmount(teardown)

  return { setVisible, refcount, flushNow, teardown }
}
