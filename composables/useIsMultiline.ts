import type { Ref } from 'vue'

/**
 * Tracks whether the referenced element renders as more than a single line of
 * text. Used for shape-switching containers (pill ↔ rounded rectangle) that
 * depend on whether their inner text has wrapped.
 *
 * Compares the element's content height against its computed `line-height`
 * after mount and on any size/content mutation. Always `false` on the server
 * (height-based measurement requires a real DOM).
 */
export function useIsMultiline(elRef: Ref<HTMLElement | null>) {
  const isMultiline = ref(false)

  let ro: ResizeObserver | null = null
  let mo: MutationObserver | null = null

  function getLineHeightPx(el: HTMLElement): number {
    const cs = getComputedStyle(el)
    const lh = cs.lineHeight
    if (lh === 'normal') {
      const fs = parseFloat(cs.fontSize) || 14
      return fs * 1.2
    }
    return parseFloat(lh) || 18
  }

  function measure() {
    const el = elRef.value
    if (!el) {
      isMultiline.value = false
      return
    }
    const h = el.getBoundingClientRect().height
    if (h <= 0) return
    const lhPx = getLineHeightPx(el)
    // Allow a 1px slack for sub-pixel rounding so we don't flip between
    // states on every layout pass.
    isMultiline.value = h > lhPx + 1
  }

  function detach() {
    ro?.disconnect()
    ro = null
    mo?.disconnect()
    mo = null
  }

  function attach(el: HTMLElement | null) {
    detach()
    if (!el) return
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure())
      ro.observe(el)
    }
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(() => measure())
      mo.observe(el, { characterData: true, childList: true, subtree: true })
    }
    void nextTick(measure)
  }

  if (import.meta.client) {
    onMounted(() => attach(elRef.value))
    watch(elRef, (el) => attach(el))
    onBeforeUnmount(detach)
  }

  return { isMultiline }
}
