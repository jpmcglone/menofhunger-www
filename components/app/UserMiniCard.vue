<template>
  <div class="shrink-0 w-56 rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 p-3">
    <div class="flex items-start justify-between gap-2">
      <button
        type="button"
        class="min-w-0 flex items-center gap-3 text-left"
        @click="goToProfile"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        <AppUserAvatar :user="user" size-class="h-10 w-10" />
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="font-semibold truncate text-gray-900 dark:text-gray-50">
              {{ displayName }}
            </div>
            <AppVerifiedBadge :status="user.verifiedStatus" :premium="user.premium" :premium-plus="user.premiumPlus" />
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
            {{ handle }}
          </div>
        </div>
      </button>

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

const props = defineProps<{
  user: FollowListUser
  showFollowButton?: boolean
}>()

const emit = defineEmits<{
  (e: 'followed'): void
  (e: 'unfollowed'): void
}>()

const { user: authUser } = useAuth()
const isAuthed = computed(() => Boolean(authUser.value?.id))

// When signed out, never show follow controls anywhere.
const showFollowButton = computed(() => isAuthed.value && props.showFollowButton !== false)

const displayName = computed(() => props.user.name || props.user.username || 'User')
const handle = computed(() => (props.user.username ? `@${props.user.username}` : '@—'))

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: computed(() => props.user.username ?? ''),
})

function goToProfile() {
  if (!props.user.username) return
  void navigateTo(`/u/${encodeURIComponent(props.user.username)}`)
}
</script>

