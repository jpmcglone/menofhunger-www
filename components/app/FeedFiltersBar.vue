<template>
  <div class="flex items-center gap-2">
    <button
      v-if="showReset"
      type="button"
      :class="resetButtonClass"
      :style="resetButtonStyle"
      aria-label="Reset feed filters"
      @click="onResetClick"
    >
      <span class="inline-flex h-4 w-4 items-center justify-center text-[14px] font-bold leading-none" aria-hidden="true">×</span>
    </button>
    <span v-if="showReset" class="h-6 w-px bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />

    <!-- Order (sort) -->
    <div ref="sortWrapEl" class="relative">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold leading-none transition-colors border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-900"
        aria-label="Change feed sort order"
        @click="toggleSortPopover"
      >
        <Icon :name="sortIconName" class="text-[10px] opacity-80" aria-hidden="true" />
        <span>{{ sortLabel }}</span>
        <Icon name="tabler:chevron-down" class="text-[10px] opacity-70" aria-hidden="true" />
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
          <Icon name="tabler:clock" class="text-[14px] opacity-70 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">{{ formatSortLabel('new') }}</span>
          <Icon v-if="sort === 'new'" name="tabler:check" class="text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
          role="menuitem"
          @click="setSort('trending')"
        >
          <Icon name="tabler:bolt" class="text-[14px] opacity-70 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">{{ formatSortLabel('trending') }}</span>
          <Icon v-if="sort === 'trending'" name="tabler:check" class="text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Visibility (optional: e.g. replies inherit parent post visibility) -->
    <div v-if="showVisibilityFilter" ref="filterWrapEl" class="relative">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold leading-none transition-colors"
        :class="filterPillClass"
        aria-label="Change feed visibility"
        @click="toggleFilterPopover"
      >
        <template v-if="filter === 'all'">
          <Icon name="tabler:layout-grid" class="text-[10px] opacity-80" aria-hidden="true" />
        </template>
        <template v-else-if="filter === 'public'">
          <Icon name="tabler:globe" class="text-[10px] opacity-80" aria-hidden="true" />
        </template>
        <template v-else-if="filter === 'verifiedOnly'">
          <AppVerifiedBadge status="identity" :premium="false" :show-tooltip="false" />
        </template>
        <template v-else-if="filter === 'premiumOnly'">
          <AppVerifiedBadge status="identity" :premium="true" :show-tooltip="false" />
        </template>
        <span>{{ filterLabel }}</span>
        <Icon name="tabler:chevron-down" class="text-[10px] opacity-70" aria-hidden="true" />
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
          <Icon name="tabler:layout-grid" class="text-[14px] opacity-70 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">All</span>
          <Icon v-if="filter === 'all'" name="tabler:check" class="text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
          role="menuitem"
          @click="setFilter('public')"
        >
          <Icon name="tabler:globe" class="text-[14px] opacity-70 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">Public</span>
          <Icon v-if="filter === 'public'" name="tabler:check" class="text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-verified flex items-center gap-2"
          role="menuitem"
          @click="setFilter('verifiedOnly')"
        >
          <AppVerifiedBadge status="identity" :premium="false" :show-tooltip="false" />
          <span class="flex-1 text-left">
            Verified
            <span v-if="!viewerIsVerified" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
          </span>
          <Icon v-if="filter === 'verifiedOnly'" name="tabler:check" class="text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-premium flex items-center gap-2"
          role="menuitem"
          @click="setFilter('premiumOnly')"
        >
          <AppVerifiedBadge status="identity" :premium="true" :show-tooltip="false" />
          <span class="flex-1 text-left">
            Premium
            <span v-if="!viewerIsPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
          </span>
          <Icon v-if="filter === 'premiumOnly'" name="tabler:check" class="text-[12px] opacity-70 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { filterPillClasses } from '~/utils/post-visibility'

const props = withDefaults(
  defineProps<{
    sort: 'new' | 'trending'
    filter: ProfilePostsFilter
    viewerIsVerified: boolean
    viewerIsPremium: boolean
    showReset: boolean
    /**
     * Optional noun to include in the sort label (e.g. "reply/replies").
     * When provided, label becomes "Newest reply/replies" or "Trending reply/replies" based on `sortCount`.
     */
    sortNoun?: { singular: string; plural: string }
    /** Optional count used to pick singular vs plural form for `sortNoun`. */
    sortCount?: number | null
    /** When false, hide visibility filter (e.g. for replies that inherit parent post visibility). */
    showVisibilityFilter?: boolean
  }>(),
  { showVisibilityFilter: true },
)

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

function formatSortLabel(v: 'new' | 'trending'): string {
  const base = v === 'trending' ? 'Trending' : 'Newest'
  const noun = props.sortNoun
  if (!noun) return base
  const c = props.sortCount
  const word = c === 1 ? noun.singular : noun.plural
  return `${base} ${word}`
}

const sortLabel = computed(() => formatSortLabel(sort.value))
const sortIconName = computed(() => (sort.value === 'trending' ? 'tabler:bolt' : 'tabler:clock'))

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

const resetTone = computed<'normal' | 'verified' | 'premium'>(() => {
  if (filter.value === 'verifiedOnly') return 'verified'
  if (filter.value === 'premiumOnly') return 'premium'
  return 'normal'
})

const resetButtonStyle = computed<Record<string, string> | undefined>(() => {
  if (resetTone.value === 'verified') {
    return { backgroundColor: 'var(--moh-verified)', borderColor: 'var(--moh-verified)' }
  }
  if (resetTone.value === 'premium') {
    // Premium+ is also orange; use the same premium theme color.
    return { backgroundColor: 'var(--moh-premium)', borderColor: 'var(--moh-premium)' }
  }
  return undefined
})

const resetButtonClass = computed(() => {
  const base = 'inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors'
  if (resetTone.value === 'verified' || resetTone.value === 'premium') {
    return `${base} text-white hover:opacity-95`
  }
  // Normal: in dark mode, white background + black text (matches app contrast).
  return `${base} bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100 dark:bg-white dark:text-black dark:border-zinc-800 dark:hover:bg-gray-100`
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

