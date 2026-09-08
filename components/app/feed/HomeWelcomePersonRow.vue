<template>
  <div class="flex items-center gap-3">
    <NuxtLink v-if="user.username" :to="`/u/${encodeURIComponent(user.username)}`" class="min-w-0 flex flex-1 items-center gap-3 min-h-11" :aria-label="`View @${user.username} profile`">
      <AppUserAvatar :user="user" size-class="h-10 w-10" :show-status="false" class="shrink-0" />
      <AppUserIdentityLine :user="user" badge-size="xs" :interactive="false" />
    </NuxtLink>
    <button v-if="user.username" type="button" class="follow-control" :disabled="busy" :aria-label="`${following ? 'Following' : 'Follow'} @${user.username}`" :aria-busy="busy" @click="toggle">
      {{ busy ? 'Saving…' : following ? 'Following' : user.relationship?.userFollowsViewer ? 'Follow back' : 'Follow' }}
    </button>
  </div>
  <p v-if="error" role="alert" class="text-xs moh-text-muted">{{ error }}</p>
</template>
<script setup lang="ts">
import type { FollowListUser } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const props = defineProps<{ user: FollowListUser }>()
const emit = defineEmits<{ followed: [] }>()
const follows = useFollowState()
const busy = ref(false)
const error = ref<string | null>(null)
const following = computed(() => follows.get(props.user.id)?.viewerFollowsUser ?? props.user.relationship?.viewerFollowsUser ?? false)
async function toggle() {
  if (busy.value || !props.user.username) return
  busy.value = true
  error.value = null
  try {
    const params = { userId: props.user.id, username: props.user.username }
    if (following.value) await follows.unfollow(params)
    else { await follows.follow(params); emit('followed') }
  } catch (cause) {
    error.value = getSafeUserErrorMessage(cause, 'Couldn’t update following. Try again.')
  } finally { busy.value = false }
}
</script>
<style scoped>
.follow-control { flex-shrink: 0; min-width: 104px; min-height: 46px; border: 1px solid var(--moh-border); border-radius: 999px; padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--moh-text); }
.follow-control:hover { background: var(--moh-surface-2); }
.follow-control:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
.follow-control:disabled { cursor: wait; opacity: .7; }
</style>
