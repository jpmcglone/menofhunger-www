<template>
  <div class="relative">
    <div
      ref="scrollerEl"
      :class="['overflow-x-auto scroll-smooth', scrollerClass]"
      @scroll.passive="onScroll"
    >
      <slot />
    </div>

    <!-- Overlay paging buttons (for non-trackpad users) -->
    <button
      type="button"
      class="absolute left-1 top-1/2 -translate-y-1/2 z-10 rounded-full border moh-border moh-frosted h-9 w-9 flex items-center justify-center transition-opacity duration-200"
      :class="canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      aria-label="Scroll left"
      @click="pageLeft"
    >
      <Icon name="tabler:chevron-left" class="text-gray-800 dark:text-gray-100" aria-hidden="true" />
    </button>

    <button
      type="button"
      class="absolute right-1 top-1/2 -translate-y-1/2 z-10 rounded-full border moh-border moh-frosted h-9 w-9 flex items-center justify-center transition-opacity duration-200"
      :class="canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      aria-label="Scroll right"
      @click="pageRight"
    >
      <Icon name="tabler:chevron-right" class="text-gray-800 dark:text-gray-100" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Extra classes applied to the scroll container element. */
    scrollerClass?: string
    /** Scroll step as fraction of visible width (default 0.9). */
    pageRatio?: number
  }>(),
  { scrollerClass: '', pageRatio: 0.9 },
)

const scrollerEl = ref<HTMLElement | null>(null)

const canScrollLeft = ref(false)
const canScrollRight = ref(false)

let rafPending = false
function updateScrollState() {
  const el = scrollerEl.value
  if (!el) return
  const maxScrollLeft = el.scrollWidth - el.clientWidth
  const left = el.scrollLeft
  const epsilon = 2

  canScrollLeft.value = left > epsilon
  canScrollRight.value = maxScrollLeft - left > epsilon
}

function scheduleUpdate() {
  if (rafPending) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    updateScrollState()
  })
}

function onScroll() {
  scheduleUpdate()
}

function pageBy(delta: number) {
  const el = scrollerEl.value
  if (!el) return
  const step = Math.max(160, Math.floor(el.clientWidth * props.pageRatio))
  el.scrollBy({ left: delta * step, behavior: 'smooth' })
  // scrollBy is async; update soon to fade buttons appropriately
  scheduleUpdate()
}

function pageLeft() {
  pageBy(-1)
}

function pageRight() {
  pageBy(1)
}

onMounted(() => {
  updateScrollState()

  if (!scrollerEl.value) return
  const el = scrollerEl.value

  let ro: ResizeObserver | null = null
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => scheduleUpdate())
    ro.observe(el)
  } else {
    const onResize = () => scheduleUpdate()
    window.addEventListener('resize', onResize, { passive: true })
    onBeforeUnmount(() => window.removeEventListener('resize', onResize))
  }

  onBeforeUnmount(() => ro?.disconnect())
  // Also update once after DOM paints/slot renders.
  requestAnimationFrame(() => updateScrollState())
})
</script>

