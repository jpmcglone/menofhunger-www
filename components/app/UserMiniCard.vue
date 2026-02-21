<template>
  <div class="shrink-0 w-56 rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 p-3">
    <div class="flex items-start justify-between gap-2">
      <NuxtLink
        v-if="profilePath"
        :to="profilePath"
        class="min-w-0 flex items-center gap-3 text-left"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        <AppUserAvatar :user="user" size-class="h-10 w-10" />
        <AppUserIdentityLine :user="user" name-class="" handle-class="text-sm" />
      </NuxtLink>
      <div
        v-else
        class="min-w-0 flex items-center gap-3 text-left"
      >
        <AppUserAvatar :user="user" size-class="h-10 w-10" />
        <AppUserIdentityLine :user="user" name-class="" handle-class="text-sm" />
      </div>

      <div class="shrink-0">
        <AppFollowButton
          v-if="showFollowButton"
          :user-id="user.id"
          :username="user.username"
          :initial-relationship="user.relationship"
          rounded
          text
          @followed="emit('followed')"
          @unfollowed="emit('unfollowed')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FollowListUser } from '~/types/api'
import { useUserOverlay } from '~/composables/useUserOverlay'

const props = defineProps<{
  user: FollowListUser
  showFollowButton?: boolean
}>()

const { user } = useUserOverlay(computed(() => props.user))

const emit = defineEmits<{
  (e: 'followed'): void
  (e: 'unfollowed'): void
}>()

const { isAuthed } = useAuth()

// When signed out, never show follow controls anywhere.
const showFollowButton = computed(() => isAuthed.value && props.showFollowButton !== false)

const profilePath = computed(() => {
  if (!user.value?.username) return null
  return `/u/${encodeURIComponent(user.value.username)}`
})

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: computed(() => user.value?.username ?? ''),
})

</script>

