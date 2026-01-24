<template>
  <div class="pt-3">
    <button
      ref="buttonEl"
      type="button"
      :class="[
        'group w-full rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-900 text-left',
        // Default to compact on smaller screens (rail is narrow until lg).
        // `compact` forces compact even at lg+ (e.g. messages/test routes).
        compact ? 'p-1' : 'p-1 lg:p-2'
      ]"
      @click="toggleMenu"
    >
      <div class="flex items-center gap-3">
        <div
          :class="[
            'shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800',
            compact ? 'mx-auto h-10 w-10' : 'mx-auto lg:mx-0 h-10 w-10'
          ]"
          aria-hidden="true"
        />

        <div
          :class="[
            'min-w-0 flex-1',
            compact ? 'hidden' : 'hidden lg:block'
          ]"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="font-semibold truncate">{{ displayName }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ handle }}</div>
            </div>
            <i class="pi pi-ellipsis-h text-gray-500 dark:text-gray-400" aria-hidden="true" />
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

const { user, logout } = useAuth()

const displayName = computed(() => user.value?.name || 'Account')
const handle = computed(() => {
  const u = user.value
  const username = u?.username
  return username ? `@${username}` : '@—'
})

const menuRef = ref()
const buttonEl = ref<HTMLElement | null>(null)
const confirmVisible = ref(false)

const menuItems = computed<MenuItem[]>(() => [
  {
    label: 'Account settings',
    icon: 'pi pi-cog',
    command: () => navigateTo('/settings')
  },
  { separator: true },
  {
    label: 'Log out',
    icon: 'pi pi-sign-out',
    command: () => {
      confirmVisible.value = true
    }
  }
])

function toggleMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(menuRef.value as any)?.toggle(event)
}

async function confirmLogout() {
  confirmVisible.value = false
  await logout()
}
</script>

