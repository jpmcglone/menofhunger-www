<template>
  <div class="flex items-center gap-2">
    <button
      v-if="showReset"
      type="button"
      class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-gray-50"
      aria-label="Reset feed filters"
      @click="onResetClick"
    >
      <span class="text-[10px] leading-none opacity-75" aria-hidden="true">×</span>
    </button>
    <span v-if="showReset" class="h-6 w-px bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />

    <!-- Order -->
    <div ref="sortWrapEl" class="relative">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold leading-none transition-colors border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-900"
        aria-label="Change feed sort order"
        @click="toggleSortPopover"
      >
        <i :class="sortIconClass" class="text-[10px] opacity-80" aria-hidden="true" />
        <span>{{ sortLabel }}</span>
        <i class="pi pi-chevron-down text-[10px] opacity-70" aria-hidden="true" />
      </button>

      <div
        v-if="sortPopoverOpen"
        class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
        role="menu"
        aria-label="Feed sort"
      >
        <div class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Order
        </div>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
          role="menuitem"
          @click="setSort('new')"
        >
          <i class="pi pi-clock text-[14px] opacity-70 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">Newest</span>
          <i v-if="sort === 'new'" class="pi pi-check text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
          role="menuitem"
          @click="setSort('trending')"
        >
          <i class="pi pi-bolt text-[14px] opacity-70 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">Trending</span>
          <i v-if="sort === 'trending'" class="pi pi-check text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Visibility -->
    <div ref="filterWrapEl" class="relative">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold leading-none transition-colors"
        :class="filterPillClass"
        aria-label="Change feed visibility"
        @click="toggleFilterPopover"
      >
        <template v-if="filter === 'all'">
          <i class="pi pi-th-large text-[10px] opacity-80" aria-hidden="true" />
        </template>
        <template v-else-if="filter === 'public'">
          <i class="pi pi-globe text-[10px] opacity-80" aria-hidden="true" />
        </template>
        <template v-else-if="filter === 'verifiedOnly'">
          <AppVerifiedBadge status="identity" :premium="false" :show-tooltip="false" />
        </template>
        <template v-else-if="filter === 'premiumOnly'">
          <AppVerifiedBadge status="identity" :premium="true" :show-tooltip="false" />
        </template>
        <span>{{ filterLabel }}</span>
        <i class="pi pi-chevron-down text-[10px] opacity-70" aria-hidden="true" />
      </button>

      <div
        v-if="filterPopoverOpen"
        class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
        role="menu"
        aria-label="Feed visibility"
      >
        <div class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Visibility
        </div>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
          role="menuitem"
          @click="setFilter('all')"
        >
          <i class="pi pi-th-large text-[14px] opacity-70 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">All</span>
          <i v-if="filter === 'all'" class="pi pi-check text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
          role="menuitem"
          @click="setFilter('public')"
        >
          <i class="pi pi-globe text-[14px] opacity-70 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">Public</span>
          <i v-if="filter === 'public'" class="pi pi-check text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-sky-700 hover:bg-sky-600 hover:text-white dark:text-sky-300 dark:hover:bg-sky-500 flex items-center gap-2"
          role="menuitem"
          @click="setFilter('verifiedOnly')"
        >
          <AppVerifiedBadge status="identity" :premium="false" :show-tooltip="false" />
          <span class="flex-1 text-left">
            Verified
            <span v-if="!viewerIsVerified" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
          </span>
          <i v-if="filter === 'verifiedOnly'" class="pi pi-check text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-amber-800 hover:bg-amber-600 hover:text-white dark:text-amber-300 dark:hover:bg-amber-500 flex items-center gap-2"
          role="menuitem"
          @click="setFilter('premiumOnly')"
        >
          <AppVerifiedBadge status="identity" :premium="true" :show-tooltip="false" />
          <span class="flex-1 text-left">
            Premium
            <span v-if="!viewerIsPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
          </span>
          <i v-if="filter === 'premiumOnly'" class="pi pi-check text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { filterPillClasses } from '~/utils/post-visibility'

const props = defineProps<{
  sort: 'new' | 'trending'
  filter: ProfilePostsFilter
  viewerIsVerified: boolean
  viewerIsPremium: boolean
  showReset: boolean
}>()

const emit = defineEmits<{
  (e: 'update:sort', v: 'new' | 'trending'): void
  (e: 'update:filter', v: ProfilePostsFilter): void
  (e: 'reset'): void
}>()

const sortWrapEl = ref<HTMLElement | null>(null)
const filterWrapEl = ref<HTMLElement | null>(null)
const sortPopoverOpen = ref(false)
const filterPopoverOpen = ref(false)

const sort = computed(() => props.sort)
const filter = computed(() => props.filter)
const viewerIsVerified = computed(() => Boolean(props.viewerIsVerified))
const viewerIsPremium = computed(() => Boolean(props.viewerIsPremium))

const sortLabel = computed(() => (sort.value === 'trending' ? 'Trending' : 'Newest'))
const sortIconClass = computed(() => (sort.value === 'trending' ? 'pi pi-bolt' : 'pi pi-clock'))

const filterLabel = computed(() => {
  if (filter.value === 'public') return 'Public'
  if (filter.value === 'verifiedOnly') return 'Verified'
  if (filter.value === 'premiumOnly') return 'Premium'
  return 'All'
})

const filterPillClass = computed(() => {
  // Color-coordinate with the selected visibility filter (subtle tint).
  return `${filterPillClasses(filter.value, false)} bg-transparent hover:bg-transparent dark:hover:bg-transparent`
})

function closeSortPopover() {
  sortPopoverOpen.value = false
}
function closeFilterPopover() {
  filterPopoverOpen.value = false
}
function toggleSortPopover() {
  closeFilterPopover()
  sortPopoverOpen.value = !sortPopoverOpen.value
}
function toggleFilterPopover() {
  closeSortPopover()
  filterPopoverOpen.value = !filterPopoverOpen.value
}

function setSort(v: 'new' | 'trending') {
  emit('update:sort', v)
  closeSortPopover()
}
function setFilter(v: ProfilePostsFilter) {
  emit('update:filter', v)
  closeFilterPopover()
}
function onResetClick() {
  emit('reset')
  closeSortPopover()
  closeFilterPopover()
}

function installOutsideClose(openRef: Ref<boolean>, wrapEl: Ref<HTMLElement | null>, close: () => void) {
  watch(
    openRef,
    (open) => {
      if (!import.meta.client) return
      if (!open) return

      const onPointerDown = (e: Event) => {
        const el = wrapEl.value
        const target = e.target as Node | null
        if (!el || !target) return
        if (el.contains(target)) return
        close()
      }
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close()
      }

      window.addEventListener('mousedown', onPointerDown, true)
      window.addEventListener('touchstart', onPointerDown, true)
      window.addEventListener('keydown', onKeyDown)

      return () => {
        window.removeEventListener('mousedown', onPointerDown, true)
        window.removeEventListener('touchstart', onPointerDown, true)
        window.removeEventListener('keydown', onKeyDown)
      }
    },
    { flush: 'post' },
  )
}

installOutsideClose(sortPopoverOpen, sortWrapEl, closeSortPopover)
installOutsideClose(filterPopoverOpen, filterWrapEl, closeFilterPopover)
</script>

