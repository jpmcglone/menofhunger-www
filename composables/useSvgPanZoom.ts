import type { Ref } from 'vue'
import { select, type Selection } from 'd3-selection'
import 'd3-transition'
import { zoom as d3zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom'

export type PanZoomTransform = { x: number; y: number; k: number }

type Options = {
  /** Viewport size in CSS pixels; pan is limited to this box. */
  size: Ref<{ width: number; height: number }>
  maxScale?: number
  /** Fired when a user gesture (not a programmatic zoom) ends. */
  onGestureEnd?: (t: PanZoomTransform) => void
}

/**
 * Wheel/pinch/drag zoom for an SVG viewport. Plain wheel keeps scrolling the page;
 * ctrl/cmd + wheel (and trackpad pinch, which sends ctrl) zooms. One-finger touch
 * only pans once zoomed in, so the map never traps page scrolling on phones.
 */
export function useSvgPanZoom(target: Ref<SVGSVGElement | null>, opts: Options) {
  const transform = ref<PanZoomTransform>({ x: 0, y: 0, k: 1 })
  const maxScale = opts.maxScale ?? 14
  let behavior: ZoomBehavior<SVGSVGElement, unknown> | null = null
  let selection: Selection<SVGSVGElement, unknown, null, undefined> | null = null

  function applyExtent() {
    if (!behavior) return
    const { width, height } = opts.size.value
    behavior.extent([[0, 0], [width, height]]).translateExtent([[0, 0], [width, height]])
  }

  function attach(el: SVGSVGElement) {
    behavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, maxScale])
      .filter((event: Event) => {
        if (event.type === 'wheel') return (event as WheelEvent).ctrlKey || (event as WheelEvent).metaKey
        if (event.type === 'touchstart') return (event as TouchEvent).touches.length > 1 || transform.value.k > 1.01
        if (event.type === 'dblclick') return true
        return !(event as MouseEvent).button && transform.value.k > 1.01
      })
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { x, y, k } = event.transform
        transform.value = { x, y, k }
      })
      .on('end', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (event.sourceEvent) opts.onGestureEnd?.(transform.value)
      })
    selection = select(el)
    applyExtent()
    selection.call(behavior)
  }

  function detach() {
    selection?.on('.zoom', null)
    selection?.interrupt()
    selection = null
    behavior = null
  }

  function zoomTo(t: PanZoomTransform, durationMs = 650) {
    if (!behavior || !selection) {
      transform.value = t
      return
    }
    const next = zoomIdentity.translate(t.x, t.y).scale(t.k)
    const reduceMotion = import.meta.client && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (durationMs <= 0 || reduceMotion) selection.interrupt().call(behavior.transform, next)
    else selection.interrupt().transition().duration(durationMs).call(behavior.transform, next)
  }

  function zoomBy(factor: number) {
    if (!behavior || !selection) return
    selection.interrupt().transition().duration(250).call(behavior.scaleBy, factor)
  }

  function reset(durationMs = 650) {
    zoomTo({ x: 0, y: 0, k: 1 }, durationMs)
  }

  watch(
    target,
    (el, prev) => {
      if (prev) detach()
      if (el) attach(el)
    },
    { immediate: true, flush: 'post' },
  )
  watch(() => opts.size.value, applyExtent, { deep: true })
  onBeforeUnmount(detach)

  return { transform, zoomTo, zoomBy, reset, maxScale }
}
