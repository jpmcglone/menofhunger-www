<template>
  <div class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
    <div class="flex items-center justify-between gap-3">
      <button
        type="button"
        class="min-w-0 flex-1 text-left"
        @click="goToProfile"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        <div class="flex items-center gap-3 min-w-0">
          <AppUserAvatar
            :user="user"
            size-class="h-10 w-10"
          />

          <div class="min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <div class="font-semibold truncate text-gray-900 dark:text-gray-50">
                {{ displayName }}
              </div>
              <AppVerifiedBadge :status="user.verifiedStatus" :premium="user.premium" />
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
              {{ handle }}
            </div>
          </div>
        </div>
      </button>

      <div class="shrink-0">
        <AppFollowButton
          v-if="showFollowButton"
          :user-id="user.id"
          :username="user.username"
          :initial-relationship="user.relationship"
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

const { user: authUser } = useAuth()
const isAuthed = computed(() => Boolean(authUser.value?.id))

// When signed out, never show follow controls anywhere.
const showFollowButton = computed(() => isAuthed.value && props.showFollowButton !== false)

const displayName = computed(() => props.user.name || props.user.username || 'User')
const handle = computed(() => (props.user.username ? `@${props.user.username}` : '@—'))

const { addInterest, removeInterest } = usePresence()
onMounted(() => {
  if (props.user?.id) addInterest([props.user.id])
})
onBeforeUnmount(() => {
  if (props.user?.id) removeInterest([props.user.id])
})

const pop = useUserPreviewPopover()
function onEnter(e: MouseEvent) {
  const u = (props.user.username ?? '').trim()
  if (!u) return
  pop.onTriggerEnter({ username: u, event: e })
}
function onMove(e: MouseEvent) {
  pop.onTriggerMove(e)
}
function onLeave() {
  pop.onTriggerLeave()
}

function goToProfile() {
  if (!props.user.username) return
  void navigateTo(`/u/${encodeURIComponent(props.user.username)}`)
}
</script>

