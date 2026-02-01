<template>
  <div class="pt-3">
    <button
      ref="buttonEl"
      type="button"
      :class="[
        'group w-full rounded-xl border border-gray-200 bg-gray-50/80 text-left transition-colors hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900',
        // Default to compact on smaller screens (rail is narrow until xl).
        // `compact` forces compact even at xl+ (e.g. messages route).
        compact ? 'p-1' : 'p-1 xl:p-2'
      ]"
      @click="toggleMenu"
    >
      <div class="flex items-center gap-3">
        <AppAvatarCircle
          :src="avatarUrl"
          :name="user?.name ?? null"
          :username="user?.username ?? null"
          :size-class="compact ? 'mx-auto h-10 w-10' : 'mx-auto xl:mx-0 h-10 w-10'"
        />

        <div
          :class="[
            'min-w-0 flex-1',
            compact ? 'hidden' : 'hidden xl:block'
          ]"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <div class="font-semibold truncate">{{ displayName }}</div>
                <AppVerifiedBadge :status="user?.verifiedStatus" :premium="user?.premium" />
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ handle }}</div>
            </div>
            <i class="pi pi-ellipsis-v text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </div>
    </button>

    <Menu ref="menuRef" :model="menuItems" popup />

    <Dialog v-model:visible="confirmVisible" modal header="Log out?" :style="{ width: '26rem' }">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        Are you sure you want to log out?
      </p>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="confirmVisible = false" />
        <Button label="Log out" severity="danger" @click="confirmLogout" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'

const props = defineProps<{
  compact: boolean
}>()

const { user } = useAuth()
const { menuItems, confirmVisible, confirmLogout } = useUserMenu()

const displayName = computed(() => user.value?.name || 'Account')
const handle = computed(() => {
  const u = user.value
  const username = u?.username
  return username ? `@${username}` : '@—'
})

const avatarUrl = computed(() => (user.value?.avatarUrl ?? null))

const menuRef = ref()
const buttonEl = ref<HTMLElement | null>(null)

function toggleMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(menuRef.value as any)?.toggle(event)
}
</script>

