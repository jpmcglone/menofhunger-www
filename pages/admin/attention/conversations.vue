<template>
  <section>
    <header class="moh-gutter-x space-y-4 py-5">
      <NuxtLink to="/admin/attention" class="inline-flex min-h-11 items-center gap-2 text-sm moh-text-muted hover:underline">
        <Icon name="tabler:arrow-left" aria-hidden="true" /> Attention inbox
      </NuxtLink>
      <h1 class="text-2xl font-semibold">Conversations needing a reply</h1>
      <p class="text-sm moh-text-muted">Public posts from the past 14 days with no human replies. Member posts are listed first.</p>
      <Button label="Refresh" severity="secondary" rounded size="small" class="min-h-11" :loading="loading" @click="refresh" />
    </header>
    <div v-if="error" role="alert" class="moh-gutter-x space-y-3 py-5">
      <h2 class="text-lg font-semibold">Could not load conversations.</h2>
      <p class="text-sm moh-text-muted">Try again to refresh this queue.</p>
      <Button label="Try again" severity="secondary" rounded size="small" class="min-h-11" :loading="loading" @click="refresh" />
    </div>
    <div v-if="!data && loading" class="moh-gutter-x space-y-4 py-6" role="status" aria-label="Loading conversations">
      <Skeleton v-for="n in 4" :key="n" height="5rem" />
    </div>
    <template v-if="data">
      <div v-if="!data.unansweredPosts.length && !error" class="moh-gutter-x space-y-3 py-5">
        <h2 class="text-lg font-semibold">No conversations need a first reply.</h2>
        <p class="text-sm moh-text-muted">New conversations will appear here as they need attention.</p>
      </div>
      <template v-if="data.unansweredPosts.length">
        <div class="moh-gutter-x space-y-3 py-5" aria-live="polite">
          <p class="text-sm font-semibold">Showing the oldest {{ data.unansweredPosts.length }} of {{ unansweredCount }} posts</p>
          <p v-if="unansweredCount > data.unansweredPosts.length" class="text-sm moh-text-muted">More posts appear as conversations receive their first human reply.</p>
        </div>
        <div class="moh-divide border-t moh-border">
          <NuxtLink
            v-for="post in data.unansweredPosts" :key="post.id" :to="`/p/${post.id}`"
            class="moh-gutter-x block space-y-3 py-5 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <p class="text-sm font-semibold">@{{ post.username || 'member' }} · <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time></p>
            <p class="line-clamp-3 break-words text-sm">{{ post.body || 'Open this post to view its content.' }}</p>
            <span class="inline-flex items-center gap-1 text-sm font-semibold">Open post <Icon name="tabler:arrow-right" aria-hidden="true" /></span>
          </NuxtLink>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { usePrivateApiData } from '~/composables/usePrivateApiData'
import type { AdminAttentionDto } from '~/types/api'

// Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=389-3
definePageMeta({ layout: 'app', middleware: ['admin'] })
useHead({ title: 'Conversations needing a reply' })
const { data, loading, error, refresh } = usePrivateApiData<AdminAttentionDto>('/admin/operations/attention')
const unansweredCount = computed(() => data.value?.items.find(item => item.id === 'unanswered')?.count ?? 0)
const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
</script>
