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

          <!-- SPACES: gradient-outlined circle -->
          <NuxtLink
            v-else-if="item.key === 'spaces'"
            :to="item.to"
            class="flex h-full w-full flex-col items-center justify-center touch-manipulation transition-transform duration-100 active:scale-[0.98] moh-focus"
            @click="(e) => { haptics.tap(); onNavClick(item.to, e) }"
          >
            <!-- Outer ring = gradient background; inner disc = page bg with icon -->
            <div
              class="relative flex items-center justify-center rounded-full shrink-0"
              :style="{
                background: 'linear-gradient(90deg, var(--moh-verified), var(--moh-premium))',
                padding: isActive(item.to) ? '3px' : '2.5px',
                width: '40px',
                height: '40px',
              }"
            >
              <div
                class="w-full h-full rounded-full flex items-center justify-center"
                :style="{
                  background: isActive(item.to)
                    ? 'linear-gradient(rgba(43,123,185,0.12) 0%, rgba(199,125,26,0.08) 100%)'
                    : 'var(--moh-bg)',
                }"
              >
                <Icon
                  :name="isActive(item.to) ? (item.iconActive || item.icon) : item.icon"
                  size="22"
                  class="text-gray-900 dark:text-gray-100"
                  :class="[item.iconClass, isActive(item.to) ? 'opacity-100' : 'opacity-80']"
                  aria-hidden="true"
                />
              </div>
            </div>
          </NuxtLink>

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
const { openShortcutsModal } = useKeyboardShortcuts()

// Tab bar is md:hidden in layout; match that breakpoint (show sheet only when tab bar is visible).
const isMobile = useMediaQuery('(max-width: 767px)')
const moreOpen = ref(false)
watch(isMobile, (mobile) => {
  if (!mobile) moreOpen.value = false
})

const { allItems, isItemVisible } = useAppNav()
const { totalCount: bookmarkTotalCount } = useBookmarkCollections()
const hasBookmarks = computed(() => Math.max(0, Math.floor(bookmarkTotalCount.value ?? 0)) > 0)

const mainMenuKeys = new Set(['explore', 'groups', 'bookmarks', 'profile', 'only-me'])
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
