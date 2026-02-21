import type { Ref } from 'vue'

/**
 * Sets up an IntersectionObserver on a sentinel element to trigger infinite-scroll load-more.
 * Automatically disconnects and reconnects when sentinel, scrollRoot, or hasMore changes.
 * Cleans up on component unmount.
 */
export function useLoadMoreObserver(
  sentinelEl: Ref<HTMLElement | null>,
  scrollRoot: Ref<HTMLElement | null>,
  hasMore: Ref<boolean> | (() => boolean),
  onIntersect: () => void,
  options: { rootMargin?: string } = {},
) {
  const rootMargin = options.rootMargin ?? '400px'

  const hasMoreRef = typeof hasMore === 'function' ? computed(hasMore) : hasMore

  let obs: IntersectionObserver | null = null

  function disconnect() {
    obs?.disconnect()
    obs = null
  }

  watch(
    [sentinelEl, scrollRoot, hasMoreRef],
    ([sentinel, root]) => {
      if (!import.meta.client) return
      disconnect()
      const el = sentinel as HTMLElement | null
      const rootEl = root as HTMLElement | null
      if (!el || !rootEl || !hasMoreRef.value) return
      obs = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) onIntersect()
        },
        { root: rootEl, rootMargin, threshold: 0 },
      )
      obs.observe(el)
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(disconnect)
}
