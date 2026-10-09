import type { ComponentPublicInstance, ComputedRef, Ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { PostsFeedDisplayItem } from '~/composables/usePostsFeed'

/** Virtualized home feed list: scroll margin tracking, row measuring, and visible-row reporting. */
export function useHomeFeedVirtualizer(deps: {
  middleScrollerRef: ReturnType<typeof useMiddleScroller>
  items: ComputedRef<PostsFeedDisplayItem[]>
  isAuthed: Ref<boolean>
  hasCheckedInToday: ComputedRef<boolean>
  heroResolved: ComputedRef<boolean>
  feedCtaKind: Ref<unknown>
  notifyVisibleRowIds: (ids: string[]) => void
}) {
  const { middleScrollerRef, items: activeHomeFeedDisplayItems, isAuthed, hasCheckedInToday, heroResolved, feedCtaKind, notifyVisibleRowIds } = deps

  // Mirrors the chat list pattern (ChatMessageList.vue). Only ~OVERSCAN+visible
  // rows are mounted at any time; off-screen rows are unmounted. The outer div
  // is height-stable (feedTotalSize px); each row is absolutely positioned.
  //
  // scrollMargin = distance from the middle scroller's top to the feed list
  // container's top. This accounts for the variable-height header stack above
  // the feed (composer, check-in hero, welcome card, etc.). It's recomputed
  // via ResizeObserver whenever the header resizes and via watchEffect whenever
  // reactive state that drives header height changes.

  const FEED_ESTIMATED_ROW_PX = 280
  const FEED_OVERSCAN = 3

  const feedVirtualListContainerEl = ref<HTMLElement | null>(null)
  const feedListScrollMargin = ref(0)

  function computeFeedScrollMargin() {
    const container = feedVirtualListContainerEl.value
    const scroller = middleScrollerRef.value
    if (!container || !scroller) {
      feedListScrollMargin.value = 0
      return
    }
    const scrollerRect = scroller.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    // Distance from scroll-container's content start to the list container top.
    const offset = containerRect.top - scrollerRect.top + scroller.scrollTop
    feedListScrollMargin.value = Math.max(0, Math.floor(offset))
  }

  const initialFeedLoadStarted = ref(false)
  const {
    initialFeedResolved,
    markInitialFeedResolved,
  } = useHomeLoadState()

  // Recompute when anything that changes header height changes reactively
  // (check-in hero visible/collapsed, composer mounted/unmounted, etc.).
  watchEffect(async () => {
    const _deps = [
      hasCheckedInToday.value,
      heroResolved.value,
      isAuthed.value,
      feedCtaKind.value,
      initialFeedResolved.value,
    ]
    if (!import.meta.client) return
    await nextTick()
    computeFeedScrollMargin()
  })

  const feedVirtualizer = useVirtualizer({
    get count() { return activeHomeFeedDisplayItems.value.length },
    getScrollElement: () => middleScrollerRef.value ?? null,
    estimateSize: () => FEED_ESTIMATED_ROW_PX,
    overscan: FEED_OVERSCAN,
    get scrollMargin() { return feedListScrollMargin.value },
    getItemKey: (index) => {
      const item = activeHomeFeedDisplayItems.value[index]
      if (!item) return index
      return item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)
    },
  })

  const feedVirtualItems = computed(() => feedVirtualizer.value.getVirtualItems())
  const feedTotalSize = computed(() => feedVirtualizer.value.getTotalSize())

  function measureFeedRow(el: Element | ComponentPublicInstance | null) {
    if (!el || !(el instanceof Element)) return
    // TanStack Virtual reads `data-index` off the measured node. A ref can fire
    // on a detached/replaced node during a mid-setup crash; skip those.
    if (!el.hasAttribute('data-index')) return
    feedVirtualizer.value.measureElement(el)
  }

  // Drive realtime subscriptions from visible virtualizer rows instead of DOM scan.
  watch(feedVirtualItems, (items) => {
    const visibleIds = items
      .map(row => {
        const item = activeHomeFeedDisplayItems.value[row.index]
        return item?.kind === 'post' ? item.post.id : null
      })
      .filter((id): id is string => Boolean(id))
    notifyVisibleRowIds(visibleIds)
  })

  return {
    feedVirtualListContainerEl,
    feedListScrollMargin,
    computeFeedScrollMargin,
    initialFeedLoadStarted,
    initialFeedResolved,
    markInitialFeedResolved,
    feedVirtualItems,
    feedTotalSize,
    measureFeedRow,
  }
}
