<template>
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
    @mouseenter="onEnter"
    @mousemove="onMove"
    @mouseleave="onLeave"
  />
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
const { getPresenceStatus, getCurrentSpaceForUser } = usePresence()
const { user: authUser } = useAuth()
const { selectedSpaceId } = useSpaceLobby()
const { user: u } = useUserOverlay(computed(() => props.user))

const avatarUrl = computed(() => u.value?.avatarUrl ?? null)
const name = computed(() => u.value?.name ?? null)
const username = computed(() => u.value?.username ?? null)
const isPremiumPlus = computed(() => Boolean(u.value?.premiumPlus))
const isOrganization = computed(() => Boolean((u.value as any)?.isOrganization))
const roundClass = computed(() => avatarRoundClass(isOrganization.value))
const previewUsername = computed(() => (u.value?.username ?? '').trim())
const enablePreview = computed(() => props.enablePreview !== false)

const showPresence = computed(() => props.showPresence ?? true)

const presenceStatus = computed(() => {
  if (props.presenceStatusOverride !== undefined) return props.presenceStatusOverride
  return u.value?.id ? getPresenceStatus(u.value.id) : 'offline'
})

// Show the Spaces gradient ring when a user is in a space.
// For the current user, read from the local space lobby state.
// For other users, read from the presence WebSocket state (users:spaceChanged events).
// Suppressed on /spaces routes (context is already clear) and when presence is hidden (radio bar).
const showSpacesRing = computed(() => {
  const uid = u.value?.id
  if (!uid) return false
  if (route.path.startsWith('/spaces')) return false
  if (props.showPresence === false) return false
  const authId = authUser.value?.id
  if (uid === authId) {
    return Boolean(selectedSpaceId.value)
  }
  return Boolean(getCurrentSpaceForUser(uid))
})

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: previewUsername,
  enabled: enablePreview,
})
</script>
