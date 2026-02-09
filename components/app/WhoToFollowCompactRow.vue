<template>
  <div class="flex items-center justify-between gap-3 py-1.5">
    <NuxtLink
      v-if="user.username"
      :to="`/u/${encodeURIComponent(user.username)}`"
      class="min-w-0 flex items-center gap-2.5 hover:opacity-95"
      :aria-label="`View @${user.username} profile`"
      @mouseenter="onEnter"
      @mousemove="onMove"
      @mouseleave="onLeave"
    >
      <AppUserAvatar :user="user" size-class="h-9 w-9" />
      <div class="min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <div class="text-sm font-semibold truncate text-gray-900 dark:text-gray-50">
            {{ displayName }}
          </div>
          <AppVerifiedBadge :status="user.verifiedStatus" :premium="user.premium" :premium-plus="user.premiumPlus" size="xs" />
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-300 truncate">
          {{ handle }}
        </div>
      </div>
    </NuxtLink>

    <div v-else class="min-w-0 flex items-center gap-2.5">
      <AppUserAvatar :user="user" size-class="h-9 w-9" />
      <div class="min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <div class="text-sm font-semibold truncate text-gray-900 dark:text-gray-50">
            {{ displayName }}
          </div>
          <AppVerifiedBadge :status="user.verifiedStatus" :premium="user.premium" :premium-plus="user.premiumPlus" size="xs" />
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-300 truncate">
          {{ handle }}
        </div>
      </div>
    </div>

    <div class="shrink-0">
      <AppFollowButton
        :user-id="user.id"
        :username="user.username"
        :initial-relationship="user.relationship"
        size="small"
        :show-icon="false"
        :button-class="followButtonClass"
        @followed="emit('followed')"
        @unfollowed="emit('unfollowed')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FollowListUser } from '~/types/api'
import { useUserOverlay } from '~/composables/useUserOverlay'

const props = defineProps<{
  user: FollowListUser
}>()

const { user } = useUserOverlay(computed(() => props.user))

const emit = defineEmits<{
  (e: 'followed'): void
  (e: 'unfollowed'): void
}>()

const displayName = computed(() => user.value?.name || user.value?.username || 'User')
const handle = computed(() => (user.value?.username ? `@${user.value.username}` : '@—'))

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: computed(() => user.value?.username ?? ''),
})

// X-like pill button: dark mode = white pill, light mode = dark pill.
const followButtonClass =
  '!rounded-full !px-3 !py-1 !min-h-0 !text-xs !leading-none !font-semibold ' +
  '!bg-gray-900 !border-gray-900 !text-white ' +
  'dark:!bg-white dark:!border-white dark:!text-black'
</script>

