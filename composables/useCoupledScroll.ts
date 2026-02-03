import type { Ref } from 'vue'

type Options = {
  middle: Ref<HTMLElement | null>
  right: Ref<HTMLElement | null>
  enabled?: Ref<boolean>
}

export function useCoupledScroll({ middle, right, enabled }: Options) {
  const isEnabled = enabled ?? computed(() => true)

  // We let each column scroll natively and mirror scrollTop to the other side.
  // When the hovered column hits its bottom but the other has room, we forward wheel
  // events to the other column so both keep advancing (only the hovered one is visually
  // capped; underlying offset continues). We use wheel handlers only in that edge case.

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

      const middleMax = Math.max(0, middleEl.scrollHeight - middleEl.clientHeight)
      const rightMax = Math.max(0, rightEl2.scrollHeight - rightEl2.clientHeight)

      if (lastSource === 'middle') {
        // Middle drove: right follows but clamps at its bottom. When middle scrolls back up,
        // right stays at bottom until middle's scrollTop is back at or below rightMax.
        syncingFrom = 'middle'
        rightEl2.scrollTop = Math.min(middleEl.scrollTop, rightMax)
        syncingFrom = null
        return
      }

      // Right drove: middle follows but clamps at its bottom. Same "remember position" logic.
      syncingFrom = 'right'
      middleEl.scrollTop = Math.min(rightEl2.scrollTop, middleMax)
      syncingFrom = null
    })
  }

  let middleScrollHandler: (() => void) | null = null
  let rightScrollHandler: (() => void) | null = null
  let middleWheelHandler: ((e: WheelEvent) => void) | null = null
  let rightWheelHandler: ((e: WheelEvent) => void) | null = null

  function bindMiddle(el: HTMLElement) {
    if (middleScrollHandler) return
    middleScrollHandler = () => {
      if (syncingFrom === 'right') return
      scheduleSync('middle')
    }
    middleWheelHandler = (e: WheelEvent) => {
      if (!isEnabled.value) return
      const rightEl = right.value
      if (!rightEl || rightEl.clientHeight === 0 || rightEl.offsetParent === null) return
      const middleMax = Math.max(0, el.scrollHeight - el.clientHeight)
      const rightMax = Math.max(0, rightEl.scrollHeight - rightEl.clientHeight)
      // Scrolling down: middle at bottom, right has room → forward to right
      if (e.deltaY > 0 && el.scrollTop >= middleMax - 1 && rightEl.scrollTop < rightMax - 1) {
        e.preventDefault()
        rightEl.scrollTop = Math.min(rightMax, rightEl.scrollTop + e.deltaY)
        return
      }
      // Scrolling up: right past middle's bottom → forward to right so it scrolls back
      if (e.deltaY < 0 && el.scrollTop >= middleMax - 1 && rightEl.scrollTop > middleMax) {
        e.preventDefault()
        rightEl.scrollTop = Math.max(0, rightEl.scrollTop + e.deltaY)
        return
      }
    }
    el.addEventListener('scroll', middleScrollHandler, { passive: true })
    el.addEventListener('wheel', middleWheelHandler, { passive: false })
  }

  function unbindMiddle(prev?: HTMLElement | null) {
    const el = prev ?? middle.value
    if (el) {
      if (middleScrollHandler) el.removeEventListener('scroll', middleScrollHandler)
      if (middleWheelHandler) el.removeEventListener('wheel', middleWheelHandler)
    }
    middleScrollHandler = null
    middleWheelHandler = null
  }

  function bindRight(el: HTMLElement) {
    if (rightScrollHandler) return
    rightScrollHandler = () => {
      if (syncingFrom === 'middle') return
      scheduleSync('right')
    }
    rightWheelHandler = (e: WheelEvent) => {
      if (!isEnabled.value) return
      const middleEl = middle.value
      if (!middleEl || middleEl.clientHeight === 0) return
      const middleMax = Math.max(0, middleEl.scrollHeight - middleEl.clientHeight)
      const rightMax = Math.max(0, el.scrollHeight - el.clientHeight)
      // Scrolling down: right at bottom, middle has room → forward to middle
      if (e.deltaY > 0 && el.scrollTop >= rightMax - 1 && middleEl.scrollTop < middleMax - 1) {
        e.preventDefault()
        middleEl.scrollTop = Math.min(middleMax, middleEl.scrollTop + e.deltaY)
        return
      }
      // Scrolling up: middle past right's bottom → forward to middle so it scrolls back
      if (e.deltaY < 0 && el.scrollTop >= rightMax - 1 && middleEl.scrollTop > rightMax) {
        e.preventDefault()
        middleEl.scrollTop = Math.max(0, middleEl.scrollTop + e.deltaY)
        return
      }
    }
    el.addEventListener('scroll', rightScrollHandler, { passive: true })
    el.addEventListener('wheel', rightWheelHandler, { passive: false })
  }

  function unbindRight(prev?: HTMLElement | null) {
    const el = prev ?? right.value
    if (el) {
      if (rightScrollHandler) el.removeEventListener('scroll', rightScrollHandler)
      if (rightWheelHandler) el.removeEventListener('wheel', rightWheelHandler)
    }
    rightScrollHandler = null
    rightWheelHandler = null
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

