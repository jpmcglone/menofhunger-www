<template>
  <div class="mt-4">
    <!-- Mobile: bleed to edges so the horizontal scroll feels off-screen -->
    <div class="-mx-4 sm:mx-0 relative">
      <!-- Desktop scroll arrows -->
      <button
        v-if="showScrollArrows && canScrollLeft"
        type="button"
        class="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full border moh-border moh-frosted pl-1"
        aria-label="Scroll folders left"
        @click="scrollByAmount(-1)"
      >
        <i class="pi pi-chevron-left text-sm moh-text" aria-hidden="true" />
      </button>
      <button
        v-if="showScrollArrows && canScrollRight"
        type="button"
        class="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full border moh-border moh-frosted pr-1"
        aria-label="Scroll folders right"
        @click="scrollByAmount(1)"
      >
        <i class="pi pi-chevron-right text-sm moh-text" aria-hidden="true" />
      </button>

      <div
        ref="scrollerEl"
        class="flex gap-3 overflow-x-auto no-scrollbar py-1 px-4 sm:px-0"
        @scroll.passive="onScroll"
      >
      <NuxtLink
        to="/bookmarks"
        class="shrink-0 w-20 select-none px-2 py-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-primary-color)] rounded-lg"
        aria-label="All saved bookmarks"
      >
        <div class="flex justify-center">
          <i
            class="pi pi-bookmark text-2xl"
            :class="activeSlug === null ? 'text-[var(--p-primary-color)]' : 'moh-text'"
            aria-hidden="true"
          />
        </div>
        <div
          class="mt-1 text-[11px] font-semibold truncate"
          :class="activeSlug === null ? 'text-[var(--p-primary-color)]' : 'moh-text'"
        >
          All
        </div>
      </NuxtLink>

      <NuxtLink
        to="/bookmarks/unorganized"
        class="shrink-0 w-20 select-none px-2 py-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-primary-color)] rounded-lg"
        aria-label="Unorganized bookmarks"
      >
        <div class="flex justify-center">
          <i
            :class="[
              'text-2xl',
              unorganizedCount > 0 ? 'pi pi-folder' : 'pi pi-folder-open',
              activeSlug === 'unorganized' ? 'text-[var(--p-primary-color)]' : 'moh-text',
            ]"
            aria-hidden="true"
          />
        </div>
        <div
          class="mt-1 text-[11px] font-semibold truncate"
          :class="activeSlug === 'unorganized' ? 'text-[var(--p-primary-color)]' : 'moh-text'"
        >
          Unorganized
        </div>
      </NuxtLink>

      <NuxtLink
        v-for="c in collections"
        :key="c.id"
        :to="`/bookmarks/${encodeURIComponent(c.slug)}`"
        class="shrink-0 w-20 select-none px-2 py-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-primary-color)] rounded-lg"
        :aria-label="`Folder ${c.name}`"
      >
        <div class="flex justify-center">
          <i
            :class="[
              'text-2xl',
              c.bookmarkCount > 0 ? 'pi pi-folder' : 'pi pi-folder-open',
              activeSlug === c.slug ? 'text-[var(--p-primary-color)]' : 'moh-text',
            ]"
            aria-hidden="true"
          />
        </div>
        <div
          class="mt-1 text-[11px] font-semibold truncate"
          :class="activeSlug === c.slug ? 'text-[var(--p-primary-color)]' : 'moh-text'"
        >
          {{ c.name }}
        </div>
      </NuxtLink>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BookmarkCollection } from '~/types/api'
import { nextTick } from 'vue'

const props = defineProps<{
  collections: BookmarkCollection[]
  /** null = All saved page */
  activeSlug: string | null
  unorganizedCount: number
}>()

const scrollerEl = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const showScrollArrows = ref(false)

function computeShowScrollArrows() {
  if (!import.meta.client) return false
  // Desktop-ish input: show arrows even if window is narrow.
  // Hide on touch-first devices.
  try {
    return window.matchMedia('(hover:hover) and (pointer:fine)').matches
  } catch {
    return false
  }
}

function updateScrollAffordances() {
  const el = scrollerEl.value
  if (!el) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }
  const left = el.scrollLeft
  const maxLeft = el.scrollWidth - el.clientWidth
  canScrollLeft.value = left > 1
  canScrollRight.value = maxLeft - left > 1
}

let raf: number | null = null
function onScroll() {
  if (!import.meta.client) return
  if (raf != null) cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    raf = null
    updateScrollAffordances()
  })
}

function scrollByAmount(dir: -1 | 1) {
  const el = scrollerEl.value
  if (!el) return
  const amt = Math.max(160, Math.floor(el.clientWidth * 0.65))
  el.scrollBy({ left: dir * amt, behavior: 'smooth' })
}

let ro: ResizeObserver | null = null
onMounted(async () => {
  if (!import.meta.client) return
  await nextTick()
  showScrollArrows.value = computeShowScrollArrows()
  updateScrollAffordances()
  const el = scrollerEl.value
  if (!el) return
  ro = new ResizeObserver(() => updateScrollAffordances())
  ro.observe(el)
  window.addEventListener(
    'resize',
    () => {
      showScrollArrows.value = computeShowScrollArrows()
      updateScrollAffordances()
    },
    { passive: true },
  )
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (raf != null) cancelAnimationFrame(raf)
  raf = null
  ro?.disconnect()
  ro = null
  window.removeEventListener('resize', updateScrollAffordances)
})

watch(
  () => [props.collections.length, props.unorganizedCount],
  async () => {
    if (!import.meta.client) return
    await nextTick()
    updateScrollAffordances()
  },
)
</script>

