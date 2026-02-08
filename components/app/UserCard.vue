<template>
  <div class="pt-3">
    <NuxtLink
      v-if="hideMenu && (linkToHome || user?.username)"
      :to="linkToHome ? '/home' : `/u/${user!.username}`"
      :class="cardClass"
    >
      <div class="flex items-center gap-3">
        <AppUserAvatar
          :user="user"
          :presence-status-override="currentUserPresenceStatus"
          :size-class="props.compact ? 'mx-auto h-10 w-10' : 'mx-auto xl:mx-0 h-10 w-10'"
          :enable-preview="false"
        />

        <div
          :class="[
            'min-w-0 flex-1',
            props.compact ? 'hidden' : 'hidden xl:block'
          ]"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <div class="font-semibold truncate">{{ displayName }}</div>
                <AppVerifiedBadge :status="user?.verifiedStatus" :premium="user?.premium" :premium-plus="user?.premiumPlus" />
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ handle }}</div>
            </div>
          </div>
        </div>
      </div>
    </NuxtLink>
    <button
      v-else
      ref="buttonEl"
      type="button"
      :class="cardClass"
      @click="toggleMenu"
    >
      <div class="flex items-center gap-3">
        <AppUserAvatar
          :user="user"
          :presence-status-override="currentUserPresenceStatus"
          :size-class="props.compact ? 'mx-auto h-10 w-10' : 'mx-auto xl:mx-0 h-10 w-10'"
          :enable-preview="false"
        />

        <div
          :class="[
            'min-w-0 flex-1',
            props.compact ? 'hidden' : 'hidden xl:block'
          ]"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <div class="font-semibold truncate">{{ displayName }}</div>
                <AppVerifiedBadge :status="user?.verifiedStatus" :premium="user?.premium" :premium-plus="user?.premiumPlus" />
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ handle }}</div>
            </div>
            <Icon name="tabler:dots-vertical" class="text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </div>
    </button>

    <Menu v-if="!hideMenu" ref="menuRef" :model="menuItems" popup>
      <template #item="{ item, props }">
        <a v-bind="props.action" class="flex items-center gap-2">
          <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
          <span v-bind="props.label">{{ item.label }}</span>
        </a>
      </template>
    </Menu>

    <Dialog v-if="!hideMenu" v-model:visible="confirmVisible" modal header="Log out?" :style="{ width: '26rem' }">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        Are you sure you want to log out?
      </p>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="confirmVisible = false" />
        <Button label="Log out" severity="danger" rounded @click="confirmLogout">
          <template #icon>
            <Icon name="tabler:logout" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'

const props = withDefaults(
  defineProps<{
    compact: boolean
    /** When true, show card as link to profile with no menu button. */
    hideMenu?: boolean
    /** When true with hideMenu, link goes to /home instead of profile. */
    linkToHome?: boolean
  }>(),
  { hideMenu: false, linkToHome: false }
)

const cardClass = computed(() => [
  props.compact
    ? // Compact left rail: avatar only (no card chrome).
      'group block w-full p-0 bg-transparent border-0 rounded-none text-left'
    : 'group block w-full rounded-xl border border-gray-200 bg-gray-50/80 text-left transition-colors hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900',
  props.compact ? 'p-0' : 'p-1 xl:p-2'
])

const { user } = useAuth()
const { getPresenceStatus, isSocketConnecting } = usePresence()
const { menuItems, confirmVisible, confirmLogout } = useUserMenu()

const currentUserPresenceStatus = computed(() => {
  const u = user.value
  if (!u?.id) return 'offline' as const
  if (isSocketConnecting.value) return 'connecting' as const
  return getPresenceStatus(u.id)
})

const displayName = computed(() => user.value?.name || 'Account')
const handle = computed(() => {
  const u = user.value
  const username = u?.username
  return username ? `@${username}` : '@—'
})

const menuRef = ref()
const buttonEl = ref<HTMLElement | null>(null)

function toggleMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(menuRef.value as any)?.toggle(event)
}
</script>

