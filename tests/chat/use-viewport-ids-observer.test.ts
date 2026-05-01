import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  useViewportIdsObserver,
  type ViewportIdsObserverHandle,
} from '~/composables/chat/useViewportIdsObserver'

/**
 * `useViewportIdsObserver` is a small adapter around IntersectionObserver
 * for "tell me when this row enters/leaves the viewport, by stable id".
 *
 * Tests cover the contract that matters at the boundary:
 *  - The observer is created EAGERLY in setup (not in onMounted) so the
 *    first batch of `:ref` callbacks — which Vue invokes during the patch
 *    phase, BEFORE onMounted — actually start observing instead of being
 *    silently dropped. This was the root cause of the chat freeze fix's
 *    presence-subscription regression.
 *  - `bindRow(id)` returns a STABLE function reference per id (so Vue's
 *    template `:ref` doesn't tear down + re-observe across renders).
 *  - `bindRow` accepts both raw Elements and { $el } wrappers (NuxtLink).
 *  - On row unmount, `onVisible(id, false)` fires and the slot is cleaned
 *    so no DOM reference leaks past the row's lifetime.
 *  - On component unmount, every still-observed row gets a final
 *    `onVisible(id, false)` and the observer disconnects.
 */

// ─── Fake IntersectionObserver ───────────────────────────────────────────────
//
// happy-dom ships an IntersectionObserver shim, but it doesn't actually fire
// callbacks unless we drive layout — and we want deterministic control. So
// we install our own and inspect what was observed/unobserved.

interface FakeObserverInstance {
  callback: IntersectionObserverCallback
  observed: Set<Element>
  disconnected: boolean
  /** Drive an entry into the observer callback as if the browser fired it. */
  fire: (target: Element, isIntersecting: boolean) => void
}

const liveObservers: FakeObserverInstance[] = []

class FakeIntersectionObserver implements IntersectionObserver {
  root = null
  rootMargin = ''
  thresholds: readonly number[] = []
  private state: FakeObserverInstance

  constructor(callback: IntersectionObserverCallback) {
    this.state = {
      callback,
      observed: new Set<Element>(),
      disconnected: false,
      fire: (target, isIntersecting) => {
        if (this.state.disconnected) return
        if (!this.state.observed.has(target)) return
        const entry = {
          target,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        } as IntersectionObserverEntry
        callback([entry], this)
      },
    }
    liveObservers.push(this.state)
  }

  observe(target: Element): void {
    if (this.state.disconnected) return
    this.state.observed.add(target)
  }

  unobserve(target: Element): void {
    this.state.observed.delete(target)
  }

  disconnect(): void {
    this.state.observed.clear()
    this.state.disconnected = true
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

let originalIO: typeof globalThis.IntersectionObserver | undefined

beforeEach(() => {
  liveObservers.length = 0
  originalIO = globalThis.IntersectionObserver
  ;(globalThis as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
    FakeIntersectionObserver as unknown as typeof IntersectionObserver
})

afterEach(() => {
  if (originalIO) {
    ;(globalThis as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
      originalIO
  }
  vi.restoreAllMocks()
})

// ─── Harness ─────────────────────────────────────────────────────────────────

interface MountedHarness {
  handle: ViewportIdsObserverHandle
  visibleEvents: Array<[string, boolean]>
  observer: FakeObserverInstance
  destroy: () => void
}

function mountHarness(): MountedHarness {
  const visibleEvents: Array<[string, boolean]> = []
  let handle!: ViewportIdsObserverHandle

  const Comp = defineComponent({
    name: 'ViewportIdsObserverHarness',
    setup() {
      handle = useViewportIdsObserver({
        onVisible: (id, visible) => visibleEvents.push([id, visible]),
        rootMargin: '50px 0px',
      })
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)

  const observer = liveObservers[liveObservers.length - 1]
  if (!observer) {
    throw new Error('Expected useViewportIdsObserver to create an IntersectionObserver in setup')
  }

  return {
    handle,
    visibleEvents,
    observer,
    destroy: () => wrapper.unmount(),
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useViewportIdsObserver', () => {
  it('creates the IntersectionObserver eagerly in setup (not in onMounted)', () => {
    // The harness throws above if no observer was created during setup; make
    // the assertion explicit so a regression is obvious.
    const harness = mountHarness()
    expect(harness.observer).toBeDefined()
    expect(harness.observer.disconnected).toBe(false)
    harness.destroy()
  })

  it('observes a row when bindRow(id)(el) is called', () => {
    const { handle, observer, destroy } = mountHarness()
    const el = document.createElement('div')
    handle.bindRow('row-1')(el)
    expect(observer.observed.has(el)).toBe(true)
    destroy()
  })

  it('returns a stable function reference per id (Vue template ref dedup)', () => {
    const { handle, destroy } = mountHarness()
    const fn1 = handle.bindRow('same')
    const fn2 = handle.bindRow('same')
    expect(fn1).toBe(fn2)
    destroy()
  })

  it('extracts the underlying $el from a NuxtLink-style wrapper', () => {
    const { handle, observer, destroy } = mountHarness()
    const el = document.createElement('a')
    handle.bindRow('link-row')({ $el: el })
    expect(observer.observed.has(el)).toBe(true)
    destroy()
  })

  it('emits onVisible(id, true) when the observer fires intersecting', () => {
    const { handle, observer, visibleEvents, destroy } = mountHarness()
    const el = document.createElement('div')
    handle.bindRow('row-1')(el)
    observer.fire(el, true)
    expect(visibleEvents).toContainEqual(['row-1', true])
    destroy()
  })

  it('emits onVisible(id, false) and unobserves when the row unmounts', () => {
    const { handle, observer, visibleEvents, destroy } = mountHarness()
    const el = document.createElement('div')
    const ref = handle.bindRow('row-1')
    ref(el)
    visibleEvents.length = 0
    ref(null) // simulate Vue calling :ref with null on unmount
    expect(observer.observed.has(el)).toBe(false)
    expect(visibleEvents).toEqual([['row-1', false]])
    destroy()
  })

  it('cleanly switches the observed element when the same id remounts on a different node', () => {
    const { handle, observer, visibleEvents, destroy } = mountHarness()
    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    const ref = handle.bindRow('row-1')
    ref(el1)
    visibleEvents.length = 0
    ref(el2)
    expect(observer.observed.has(el1)).toBe(false)
    expect(observer.observed.has(el2)).toBe(true)
    // We should see a clean visible→hidden transition for the old node
    // before the new one is observed (the parent depends on this when
    // releasing per-id resources).
    expect(visibleEvents[0]).toEqual(['row-1', false])
    destroy()
  })

  it('teardown emits onVisible(false) for every still-observed row and disconnects', async () => {
    const { handle, observer, visibleEvents, destroy } = mountHarness()
    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    handle.bindRow('a')(el1)
    handle.bindRow('b')(el2)
    visibleEvents.length = 0
    destroy() // unmount → onBeforeUnmount → teardown
    await nextTick()
    expect(visibleEvents.sort()).toEqual([
      ['a', false],
      ['b', false],
    ])
    expect(observer.disconnected).toBe(true)
  })

  it('is a no-op when IntersectionObserver is unavailable (SSR safety)', () => {
    const original = globalThis.IntersectionObserver
    // @ts-expect-error — simulate environment without IntersectionObserver
    delete globalThis.IntersectionObserver
    try {
      const visibleEvents: Array<[string, boolean]> = []
      let handle!: ViewportIdsObserverHandle
      const Comp = defineComponent({
        setup() {
          handle = useViewportIdsObserver({
            onVisible: (id, visible) => visibleEvents.push([id, visible]),
          })
          return () => h('div')
        },
      })
      const wrapper = mount(Comp)
      const el = document.createElement('div')
      handle.bindRow('row-1')(el)
      // Without an observer, no events fire; nothing throws.
      expect(visibleEvents).toEqual([])
      wrapper.unmount()
    } finally {
      ;(globalThis as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
        original
    }
  })
})
