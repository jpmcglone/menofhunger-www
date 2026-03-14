<template>
  <div class="pt-3">
    <NuxtLink
      v-if="hideMenu && (linkToHome || user?.username)"
      :to="linkToHome ? '/home' : `/u/${user!.username}`"
      :class="cardClass"
      :style="cardStyle"
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
          <div class="min-w-0">
            <div class="mt-0.5 flex items-center min-w-0">
              <div class="font-semibold truncate text-gray-900 dark:text-gray-50">{{ displayName }}</div>
            </div>
            <div class="mt-0.5 flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300">
              <Icon name="tabler:coin" size="14" aria-hidden="true" />
              <span class="truncate">{{ coinsLabel }}</span>
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
      :style="cardStyle"
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
          <div class="min-w-0 pr-1">
            <div class="mt-0.5 flex items-center min-w-0">
              <div class="font-semibold truncate text-gray-900 dark:text-gray-50">{{ displayName }}</div>
            </div>
            <div class="mt-0.5 flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300">
              <Icon name="tabler:coin" size="14" aria-hidden="true" />
              <span class="truncate">{{ coinsLabel }}</span>
            </div>
          </div>
        </div>
      </div>
    </button>

    <Menu v-if="!hideMenu" ref="menuRef" :model="allMenuItems" popup>
      <template #item="{ item, props }">
        <a v-bind="props.action" class="flex items-center gap-2">
          <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
          <span v-bind="props.label">{{ item.label }}</span>
        </a>
      </template>
    </Menu>

    <AppConfirmDialog
      v-if="!hideMenu"
      v-model:visible="confirmVisible"
      header="Log out?"
      message="Are you sure you want to log out?"
      confirm-label="Log out"
      confirm-icon="tabler:door-exit"
      @confirm="confirmLogout"
    />
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
    : 'group moh-user-card-tier relative block w-full rounded-xl border border-black/10 bg-gray-50/80 text-left transition-colors dark:border-white/10 dark:bg-zinc-950/40',
  props.compact ? 'p-0' : 'p-1 xl:p-2'
])

const route = useRoute()
const { user } = useAuth()
const { getPresenceStatus, isSocketConnecting } = usePresence()
const { menuItems, confirmVisible, confirmLogout } = useUserMenu()
const { selectedSpaceId } = useSpaceLobby()

const tierAccentRgb = computed<string | null>(() => {
  const u = user.value
  if (!u) return null
  if (u.premiumPlus || u.isOrganization) return 'var(--moh-org-rgb)'
  if (u.premium) return 'var(--moh-premium-rgb)'
  if (u.verifiedStatus && u.verifiedStatus !== 'none') return 'var(--moh-verified-rgb)'
  return null
})

const cardStyle = computed<Record<string, string> | undefined>(() => {
  if (props.compact) return undefined
  // Keep border neutral; only hover tint follows user tier.
  if (!tierAccentRgb.value) return { '--user-card-hover': 'var(--moh-surface-hover)' }
  return {
    '--user-card-hover': `rgba(${tierAccentRgb.value}, 0.12)`,
  }
})

const currentUserPresenceStatus = computed(() => {
  const u = user.value
  if (!u?.id) return 'offline' as const
  if (isSocketConnecting.value) return 'connecting' as const
  return getPresenceStatus(u.id)
})

const coinCount = computed(() => Math.max(0, Math.floor(Number(user.value?.coins ?? 0))))
const coinsLabel = computed(() => `${coinCount.value.toLocaleString()} ${coinCount.value === 1 ? 'coin' : 'coins'}`)
const displayName = computed(() => user.value?.name || user.value?.username || 'User')

type MenuItemWithIcon = MenuItem & { iconName?: string }

// Prepend "Go to space" when the current user is actively in a space (suppressed on /spaces routes).
const allMenuItems = computed<MenuItemWithIcon[]>(() => {
  const base = menuItems.value as MenuItemWithIcon[]
  const sid = selectedSpaceId.value
  if (!sid || route.path.startsWith('/spaces')) return base
  return [
    {
      label: 'Go to space',
      iconName: 'tabler:layout-grid',
      command: () => navigateTo(`/spaces/${encodeURIComponent(sid)}`),
    } as MenuItemWithIcon,
    { separator: true } as MenuItemWithIcon,
    ...base,
  ]
})

const menuRef = ref()
const buttonEl = ref<HTMLElement | null>(null)

function toggleMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(menuRef.value as any)?.toggle(event)
}
</script>

<style scoped>
.moh-user-card-tier:hover {
  background-color: var(--user-card-hover, var(--moh-surface-hover));
}
</style>

