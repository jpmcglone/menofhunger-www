<template>
  <svg
    ref="svgEl"
    :viewBox="viewBox"
    xmlns="http://www.w3.org/2000/svg"
    :class="['block', props.class]"
    aria-hidden="true"
    focusable="false"
  >
    <path ref="pathEl" :d="pathData" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
import usaMap from '@svg-maps/usa.states-territories'

const props = defineProps<{
  /** Two-letter state abbreviation, e.g. "VA" */
  state: string
  class?: string
}>()

const pathEl = ref<SVGPathElement | null>(null)
const viewBox = ref('8 6 920 585')

const pathData = computed(() => {
  const entry = usaMap.locations.find((l) => l.id === props.state.toLowerCase())
  return entry?.path ?? ''
})

function updateViewBox() {
  const el = pathEl.value
  if (!el || !pathData.value) return
  try {
    const { x, y, width, height } = el.getBBox()
    if (width > 0 && height > 0) {
      const pad = Math.max(width, height) * 0.06
      viewBox.value = `${x - pad} ${y - pad} ${width + pad * 2} ${height + pad * 2}`
    }
  } catch {
    // getBBox can fail in some environments; fall back to full map viewBox
  }
}

onMounted(updateViewBox)

watch(pathData, async () => {
  viewBox.value = '8 6 920 585'
  await nextTick()
  updateViewBox()
})
</script>
