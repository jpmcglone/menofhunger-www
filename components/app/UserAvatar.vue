<template>
  <AppAvatarCircle
    :src="avatarUrl"
    :name="name"
    :username="username"
    :size-class="sizeClass"
    :bg-class="bgClass"
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
 */
export type UserAvatarUser = {
  id: string
  avatarUrl?: string | null
  name?: string | null
  username?: string | null
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

const { getPresenceStatus } = usePresence()

const avatarUrl = computed(() => props.user?.avatarUrl ?? null)
const name = computed(() => props.user?.name ?? null)
const username = computed(() => props.user?.username ?? null)
const previewUsername = computed(() => (props.user?.username ?? '').trim())
const enablePreview = computed(() => props.enablePreview !== false)

const showPresence = computed(() => props.showPresence ?? true)

const presenceStatus = computed(() => {
  if (props.presenceStatusOverride !== undefined) return props.presenceStatusOverride
  return props.user?.id ? getPresenceStatus(props.user.id) : 'offline'
})

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: previewUsername,
  enabled: enablePreview,
})
</script>
