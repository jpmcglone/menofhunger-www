import type { CSSProperties } from 'vue'

type Align = 'start' | 'end'

export interface PlaceOptions {
  /**
   * Horizontal alignment relative to the anchor.
   * - 'start' (default): align menu's left edge with anchor's left edge
   * - 'end': align menu's right edge with anchor's right edge
   */
  align?: Align
  /** Estimated menu width in px (used before measurement). */
  menuWidth?: number
  /** Estimated menu height in px (used before measurement). */
  menuHeight?: number
  /** Viewport edge margin in px. Default 8. */
  margin?: number
  /** Gap between anchor and menu in px. Default 4. */
  gap?: number
  /** Stretch the menu to the anchor's width (search, typeahead). */
  matchAnchorWidth?: boolean
  /** Cap height so long lists scroll instead of overflowing the viewport. */
  maxHeight?: number
  /** Reposition on resize/scroll until `reset()`. */
  trackViewport?: boolean
}

/**
 * Position helper for click-triggered drop-down menus.
 *
 * Produces fixed-position `top`/`left` style values relative to the
 * viewport, with full 2D clamping and an above-flip when there is not
 * enough room below the anchor.
 *
 * Pair with `Teleport to="body"` + `position: fixed` so the menu always
 * escapes containers and stays inside the viewport.
 */
export function useMenuPosition() {
  const style = ref<CSSProperties>({})
  const menuEl = ref<HTMLElement | null>(null)
  let lastAnchor: HTMLElement | null = null
  let lastOptions: PlaceOptions = {}
  let tracking = false

  function setTracking(on: boolean) {
    if (!import.meta.client || on === tracking) return
    tracking = on
    if (on) {
      window.addEventListener('resize', remeasure)
      window.addEventListener('scroll', remeasure, true)
    } else {
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('scroll', remeasure, true)
    }
  }

  function compute(anchorEl: HTMLElement, opts: PlaceOptions) {
    const rect = anchorEl.getBoundingClientRect()
    const margin = opts.margin ?? 8
    const gap = opts.gap ?? 4
    const align: Align = opts.align ?? 'start'

    const measured = menuEl.value?.getBoundingClientRect()
    const w = opts.matchAnchorWidth
      ? rect.width
      : (measured?.width || opts.menuWidth || 200)
    const rawH = measured?.height || opts.menuHeight || 200
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin
    const spaceAbove = rect.top - gap - margin
    const openDown = spaceBelow >= Math.min(rawH, opts.maxHeight ?? rawH) || spaceBelow >= spaceAbove
    const available = Math.max(96, openDown ? spaceBelow : spaceAbove)
    const maxH = opts.maxHeight != null ? Math.min(opts.maxHeight, available) : available
    const h = Math.min(rawH, maxH)

    let left = align === 'end' ? rect.right - w : rect.left
    if (left + w > window.innerWidth - margin) left = window.innerWidth - w - margin
    if (left < margin) left = margin

    let top = openDown ? rect.bottom + gap : rect.top - h - gap
    if (top < margin) top = margin
    if (top + h > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - h - margin)
    }

    const next: CSSProperties = {
      top: `${Math.floor(top)}px`,
      left: `${Math.floor(left)}px`,
    }
    if (opts.matchAnchorWidth) next.width = `${Math.floor(w)}px`
    if (opts.maxHeight != null) next.maxHeight = `${Math.floor(maxH)}px`
    style.value = next
  }

  /**
   * Position the menu near the given anchor element. Call this when the
   * menu opens. After the menu mounts, call `remeasure()` (or pass the
   * `menuEl` ref) so the position can refine using the actual size.
   */
  function place(anchorEl: HTMLElement, opts: PlaceOptions = {}) {
    if (!import.meta.client) return
    lastAnchor = anchorEl
    lastOptions = opts
    setTracking(Boolean(opts.trackViewport))
    compute(anchorEl, opts)
    nextTick(() => {
      if (!lastAnchor) return
      compute(lastAnchor, lastOptions)
    })
  }

  /** Recompute using the most recent anchor + options (e.g., on resize). */
  function remeasure() {
    if (!import.meta.client) return
    if (!lastAnchor) return
    compute(lastAnchor, lastOptions)
  }

  function reset() {
    setTracking(false)
    lastAnchor = null
    lastOptions = {}
    style.value = {}
  }

  return { style, menuEl, place, remeasure, reset }
}
