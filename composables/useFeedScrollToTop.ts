/**
 * Scrolls the middle scroller the minimum amount needed so the feed content
 * is visible just below the sticky tab bar / filter header.
 *
 * @param feedContentEl  Sentinel element placed immediately after the tab bar —
 *                       marks the "content starts here" boundary.
 * @param stickyHeaderEl The sticky tab bar element — its height is subtracted
 *                       from the scroll target so content appears below it,
 *                       not hidden behind it.
 *
 * If feedContentEl is not provided, falls back to `scrollTo({ top: 0 })`.
 * If delta >= 0 the content is already fully visible — nothing happens.
 */
export function useFeedScrollToTop(
  feedContentEl?: Ref<HTMLElement | null>,
  stickyHeaderEl?: Ref<HTMLElement | null>,
) {
  const scroller = useMiddleScroller()

  function scrollToTop() {
    if (!import.meta.client) return
    void nextTick(() => {
      const s = scroller.value
      const target = feedContentEl?.value

      if (target) {
        const scrollerTop = s ? s.getBoundingClientRect().top : 0
        const headerH = stickyHeaderEl?.value?.getBoundingClientRect().height ?? 0
        const targetTop = target.getBoundingClientRect().top
        // Negative delta means feed content is above the visible area — scroll up.
        // Zero or positive means it is already visible below the sticky header.
        const delta = targetTop - scrollerTop - headerH
        if (delta >= 0) return
        if (s) s.scrollBy({ top: delta, behavior: 'smooth' })
        else window.scrollBy({ top: delta, behavior: 'smooth' })
      } else {
        if (s) s.scrollTo({ top: 0, behavior: 'smooth' })
        else window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  return { scrollToTop }
}
