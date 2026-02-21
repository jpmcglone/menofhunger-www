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
      <div :class="['shrink-0 ring-2 ring-[color:var(--moh-surface-3)]', avatarRoundClass]">
        <AppUserAvatar :user="user" size-class="h-9 w-9" />
      </div>
      <AppUserIdentityLine :user="user" badge-size="xs" />
    </NuxtLink>

    <div v-else class="min-w-0 flex items-center gap-2.5">
      <div :class="['shrink-0 ring-2 ring-[color:var(--moh-surface-3)]', avatarRoundClass]">
        <AppUserAvatar :user="user" size-class="h-9 w-9" />
      </div>
      <AppUserIdentityLine :user="user" badge-size="xs" />
    </div>

    <div class="shrink-0">
      <AppFollowButton
        :user-id="user.id"
        :username="user.username"
        :initial-relationship="user.relationship"
        show-when-logged-out
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
import { avatarRoundClass as getAvatarRoundClass } from '~/utils/avatar-rounding'

const props = defineProps<{
  user: FollowListUser
}>()

const { user } = useUserOverlay(computed(() => props.user))

const emit = defineEmits<{
  (e: 'followed'): void
  (e: 'unfollowed'): void
}>()

const avatarRoundClass = computed(() => getAvatarRoundClass(Boolean(user.value?.isOrganization)))

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: computed(() => user.value?.username ?? ''),
})

// X-like pill button: dark mode = white pill, light mode = dark pill.
const followButtonClass =
  '!rounded-full !px-3 !py-1 !min-h-0 !text-xs !leading-none !font-semibold ' +
  '!bg-gray-900 !border-gray-900 !text-white ' +
  'dark:!bg-white dark:!border-white dark:!text-black'
</script>

