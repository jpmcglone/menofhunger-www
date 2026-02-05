export function useChatBubbleShape() {
  const bubbleShapeById = ref<Map<string, 'pill' | 'rect'>>(new Map())
  const bubbleEls = new Map<string, HTMLElement>()
  let bubbleRo: ResizeObserver | null = null

  function computeBubbleShapeFor(id: string, el: HTMLElement) {
    const h = Math.max(0, Math.floor(el.getBoundingClientRect().height))
    const current = bubbleShapeById.value.get(id) ?? 'rect'
    // Heuristics based on current styles:
    // - rect uses p-3 (12px top/bottom) + text-sm (~20px line height) => ~44px for 1 line
    // - 2 lines => ~64px. Use hysteresis to avoid flip-flop near boundary.
    const toPillThreshold = 46
    const toRectThreshold = 54
    const next =
      current === 'pill'
        ? (h > toRectThreshold ? 'rect' : 'pill')
        : (h < toPillThreshold ? 'pill' : 'rect')
    if (next === current) return
    const m = new Map(bubbleShapeById.value)
    m.set(id, next)
    bubbleShapeById.value = m
  }

  function ensureBubbleObserver() {
    if (!import.meta.client) return
    if (bubbleRo) return
    bubbleRo = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        const id = el?.dataset?.mohBubbleId
        if (!id) continue
        computeBubbleShapeFor(id, el)
      }
    })
  }

  function registerBubbleEl(id: string, el: unknown) {
    if (!import.meta.client) return
    const mid = (id ?? '').trim()
    if (!mid) return
    ensureBubbleObserver()
    const prev = bubbleEls.get(mid) ?? null
    if (prev && bubbleRo) {
      bubbleRo.unobserve(prev)
    }
    if (!el || !(el instanceof HTMLElement)) {
      bubbleEls.delete(mid)
      const m = new Map(bubbleShapeById.value)
      m.delete(mid)
      bubbleShapeById.value = m
      return
    }
    const htmlEl = el
    htmlEl.dataset.mohBubbleId = mid
    bubbleEls.set(mid, htmlEl)
    bubbleRo?.observe(htmlEl)
    // Compute once immediately.
    computeBubbleShapeFor(mid, htmlEl)
  }

  function bubbleShapeClass(id: string) {
    const shape = bubbleShapeById.value.get(id) ?? 'rect'
    // Pill should be a bit tighter vertically and more horizontal padding.
    return shape === 'pill' ? 'rounded-full px-4 py-2' : 'rounded-2xl p-3'
  }

  onBeforeUnmount(() => {
    if (bubbleRo) {
      for (const el of bubbleEls.values()) bubbleRo.unobserve(el)
      bubbleEls.clear()
      bubbleRo.disconnect()
      bubbleRo = null
    }
  })

  return {
    bubbleShapeClass,
    registerBubbleEl,
  }
}
