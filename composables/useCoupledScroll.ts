import type { Ref } from 'vue'

type Options = {
  middle: Ref<HTMLElement | null>
  right: Ref<HTMLElement | null>
  enabled?: Ref<boolean>
}

export function useCoupledScroll({ middle, right, enabled }: Options) {
  const isEnabled = enabled ?? computed(() => true)

  // Performance note:
  // We avoid intercepting wheel events (passive:false + preventDefault) since this can
  // be very expensive on Safari and blocks native scrolling optimizations.
  // Instead, we let each column scroll natively and mirror scrollTop to the other side
  // on the next animation frame, with loop-avoidance guards.

  let syncingFrom: 'middle' | 'right' | null = null
  let rafId: number | null = null
  let lastSource: 'middle' | 'right' | null = null

  function scheduleSync(source: 'middle' | 'right') {
    if (!import.meta.client) return
    if (!isEnabled.value) return
    const rightEl = right.value
    if (!rightEl || rightEl.clientHeight === 0 || rightEl.offsetParent === null) return

    lastSource = source
    if (rafId != null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      const middleEl = middle.value
      const rightEl2 = right.value
      if (!middleEl || !rightEl2) return
      if (!isEnabled.value) return
      if (rightEl2.clientHeight === 0 || rightEl2.offsetParent === null) return

      if (lastSource === 'middle') {
        syncingFrom = 'middle'
        rightEl2.scrollTop = middleEl.scrollTop
        syncingFrom = null
        return
      }

      syncingFrom = 'right'
      middleEl.scrollTop = rightEl2.scrollTop
      syncingFrom = null
    })
  }

  let middleScrollHandler: (() => void) | null = null
  let rightScrollHandler: (() => void) | null = null

  function bindMiddle(el: HTMLElement) {
    if (middleScrollHandler) return
    middleScrollHandler = () => {
      if (syncingFrom === 'right') return
      scheduleSync('middle')
    }
    el.addEventListener('scroll', middleScrollHandler, { passive: true })
  }

  function unbindMiddle(prev?: HTMLElement | null) {
    const el = prev ?? middle.value
    if (el && middleScrollHandler) el.removeEventListener('scroll', middleScrollHandler)
    middleScrollHandler = null
  }

  function bindRight(el: HTMLElement) {
    if (rightScrollHandler) return
    rightScrollHandler = () => {
      if (syncingFrom === 'middle') return
      scheduleSync('right')
    }
    el.addEventListener('scroll', rightScrollHandler, { passive: true })
  }

  function unbindRight(prev?: HTMLElement | null) {
    const el = prev ?? right.value
    if (el && rightScrollHandler) el.removeEventListener('scroll', rightScrollHandler)
    rightScrollHandler = null
  }

  onMounted(() => {
    if (!import.meta.client) return

    watch(
      () => middle.value,
      (el, prev) => {
        if (prev) unbindMiddle(prev)
        if (el) bindMiddle(el)
      },
      { immediate: true }
    )

    watch(
      () => right.value,
      (el, prev) => {
        if (prev) unbindRight(prev)
        if (el) bindRight(el)
      },
      { immediate: true }
    )
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    unbindMiddle()
    unbindRight()
    if (rafId != null) cancelAnimationFrame(rafId)
    rafId = null
  })
}

