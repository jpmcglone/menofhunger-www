import type { Ref } from 'vue'

type Options = {
  middle: Ref<HTMLElement | null>
  right: Ref<HTMLElement | null>
  enabled?: Ref<boolean>
}

function normalizeWheelDeltaY(e: WheelEvent, container: HTMLElement) {
  // deltaMode: 0=pixel, 1=line, 2=page
  if (e.deltaMode === 1) return e.deltaY * 16
  if (e.deltaMode === 2) return e.deltaY * container.clientHeight
  return e.deltaY
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function useCoupledScroll({ middle, right, enabled }: Options) {
  const isEnabled = enabled ?? computed(() => true)

  // Shared "virtual" scroll position for columns 2 + 3.
  // Each column renders this position clamped to its own scroll range.
  const coupledScrollY = ref(0)

  function onCoupledWheel(e: WheelEvent) {
    const middleEl = middle.value
    const rightEl = right.value
    if (!middleEl || !rightEl) return

    // If disabled (e.g. right rail hidden), don't intercept scrolling.
    if (!isEnabled.value) return
    if (rightEl.clientHeight === 0 || rightEl.offsetParent === null) return

    const dy = normalizeWheelDeltaY(e, middleEl)
    if (dy === 0) return

    // We fully control the scroll so it behaves the same regardless of pointer zone.
    e.preventDefault()

    const maxMiddle = Math.max(0, middleEl.scrollHeight - middleEl.clientHeight)
    const maxRight = Math.max(0, rightEl.scrollHeight - rightEl.clientHeight)
    const maxCoupled = Math.max(maxMiddle, maxRight)

    // Advance shared position (this is the "underlying scroll position").
    coupledScrollY.value = clamp(coupledScrollY.value + dy, 0, maxCoupled)

    // Apply it to each column.
    middleEl.scrollTop = clamp(coupledScrollY.value, 0, maxMiddle)
    rightEl.scrollTop = clamp(coupledScrollY.value, 0, maxRight)
  }

  function onRightScroll() {
    const rightEl = right.value
    if (!rightEl) return
    coupledScrollY.value = Math.max(coupledScrollY.value, rightEl.scrollTop)
  }

  let middleWheelHandler: ((e: WheelEvent) => void) | null = null
  let rightWheelHandler: ((e: WheelEvent) => void) | null = null
  let rightScrollHandler: (() => void) | null = null

  function bindMiddle() {
    const middleEl = middle.value
    if (!middleEl || middleWheelHandler) return

    // Initialize shared position from current scrollTop.
    coupledScrollY.value = middleEl.scrollTop

    middleWheelHandler = (e: WheelEvent) => onCoupledWheel(e)
    middleEl.addEventListener('wheel', middleWheelHandler, { passive: false })
  }

  function unbindMiddle() {
    const middleEl = middle.value
    if (middleEl && middleWheelHandler) {
      middleEl.removeEventListener('wheel', middleWheelHandler)
    }
    middleWheelHandler = null
  }

  function bindRight(el: HTMLElement) {
    if (rightScrollHandler || rightWheelHandler) return

    rightScrollHandler = () => onRightScroll()
    el.addEventListener('scroll', rightScrollHandler, { passive: true })

    rightWheelHandler = (e: WheelEvent) => onCoupledWheel(e)
    el.addEventListener('wheel', rightWheelHandler, { passive: false })
  }

  function unbindRight(prev?: HTMLElement | null) {
    const el = prev ?? right.value
    if (el && rightScrollHandler) el.removeEventListener('scroll', rightScrollHandler)
    if (el && rightWheelHandler) el.removeEventListener('wheel', rightWheelHandler)
    rightScrollHandler = null
    rightWheelHandler = null
  }

  onMounted(() => {
    if (!import.meta.client) return

    bindMiddle()

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
  })
}

