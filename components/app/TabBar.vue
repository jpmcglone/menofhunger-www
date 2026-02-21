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

  <AppBottomSheet
    v-if="isMobile"
    v-model="moreOpen"
    title="More"
    :panel-class="'inset-x-0 bottom-0 max-w-none rounded-t-2xl shadow-2xl moh-bg moh-text moh-texture border-t moh-border min-h-[min(28rem,60vh)]'"
    :content-class="'px-0 pb-0 pt-2 min-h-0 flex-1 flex flex-col'"
  >
    <div class="w-full min-h-[12rem] flex flex-col">
      <div class="flex flex-col">
        <NuxtLink
          v-for="mi in mainMenuItems"
          :key="mi.key"
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
              <span
                v-if="mi.key === 'spaces'"
                class="absolute left-1/2 -top-3.5 -translate-x-1/2"
              >
                <span
                  class="inline-block moh-slow-bounce rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.12em] uppercase text-white shadow-sm"
                  style="background: linear-gradient(135deg, var(--moh-verified), var(--moh-premium));"
                >
                  NEW
                </span>
              </span>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">
                {{ mi.label }}
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <div class="mt-1 border-t border-gray-200 dark:border-zinc-700 pt-2 pb-3 px-5 flex flex-col gap-0.5">
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
      </div>
    </div>
  </AppBottomSheet>

  <AppConfirmDialog
    v-model:visible="confirmVisible"
    header="Log out?"
    message="Are you sure you want to log out?"
    confirm-label="Log out"
    confirm-icon="tabler:door-exit"
    @confirm="confirmLogout"
  />
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import type { AppNavItem } from '~/composables/useAppNav'

defineProps<{
  items: AppNavItem[]
}>()

const route = useRoute()
const { isActive } = useRouteMatch(route)
const { confirmVisible, confirmLogout } = useUserMenu()
const middleScrollerRef = useMiddleScroller()
const haptics = useHaptics()

// Tab bar is md:hidden in layout; match that breakpoint (show sheet only when tab bar is visible).
const isMobile = useMediaQuery('(max-width: 767px)')
const moreOpen = ref(false)
watch(isMobile, (mobile) => {
  if (!mobile) moreOpen.value = false
})

const { allItems, isItemVisible } = useAppNav()
const { totalCount: bookmarkTotalCount } = useBookmarkCollections()
const hasBookmarks = computed(() => Math.max(0, Math.floor(bookmarkTotalCount.value ?? 0)) > 0)

const mainMenuKeys = new Set(['bookmarks', 'spaces', 'groups', 'profile', 'only-me'])
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
    const el = middleScrollerRef.value
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

</script>
