<template>
  <svg
    ref="svgEl"
    viewBox="0 0 300 60"
    preserveAspectRatio="none"
    class="w-full h-14 cursor-crosshair select-none touch-none"
    role="img"
    :aria-label="chartLabel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="clearHover"
    @pointerleave="clearHover"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.25" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path :d="areaPath" :fill="`url(#${gradientId})`" />
    <path
      :d="linePath"
      fill="none"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <template v-if="activePoint">
      <line
        :x1="activePoint.x"
        :x2="activePoint.x"
        y1="0"
        y2="60"
        :stroke="color"
        stroke-opacity="0.28"
        stroke-width="1"
      />
      <circle :cx="activePoint.x" :cy="activePoint.y" r="4" :fill="color" />
    </template>
    <circle
      v-else-if="latestPoint"
      :cx="latestPoint.x"
      :cy="latestPoint.y"
      r="3"
      :fill="color"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { nearestPointIndex } from '~/utils/fitness-chart'

const VIEW_W = 300

const props = defineProps<{
  points: { x: number; y: number }[]
  linePath: string
  areaPath: string
  color: string
  gradientId: string
  chartLabel: string
}>()

const emit = defineEmits<{
  hover: [index: number | null]
}>()

const svgEl = ref<SVGSVGElement | null>(null)
const hoverIndex = ref<number | null>(null)

const activePoint = computed(() => {
  if (hoverIndex.value == null) return null
  return props.points[hoverIndex.value] ?? null
})

const latestPoint = computed(() => props.points.at(-1) ?? null)

function indexAtClientX(clientX: number): number | null {
  const el = svgEl.value
  if (!el || props.points.length === 0) return null
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0) return null
  const x = ((clientX - rect.left) / rect.width) * VIEW_W
  return nearestPointIndex(props.points.map((p) => p.x), x)
}

function setHover(index: number | null) {
  hoverIndex.value = index
  emit('hover', index)
}

function onPointerDown(e: PointerEvent) {
  svgEl.value?.setPointerCapture(e.pointerId)
  setHover(indexAtClientX(e.clientX))
}

function onPointerMove(e: PointerEvent) {
  setHover(indexAtClientX(e.clientX))
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') setHover(null)
}

function clearHover() {
  setHover(null)
}
</script>
