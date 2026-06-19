<template>
  <aside
    ref="leftRailEl"
    :class="[
      'hidden md:block shrink-0 h-full border-r moh-border moh-texture overflow-hidden'
    ]"
  >
    <!-- IMPORTANT: no `h-full` + no `overflow-hidden` here, or the rail can't actually scroll -->
    <AppLeftRailContent :compact="compact">
      <div
        ref="leftNavViewportRef"
        :class="[
          'min-h-0 flex-1 no-scrollbar',
          'overflow-hidden',
        ]"
      >
        <div ref="leftNavLogoRef" class="mb-3">
          <NuxtLink
            :to="'/home'"
            :class="[
              'flex items-center moh-focus',
              isAuthed && (user?.premium || (user?.verifiedStatus && user.verifiedStatus !== 'none')) && !compact ? 'gap-1.5' : 'gap-2'
            ]"
            aria-label="Home"
            @click="onHomeClick"
          >
            <div class="flex h-12 w-12 shrink-0 items-center justify-center">
              <AppLogo
                :alt="siteConfig.name"
                :width="48"
                :height="48"
                imgClass="h-12 w-12 rounded"
              />
            </div>
            <span
              v-if="isAuthed && (user?.premiumPlus || user?.premium) && !compact"
              class="hidden xl:inline text-[10px] font-bold tracking-[0.2em] text-[var(--moh-premium)] uppercase"
            >
              {{ user?.premiumPlus ? 'PREMIUM+' : 'PREMIUM' }}
            </span>
            <span
              v-else-if="isAuthed && user?.verifiedStatus && user.verifiedStatus !== 'none' && !compact"
              class="hidden xl:inline text-[10px] font-bold tracking-[0.2em] text-[var(--moh-verified)] uppercase"
            >
              VERIFIED
            </span>
          </NuxtLink>
        </div>

        <nav class="space-y-1 flex-1">
          <template v-for="item in leftVisibleNavItems" :key="item.key">

            <NuxtLink
              :to="item.to"
              :class="[
                // NOTE: Don't use `moh-text` here; it overrides per-item color accents (e.g. Only me).
                'group flex h-12 items-center rounded-xl transition-colors moh-focus',
                // Add breathing room between icon and label (label only shows in wide mode).
                !compact ? 'gap-2' : '',
                'w-full',
                isActiveNav(item.to)
                  ? (item.key === 'only-me' ? 'font-bold' : 'moh-surface font-bold')
                  : 'font-semibold',
                // Default nav tone
                item.key !== 'only-me' ? 'text-gray-900 dark:text-gray-100 moh-surface-hover' : '',
                item.key === 'only-me'
                  ? (isActiveNav(item.to) ? 'moh-nav-onlyme-active' : 'moh-nav-onlyme')
                  : ''
              ]"
              @click="(e) => onLeftNavClick(item.to, e)"
            >
              <span class="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <ClientOnly v-if="item.key === 'bookmarks'">
                  <Icon
                    :name="(hasBookmarks || isActiveNav(item.to)) ? 'tabler:bookmark-filled' : 'tabler:bookmark'"
                    size="28"
                    class="opacity-90"
                    :style="hasBookmarks ? { color: 'var(--p-primary-color)' } : undefined"
                    aria-hidden="true"
                  />
                  <template #fallback>
                    <Icon name="tabler:bookmark" size="28" class="opacity-90" aria-hidden="true" />
                  </template>
                </ClientOnly>
                <Icon
                  v-else
                  :name="isActiveNav(item.to) ? (item.iconActive || item.icon) : item.icon"
                  size="28"
                  :class="['opacity-90', item.iconClass, item.key === 'check-ins' ? '!opacity-100' : '']"
                  :style="item.key === 'check-ins'
                    ? `color: var(--moh-checkin); opacity: ${viewerCrewMembership !== null ? '1' : '0.75'}`
                    : undefined"
                  aria-hidden="true"
                />
                <div
                  v-if="item.key === 'crew' || item.key === 'spaces'"
                  class="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 z-20"
                >
                  <AppNewBadge label="BETA" variant="beta" />
                </div>
                <AppNotificationBadge v-if="item.key === 'notifications'" />
                <AppMessagesBadge v-if="item.key === 'messages'" />
                <AppCrewInvitesBadge v-if="item.key === 'crew'" />
                <AppGroupsBadge v-if="item.key === 'groups'" />
              </span>
              <span
                v-if="!compact"
                :class="[
                  'hidden xl:inline-flex items-center gap-2 whitespace-nowrap overflow-hidden text-lg max-w-[220px]',
                  isActiveNav(item.to) ? 'font-bold' : 'font-semibold'
                ]"
              >
                {{ item.label }}
                <ClientOnly>
                  <span
                    v-if="item.key === 'spaces' && totalLobbyCount > 0"
                    class="text-sm font-medium moh-meta tabular-nums"
                  >({{ totalLobbyCount }})</span>
                  <!-- In a crew: personal streak (orange) + crew streak (green) -->
                  <span
                    v-if="item.key === 'check-ins' && viewerCrewMembership !== null && crewStreakDays !== null"
                    class="inline-flex items-center gap-1.5"
                  >
                    <span class="text-sm font-medium text-orange-500 dark:text-orange-400 tabular-nums">
                      🔥 {{ user?.checkinStreakDays ?? 0 }}d
                    </span>
                    <span class="text-xs moh-text-muted font-normal opacity-50">·</span>
                    <NuxtLink
                      :to="viewerCrewMembership.crewSlug ? `/c/${viewerCrewMembership.crewSlug}` : '/crew'"
                      class="inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums hover:underline"
                      style="color: var(--moh-checkin)"
                      title="Crew streak"
                      @click.stop
                    >
                      <Icon name="tabler:users" size="13" class="shrink-0 opacity-80" aria-hidden="true" />
                      {{ crewStreakDays }}d
                    </NuxtLink>
                  </span>
                  <!-- No crew (or crew streak not yet loaded): just personal streak -->
                  <span
                    v-else-if="item.key === 'check-ins' && (user?.checkinStreakDays ?? 0) > 0"
                    class="text-sm font-medium text-orange-500 dark:text-orange-400 tabular-nums"
                  >{{ user!.checkinStreakDays }}d</span>
                </ClientOnly>
              </span>
            </NuxtLink>

          </template>

          <!-- More button + popover (height overflow from the ordered nav list) -->
          <div v-if="leftOverflowNavItems.length" class="relative">
            <button
              ref="moreButtonRef"
              type="button"
              :class="[
                'group flex h-12 items-center rounded-xl transition-colors moh-focus w-full text-gray-900 dark:text-gray-100 moh-surface-hover',
                !compact ? 'gap-2' : '',
                morePopoverOpen || moreNavHasActiveRoute ? 'moh-surface font-bold' : 'font-semibold',
              ]"
              @click="morePopoverOpen = !morePopoverOpen"
            >
              <span class="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <Icon name="tabler:dots" size="28" class="opacity-90" aria-hidden="true" />
              </span>
              <span
                v-if="!compact"
                class="hidden xl:inline whitespace-nowrap text-lg"
                :class="morePopoverOpen || moreNavHasActiveRoute ? 'font-bold' : 'font-semibold'"
              >
                More
              </span>
            </button>
            <Transition
              enter-active-class="transition-[opacity,transform] duration-150 ease-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition-[opacity,transform] duration-100 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="morePopoverOpen"
                ref="morePopoverRef"
                class="absolute left-0 bottom-full mb-2 z-50 min-w-[12rem] rounded-xl border moh-border bg-white p-1.5 shadow-lg dark:bg-zinc-900"
              >
                <NuxtLink
                  v-for="mi in leftOverflowNavItems"
                  :key="mi.key"
                  :to="mi.to"
                  :class="[
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors moh-focus',
                    mi.key === 'only-me'
                      ? (isActiveNav(mi.to) ? 'moh-nav-onlyme-active font-bold' : 'moh-nav-onlyme')
                      : (isActiveNav(mi.to) ? 'moh-surface font-bold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'),
                  ]"
                  @click="(e) => { morePopoverOpen = false; onLeftNavClick(mi.to, e) }"
                >
                  <span class="relative flex h-6 w-6 shrink-0 items-center justify-center">
                    <ClientOnly v-if="mi.key === 'bookmarks'">
                      <Icon
                        :name="(hasBookmarks || isActiveNav(mi.to)) ? 'tabler:bookmark-filled' : 'tabler:bookmark'"
                        size="22"
                        :style="hasBookmarks ? { color: 'var(--p-primary-color)' } : undefined"
                        aria-hidden="true"
                      />
                      <template #fallback>
                        <Icon name="tabler:bookmark" size="22" aria-hidden="true" />
                      </template>
                    </ClientOnly>
                    <Icon
                      v-else
                      :name="isActiveNav(mi.to) ? (mi.iconActive || mi.icon) : mi.icon"
                      size="22"
                      :class="[mi.iconClass, mi.key === 'check-ins' ? '!opacity-100' : '']"
                      :style="mi.key === 'check-ins'
                        ? `color: var(--moh-checkin); opacity: ${viewerCrewMembership !== null ? '1' : '0.75'}`
                        : undefined"
                      aria-hidden="true"
                    />
                    <AppNotificationBadge v-if="mi.key === 'notifications'" />
                    <AppMessagesBadge v-if="mi.key === 'messages'" />
                    <AppCrewInvitesBadge v-if="mi.key === 'crew'" />
                    <AppGroupsBadge v-if="mi.key === 'groups'" />
                  </span>
                  <span>{{ mi.label }}</span>
                  <ClientOnly>
                    <span
                      v-if="mi.key === 'spaces' && totalLobbyCount > 0"
                      class="ml-auto text-xs font-medium moh-meta tabular-nums"
                    >({{ totalLobbyCount }})</span>
                  </ClientOnly>
                </NuxtLink>
              </div>
            </Transition>
          </div>

          <div ref="leftNavPostRef" class="pt-2">
            <Transition
              enter-active-class="transition-opacity duration-150 ease-out"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition-opacity duration-150 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <button
                v-if="canOpenComposer && isComposerEntrypointRoute"
                type="button"
                aria-label="Post"
                :class="[
                  'moh-pressable group flex h-12 items-center rounded-xl text-white hover:opacity-95 w-full moh-focus',
                  fabButtonClass,
                  'mt-1',
                ]"
                :style="fabButtonStyle"
                @click="openComposerForCurrentRoute()"
              >
                <span class="flex h-12 w-12 shrink-0 items-center justify-center">
                  <Icon name="tabler:plus" size="26" class="opacity-95" aria-hidden="true" />
                </span>
                <span v-if="!compact" class="hidden xl:inline text-base font-semibold">Post</span>
              </button>
            </Transition>
          </div>

        </nav>
      </div>

      <div class="shrink-0 border-t border-black/10 dark:border-white/10 pt-2">
        <ClientOnly>
          <AppUserCard v-if="isAuthed" :compact="compact" />
          <NuxtLink
            v-else
            to="/login"
            aria-label="Log in"
            :class="[
              // Match the Post button shape/style (rounded rect).
              'group flex h-12 items-center rounded-xl bg-black text-white hover:opacity-95 dark:bg-white dark:text-black moh-focus',
              compact ? 'w-12 mx-auto justify-center' : 'w-full',
              'mt-2'
            ]"
          >
            <span class="flex h-12 w-12 shrink-0 items-center justify-center">
              <Icon name="tabler:arrow-right" class="text-[22px] opacity-95" aria-hidden="true" />
            </span>
            <span v-if="!compact" class="hidden xl:inline text-base font-semibold">Log in</span>
          </NuxtLink>
          <template #fallback>
            <div class="mt-2 h-12 w-full" />
          </template>
        </ClientOnly>
      </div>
    </AppLeftRailContent>
  </aside>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import { useBookmarkCollections } from '~/composables/useBookmarkCollections'
import { ClientOnly, NuxtLink } from '#components'
import type { AppNavItem } from '~/composables/useAppNav'
import type { AppLayoutComposerApi } from '~/composables/layout/useAppLayoutComposer'

const props = defineProps<{
  /** Icon-only mode (no labels). */
  compact: boolean
  /** The layout's composer surface (Post button entry point). */
  composer: AppLayoutComposerApi
  /** Scrolls the center column (and right rail) back to the top. */
  scrollMiddleToTop: () => void
}>()

const route = useRoute()
const { isActive: isActiveNav } = useRouteMatch(route)
const { user } = useAuth()
const { membership: viewerCrewMembership } = useViewerCrew()
const { days: crewStreakDays } = useCrewCheckinStreak()
const { isAuthed, primaryItems: primaryNavItems } = useAppNav()
const { totalLobbyCount } = useSpaceLobby()
const { totalCount: bookmarkTotalCount } = useBookmarkCollections()
const hasBookmarks = computed(() => Math.max(0, Math.floor(bookmarkTotalCount.value ?? 0)) > 0)

const {
  canOpenComposer,
  isComposerEntrypointRoute,
  fabButtonClass,
  fabButtonStyle,
  openComposerForCurrentRoute,
} = props.composer

const leftRailEl = ref<HTMLElement | null>(null)
defineExpose({
  /** The rail's root element — the layout uses it for linked-scroll hit testing. */
  el: leftRailEl,
})

// ── Nav capacity: collapse overflow items into the "More" popover ─────────────

const morePopoverOpen = ref(false)
const moreButtonRef = ref<HTMLElement | null>(null)
const morePopoverRef = ref<HTMLElement | null>(null)
const leftNavViewportRef = ref<HTMLElement | null>(null)
const leftNavLogoRef = ref<HTMLElement | null>(null)
const leftNavPostRef = ref<HTMLElement | null>(null)
const leftNavCapacity = ref(99)
const leftRailNavItems = computed(() => primaryNavItems.value.filter((item) => item.menuSection !== 'footer'))
const leftVisibleNavItems = computed<AppNavItem[]>(() => {
  const items = leftRailNavItems.value
  if (items.length <= leftNavCapacity.value) return items
  return items.slice(0, Math.max(0, leftNavCapacity.value - 1))
})
const leftOverflowNavItems = computed<AppNavItem[]>(() => {
  const items = leftRailNavItems.value
  if (items.length <= leftNavCapacity.value) return []
  return items.slice(Math.max(0, leftNavCapacity.value - 1))
})
const moreNavHasActiveRoute = computed(() => leftOverflowNavItems.value.some((item) => isActiveNav(item.to)))

function onDocClickForMore(e: MouseEvent) {
  if (!morePopoverOpen.value) return
  const t = e.target as Node | null
  if (moreButtonRef.value?.contains(t)) return
  if (morePopoverRef.value?.contains(t)) return
  morePopoverOpen.value = false
}

function updateLeftNavCapacity() {
  const viewport = leftNavViewportRef.value
  if (!viewport) return
  const itemHeight = 52 // h-12 plus space-y-1 gap.
  const logoHeight = leftNavLogoRef.value?.offsetHeight ?? 0
  const postHeight = leftNavPostRef.value?.offsetHeight ?? 0
  const available = Math.max(0, viewport.clientHeight - logoHeight - postHeight)
  leftNavCapacity.value = Math.max(1, Math.floor((available + 4) / itemHeight))
}

let leftNavResizeObserver: ResizeObserver | null = null
onMounted(() => {
  document.addEventListener('click', onDocClickForMore, true)
  updateLeftNavCapacity()
  leftNavResizeObserver = new ResizeObserver(() => updateLeftNavCapacity())
  if (leftNavViewportRef.value) leftNavResizeObserver.observe(leftNavViewportRef.value)
  if (leftNavLogoRef.value) leftNavResizeObserver.observe(leftNavLogoRef.value)
  if (leftNavPostRef.value) leftNavResizeObserver.observe(leftNavPostRef.value)
  window.addEventListener('resize', updateLeftNavCapacity)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClickForMore, true)
  window.removeEventListener('resize', updateLeftNavCapacity)
  leftNavResizeObserver?.disconnect()
  leftNavResizeObserver = null
})
watch(
  primaryNavItems,
  () => nextTick(updateLeftNavCapacity),
  { flush: 'post' },
)

// ── Click handlers ────────────────────────────────────────────────────────────

function onHomeClick(e: MouseEvent) {
  if (route.path === '/home') {
    e.preventDefault()
    props.scrollMiddleToTop()
  }
}

function onLeftNavClick(to: string, e: MouseEvent) {
  if (!isActiveNav(to)) return
  e.preventDefault()
  e.stopPropagation()
  if (to === '/home') props.scrollMiddleToTop()
}
</script>
