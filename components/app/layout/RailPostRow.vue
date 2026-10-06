<template>
  <NuxtLink
    :to="href"
    class="moh-focus moh-surface-hover flex min-h-11 items-start gap-3 px-4 py-3 transition-colors"
    :aria-label="ariaLabel"
  >
    <AppUserAvatar :user="post.author" size-class="h-8 w-8" :show-status="false" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold moh-text">{{ authorName }}</p>
      <p v-if="excerpt" class="mt-0.5 line-clamp-2 text-sm moh-text-muted">{{ excerpt }}</p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

const props = defineProps<{ post: FeedPost }>()

const href = computed(() => boardPostHref(props.post) ?? `/p/${encodeURIComponent(props.post.id)}`)
const authorName = computed(() => props.post.author?.name?.trim() || props.post.author?.username || 'Member')
const excerpt = computed(() => {
  const body = props.post.body?.replace(/\s+/g, ' ').trim()
  if (body) return body
  if (props.post.media?.length) return 'Photo or video'
  return ''
})
const ariaLabel = computed(() => `${authorName.value}: ${excerpt.value || 'Post'}`)
</script>
