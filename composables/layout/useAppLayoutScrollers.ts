import type { ComputedRef, Ref } from 'vue'
import { MOH_MIDDLE_SCROLLER_KEY } from '~/utils/injection-keys'

/** Title-bar height + toast clearance CSS vars, and the linked middle/right wheel scrolling. */
export function useAppLayoutScrollers(options: {
  route: ReturnType<typeof useRoute>
  hideTopBar: ComputedRef<boolean> | Ref<boolean>
  middleScrollerEl: Ref<HTMLElement | null>
  anyOverlayOpen: Ref<boolean> | ComputedRef<boolean>
}) {
  const { route, hideTopBar, middleScrollerEl, anyOverlayOpen } = options
  // ── Scrollers + title bar height ──────────────────────────────────────────────

  const titleBarEl = ref<HTMLElement | null>(null)
  const pinnedBannerEl = ref<HTMLElement | null>(null)
  const layoutViewportEl = ref<HTMLElement | null>(null)
  const leftRailRef = ref<{ el: HTMLElement | null } | null>(null)
  const rightRailRef = ref<{ el: HTMLElement | null } | null>(null)
  const leftRailEl = computed(() => leftRailRef.value?.el ?? null)
  const rightRailEl = computed(() => rightRailRef.value?.el ?? null)

  provide(MOH_MIDDLE_SCROLLER_KEY, middleScrollerEl)

  function updateTitleBarHeightVar() {
    if (!import.meta.client) return
    const main = middleScrollerEl.value
    const bar = titleBarEl.value
    if (!main) return
    if (!hideTopBar.value && bar) {
      main.style.setProperty('--moh-title-bar-height', `${bar.offsetHeight}px`)
    } else if (hideTopBar.value) {
      // Status banners only. The day line scrolls away and is not part of this offset.
      const pinned = pinnedBannerEl.value?.offsetHeight ?? 0
      main.style.setProperty('--moh-title-bar-height', `${pinned}px`)
    } else {
      main.style.setProperty('--moh-title-bar-height', '0px')
    }
    updateToastClearanceVar()
  }

  /** Toast stack is teleported to body — publish clearance on :root so it can see it. */
  function updateToastClearanceVar() {
    if (!import.meta.client) return
    let clearancePx = 0
    if (!hideTopBar.value && titleBarEl.value) {
      clearancePx = titleBarEl.value.offsetHeight
    } else {
      // hideTopBar routes often have their own sticky header (home avatar bar, etc.).
      // Prefer an explicit anchor; otherwise clear a typical toolbar band so toasts
      // don't sit on top of chrome.
      const anchor = middleScrollerEl.value?.querySelector(
        '[data-moh-toast-anchor]',
      ) as HTMLElement | null
      if (anchor) {
        clearancePx = Math.max(0, Math.round(anchor.getBoundingClientRect().bottom))
      } else {
        clearancePx = 56
      }
    }
    document.documentElement.style.setProperty('--moh-toast-clearance', `${clearancePx}px`)
  }
  watch([titleBarEl, pinnedBannerEl, hideTopBar, () => route.path], () => {
    nextTick(() => {
      updateTitleBarHeightVar()
      updateToastClearanceVar()
    })
  }, { immediate: true })

  let titleBarRo: ResizeObserver | null = null
  watch(
    [titleBarEl, pinnedBannerEl],
    (elements) => {
      if (!import.meta.client) return
      titleBarRo?.disconnect()
      titleBarRo = null
      const observed = elements.filter((el): el is HTMLElement => el != null)
      if (!observed.length) return
      updateTitleBarHeightVar()
      titleBarRo = new ResizeObserver(() => updateTitleBarHeightVar())
      for (const el of observed) titleBarRo.observe(el)
    },
    { immediate: true },
  )
  onMounted(() => {
    if (!import.meta.client) return
    updateTitleBarHeightVar()
  })
  onBeforeUnmount(() => {
    titleBarRo?.disconnect()
    titleBarRo = null
  })

  // ── Linked scroll: middle + right columns scroll together ─────────────────────
  function onLayoutWheel(e: WheelEvent) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    if (anyOverlayOpen.value) return

    const target = e.target as Node | null
    if (!target) return

    if (leftRailEl.value?.contains(target)) return
    if (rightRailEl.value?.contains(target)) return

    // If the event originates inside a nested scrollable container within the center
    // column (e.g. chat message list, settings panel, admin table), let native scroll
    // handle it rather than intercepting. Walk up from the target until we reach the
    // middle scroller; if any intermediate element is independently scrollable, bail out.
    const middle = middleScrollerEl.value
    if (middle && target instanceof Element) {
      let el: Element | null = target
      while (el && el !== middle) {
        const overflowY = window.getComputedStyle(el).overflowY
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          return
        }
        el = el.parentElement
      }
    }

    e.preventDefault()

    let delta = e.deltaY
    if (e.deltaMode === 1) delta *= 20
    else if (e.deltaMode === 2) delta *= (middleScrollerEl.value?.clientHeight ?? window.innerHeight)

    middleScrollerEl.value?.scrollBy(0, delta)
    rightRailEl.value?.scrollBy(0, delta)
  }

  onMounted(() => {
    layoutViewportEl.value?.addEventListener('wheel', onLayoutWheel, { passive: false })
  })

  onBeforeUnmount(() => {
    layoutViewportEl.value?.removeEventListener('wheel', onLayoutWheel)
  })


  function scrollMiddleToTop() {
    const middle = middleScrollerEl.value
    const right = rightRailEl.value
    if (middle) middle.scrollTo({ top: 0, behavior: 'smooth' })
    if (right) right.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { titleBarEl, pinnedBannerEl, layoutViewportEl, leftRailRef, rightRailRef, scrollMiddleToTop }
}
