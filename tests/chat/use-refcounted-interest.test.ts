import { describe, expect, it, vi, afterEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  useRefcountedInterest,
  type RefcountedInterestHandle,
  type RefcountedInterestOptions,
} from '~/composables/chat/useRefcountedInterest'

/**
 * `useRefcountedInterest` is the reducer that turns "row N is visible /
 * not visible" events into batched `add(ids[])` / `remove(ids[])` calls to
 * a downstream subscriber (the chat page uses it for presence
 * subscriptions). The contract under test:
 *
 *   - Refcount per id; only the 0↔1 edges call into add/remove.
 *   - Adds and removes that happen in the same flush window are coalesced.
 *   - An add-then-remove (or remove-then-add) inside the same window
 *     cancels itself out; nothing is dispatched.
 *   - Teardown calls `remove(...)` for everything still subscribed and
 *     cancels any pending flush.
 */

interface MountedHandle {
  handle: RefcountedInterestHandle
  add: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  flushQueued: () => void
  destroy: () => void
}

/**
 * Mounts a tiny harness so the composable's `onBeforeUnmount` hook is
 * actually wired up. Returns the composable's handle, plus a way to
 * manually drive its scheduler (so tests don't depend on requestAnimationFrame
 * timing).
 */
function mountHarness(extra?: Partial<RefcountedInterestOptions>): MountedHandle {
  const add = vi.fn<(ids: string[]) => void>()
  const remove = vi.fn<(ids: string[]) => void>()
  const queue: Array<() => void> = []

  let handle!: RefcountedInterestHandle
  const Comp = defineComponent({
    name: 'RefcountedInterestHarness',
    setup() {
      handle = useRefcountedInterest({
        add,
        remove,
        // Capture scheduled callbacks instead of calling rAF — the test
        // drives them explicitly via `flushQueued()`.
        schedule: (cb) => {
          queue.push(cb)
          return queue.length
        },
        cancelHandle: (h) => {
          const idx = (h as number) - 1
          if (idx >= 0 && idx < queue.length) queue[idx] = () => {}
        },
        ...extra,
      })
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return {
    handle,
    add,
    remove,
    flushQueued: () => {
      const pending = queue.splice(0, queue.length)
      for (const cb of pending) cb()
    },
    destroy: () => wrapper.unmount(),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useRefcountedInterest', () => {
  it('does not call add until the scheduled flush runs', () => {
    const { handle, add, flushQueued } = mountHarness()
    handle.setVisible('a', true)
    expect(add).not.toHaveBeenCalled()
    flushQueued()
    expect(add).toHaveBeenCalledTimes(1)
    expect(add.mock.calls[0]?.[0]).toEqual(['a'])
  })

  it('coalesces multiple adds in the same window into one batch', () => {
    const { handle, add, flushQueued } = mountHarness()
    handle.setVisible('a', true)
    handle.setVisible('b', true)
    handle.setVisible('c', true)
    flushQueued()
    expect(add).toHaveBeenCalledTimes(1)
    expect(add.mock.calls[0]?.[0].sort()).toEqual(['a', 'b', 'c'])
  })

  it('only emits add() once when the same id is bumped twice (refcount 0→1→2)', () => {
    const { handle, add, flushQueued } = mountHarness()
    handle.setVisible('a', true)
    handle.setVisible('a', true)
    flushQueued()
    expect(add).toHaveBeenCalledTimes(1)
    expect(add.mock.calls[0]?.[0]).toEqual(['a'])
    expect(handle.refcount.get('a')).toBe(2)
  })

  it('only emits remove() once on the 1→0 edge (not on intermediate decrements)', () => {
    const { handle, add, remove, flushQueued } = mountHarness()
    handle.setVisible('a', true)
    handle.setVisible('a', true)
    flushQueued()
    add.mockClear()
    handle.setVisible('a', false)
    flushQueued()
    expect(remove).not.toHaveBeenCalled()
    handle.setVisible('a', false)
    flushQueued()
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove.mock.calls[0]?.[0]).toEqual(['a'])
    expect(handle.refcount.has('a')).toBe(false)
  })

  it('cancels a pending add when the same id is removed in the same window', () => {
    const { handle, add, remove, flushQueued } = mountHarness()
    handle.setVisible('a', true)
    handle.setVisible('a', false)
    flushQueued()
    expect(add).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('cancels a pending remove when the same id is re-added in the same window', () => {
    const { handle, add, remove, flushQueued } = mountHarness()
    // Seed: get refcount to 1 with a flushed add.
    handle.setVisible('a', true)
    flushQueued()
    add.mockClear()
    // In the next window, drop and re-add immediately.
    handle.setVisible('a', false)
    handle.setVisible('a', true)
    flushQueued()
    expect(add).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(handle.refcount.get('a')).toBe(1)
  })

  it('clamps spurious decrements at 0 (refcount never goes negative)', () => {
    const { handle, add, remove, flushQueued } = mountHarness()
    handle.setVisible('a', false)
    flushQueued()
    expect(add).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(handle.refcount.has('a')).toBe(false)
  })

  it('flushNow drains pending adds/removes synchronously', () => {
    const { handle, add } = mountHarness()
    handle.setVisible('x', true)
    handle.flushNow()
    expect(add).toHaveBeenCalledTimes(1)
    expect(add.mock.calls[0]?.[0]).toEqual(['x'])
  })

  it('teardown removes only ids that were actually committed (not pending adds)', async () => {
    const { handle, add, remove, flushQueued, destroy } = mountHarness()
    handle.setVisible('a', true)
    handle.setVisible('b', true)
    flushQueued()
    expect(add).toHaveBeenCalledTimes(1)
    add.mockClear()

    // 'c' was bumped but the flush hasn't run, so the consumer never saw an
    // add for 'c'. We must NOT send a remove for 'c' on teardown — the
    // gateway never had it.
    handle.setVisible('c', true)
    destroy() // triggers onBeforeUnmount → teardown
    await nextTick()

    expect(add).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove.mock.calls[0]?.[0].sort()).toEqual(['a', 'b'])
  })

  it('teardown is a no-op when nothing was ever committed', async () => {
    const { handle, add, remove, destroy } = mountHarness()
    handle.setVisible('a', true) // pending, never flushed
    destroy()
    await nextTick()
    expect(add).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('ignores empty-string ids', () => {
    const { handle, add, remove, flushQueued } = mountHarness()
    handle.setVisible('', true)
    handle.setVisible('', false)
    flushQueued()
    expect(add).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })
})
