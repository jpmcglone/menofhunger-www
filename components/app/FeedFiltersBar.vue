<template>
  <div ref="filterWrapEl" class="inline-flex shrink-0 items-center py-1">
    <button ref="triggerEl" type="button" class="filter-trigger" :class="{ 'is-active': isNonDefault, 'is-open': filterPopoverOpen }" :aria-label="`Feed filters: ${summary}`" :aria-controls="filterPopoverOpen ? menuId : undefined" aria-haspopup="menu" :aria-expanded="filterPopoverOpen" @click="toggleFilterPopover">
      <Icon name="tabler:adjustments-horizontal" class="size-[18px] shrink-0" aria-hidden="true" />
      <span>{{ showVisibilityFilter ? 'Filters' : effectiveSort === 'trending' ? 'Trending' : 'Recent' }}</span>
      <span v-if="activeCount" class="filter-count" aria-hidden="true">{{ activeCount }}</span>
      <Icon v-else name="tabler:chevron-down" class="size-3" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <div v-if="filterPopoverOpen" :id="menuId" ref="filterMenuEl" class="filter-menu" :style="filterMenuStyle" role="menu" aria-label="Feed filters" @keydown="onMenuKey">
        <div class="filter-menu-title">Feed filters</div>
        <template v-if="!hideSort">
          <p class="filter-section-label">Order</p>
          <button v-for="order in (['new', 'trending'] as const)" :key="order" type="button" class="filter-option" role="menuitemradio" :aria-checked="sort === order" @click="setSort(order)">
            <Icon :name="order === 'new' ? 'tabler:clock' : 'tabler:trending-up'" class="filter-option-icon" aria-hidden="true" />
            <span class="flex-1">{{ formatSortLabel(order) }}</span>
            <Icon v-if="sort === order" name="tabler:check" class="size-4" aria-hidden="true" />
          </button>
        </template>
        <template v-if="showVisibilityFilter">
          <p class="filter-section-label" :class="{ 'filter-divider': !hideSort }">Scope</p>
          <button v-for="option in scopeOptions" :key="option.value" type="button" class="filter-option" role="menuitemradio" :aria-checked="filter === option.value" @click="setFilter(option.value)">
            <Icon :name="option.icon" class="filter-option-icon" :class="{ 'scope-verified': option.value === 'verifiedOnly', 'scope-premium': option.value === 'premiumOnly' }" aria-hidden="true" />
            <span class="min-w-0 flex-1"><span class="block">{{ option.title }}</span><span class="filter-hint">{{ option.hint }}</span></span>
            <Icon v-if="filter === option.value" name="tabler:check" class="size-4" aria-hidden="true" />
            <Icon v-else-if="option.locked" name="tabler:lock" class="size-4 moh-text-muted" aria-hidden="true" />
          </button>
        </template>
        <button v-if="isNonDefault" type="button" class="filter-reset" role="menuitem" @click="clearFilters"><Icon name="tabler:rotate-clockwise" class="size-4" aria-hidden="true" /> Reset filters</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { ProfilePostsFilter } from '~/utils/post-visibility'


const props = withDefaults(
  defineProps<{
    label?: string
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
    label: undefined,
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
const triggerEl = ref<HTMLButtonElement | null>(null)
const menuId = useId()
const activeCount = computed(() => Number(!props.hideSort && sort.value !== 'new') + Number(props.showVisibilityFilter && filter.value !== 'all'))
const scopeOptions = computed(() => [
  { value: 'all', title: 'All', hint: 'Every post you can access', icon: 'tabler:layout-grid', locked: false },
  { value: 'public', title: 'Public', hint: 'Posts shared with everyone', icon: 'tabler:world', locked: false },
  { value: 'verifiedOnly', title: 'Verified', hint: viewerIsVerified.value ? 'Posts for verified members' : 'Verification required', icon: 'tabler:circle-check-filled', locked: !viewerIsVerified.value },
  { value: 'premiumOnly', title: 'Premium', hint: viewerIsPremium.value ? 'Posts for premium members' : 'Premium membership required', icon: 'tabler:rosette-discount-check', locked: !viewerIsPremium.value },
] as const)
const summary = computed(() => [!props.hideSort ? formatSortLabel(effectiveSort.value) : '', props.showVisibilityFilter ? scopeOptions.value.find(o => o.value === filter.value)?.title ?? filter.value : ''].filter(Boolean).join(', '))
const filterMenuHeight = computed(() => 72 + (props.hideSort ? 0 : 140) + (props.showVisibilityFilter ? 292 : 0) + (activeCount.value ? 52 : 0))

function focusOption(direction: number) {
  const items = Array.from(filterMenuEl.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
  const current = items.findIndex(item => item === document.activeElement)
  items[(current + direction + items.length) % items.length]?.focus({ preventScroll: true })
}
function onMenuKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    focusOption(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    const items = filterMenuEl.value?.querySelectorAll<HTMLButtonElement>('button')
    items?.[event.key === 'Home' ? 0 : items.length - 1]?.focus({ preventScroll: true })
  } else if (event.key === 'Tab') closeFilterPopover(false)
}

function closeFilterPopover(restoreFocus = true) {
  filterPopoverOpen.value = false
  resetFilterMenu()
  if (restoreFocus) triggerEl.value?.focus({ preventScroll: true })
}

function toggleFilterPopover(e: MouseEvent) {
  const next = !filterPopoverOpen.value
  if (next) {
    const btn = e.currentTarget as HTMLElement
    placeFilterMenu(btn, { align: 'end', menuWidth: 288, menuHeight: filterMenuHeight.value })
  } else {
    closeFilterPopover()
    return
  }
  filterPopoverOpen.value = next
  if (next) void nextTick(() => filterMenuEl.value?.querySelector<HTMLButtonElement>('button[aria-checked="true"], button')?.focus({ preventScroll: true }))
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
  () => activeCount.value > 0,
)

function clearFilters() {
  if (!props.hideSort && sort.value !== 'new') emit('update:sort', 'new')
  if (props.showVisibilityFilter && filter.value !== 'all') emit('update:filter', 'all')
  closeFilterPopover()
}

watch(
  filterPopoverOpen,
  (open, _previous, onCleanup) => {
    if (!import.meta.client) return
    if (!open) return

    const onPointerDown = (e: Event) => {
      const target = e.target as Node | null
      if (!target) return
      if (filterWrapEl.value && filterWrapEl.value.contains(target)) return
      if (filterMenuEl.value && filterMenuEl.value.contains(target)) return
      closeFilterPopover(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFilterPopover()
    }

    window.addEventListener('mousedown', onPointerDown, true)
    window.addEventListener('touchstart', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)

    onCleanup(() => {
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('touchstart', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    })
  },
  { flush: 'post' },
)
</script>

<style scoped>
.filter-trigger { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 36px; padding: 0 10px; border: 1px solid var(--moh-border); border-radius: 10px; font-size: 12px; font-weight: 600; color: var(--moh-text-muted); background: var(--moh-bg); cursor: pointer; }
.filter-trigger::before { content: ""; position: absolute; inset: -4px 0; }
.filter-trigger:hover, .filter-trigger.is-open { background: var(--moh-surface-2); color: var(--moh-text); }
.filter-trigger.is-active { color: var(--moh-text); }
.filter-count { display: grid; place-items: center; min-width: 20px; height: 20px; border-radius: 50%; background: var(--moh-text); color: var(--moh-bg); font-size: 11px; }
.filter-menu { position: fixed; z-index: 9999; width: 288px; max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); overflow-y: auto; padding: 8px; border-radius: 20px; border: 1px solid var(--moh-border); background: var(--moh-bg); color: var(--moh-text); box-shadow: 0 16px 48px #0003; }
.filter-menu-title { padding: 12px 12px 16px; font-size: 17px; font-weight: 600; }
.filter-section-label { padding: 8px 12px; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--moh-text-muted); }
.filter-divider { border-top: 1px solid var(--moh-border); margin-top: 8px; padding-top: 16px; }
.filter-option { display: flex; align-items: center; gap: 12px; min-height: 48px; width: 100%; padding: 12px; border-radius: 12px; text-align: left; font-size: 15px; font-weight: 600; cursor: pointer; }
.filter-option[aria-checked=true] { background: var(--moh-surface-2); }
.filter-option:hover { background: var(--moh-surface); }
.filter-option-icon { width: 20px; height: 20px; flex-shrink: 0; color: var(--moh-text-muted); }
.filter-hint { display: block; margin-top: 3px; font-size: 12px; line-height: 18px; font-weight: 400; color: var(--moh-text-muted); }
.scope-verified { color: var(--moh-verified); }
.scope-premium { color: var(--moh-premium); }
.filter-reset { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 48px; padding: 12px; margin-top: 8px; border-top: 1px solid var(--moh-border); font-size: 13px; font-weight: 600; color: var(--moh-text-muted); cursor: pointer; }
button:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: -2px; }
</style>
