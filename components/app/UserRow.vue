<template>
  <div class="px-3 py-2.5 sm:px-4 sm:py-3 min-h-[44px] w-full hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
    <div class="w-full flex items-center gap-3">
      <NuxtLink
        v-if="profilePath"
        :to="profilePath"
        class="min-w-0 flex-1 text-left"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        <div class="flex items-center gap-3 min-w-0">
          <AppUserAvatar :user="user" size-class="h-10 w-10" />
          <AppUserIdentityLine :user="user">
            <template v-if="nameMeta" #after-name>
              <div class="shrink-0 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {{ nameMeta }}
              </div>
            </template>
          </AppUserIdentityLine>
        </div>
      </NuxtLink>
      <div
        v-else
        class="min-w-0 flex-1 text-left"
      >
        <div class="flex items-center gap-3 min-w-0">
          <AppUserAvatar :user="user" size-class="h-10 w-10" />
          <AppUserIdentityLine :user="user">
            <template v-if="nameMeta" #after-name>
              <div class="shrink-0 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {{ nameMeta }}
              </div>
            </template>
          </AppUserIdentityLine>
        </div>
      </div>

      <div v-if="showFollowButton" class="ml-auto shrink-0">
        <AppFollowButton
          :user-id="user.id"
          :username="user.username"
          :initial-relationship="user.relationship"
          :show-when-logged-out="props.allowLoggedOutFollowButton === true"
          size="small"
          button-class="!text-xs !py-1.5 !px-3"
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
  /** When true, show follow button even while logged out (click routes to login). */
  allowLoggedOutFollowButton?: boolean
  /** Optional label displayed inline next to name + badges. */
  nameMeta?: string | null
}>()

const { user } = useUserOverlay(computed(() => props.user))

const { isAuthed } = useAuth()

// When signed out, never show follow controls anywhere.
const showFollowButton = computed(() => props.showFollowButton !== false && (isAuthed.value || props.allowLoggedOutFollowButton === true))

const nameMeta = computed(() => (props.nameMeta ?? '').trim() || null)
const profilePath = computed(() => {
  if (!user.value?.username) return null
  return `/u/${encodeURIComponent(user.value.username)}`
})

const { addInterest, removeInterest } = usePresence()
onMounted(() => {
  if (user.value?.id) addInterest([user.value.id])
})
onBeforeUnmount(() => {
  if (user.value?.id) removeInterest([user.value.id])
})

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: computed(() => user.value?.username ?? ''),
})

</script>

