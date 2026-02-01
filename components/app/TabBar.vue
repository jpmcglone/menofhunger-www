<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 dark:border-zinc-800 dark:bg-black/90 sm:hidden"
    style="padding-bottom: env(safe-area-inset-bottom)"
    aria-label="Primary"
  >
    <div class="mx-auto w-full max-w-6xl px-2">
      <div class="grid grid-flow-col auto-cols-fr py-2">
        <template v-for="item in items" :key="item.key">
          <button
            v-if="item.key === 'profile'"
            type="button"
            class="flex flex-col items-center justify-center py-1"
            :class="isActive(item.to) ? 'text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'"
            aria-label="Profile menu"
            @click="toggleProfileMenu"
          >
            <div class="relative h-8 w-8 flex items-center justify-center">
              <AppUserAvatar
                :user="user"
                size-class="h-7 w-7"
              />
            </div>
          </button>

          <NuxtLink
            v-else
            :to="item.to"
            class="flex flex-col items-center justify-center py-1"
            :class="isActive(item.to) ? 'text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'"
            @click="(e) => onNavClick(item.to, e)"
          >
            <div class="relative h-8 w-8 flex items-center justify-center">
              <i class="pi text-xl" :class="item.icon" aria-hidden="true" />

              <span
                v-if="item.key === 'notifications' && notifBadge.show"
                :class="[
                  'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center',
                  notifBadge.toneClass.value,
                ]"
              >
                {{ notifBadge.count }}
              </span>
            </div>
          </NuxtLink>
        </template>
      </div>
    </div>
  </nav>

  <Menu ref="profileMenuRef" :model="menuItems" popup />

  <Dialog v-model:visible="confirmVisible" modal header="Log out?" :style="{ width: '26rem' }">
    <p class="text-sm text-gray-700 dark:text-gray-300">
      Are you sure you want to log out?
    </p>
    <template #footer>
      <Button label="Cancel" text severity="secondary" @click="confirmVisible = false" />
      <Button label="Log out" severity="danger" @click="confirmLogout" />
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
const notifBadge = useNotificationsBadge()
const { menuItems, confirmVisible, confirmLogout } = useUserMenu()

const profileMenuRef = ref()

function isActive(to: string) {
  if (to === '/home') return route.path === '/home'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function onNavClick(to: string, e: MouseEvent) {
  if (!isActive(to)) return
  e.preventDefault()
  e.stopPropagation()
  if (!import.meta.client) return
  window.dispatchEvent(new CustomEvent('moh-scroll-top', { detail: { to } }))
}

function toggleProfileMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(profileMenuRef.value as any)?.toggle(event)
}
</script>

