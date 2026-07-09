<template>
  <!--
    Mouse-follow hover zoom wrapper.
    - contain: overflow-hidden container; transform applied to inner (image) via slot prop
    - frame: transform applied to this root (subtle scale + pan of the whole box)
  -->
  <div
    ref="rootEl"
    :class="rootClass"
    :style="rootMergedStyle"
  >
    <slot :style="mode === 'contain' ? zoomStyle : undefined" :hovering="hovering" />
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useHoverPanZoom, type HoverPanZoomMode } from '~/composables/useHoverPanZoom'

const props = withDefaults(
  defineProps<{
    mode: HoverPanZoomMode
    enabled?: boolean
    scale?: number
    maxTranslatePx?: number
    rootClass?: string
    /** Extra styles merged onto the root (e.g. sizing). Frame-mode transform wins on conflict. */
    rootStyle?: CSSProperties | CSSProperties[]
    /** Axes to pan in frame mode. Default 'y'. Use 'xy' for single-image frames. */
    panAxes?: 'y' | 'xy'
  }>(),
  {
    enabled: true,
    scale: undefined,
    maxTranslatePx: undefined,
    rootClass: '',
    rootStyle: undefined,
    panAxes: undefined,
  },
)

const rootEl = ref<HTMLElement | null>(null)
const enabledRef = computed(() => props.enabled)

const { style: zoomStyle, hovering } = useHoverPanZoom({
  target: rootEl,
  mode: props.mode,
  scale: props.scale,
  maxTranslatePx: props.maxTranslatePx,
  enabled: enabledRef,
  panAxes: props.panAxes,
})

const rootMergedStyle = computed<CSSProperties>(() => {
  // Default to relative so the element establishes a stacking/positioning context.
  // Callers can override via rootStyle (inline styles beat CSS class specificity).
  const base: CSSProperties = { position: 'relative' }
  const extra = props.rootStyle
  if (Array.isArray(extra)) {
    for (const s of extra) Object.assign(base, s)
  } else if (extra) {
    Object.assign(base, extra)
  }
  if (props.mode === 'frame') Object.assign(base, zoomStyle.value)
  return base
})
</script>
