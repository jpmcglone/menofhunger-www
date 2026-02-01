<template>
  <AppAvatarCircle
    :src="avatarUrl"
    :name="name"
    :username="username"
    :size-class="sizeClass"
    :bg-class="bgClass"
    :presence-status="user?.id ? getPresenceStatus(user.id) : 'offline'"
    :presence-scale="props.presenceScale"
    :presence-inset-ratio="props.presenceInsetRatio"
  />
</template>

<script setup lang="ts">
/**
 * User avatar with presence: takes a user (id + avatar fields) and shows
 * AvatarCircle + green dot (online) or red dot (recently disconnected). Callers don't need usePresence().
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
    /** Presence dot size as fraction of avatar diameter (default 0.25). Use smaller for large avatars. */
    presenceScale?: number
    /** How far the dot extends outside the avatar (0.5 = half out, 0.25 = closer). Default 0.5. */
    presenceInsetRatio?: number
  }>(),
  {
    sizeClass: 'h-10 w-10',
    bgClass: 'bg-gray-200 dark:bg-zinc-800',
    presenceScale: 0.25,
    presenceInsetRatio: 0.5,
  },
)

const { getPresenceStatus } = usePresence()

const avatarUrl = computed(() => props.user?.avatarUrl ?? null)
const name = computed(() => props.user?.name ?? null)
const username = computed(() => props.user?.username ?? null)
</script>
