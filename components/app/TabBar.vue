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
            v-if="item.key === 'profile'"
            type="button"
            class="flex h-full w-full flex-col items-center justify-center touch-manipulation transition-transform duration-100 active:scale-[0.98] moh-focus"
            :class="isActive(item.to) ? 'moh-text' : 'moh-text-muted'"
            aria-label="Profile menu"
            @click="(e) => { haptics.tap(); toggleProfileMenu(e) }"
          >
            <div class="relative h-10 w-10 flex items-center justify-center">
              <AppUserAvatar
                :user="displayUser"
                size-class="h-8 w-8"
                :enable-preview="false"
              />
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

  <Menu ref="profileMenuRef" :model="menuItems" popup appendTo="body">
    <template #item="{ item, props }">
      <a v-bind="props.action" class="flex items-center gap-2">
        <!-- PrimeVue MenuItem supports arbitrary fields; we use iconName for Iconify. -->
        <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
        <span v-bind="props.label">{{ item.label }}</span>
      </a>
    </template>
  </Menu>

  <Dialog v-model:visible="confirmVisible" modal header="Log out?" :style="{ width: '26rem', maxWidth: '92vw' }">
    <p class="text-sm text-gray-700 dark:text-gray-300">
      Are you sure you want to log out?
    </p>
    <template #footer>
      <Button label="Cancel" text severity="secondary" @click="confirmVisible = false" />
      <Button label="Log out" severity="danger" rounded @click="confirmLogout">
        <template #icon>
          <Icon name="tabler:door-exit" aria-hidden="true" />
        </template>
      </Button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { AppNavItem } from '~/composables/useAppNav'
import { useUserOverlay } from '~/composables/useUserOverlay'

defineProps<{
  items: AppNavItem[]
}>()

const route = useRoute()
const { isActive } = useRouteMatch(route)
const { user } = useAuth()
const { user: displayUser } = useUserOverlay(user)
const { menuItems, confirmVisible, confirmLogout } = useUserMenu()
const middleScrollerRef = useMiddleScroller()
const haptics = useHaptics()

const profileMenuRef = ref()

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
