<template>
  <span
    ref="wrapEl"
    class="relative inline-flex shrink-0"
    @mouseenter="onEnter"
    @mousemove="onMove"
    @mouseleave="onLeave"
  >
    <AppAvatarCircle
      :src="avatarUrl"
      :name="name"
      :username="username"
      :size-class="sizeClass"
      :bg-class="bgClass"
      :round-class="roundClass"
      :premium-plus-glow="isPremiumPlus"
      :is-organization="isOrganization"
      :spaces-ring="showSpacesRing"
      :show-presence="showPresence"
      :presence-status="presenceStatus"
      :presence-scale="props.presenceScale"
      :presence-inset-ratio="props.presenceInsetRatio"
    />
    <ClientOnly>
      <button
        v-if="activeStatus"
        ref="statusButtonEl"
        type="button"
        class="moh-avatar-status-bubble moh-focus absolute -right-1 -top-1 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[var(--p-primary-color)] shadow-[0_2px_8px_rgba(0,0,0,0.18)] ring-1 ring-black/10 transition-[transform,opacity] duration-150 hover:scale-[1.04] active:scale-[0.96] dark:bg-zinc-900 dark:ring-white/15"
        :aria-label="`${displayName}'s status`"
        @click.prevent.stop="toggleStatusPopover"
      >
        <Icon name="tabler:message-circle-filled" size="13" aria-hidden="true" />
      </button>
      <Teleport to="body">
        <Transition
          enter-active-class="transition-[opacity,transform] duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition-[opacity,transform] duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-1 scale-95"
        >
          <div
            v-if="statusPopoverOpen && activeStatus"
            ref="statusPopoverEl"
            class="fixed z-[9999] w-56 origin-top rounded-2xl bg-white p-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/10 dark:bg-zinc-950 dark:ring-white/15"
            :style="statusPopoverStyle"
            role="dialog"
            @click.stop
          >
            <div class="text-xs font-semibold text-gray-500 dark:text-gray-400">{{ displayName }}</div>
            <div class="mt-1 text-sm font-medium leading-snug text-gray-900 dark:text-gray-50">{{ activeStatus.text }}</div>
            <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ statusMeta }}</div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </span>
</template>

<script setup lang="ts">
/**
 * User avatar with presence: takes a user (id + avatar fields) and shows
 * AvatarCircle + green dot (online), clock (idle), or offline. Callers don't need usePresence().
 * When the displayed user is the current auth user AND they are in a space, shows the Spaces
 * gradient ring automatically.
 */
import { useUserOverlay } from '~/composables/useUserOverlay'
import { avatarRoundClass } from '~/utils/avatar-rounding'
import { formatRelativeTime } from '~/utils/time-format'

export type UserAvatarUser = {
  id: string
  avatarUrl?: string | null
  name?: string | null
  username?: string | null
  premiumPlus?: boolean
  isOrganization?: boolean
}

const props = withDefaults(
  defineProps<{
    user: UserAvatarUser | null | undefined
    sizeClass?: string
    bgClass?: string
    /** When false, disable the user hover preview trigger (used inside preview popovers). */
    enablePreview?: boolean
    /** When false, hide the presence indicator (e.g. radio bar listener avatars). Default true. */
    showPresence?: boolean
    /** Override presence (e.g. 'connecting' for current user while socket is connecting). */
    presenceStatusOverride?: 'online' | 'idle' | 'connecting' | 'offline'
    /** Presence dot size as fraction of avatar diameter (default 0.25). Use smaller for large avatars. */
    presenceScale?: number
    /** How far the dot extends outside the avatar (0.5 = half out, 0.25 = closer). Default 0.5. */
    presenceInsetRatio?: number
  }>(),
  {
    sizeClass: 'h-10 w-10',
    bgClass: 'bg-gray-200 dark:bg-zinc-800',
    enablePreview: true,
    showPresence: true,
    presenceScale: 0.25,
    presenceInsetRatio: 0.5,
  },
)

const route = useRoute()
const { getPresenceStatus, getCurrentSpaceForUser, getUserStatus } = usePresence()
const { user: authUser } = useAuth()
const { selectedSpaceId } = useSpaceLobby()
const { user: u } = useUserOverlay(computed(() => props.user))
const { nowMs } = useNowTicker({ everyMs: 30_000 })
const wrapEl = ref<HTMLElement | null>(null)
const statusButtonEl = ref<HTMLElement | null>(null)
const statusPopoverEl = ref<HTMLElement | null>(null)
const statusPopoverOpen = ref(false)
const statusPopoverPosition = ref({ top: 0, left: 0 })

const avatarUrl = computed(() => u.value?.avatarUrl ?? null)
const name = computed(() => u.value?.name ?? null)
const username = computed(() => u.value?.username ?? null)
const isPremiumPlus = computed(() => Boolean(u.value?.premiumPlus))
const isOrganization = computed(() => Boolean((u.value as any)?.isOrganization))
const roundClass = computed(() => avatarRoundClass(isOrganization.value))
const previewUsername = computed(() => (u.value?.username ?? '').trim())
const enablePreview = computed(() => props.enablePreview !== false)
const displayName = computed(() => name.value || username.value || 'User')

const showPresence = computed(() => props.showPresence ?? true)

const presenceStatus = computed(() => {
  if (props.presenceStatusOverride !== undefined) return props.presenceStatusOverride
  return u.value?.id ? getPresenceStatus(u.value.id) : 'offline'
})

const activeStatus = computed(() => {
  const uid = u.value?.id
  if (!uid || props.showPresence === false) return null
  return getUserStatus(uid)
})

const statusMeta = computed(() => {
  const status = activeStatus.value
  if (!status) return ''
  const setAt = formatRelativeTime(status.setAt, { nowMs: nowMs.value, fallback: '' })
  const expiresAtMs = Date.parse(status.expiresAt)
  if (!Number.isFinite(expiresAtMs)) return setAt ? `Set ${setAt.toLowerCase()}` : 'Active status'
  const minutesLeft = Math.max(0, Math.ceil((expiresAtMs - nowMs.value) / 60000))
  const expires =
    minutesLeft < 60
      ? `Expires in ${minutesLeft}m`
      : `Expires in ${Math.ceil(minutesLeft / 60)}h`
  return setAt ? `Set ${setAt.toLowerCase()} · ${expires}` : expires
})

function closeStatusPopover() {
  statusPopoverOpen.value = false
}

function updateStatusPopoverPosition() {
  if (!import.meta.client) return
  const button = statusButtonEl.value
  if (!button) return

  const rect = button.getBoundingClientRect()
  const popoverWidth = statusPopoverEl.value?.offsetWidth || 224
  const margin = 12
  const centeredLeft = rect.left + rect.width / 2 - popoverWidth / 2
  const maxLeft = window.innerWidth - popoverWidth - margin
  statusPopoverPosition.value = {
    top: Math.round(rect.bottom + 8),
    left: Math.round(Math.min(Math.max(margin, centeredLeft), Math.max(margin, maxLeft))),
  }
}

async function toggleStatusPopover() {
  statusPopoverOpen.value = !statusPopoverOpen.value
  if (statusPopoverOpen.value) {
    await nextTick()
    updateStatusPopoverPosition()
  }
}

const statusPopoverStyle = computed(() => ({
  top: `${statusPopoverPosition.value.top}px`,
  left: `${statusPopoverPosition.value.left}px`,
}))

function onDocumentClick(event: MouseEvent) {
  const target = event.target
  if (target instanceof Node && wrapEl.value?.contains(target)) return
  closeStatusPopover()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeStatusPopover()
}

onMounted(() => {
  if (!import.meta.client) return
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', closeStatusPopover, true)
  window.addEventListener('resize', closeStatusPopover)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', closeStatusPopover, true)
  window.removeEventListener('resize', closeStatusPopover)
})

watch(activeStatus, (status) => {
  if (!status) closeStatusPopover()
})

// Show the Spaces gradient ring when a user is in a space.
// For the current user, check both local lobby state and the presence-tracked map
// (seeded in useSpaceLobby.select/leave) so the ring is visible on their own posts/avatar.
// For other users, read from the presence WebSocket state (users:spaceChanged events).
// Suppressed on /spaces routes (context is already clear) and when presence is hidden (radio bar).
const showSpacesRing = computed(() => {
  const uid = u.value?.id
  if (!uid) return false
  if (route.path.startsWith('/spaces')) return false
  if (props.showPresence === false) return false
  const authId = authUser.value?.id
  if (uid === authId) {
    return Boolean(selectedSpaceId.value) || Boolean(getCurrentSpaceForUser(uid))
  }
  return Boolean(getCurrentSpaceForUser(uid))
})

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: previewUsername,
  enabled: enablePreview,
})
</script>
