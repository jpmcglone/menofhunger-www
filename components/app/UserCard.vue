<template>
  <div class="relative pt-3">
    <div v-if="showTopControls" class="mb-1.5 flex items-center justify-between gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        @click.stop="openShortcutsModal"
      >
        <span>Shortcuts</span>
        <span class="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border border-current/35 px-1 font-mono text-[10px] leading-none">?</span>
      </button>

      <NuxtLink
        v-if="canUseCoins"
        to="/coins"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-700/40 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
      >
        <Icon name="tabler:coin" size="14" aria-hidden="true" />
        <span class="truncate tabular-nums">{{ coinCountLabel }}</span>
      </NuxtLink>
    </div>

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

    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-[opacity,transform] duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <form
        v-if="statusEditorOpen"
        ref="statusEditorRef"
        class="fixed bottom-[calc(5rem+var(--moh-safe-bottom,0px))] left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl bg-white p-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/10 dark:bg-zinc-950 dark:ring-white/15 md:absolute md:bottom-16 md:left-3 md:right-3 md:max-w-none"
        @submit.prevent="saveStatus"
        @click.stop
      >
        <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Set status</div>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Shows on your avatar for 24 hours.
        </p>
        <input
          v-model="statusDraft"
          type="text"
          maxlength="120"
          placeholder="What are you up to?"
          class="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-shadow focus:ring-2 focus:ring-[var(--p-primary-color)]/30 dark:border-white/10 dark:bg-zinc-900 dark:text-gray-50"
        >
        <div v-if="statusError" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ statusError }}</div>
        <div class="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
            :disabled="statusSaving"
            @click="clearStatus"
          >
            Clear
          </button>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
              :disabled="statusSaving"
              @click="closeStatusEditor"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="moh-pressable rounded-lg bg-[var(--p-primary-color)] px-3 py-1.5 text-xs font-semibold text-white transition-[opacity,transform] active:scale-[0.96] disabled:opacity-60"
              :disabled="statusSaving || !statusDraft.trim()"
            >
              {{ statusSaving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </form>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import { getApiErrorMessage } from '~/utils/api-error'

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
const { getPresenceStatus, getUserStatus, isSocketConnecting, setMyStatus, clearMyStatus } = usePresence()
const { menuItems } = useUserMenu()
const { selectedSpaceId, currentSpace: currentSpaceForNav } = useSpaceLobby()
const { openShortcutsModal } = useKeyboardShortcuts()
const isXlUp = useHydratedMediaQuery('(min-width: 1280px)')

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
const coinCountLabel = computed(() => coinCount.value.toLocaleString())
const canUseCoins = computed(() => (user.value?.verifiedStatus ?? 'none') !== 'none')
const displayName = computed(() => user.value?.name || user.value?.username || 'User')
const showTopControls = computed(() => !props.compact && !props.hideMenu && isXlUp.value)
const statusEditorOpen = ref(false)
const statusEditorRef = ref<HTMLElement | null>(null)
const statusDraft = ref('')
const statusSaving = ref(false)
const statusError = ref<string | null>(null)
let ignoreNextStatusEditorDocumentClick = false
const activeStatus = computed(() => {
  const id = user.value?.id
  return id ? getUserStatus(id) : null
})

type MenuItemWithIcon = MenuItem & { iconName?: string }

// Prepend "Go to space" when the current user is actively in a space (suppressed on /spaces routes).
const allMenuItems = computed<MenuItemWithIcon[]>(() => {
  const base = menuItems.value as MenuItemWithIcon[]
  const statusItem = {
    label: activeStatus.value ? 'Update status' : 'Set status',
    iconName: 'tabler:message-circle',
    command: () => openStatusEditor(),
  } as MenuItemWithIcon
  const withStatus = [statusItem, { separator: true } as MenuItemWithIcon, ...base]
  const ownerUsername = currentSpaceForNav.value?.owner?.username
  if (!ownerUsername || route.path.startsWith('/spaces') || route.path.startsWith('/s/')) return withStatus
  return [
    {
      label: 'Go to space',
      iconName: 'tabler:layout-grid',
      command: () => navigateTo(`/s/${encodeURIComponent(ownerUsername)}`),
    } as MenuItemWithIcon,
    { separator: true } as MenuItemWithIcon,
    ...withStatus,
  ]
})

const menuRef = ref()
const buttonEl = ref<HTMLElement | null>(null)

function toggleMenu(event: Event) {
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(menuRef.value as any)?.toggle(event)
}

function openStatusEditor() {
  ignoreNextStatusEditorDocumentClick = true
  setTimeout(() => {
    ignoreNextStatusEditorDocumentClick = false
  }, 0)
  statusDraft.value = activeStatus.value?.text ?? ''
  statusError.value = null
  statusEditorOpen.value = true
}

function closeStatusEditor() {
  statusEditorOpen.value = false
  statusError.value = null
}

async function saveStatus() {
  const text = statusDraft.value.trim()
  if (!text) return
  statusSaving.value = true
  statusError.value = null
  try {
    await setMyStatus(text)
    closeStatusEditor()
  } catch (e) {
    statusError.value = getApiErrorMessage(e) || 'Could not save status.'
  } finally {
    statusSaving.value = false
  }
}

async function clearStatus() {
  statusSaving.value = true
  statusError.value = null
  try {
    await clearMyStatus()
    statusDraft.value = ''
    closeStatusEditor()
  } catch (e) {
    statusError.value = getApiErrorMessage(e) || 'Could not clear status.'
  } finally {
    statusSaving.value = false
  }
}

function onDocumentClick(event: MouseEvent) {
  if (ignoreNextStatusEditorDocumentClick) return
  const target = event.target
  if (target instanceof Node && statusEditorRef.value?.contains(target)) return
  closeStatusEditor()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeStatusEditor()
}

onMounted(() => {
  if (!import.meta.client) return
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.moh-user-card-tier:hover {
  background-color: var(--user-card-hover, var(--moh-surface-hover));
}
</style>

