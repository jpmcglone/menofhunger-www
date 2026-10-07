<template>
  <div class="py-4 space-y-4">
    <AppAdminUserSubpageHeader
      title="User Posts"
      icon="tabler:message-circle"
      description="Paginated admin view of user posts and replies."
      :username="username"
    />

    <div v-if="initialLoading" class="px-4 py-16 flex justify-center">
      <AppLogoLoader :size="48" />
    </div>

    <template v-else>
      <div v-if="error" class="px-4">
        <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
      </div>

      <div class="px-4 space-y-2">
        <div v-if="items.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No posts found.</div>
        <NuxtLink
          v-for="p in items"
          :key="p.id"
          :to="`/p/${encodeURIComponent(p.id)}`"
          class="block rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
        >
          <div class="text-sm whitespace-pre-wrap break-words">{{ p.body }}</div>
          <div class="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{{ formatDateTime(p.createdAt) }}</span>
            <span>&middot;</span>
            <span class="inline-flex items-center gap-1"><Icon name="tabler:message-circle" aria-hidden="true" />{{ p.commentCount }}</span>
            <span class="inline-flex items-center gap-1"><Icon name="tabler:arrow-up" aria-hidden="true" />{{ p.boostCount }}</span>
          </div>
        </NuxtLink>
      </div>

      <div v-if="nextCursor" class="px-4">
        <Button label="Load more" severity="secondary" :loading="loadingMore" :disabled="loadingMore" @click="loadMore" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AdminUserRecentPost } from '~/types/api'
import { formatDateTime } from '~/utils/time-format'

definePageMeta({
  layout: 'app',
  title: 'User Posts',
  middleware: 'admin',
})

const route = useRoute()
const username = computed(() => String(route.params.username ?? '').trim())
const { items, nextCursor, loadingMore, error, initialLoading, refresh, loadMore } = useCursorFeed<AdminUserRecentPost>({
  stateKey: 'admin-user-posts',
  stateMode: 'local',
  buildRequest: (cursor) => username.value
    ? { path: `/admin/users/by-username/${encodeURIComponent(username.value)}/recent/posts`, query: { limit: 25, cursor: cursor ?? undefined } }
    : null,
  defaultErrorMessage: 'Failed to load posts.',
  loadMoreErrorMessage: 'Failed to load more posts.',
})

watch(() => username.value, () => void refresh(), { immediate: true })
</script>
