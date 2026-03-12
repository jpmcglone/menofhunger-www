<template>
  <div
    v-if="shouldShow"
    class="my-10 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 dark:border-zinc-700 dark:from-zinc-800/60 dark:to-zinc-900"
  >
    <div class="flex items-center gap-4">
      <NuxtLink :to="`/u/${author.username}`" class="flex-shrink-0">
        <AppUserAvatar :user="author" size="lg" />
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-gray-900 dark:text-gray-100">
          {{ author.name || author.username || 'This author' }}
        </p>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
          Follow to get their articles delivered to your feed.
        </p>
      </div>
      <Button
        :label="following ? 'Following' : 'Follow'"
        :severity="following ? 'secondary' : 'primary'"
        rounded
        size="small"
        :loading="inflight"
        @click="toggle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArticleAuthor } from '~/types/api'

const props = defineProps<{
  author: ArticleAuthor
  viewerIsAuthor: boolean
}>()

const { user, isAuthed } = useAuth()
const followState = useFollowState()

const authorId = computed(() => props.author.id)
const authorUsername = computed(() => props.author.username ?? '')
const rel = computed(() => followState.get(authorId.value))
const following = computed(() => Boolean(rel.value?.viewerFollowsUser))
const inflight = computed(() => Boolean(followState.inflight.value[`follow:${authorId.value}`]))

const shouldShow = computed(() => {
  if (!isAuthed.value) return false
  if (props.viewerIsAuthor) return false
  if (following.value) return false
  return true
})

async function toggle() {
  if (!authorUsername.value) return
  if (following.value) {
    await followState.unfollow({ userId: authorId.value, username: authorUsername.value })
  } else {
    await followState.follow({ userId: authorId.value, username: authorUsername.value })
  }
}

// Load follow status on mount
const { apiFetchData } = useApiClient()
onMounted(async () => {
  if (!isAuthed.value || !authorUsername.value || props.viewerIsAuthor) return
  if (rel.value !== null) return
  try {
    const r = await apiFetchData<{ viewerFollowsUser: boolean; userFollowsViewer: boolean }>(
      `/follows/status/${encodeURIComponent(authorUsername.value)}`,
    )
    followState.upsert(authorId.value, { viewerFollowsUser: Boolean(r.viewerFollowsUser) })
  } catch {
    // best effort
  }
})
</script>
