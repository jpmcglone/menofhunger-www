<template>
  <div class="py-4 space-y-4">
    <AppAdminUserSubpageHeader
      title="User Searches"
      icon="tabler:search"
      description="Paginated admin view of user search history."
      :username="username"
    />

    <div v-if="initialLoading" class="px-4 py-16 flex justify-center">
      <AppLogoLoader :size="48" />
    </div>

    <template v-else>
      <div v-if="error" class="px-4">
        <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
      </div>

      <div class="px-4 space-y-3">
        <div v-if="items.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No searches found.</div>
        <div
          v-for="s in items"
          :key="s.id"
          class="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2"
        >
          <div class="text-sm font-mono break-words">{{ s.query }}</div>
          <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ formatDateTime(s.createdAt) }}</div>
        </div>
      </div>

      <div v-if="nextCursor" class="px-4">
        <Button label="Load more" severity="secondary" :loading="loadingMore" :disabled="loadingMore" @click="loadMore" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AdminUserRecentSearch } from '~/types/api'
import { formatDateTime } from '~/utils/time-format'

definePageMeta({
  layout: 'app',
  title: 'User Searches',
  middleware: 'admin',
})

const route = useRoute()
const username = computed(() => String(route.params.username ?? '').trim())
const { items, nextCursor, loadingMore, error, initialLoading, refresh, loadMore } = useCursorFeed<AdminUserRecentSearch>({
  stateKey: 'admin-user-searches',
  stateMode: 'local',
  buildRequest: (cursor) => username.value
    ? { path: `/admin/users/by-username/${encodeURIComponent(username.value)}/recent/searches`, query: { limit: 25, cursor: cursor ?? undefined } }
    : null,
  defaultErrorMessage: 'Failed to load searches.',
  loadMoreErrorMessage: 'Failed to load more searches.',
})

watch(() => username.value, () => void refresh(), { immediate: true })
</script>
