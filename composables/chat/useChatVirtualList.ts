import { computed, nextTick, onScopeDispose, ref, watch, type Ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { ChatListItem } from './useChatTimeFormatting'

/** Variable-height windowing; measured sizes stay keyed to stable message IDs. */
export function useChatVirtualList(items: Ref<ChatListItem[]>, scroller: Ref<HTMLElement | null>, atBottom?: Ref<boolean>) {
  const container = ref<HTMLElement | null>(null)
  const margin = ref(0)
  const updateMargin = () => {
    if (!container.value || !scroller.value) return
    margin.value = container.value.getBoundingClientRect().top - scroller.value.getBoundingClientRect().top + scroller.value.scrollTop
  }
  const virtualizer = useVirtualizer(computed(() => ({
    count: items.value.length,
    getScrollElement: () => scroller.value,
    estimateSize: (index: number) => {
      const item = items.value[index]
      if (item?.type === 'divider') return 36
      return item?.type === 'message' && item.message.media?.length ? 320 : 88
    },
    getItemKey: (index: number) => items.value[index]?.key ?? index,
    overscan: 6,
    scrollMargin: margin.value,
  })))
  // The chat scroll controller owns bottom anchoring. Letting both systems
  // compensate the same measurement can move us off the bottom by one row.
  virtualizer.value.shouldAdjustScrollPositionOnItemSizeChange = (item, _delta, instance) =>
    !atBottom?.value && item.start < (instance.scrollOffset ?? 0)
  let observer: ResizeObserver | null = null
  watch([container, scroller], () => {
    observer?.disconnect()
    updateMargin()
    if (typeof ResizeObserver !== 'undefined' && scroller.value) {
      observer = new ResizeObserver(updateMargin)
      observer.observe(scroller.value)
      // Includes the load-older button and sticky header above the virtual list.
      if (container.value?.parentElement) observer.observe(container.value.parentElement)
    }
  }, { flush: 'post' })
  onScopeDispose(() => observer?.disconnect())

  const rows = computed(() => virtualizer.value.getVirtualItems().flatMap((row) => {
    const item = items.value[row.index]
    return item ? [{ ...row, item, offset: row.start - margin.value }] : []
  }))
  const totalSize = computed(() => virtualizer.value.getTotalSize())
  const labels = computed(() => {
    let label = ''
    return items.value.map((item) => {
      if (item.type === 'divider') label = item.label
      return label
    })
  })
  const stickyLabel = computed(() => {
    const offset = virtualizer.value.scrollOffset ?? 0
    const first = virtualizer.value.getVirtualItems().find((row) => row.end > offset)
    return first ? labels.value[first.index] ?? '' : ''
  })
  function measure(el: unknown) {
    if (el instanceof Element) virtualizer.value.measureElement(el)
  }
  async function scrollToMessage(messageId: string): Promise<boolean> {
    const index = items.value.findIndex((item) => item.type === 'message' && item.message.id === messageId)
    if (index < 0) return false
    updateMargin()
    virtualizer.value.scrollToIndex(index, { align: 'center', behavior: 'auto' })
    await nextTick()
    // The target can be off-screen initially. Re-align once it has been mounted/measured.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    virtualizer.value.scrollToIndex(index, { align: 'center', behavior: 'auto' })
    await nextTick()
    return true
  }
  return { container, rows, totalSize, stickyLabel, measure, scrollToMessage }
}
