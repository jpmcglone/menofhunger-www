<template>
  <div
    class="fixed top-0 left-0 right-0 z-[var(--moh-z-chrome)] h-0.5 pointer-events-none"
    aria-hidden="true"
  >
    <div
      class="h-full transition-[width] duration-100 ease-linear"
      :style="{ width: `${progress}%`, backgroundColor: barColor }"
    />
  </div>
</template>

<script setup lang="ts">
import { articleVisibilityAccent } from '~/utils/article-visibility'
const props = withDefaults(defineProps<{
  visibility?: string
  scrollContainerSelector?: string
}>(), {
  scrollContainerSelector: '#moh-middle-scroller',
})

const progress = ref(0)

const barColor = computed(() => articleVisibilityAccent(props.visibility))

let scrollContainer: HTMLElement | null = null

function onScroll() {
  if (!scrollContainer) return

  const scrollTop = scrollContainer.scrollTop
  const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight

  if (scrollHeight <= 0) {
    progress.value = 0
    return
  }

  progress.value = Math.min(100, Math.round((scrollTop / scrollHeight) * 100))
}

onMounted(() => {
  scrollContainer = document.querySelector(props.scrollContainerSelector)
  if (!scrollContainer) scrollContainer = document.documentElement
  scrollContainer.addEventListener('scroll', onScroll, { passive: true })
  requestAnimationFrame(() => {
    requestAnimationFrame(() => onScroll())
  })
})

onBeforeUnmount(() => {
  scrollContainer?.removeEventListener('scroll', onScroll)
})
</script>
