<template>
  <div ref="filterWrapEl">
    <button
      type="button"
      class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:opacity-80"
      :class="filter === 'all' ? 'ring-1 ring-current/40' : ''"
      :style="filterButtonStyle"
      aria-label="Feed filters"
      @click="toggleFilterPopover"
    >
      <Icon :name="sortIconName" class="text-[22px]" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <div
        v-if="filterPopoverOpen"
        ref="filterMenuEl"
        class="fixed z-[9999] w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
        :style="filterMenuStyle"
        role="menu"
        aria-label="Feed filters"
      >
        <template v-if="!hideSort">
          <div class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Order
          </div>
          <button
            type="button"
            class="w-full cursor-pointer text-left px-3 py-2 text-[13px] font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
            role="menuitem"
            @click="setSort('new')"
          >
            <Icon name="tabler:clock" class="text-[15px] opacity-60 shrink-0" aria-hidden="true" />
            <span class="flex-1 text-left">{{ formatSortLabel('new') }}</span>
            <Icon v-if="sort === 'new'" name="tabler:check" class="text-[12px] opacity-60 shrink-0" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="w-full cursor-pointer text-left px-3 py-2 text-[13px] font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
            role="menuitem"
            @click="setSort('trending')"
          >
            <Icon name="tabler:bolt" class="text-[15px] opacity-60 shrink-0" aria-hidden="true" />
            <span class="flex-1 text-left">{{ formatSortLabel('trending') }}</span>
            <Icon v-if="sort === 'trending'" name="tabler:check" class="text-[12px] opacity-60 shrink-0" aria-hidden="true" />
          </button>
        </template>

        <template v-if="showVisibilityFilter">
          <div
            class="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500"
            :class="hideSort ? 'pt-2' : 'pt-3 border-t border-gray-100 dark:border-zinc-900 mt-1'"
          >
            Scope
          </div>
          <button
            type="button"
            class="w-full cursor-pointer text-left px-3 py-2 text-[13px] font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
            role="menuitem"
            @click="setFilter('all')"
          >
            <Icon name="tabler:layout-grid" class="text-[15px] opacity-60 shrink-0" aria-hidden="true" />
            <span class="flex-1 text-left">All</span>
            <Icon v-if="filter === 'all'" name="tabler:check" class="text-[12px] opacity-60 shrink-0" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="w-full cursor-pointer text-left px-3 py-2 text-[13px] font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900 flex items-center gap-2"
            role="menuitem"
            @click="setFilter('public')"
          >
            <Icon name="tabler:world" class="text-[15px] opacity-60 shrink-0" aria-hidden="true" />
            <span class="flex-1 text-left">Public</span>
            <Icon v-if="filter === 'public'" name="tabler:check" class="text-[12px] opacity-60 shrink-0" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="w-full cursor-pointer text-left px-3 py-2 text-[13px] font-semibold transition-colors moh-menuitem-verified flex items-center gap-2"
            role="menuitem"
            @click="setFilter('verifiedOnly')"
          >
            <AppVerifiedBadge status="identity" :premium="false" :show-tooltip="false" />
            <span class="flex-1 text-left">
              Verified
              <span v-if="!viewerIsVerified" class="ml-2 font-mono text-[10px] opacity-70" aria-hidden="true">LOCKED</span>
            </span>
            <Icon v-if="filter === 'verifiedOnly'" name="tabler:check" class="text-[12px] opacity-60 shrink-0" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="w-full cursor-pointer text-left px-3 py-2 text-[13px] font-semibold transition-colors moh-menuitem-premium flex items-center gap-2"
            role="menuitem"
            @click="setFilter('premiumOnly')"
          >
            <AppVerifiedBadge status="identity" :premium="true" :show-tooltip="false" />
            <span class="flex-1 text-left">
              Premium
              <span v-if="!viewerIsPremium" class="ml-2 font-mono text-[10px] opacity-70" aria-hidden="true">LOCKED</span>
            </span>
            <Icon v-if="filter === 'premiumOnly'" name="tabler:check" class="text-[12px] opacity-60 shrink-0" aria-hidden="true" />
          </button>
        </template>

        <div class="h-1.5" />

        <template v-if="isNonDefault">
          <div class="border-t border-gray-100 dark:border-zinc-900 mx-2" />
          <button
            type="button"
            class="w-full cursor-pointer text-left px-3 py-2 text-[13px] font-semibold transition-colors text-gray-400 hover:bg-gray-50 dark:text-zinc-500 dark:hover:bg-zinc-900 flex items-center gap-2"
            role="menuitem"
            @click="clearFilters"
          >
            <Icon name="tabler:x" class="text-[14px] shrink-0" aria-hidden="true" />
            <span>Clear</span>
          </button>
          <div class="h-1" />
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { feedFilterButtonColor, feedFilterButtonBg } from '~/utils/post-visibility'

const props = withDefaults(
  defineProps<{
    sort: 'new' | 'trending'
    filter: ProfilePostsFilter
    viewerIsVerified: boolean
    viewerIsPremium: boolean
    /**
     * Optional noun to include in the sort label (e.g. "reply/replies").
     * When provided, label becomes "Recent reply/replies" or "Trending reply/replies" based on `sortCount`.
     */
    sortNoun?: { singular: string; plural: string }
    /** Optional count used to pick singular vs plural form for `sortNoun`. */
    sortCount?: number | null
    /** When false, hide visibility filter (e.g. for replies that inherit parent post visibility). */
    showVisibilityFilter?: boolean
    /** When true, hide the sort section in the menu (For You, drafts). Icon defaults to clock. */
    hideSort?: boolean
  }>(),
  {
    sortNoun: undefined,
    sortCount: null,
    showVisibilityFilter: true,
    hideSort: false,
  },
)

const emit = defineEmits<{
  (e: 'update:sort', v: 'new' | 'trending'): void
  (e: 'update:filter', v: ProfilePostsFilter): void
}>()

const filterWrapEl = ref<HTMLElement | null>(null)
const filterPopoverOpen = ref(false)

const {
  style: filterMenuStyle,
  menuEl: filterMenuEl,
  place: placeFilterMenu,
  reset: resetFilterMenu,
} = useMenuPosition()

const sort = computed(() => props.sort)
const filter = computed(() => props.filter)
const viewerIsVerified = computed(() => Boolean(props.viewerIsVerified))
const viewerIsPremium = computed(() => Boolean(props.viewerIsPremium))

function formatSortLabel(v: 'new' | 'trending'): string {
  const base = v === 'trending' ? 'Trending' : 'Recent'
  const noun = props.sortNoun
  if (!noun) return base
  const c = props.sortCount
  const word = c === 1 ? noun.singular : noun.plural
  return `${base} ${word}`
}

const effectiveSort = computed(() => (props.hideSort ? 'new' : sort.value))
const sortIconName = computed(() => {
  if (props.hideSort) {
    // For You: show the scope icon instead of sort
    if (filter.value === 'verifiedOnly') return 'tabler:rosette-discount-check'
    if (filter.value === 'premiumOnly') return 'tabler:rosette-discount-check'
    if (filter.value === 'public') return 'tabler:world'
    return 'tabler:layout-grid'
  }
  return effectiveSort.value === 'trending' ? 'tabler:bolt' : 'tabler:clock'
})

const filterButtonStyle = computed(() => ({
  color: feedFilterButtonColor(filter.value),
  background: feedFilterButtonBg(filter.value),
}))

const filterMenuHeight = computed(() => {
  const sortH = props.hideSort ? 0 : 100
  const scopeH = props.showVisibilityFilter ? 188 : 0
  return 16 + sortH + scopeH
})

function closeFilterPopover() {
  filterPopoverOpen.value = false
  resetFilterMenu()
}

function toggleFilterPopover(e: MouseEvent) {
  const next = !filterPopoverOpen.value
  if (next) {
    const btn = e.currentTarget as HTMLElement
    placeFilterMenu(btn, { align: 'end', menuWidth: 208, menuHeight: filterMenuHeight.value })
  } else {
    closeFilterPopover()
    return
  }
  filterPopoverOpen.value = next
}

function setSort(v: 'new' | 'trending') {
  emit('update:sort', v)
  closeFilterPopover()
}

function setFilter(v: ProfilePostsFilter) {
  emit('update:filter', v)
  closeFilterPopover()
}

const isNonDefault = computed(
  () => sort.value !== 'new' || filter.value !== 'all',
)

function clearFilters() {
  if (sort.value !== 'new') emit('update:sort', 'new')
  if (filter.value !== 'all') emit('update:filter', 'all')
  closeFilterPopover()
}

watch(
  filterPopoverOpen,
  (open) => {
    if (!import.meta.client) return
    if (!open) return

    const onPointerDown = (e: Event) => {
      const target = e.target as Node | null
      if (!target) return
      if (filterWrapEl.value && filterWrapEl.value.contains(target)) return
      if (filterMenuEl.value && filterMenuEl.value.contains(target)) return
      closeFilterPopover()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFilterPopover()
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
</script>
