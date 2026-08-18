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
          :show-status="false"
        />
        <div
          :class="[
            'min-w-0 flex-1',
            props.compact ? 'hidden' : 'hidden xl:block'
          ]"
        >
          <div class="min-w-0">
            <div class="mt-0.5 flex items-center min-w-0">
              <div class="font-semibold line-clamp-2 break-words text-gray-900 dark:text-gray-50 leading-snug">{{ displayName }}</div>
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
      :aria-expanded="menuOpen"
      aria-haspopup="menu"
      aria-label="Account menu"
      @click="toggleMenu"
    >
      <div class="flex items-center gap-3">
        <div class="relative shrink-0">
          <AppUserAvatar
            :user="user"
            :presence-status-override="currentUserPresenceStatus"
            :size-class="props.compact ? 'mx-auto h-10 w-10' : 'mx-auto xl:mx-0 h-10 w-10'"
            :enable-preview="false"
            :show-status="false"
          />
          <span
            v-if="otherAccountsUnread > 0"
            class="pointer-events-none absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--moh-bg)]"
            aria-hidden="true"
          >{{ otherAccountsUnread > 99 ? '99+' : otherAccountsUnread }}</span>
        </div>
        <div
          :class="[
            'min-w-0 flex-1',
            props.compact ? 'hidden' : 'hidden xl:block'
          ]"
        >
          <div class="min-w-0 pr-1">
            <div class="mt-0.5 flex items-center min-w-0">
              <div class="font-semibold line-clamp-2 break-words text-gray-900 dark:text-gray-50 leading-snug">{{ displayName }}</div>
            </div>
          </div>
        </div>
      </div>
    </button>

    <Teleport v-if="!hideMenu" to="body">
      <div
        v-if="menuOpen"
        class="fixed inset-0 z-[9998]"
        aria-hidden="true"
        @click="closeMenu"
      />
      <div
        v-if="menuOpen"
        ref="menuEl"
        class="fixed z-[9999] w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border moh-border moh-surface shadow-lg"
        :style="menuStyle"
        role="menu"
        aria-label="Account menu"
        @click.stop
      >
        <AppAccountSwitcher compact :active="menuOpen" />
        <div v-if="canSwitch && extraMenuItems.length" class="border-t moh-border" />
        <div class="py-1">
          <template v-for="(item, index) in extraMenuItems" :key="item.key || index">
            <div v-if="item.separator" class="my-1 border-t moh-border" />
            <NuxtLink
              v-else-if="item.to"
              :to="item.to"
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm moh-text hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              role="menuitem"
              @click="closeMenu"
            >
              <Icon v-if="item.iconName" :name="item.iconName" class="text-[15px] shrink-0" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </NuxtLink>
            <button
              v-else
              type="button"
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm moh-text hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              role="menuitem"
              @click="onMenuAction(item)"
            >
              <Icon v-if="item.iconName" :name="item.iconName" class="text-[15px] shrink-0" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </button>
          </template>
        </div>
      </div>
    </Teleport>

    <AppStatusEditorDialog
      :open="statusEditorOpen"
      :draft="statusDraft"
      :active-status="Boolean(activeStatus)"
      :saving="statusSaving"
      :error="statusError"
      title-id="status-editor-title"
      @update:open="(open) => { if (!open) closeStatusEditor() }"
      @update:draft="statusDraft = $event"
      @save="saveStatus($event)"
      @edit="editStatus"
      @clear="clearStatus"
    />

  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import { getApiErrorMessage } from '~/utils/api-error'

type MenuRow = MenuItem & { iconName?: string; to?: string; key?: string }

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
const { user, isVerifiedMember } = useAuth()
const { getPresenceStatus, getUserStatus, isSocketConnecting, setMyStatus, editMyStatus, clearMyStatus } = usePresence()
const { menuItems } = useUserMenu()
const { canSwitch, otherAccountsUnread } = useAccountSwitcher()
const { currentSpace: currentSpaceForNav } = useSpaceLobby()
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
const statusDraft = ref('')
const statusSaving = ref(false)
const statusError = ref<string | null>(null)
let ignoreNextStatusEditorDocumentClick = false
const activeStatus = computed(() => {
  const id = user.value?.id
  return id ? getUserStatus(id) : null
})

const menuOpen = ref(false)
const buttonEl = ref<HTMLElement | null>(null)
const { style: menuStyle, menuEl, place: placeMenu } = useMenuPosition()
useOverlayDismiss(menuOpen, () => { menuOpen.value = false })

const extraMenuItems = computed<MenuRow[]>(() => {
  const base = (menuItems.value as MenuRow[]).map((item) => ({
    ...item,
    to: typeof item.url === 'string' ? item.url : undefined,
  }))
  const withStatus: MenuRow[] = isVerifiedMember.value
    ? [
        {
          key: 'status',
          label: activeStatus.value ? 'Update status' : 'Set status',
          iconName: 'tabler:message-circle',
          command: () => openStatusEditor(),
        },
        { separator: true },
        ...base,
      ]
    : base
  const ownerUsername = currentSpaceForNav.value?.owner?.username
  if (!ownerUsername || route.path.startsWith('/spaces') || route.path.startsWith('/s/')) {
    return withStatus
  }
  return [
    {
      key: 'space',
      label: 'Go to space',
      iconName: 'tabler:layout-grid',
      to: `/s/${encodeURIComponent(ownerUsername)}`,
    },
    { separator: true },
    ...withStatus,
  ]
})

function toggleMenu() {
  if (menuOpen.value) {
    menuOpen.value = false
    return
  }
  if (buttonEl.value) placeMenu(buttonEl.value, { menuWidth: 288, menuHeight: 420 })
  menuOpen.value = true
}

function closeMenu() {
  menuOpen.value = false
}

function onMenuAction(item: MenuRow) {
  closeMenu()
  item.command?.({ originalEvent: new Event('click'), item })
}

function openStatusEditor() {
  if (!isVerifiedMember.value) return
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

async function saveStatus(opts?: { durationHours?: 1 | 3 | 6 | 12 | 24; createsPost?: boolean }) {
  const text = statusDraft.value.trim()
  if (!text) return
  statusSaving.value = true
  statusError.value = null
  try {
    await setMyStatus(text, opts)
    closeStatusEditor()
  } catch (e) {
    statusError.value = getApiErrorMessage(e) || 'Could not save status.'
  } finally {
    statusSaving.value = false
  }
}

async function editStatus() {
  const text = statusDraft.value.trim()
  if (!text) return
  statusSaving.value = true
  statusError.value = null
  try {
    await editMyStatus(text)
    closeStatusEditor()
  } catch (e) {
    statusError.value = getApiErrorMessage(e) || 'Could not update status.'
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
  if (!statusEditorOpen.value) return
  if (ignoreNextStatusEditorDocumentClick) return
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

