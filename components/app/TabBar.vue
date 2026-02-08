<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white dark:border-zinc-800 dark:bg-black sm:hidden"
    style="min-height: calc(var(--moh-tabbar-height, 4.5rem) + env(safe-area-inset-bottom, 0px)); padding-bottom: env(safe-area-inset-bottom, 0px);"
    aria-label="Primary"
  >
    <AppTabBarContent>
      <div class="grid grid-flow-col auto-cols-fr">
        <template v-for="item in items" :key="item.key">
          <button
            v-if="item.key === 'profile'"
            type="button"
            class="flex flex-col items-center justify-center py-1 min-h-[44px] w-full touch-manipulation transition-transform duration-100 active:scale-[0.98]"
            :class="isActive(item.to) ? 'text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'"
            aria-label="Profile menu"
            @click="(e) => { haptics.tap(); toggleProfileMenu(e) }"
          >
            <div class="relative h-9 w-9 flex items-center justify-center">
              <AppUserAvatar
                :user="user"
                size-class="h-8 w-8"
                :enable-preview="false"
              />
            </div>
          </button>

          <NuxtLink
            v-else
            :to="item.to"
            class="flex flex-col items-center justify-center py-1 min-h-[44px] w-full touch-manipulation transition-transform duration-100 active:scale-[0.98]"
            :class="isActive(item.to) ? 'text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'"
            @click="(e) => { haptics.tap(); onNavClick(item.to, e) }"
          >
            <div class="relative h-9 w-9 flex items-center justify-center">
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

  <Menu ref="profileMenuRef" :model="menuItems" popup appendTo="body" />

  <Dialog v-model:visible="confirmVisible" modal header="Log out?" :style="{ width: '26rem', maxWidth: '92vw' }">
    <p class="text-sm text-gray-700 dark:text-gray-300">
      Are you sure you want to log out?
    </p>
    <template #footer>
      <Button label="Cancel" text severity="secondary" @click="confirmVisible = false" />
      <Button label="Log out" icon="pi pi-sign-out" severity="danger" rounded @click="confirmLogout" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { AppNavItem } from '~/composables/useAppNav'

defineProps<{
  items: AppNavItem[]
}>()

const route = useRoute()
const { user } = useAuth()
const { menuItems, confirmVisible, confirmLogout } = useUserMenu()
const middleScrollerRef = useMiddleScroller()
const haptics = useHaptics()

const profileMenuRef = ref()

function isActive(to: string) {
  if (to === '/home') return route.path === '/home'
  return route.path === to || route.path.startsWith(`${to}/`)
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

function toggleProfileMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(profileMenuRef.value as any)?.toggle(event)
}
</script>

