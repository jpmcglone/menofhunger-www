<template>
  <div class="space-y-4">
    <p class="moh-text-muted">Ask a question, offer encouragement, or share your experience.</p>
    <p v-if="loading" role="status">Loading conversations…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-else-if="!loading && !posts.length">No conversations yet. Try again soon.</p>
    <div class="moh-divide">
    <article v-for="post in posts" :key="post.id" class="py-4 space-y-3">
      <AppUserIdentityLine :user="post.author" :interactive="false" />
      <p class="whitespace-pre-wrap line-clamp-5">{{ post.body }}</p>
      <button type="button" class="min-h-11 w-full font-semibold" @click="$emit('reply', post)">Reply</button>
    </article>
    </div>
    <button type="button" class="min-h-11 w-full font-semibold" :disabled="loading" @click="load">{{ error ? 'Try again' : 'Refresh conversations' }}</button>
  </div>
</template>
<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
defineEmits<{ reply: [post: FeedPost] }>()
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const posts = ref<FeedPost[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let alive = true
async function load() {
  if (loading.value) return
  loading.value = true
  error.value = null
  const owner = user.value?.id
  try {
    const result = await apiFetchData<FeedPost[]>('/posts', { query: { limit: 20, sort: 'newest', visibility: 'all', topLevelOnly: true } })
    if (alive && owner === user.value?.id) posts.value = result.filter(post => post.author.id !== owner && !post.author.isOrganization && !post.author.isBot && post.viewerCanAccess !== false && Boolean(post.body))
  } catch (cause) {
    if (alive) error.value = getSafeUserErrorMessage(cause, 'Couldn’t load conversations. Try again.')
  } finally { loading.value = false }
}
onMounted(load)
onBeforeUnmount(() => { alive = false })
</script>
