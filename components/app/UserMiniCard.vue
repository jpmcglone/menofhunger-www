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
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="font-semibold truncate text-gray-900 dark:text-gray-50">
              {{ displayName }}
            </div>
            <AppVerifiedBadge
              :status="user.verifiedStatus"
              :premium="user.premium"
              :premium-plus="user.premiumPlus"
              :is-organization="Boolean(user.isOrganization)"
              :steward-badge-enabled="user.stewardBadgeEnabled ?? true"
            />
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
            {{ handle }}
          </div>
        </div>
      </NuxtLink>
      <div
        v-else
        class="min-w-0 flex items-center gap-3 text-left"
      >
        <AppUserAvatar :user="user" size-class="h-10 w-10" />
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="font-semibold truncate text-gray-900 dark:text-gray-50">
              {{ displayName }}
            </div>
            <AppVerifiedBadge
              :status="user.verifiedStatus"
              :premium="user.premium"
              :premium-plus="user.premiumPlus"
              :is-organization="Boolean(user.isOrganization)"
              :steward-badge-enabled="user.stewardBadgeEnabled ?? true"
            />
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
            {{ handle }}
          </div>
        </div>
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

const { user: authUser } = useAuth()
const isAuthed = computed(() => Boolean(authUser.value?.id))

// When signed out, never show follow controls anywhere.
const showFollowButton = computed(() => isAuthed.value && props.showFollowButton !== false)

const displayName = computed(() => user.value?.name || user.value?.username || 'User')
const handle = computed(() => (user.value?.username ? `@${user.value.username}` : '@—'))
const profilePath = computed(() => {
  if (!user.value?.username) return null
  return `/u/${encodeURIComponent(user.value.username)}`
})

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: computed(() => user.value?.username ?? ''),
})

</script>

