<template>
  <nav
    class="border-t moh-border moh-surface-1 moh-texture"
    style="min-height: calc(var(--moh-tabbar-height, 4.5rem) + var(--moh-safe-bottom, 0px)); padding-bottom: var(--moh-safe-bottom, 0px);"
    aria-label="Primary"
  >
    <AppTabBarContent>
      <div class="grid h-full w-full grid-flow-col auto-cols-fr">
        <template v-for="item in items" :key="item.key">
          <button
            v-if="item.key === 'more'"
            type="button"
            class="flex h-full w-full flex-col items-center justify-center touch-manipulation transition-transform duration-100 active:scale-[0.98] moh-focus"
            :class="moreOpen ? 'moh-text' : 'moh-text-muted'"
            aria-label="More"
            @click="() => { haptics.tap(); moreOpen = true }"
          >
            <div class="relative h-10 w-10 flex items-center justify-center">
              <Icon :name="item.icon" size="24" class="opacity-90" aria-hidden="true" />
            </div>
          </button>

          <NuxtLink
            v-else
            :to="item.to"
            class="flex h-full w-full flex-col items-center justify-center touch-manipulation transition-transform duration-100 active:scale-[0.98] moh-focus"
            :class="isActive(item.to) ? 'moh-text' : 'moh-text-muted'"
            @click="(e) => { haptics.tap(); onNavClick(item.to, e) }"
          >
            <div class="relative h-10 w-10 flex items-center justify-center">
              <Icon
                :name="isActive(item.to) ? (item.iconActive || item.icon) : item.icon"
                size="24"
                :class="['opacity-90', item.iconClass]"
                aria-hidden="true"
              />
              <AppNotificationBadge v-if="item.key === 'notifications'" />
              <AppMessagesBadge v-if="item.key === 'messages'" />
            </div>
          </NuxtLink>
        </template>
      </div>
    </AppTabBarContent>
  </nav>

  <ClientOnly>
  <AppBottomSheet
    v-if="isMobileHydrated"
    v-model="moreOpen"
    title="More"
    :panel-class="'inset-x-0 bottom-0 max-w-none rounded-t-2xl shadow-2xl moh-bg moh-text moh-texture border-t moh-border min-h-[min(28rem,60vh)]'"
    :content-class="'px-0 pb-0 pt-2 min-h-0 flex-1 flex flex-col'"
  >
    <div class="w-full min-h-[12rem] flex flex-col">

      <!-- User identity header -->
      <NuxtLink
        v-if="moreUser"
        :to="moreUser.username ? `/u/${moreUser.username}` : '/settings'"
        class="moh-tap flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-zinc-700 moh-surface-hover"
        @click="() => { moreOpen = false }"
      >
        <AppUserAvatar
          :user="moreUser"
          size-class="h-12 w-12 shrink-0"
          :enable-preview="false"
        />
        <div class="min-w-0 flex-1">
          <AppUserIdentityLine
            :user="moreUser as any"
            name-class="text-base font-bold"
            handle-class="text-sm text-gray-500 dark:text-gray-400"
          />
          <!-- Stats: coins + streak -->
          <div v-if="moreHasStats" class="mt-1 flex items-center gap-3">
            <NuxtLink
              v-if="canUseCoins && (moreUser.coins ?? 0) > 0"
              to="/coins"
              class="flex items-center gap-1 text-xs font-medium text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors tabular-nums"
              @click.stop
            >
              <Icon name="tabler:coin" size="13" aria-hidden="true" />
              {{ moreUser.coins!.toLocaleString() }} coins
            </NuxtLink>
            <span v-if="(moreUser.checkinStreakDays ?? 0) > 0" class="flex items-center gap-1 text-xs font-medium text-orange-500 dark:text-orange-400 tabular-nums">
              <Icon name="tabler:flame" size="13" aria-hidden="true" />
              {{ moreUser.checkinStreakDays }}d streak
            </span>
          </div>
        </div>
        <Icon name="tabler:chevron-right" size="16" class="shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      </NuxtLink>

      <div class="flex flex-col">
        <template v-for="mi in mainMenuItems" :key="mi.key">

          <NuxtLink
            :to="mi.to"
            class="moh-tap flex w-full items-center justify-between gap-3 px-5 py-4 moh-focus"
            :class="[
              mi.key === 'only-me' ? 'moh-menuitem-onlyme' : 'text-gray-900 dark:text-gray-100',
              mi.key !== 'only-me' ? 'moh-surface-hover' : '',
              isActive(mi.to) ? (mi.key === 'only-me' ? 'moh-nav-onlyme-active' : 'moh-surface font-bold') : '',
            ]"
            @click="() => { moreOpen = false }"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative h-10 w-10 shrink-0 flex items-center justify-center">
                <Icon
                  :name="moreMenuIconName(mi)"
                  size="20"
                  :class="['opacity-90', mi.iconClass]"
                  aria-hidden="true"
                />
                <div
                  v-if="mi.key === 'articles'"
                  class="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 z-20"
                >
                  <AppNewBadge small />
                </div>
              </div>
              <div class="min-w-0">
                <div class="text-sm font-semibold truncate">
                  {{ mi.label }}
                </div>
              </div>
            </div>
          </NuxtLink>

        </template>
      </div>

      <div class="mt-1 border-t border-gray-200 dark:border-zinc-700 pt-2 pb-3 px-5 flex flex-col gap-0.5">
        <NuxtLink
          v-if="moreUser && canUseCoins"
          to="/coins"
          class="moh-tap flex w-full items-center justify-between gap-2 py-2 moh-focus rounded-lg px-2 -mx-1"
          :class="[
            isActive('/coins')
              ? 'moh-surface font-semibold text-gray-900 dark:text-gray-100'
              : 'moh-surface-hover text-gray-600 dark:text-gray-400',
          ]"
          @click="() => { moreOpen = false }"
        >
          <div class="flex items-center gap-2 min-w-0">
            <Icon
              name="tabler:coin"
              size="16"
              class="opacity-80 shrink-0"
              aria-hidden="true"
            />
            <span class="text-xs font-medium truncate">Coins</span>
          </div>
        </NuxtLink>

        <NuxtLink
          v-for="mi in footerMenuItems"
          :key="mi.key"
          :to="mi.to"
          class="moh-tap flex w-full items-center justify-between gap-2 py-2 moh-focus rounded-lg px-2 -mx-1"
          :class="[
            isActive(mi.to)
              ? 'moh-surface font-semibold text-gray-900 dark:text-gray-100'
              : 'moh-surface-hover text-gray-600 dark:text-gray-400',
          ]"
          @click="() => { moreOpen = false }"
        >
          <div class="flex items-center gap-2 min-w-0">
            <Icon
              :name="moreMenuIconName(mi)"
              size="16"
              class="opacity-80 shrink-0"
              aria-hidden="true"
            />
            <span class="text-xs font-medium truncate">{{ mi.label }}</span>
          </div>
        </NuxtLink>

        <button
          type="button"
          class="moh-tap flex w-full items-center gap-2 py-2 moh-focus rounded-lg px-2 -mx-1 moh-surface-hover text-gray-600 dark:text-gray-400"
          @click="() => { moreOpen = false; openShortcutsModal() }"
        >
          <Icon name="tabler:keyboard" size="16" class="opacity-80 shrink-0" aria-hidden="true" />
          <span class="text-xs font-medium">Keyboard shortcuts</span>
          <span class="ml-auto text-[10px] font-mono opacity-50">?</span>
        </button>
      </div>

      <!-- Sign out -->
      <div v-if="moreUser" class="border-t border-gray-200 dark:border-zinc-700 px-5 pt-2 pb-1">
        <button
          type="button"
          class="moh-tap flex w-full items-center gap-2 py-2.5 moh-focus rounded-lg px-2 -mx-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
          @click="() => { moreOpen = false; requestLogout() }"
        >
          <Icon name="tabler:door-exit" size="16" class="shrink-0" aria-hidden="true" />
          <span class="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </div>
  </AppBottomSheet>
  </ClientOnly>

</template>

<script setup lang="ts">
import type { AppNavItem } from '~/composables/useAppNav'
defineProps<{
  items: AppNavItem[]
}>()

const route = useRoute()
const { isActive } = useRouteMatch(route)
const { requestLogout } = useUserMenu()
const { user } = useAuth()
const middleScrollerRef = useMiddleScroller()
const haptics = useHaptics()

// User data exposed to the "More" bottom sheet.
const moreUser = computed(() => user.value ?? null)
const canUseCoins = computed(() => (moreUser.value?.verifiedStatus ?? 'none') !== 'none')
const moreHasStats = computed(
  () => (canUseCoins.value && (moreUser.value?.coins ?? 0) > 0) || (moreUser.value?.checkinStreakDays ?? 0) > 0,
)
const { openShortcutsModal } = useKeyboardShortcuts()

// Tab bar is md:hidden in layout; match that breakpoint (show sheet only when tab bar is visible).
const isMobileHydrated = useHydratedMediaQuery('(max-width: 767px)')
const moreOpen = ref(false)
watch(isMobileHydrated, (mobileReady) => {
  if (!mobileReady) moreOpen.value = false
})

const { allItems, isItemVisible } = useAppNav()
const { totalCount: bookmarkTotalCount } = useBookmarkCollections()
const hasBookmarks = computed(() => Math.max(0, Math.floor(bookmarkTotalCount.value ?? 0)) > 0)

const mainMenuKeys = new Set(['explore', 'articles', 'groups', 'crew', 'bookmarks', 'profile', 'only-me'])
const footerMenuKeys = new Set(['settings', 'feedback', 'admin'])

const mainMenuItems = computed<AppNavItem[]>(() =>
  (allItems.value ?? []).filter((i) => mainMenuKeys.has(i.key) && isItemVisible(i)),
)
const footerMenuItems = computed<AppNavItem[]>(() =>
  (allItems.value ?? []).filter((i) => footerMenuKeys.has(i.key) && isItemVisible(i)),
)

function moreMenuIconName(mi: AppNavItem): string {
  if (mi.key === 'bookmarks' && (hasBookmarks.value || isActive(mi.to))) {
    return mi.iconActive ?? mi.icon
  }
  return isActive(mi.to) ? (mi.iconActive ?? mi.icon) : mi.icon
}

function onNavClick(to: string, e: MouseEvent) {
  if (!isActive(to)) return
  e.preventDefault()
  e.stopPropagation()
  if (to === '/home') {
    const middle = middleScrollerRef.value
    const right = document.getElementById('moh-right-rail-scroller')
    if (middle) middle.scrollTo({ top: 0, behavior: 'smooth' })
    if (right) right.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

</script>
