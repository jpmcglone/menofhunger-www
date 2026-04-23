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

  function compute(anchorEl: HTMLElement, opts: PlaceOptions) {
    const rect = anchorEl.getBoundingClientRect()
    const margin = opts.margin ?? 8
    const gap = opts.gap ?? 4
    const align: Align = opts.align ?? 'start'

    const measured = menuEl.value?.getBoundingClientRect()
    const w = measured?.width || opts.menuWidth || 200
    const h = measured?.height || opts.menuHeight || 200

    let left = align === 'end' ? rect.right - w : rect.left
    if (left + w > window.innerWidth - margin) left = window.innerWidth - w - margin
    if (left < margin) left = margin

    let top = rect.bottom + gap
    if (top + h > window.innerHeight - margin) {
      const flipped = rect.top - h - gap
      if (flipped >= margin) top = flipped
      else top = Math.max(margin, window.innerHeight - h - margin)
    }
    if (top < margin) top = margin

    style.value = { top: `${Math.floor(top)}px`, left: `${Math.floor(left)}px` }
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
    lastAnchor = null
    lastOptions = {}
    style.value = {}
  }

  return { style, menuEl, place, remeasure, reset }
}
