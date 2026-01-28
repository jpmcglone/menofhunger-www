<template>
  <div class="-mx-4">
    <AppInlineAlert v-if="errorText" class="mx-4 mt-4" severity="danger">
      {{ errorText }}
    </AppInlineAlert>

    <div v-else-if="post" class="-mx-0">
      <AppPostRow :post="post" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost, GetPostResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Post'
})

usePageSeo({
  title: 'Post',
  description: 'Post.'
})

const route = useRoute()
const postId = computed(() => String(route.params.id || '').trim())
const { apiFetchData } = useApiClient()

const post = ref<FeedPost | null>(null)
const errorText = ref<string | null>(null)

const { data, error } = await useAsyncData(`post:${postId.value}`, async () => {
  if (!postId.value) throw new Error('Post not found.')
  return await apiFetchData<GetPostResponse>(`/posts/${encodeURIComponent(postId.value)}`, { method: 'GET' })
})

post.value = data.value?.post ?? null
errorText.value = error.value ? (getApiErrorMessage(error.value) || 'Failed to load post.') : null
</script>

