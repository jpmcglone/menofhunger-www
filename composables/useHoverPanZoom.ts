/**
 * Mouse-follow hover zoom for media previews.
 *
 * Modes:
 * - `contain`: scale the inner image toward the cursor via transform-origin (Y only).
 *   Parent must have overflow-hidden so edges stay clipped (never see past the image).
 * - `frame`: scale + subtly translate the whole frame toward the cursor,
 *   clamped so the frame never slides far enough to show gaps around it.
 *   Pan axes controlled by `panAxes` option ('y' default, 'xy' for single images).
 *
 * Follow is intentionally slow (ease-in-out) so the zoom builds visibly from frame 1.
 * No-ops when prefers-reduced-motion is set, or when the pointer is not fine/hover-capable.
 */

import { useMouseInElement, usePreferredReducedMotion } from '@vueuse/core'
import type { Ref, CSSProperties } from 'vue'

export type HoverPanZoomMode = 'contain' | 'frame'

const FOLLOW_MS = 150
const EXIT_MS = 200

export type UseHoverPanZoomOptions = {
  /** Element that receives mouse tracking (the overflow-hidden container). */
  target: Ref<HTMLElement | null | undefined>
  mode: HoverPanZoomMode
  /** Scale when hovered. Defaults: contain 1.04, frame 1.02 */
  scale?: number
  /** Max translate in px for frame mode (clamped by overflow). Default 4. */
  maxTranslatePx?: number
  /** When false, hover effects are disabled (e.g. gated article). Default true. */
  enabled?: Ref<boolean> | boolean
  /** Axes to pan in frame mode. Default 'y'. Use 'xy' for single-image frames. */
  panAxes?: 'y' | 'xy'
}

export function useHoverPanZoom(options: UseHoverPanZoomOptions) {
  const reducedMotion = usePreferredReducedMotion()
  // VueUse useMediaQuery reads window on first client setup; keep SSR + first
  // paint on the inactive style (`transform: none`) until after hydration.
  const canHover = useHydratedMediaQuery('(hover: hover) and (pointer: fine)')

  const modeRef = computed(() => options.mode)

  const enabledRef = computed(() => {
    const e = options.enabled
    if (typeof e === 'boolean') return e
    if (e) return e.value
    return true
  })

  const active = computed(
    () => enabledRef.value && canHover.value && reducedMotion.value !== 'reduce',
  )

  const { elementX, elementY, elementWidth, elementHeight, isOutside } = useMouseInElement(options.target)

  const scale = computed(() => {
    if (options.scale != null) return options.scale
    return modeRef.value === 'frame' ? 1.02 : 1.04
  })

  const maxTranslate = computed(() => options.maxTranslatePx ?? 4)

  const hovering = computed(() => active.value && !isOutside.value)

  /** Vertical origin % from mouse Y; X stays centered (no horizontal pan). */
  const originYPercent = computed(() => {
    const h = elementHeight.value || 1
    return Math.min(100, Math.max(0, (elementY.value / h) * 100))
  })

  /** Frame-mode translate on a single axis, clamped so scaled overflow covers the container. */
  function frameTranslate(pos: number, size: number): number {
    const s = scale.value
    const overflow = ((s - 1) / 2) * (size || 0)
    const cap = Math.min(maxTranslate.value, Math.max(0, overflow))
    if (cap <= 0) return 0
    const n = ((pos / (size || 1)) * 2 - 1)
    return Math.max(-cap, Math.min(cap, n * cap))
  }

  const style = computed<CSSProperties>(() => {
    if (!active.value) {
      return {
        transform: 'none',
        transformOrigin: 'center center',
        transition: `transform ${EXIT_MS}ms ease-in-out`,
      }
    }

    if (modeRef.value === 'contain') {
      const y = originYPercent.value
      // Transition both scale and origin so the zoom center drifts toward the mouse (Y only).
      const follow = `transform ${FOLLOW_MS}ms ease-in-out, transform-origin ${FOLLOW_MS}ms ease-in-out`
      const exit = `transform ${EXIT_MS}ms ease-in-out, transform-origin ${EXIT_MS}ms ease-in-out`
      return {
        transform: hovering.value ? `scale(${scale.value})` : 'scale(1)',
        transformOrigin: hovering.value ? `50% ${y}%` : '50% 50%',
        transition: hovering.value ? follow : exit,
        willChange: 'transform',
      }
    }

    // frame mode — Y only by default, XY when panAxes === 'xy'
    const useXAxis = options.panAxes === 'xy'
    const tx = useXAxis ? frameTranslate(elementX.value, elementWidth.value) : 0
    const ty = frameTranslate(elementY.value, elementHeight.value)
    const s = scale.value
    return {
      transform: hovering.value
        ? `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s})`
        : 'translate3d(0, 0, 0) scale(1)',
      transformOrigin: 'center center',
      transition: hovering.value
        ? `transform ${FOLLOW_MS}ms ease-in-out`
        : `transform ${EXIT_MS}ms ease-in-out`,
      willChange: 'transform',
    }
  })

  return {
    style,
    hovering,
    active,
  }
}
