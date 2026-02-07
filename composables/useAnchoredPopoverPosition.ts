import type { CSSProperties, Ref } from 'vue'

type Size = { w: number; h: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Generic “anchored” popover positioning helper.
 * - Measures the element on open
 * - Computes clamped fixed-position style near an anchor point
 */
export function useAnchoredPopoverPosition(params: {
  open: Ref<boolean>
  anchorX: Ref<number>
  anchorY: Ref<number>
  el: Ref<HTMLElement | null>
  defaultWidth: number
  defaultHeight: number
  margin?: number
  offset?: number
}) {
  const measured = ref<Size | null>(null)

  function measure() {
    if (!import.meta.client) return
    const el = params.el.value
    if (!el) return
    const r = el.getBoundingClientRect()
    measured.value = { w: r.width, h: r.height }
  }

  watch(
    () => [params.open.value, params.anchorX.value, params.anchorY.value],
    async () => {
      if (!import.meta.client) return
      if (!params.open.value) return
      await nextTick()
      measure()
    },
    { flush: 'post' },
  )

  const style = computed<CSSProperties>(() => {
    const x = params.anchorX.value
    const y = params.anchorY.value

    const margin = params.margin ?? 8
    const offset = params.offset ?? 8
    const w = measured.value?.w ?? params.defaultWidth
    const h = measured.value?.h ?? params.defaultHeight

    const maxLeft = Math.max(margin, window.innerWidth - w - margin)
    const maxTop = Math.max(margin, window.innerHeight - h - margin)

    const left = clamp(x + offset, margin, maxLeft)
    const top = clamp(y + offset, margin, maxTop)

    return { left: `${Math.floor(left)}px`, top: `${Math.floor(top)}px` }
  })

  return { style, measure, measured }
}

