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
        v-if="showStatusButton && statusBehavior === 'custom'"
        v-tooltip.bottom="statusTooltip"
        type="button"
        :class="statusButtonClass"
        :aria-label="activeStatus ? `${displayName}'s status` : 'Set status'"
        @click.prevent.stop="onStatusButtonClick"
      >
        <Icon
          :name="activeStatus ? 'tabler:message-circle-filled' : 'tabler:message-circle'"
          :class="statusIconClass"
          aria-hidden="true"
        />
      </button>
      <span
        v-else-if="showStatusButton"
        v-tooltip.bottom="statusTooltip"
        :class="statusButtonClass"
        aria-hidden="true"
      >
        <Icon
          :name="activeStatus ? 'tabler:message-circle-filled' : 'tabler:message-circle'"
          :class="statusIconClass"
          aria-hidden="true"
        />
      </span>
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
import { tinyTooltip } from '~/utils/tiny-tooltip'

export type UserAvatarUser = {
  id: string
  avatarUrl?: string | null
  name?: string | null
  username?: string | null
  premiumPlus?: boolean
  isOrganization?: boolean
}

const emit = defineEmits<{
  (e: 'statusClick'): void
}>()

const props = withDefaults(
  defineProps<{
    user: UserAvatarUser | null | undefined
    sizeClass?: string
    bgClass?: string
    /** When false, disable the user hover preview trigger (used inside preview popovers). */
    enablePreview?: boolean
    /** When false, hide the presence indicator (e.g. radio bar listener avatars). Default true. */
    showPresence?: boolean
    /** When false, hide the temporary status bubble while keeping presence visible. */
    showStatus?: boolean
    /** When true, show an empty status affordance if no active status exists. */
    showEmptyStatus?: boolean
    /** Use `custom` when the parent wants to open an editor instead of the read-only status card. */
    statusBehavior?: 'view' | 'custom'
    /** Override the status bubble position for larger avatar contexts. */
    statusPositionClass?: string
    /** Override the status bubble size for larger avatar contexts. */
    statusSizeClass?: string
    /** Override the status icon size. */
    statusIconClass?: string
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
    showStatus: true,
    showEmptyStatus: false,
    statusBehavior: 'view',
    statusPositionClass: '-right-1 -top-1',
    statusSizeClass: 'h-5 w-5',
    statusIconClass: 'text-[13px]',
    presenceScale: 0.25,
    presenceInsetRatio: 0.5,
  },
)

const route = useRoute()
const { getPresenceStatus, getCurrentSpaceForUser, getUserStatus } = usePresence()
const { user: authUser } = useAuth()
const { selectedSpaceId } = useSpaceLobby()
const { user: u } = useUserOverlay(computed(() => props.user))
const wrapEl = ref<HTMLElement | null>(null)

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
  if (!uid || props.showPresence === false || props.showStatus === false) return null
  return getUserStatus(uid)
})

const showStatusButton = computed(() => Boolean(props.showStatus && props.showPresence !== false && (activeStatus.value || props.showEmptyStatus)))
const statusTooltip = computed(() => {
  // Only show a tooltip when there is actual status text to surface; the
  // empty/dashed affordance speaks for itself via the dashed border.
  const text = activeStatus.value?.text?.trim()
  if (!text) return null
  return tinyTooltip(text)
})
const statusButtonClass = computed(() => [
  'moh-avatar-status-bubble moh-focus absolute z-20 inline-flex items-center justify-center rounded-full transition-[transform,opacity] duration-150 hover:scale-[1.04] active:scale-[0.96]',
  props.statusPositionClass,
  props.statusSizeClass,
  activeStatus.value
    ? 'bg-zinc-950 text-white shadow-[0_2px_8px_rgba(0,0,0,0.22)] ring-1 ring-white/20 dark:bg-black dark:text-white dark:ring-white/25'
    : 'border border-dashed border-white/80 bg-zinc-950 text-white shadow-[0_2px_8px_rgba(0,0,0,0.22)] ring-1 ring-white/20 dark:border-white/80 dark:bg-black dark:text-white',
])

function onStatusButtonClick() {
  onLeave()
  if (props.statusBehavior === 'custom') {
    emit('statusClick')
  }
}

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
