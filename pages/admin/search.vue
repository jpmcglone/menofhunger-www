<template>
  <AppPageContent bottom="standard">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" title="Search"  description="Recent user searches.">
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
    </AppPageHeader>
  <div class="py-4 space-y-4">

    <div class="px-4 flex items-center gap-2">
      <InputText
        v-model="filterQuery"
        class="w-full"
        placeholder="Search search terms…"
        @keydown.enter.prevent="runFilter"
      />
      <Button
        label="Search"
        severity="secondary"
        :loading="loading"
        :disabled="loading"
        @click="runFilter"
      >
        <template #icon>
          <Icon name="tabler:search" aria-hidden="true" />
        </template>
      </Button>
    </div>

    <div v-if="error" class="px-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-if="searchedOnce && items.length === 0" class="px-4 text-sm text-gray-600 dark:text-gray-300">
      No searches found.
    </div>

    <div v-else class="moh-divide">
      <div
        v-for="row in items"
        :key="row.id"
        class="px-4 py-3 text-sm"
      >
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="font-medium text-gray-900 dark:text-gray-50">"{{ row.query }}"</span>
          <span class="text-gray-500 dark:text-gray-400">
            {{ row.user.name || row.user.username || 'User' }}
            <template v-if="row.user.username">@{{ row.user.username }}</template>
          </span>
          <NuxtLink
            v-if="row.user.username"
            :to="`/admin/users?q=${encodeURIComponent(row.user.username)}`"
            class="text-primary hover:underline"
          >
            View user
          </NuxtLink>
        </div>
        <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {{ formatSearchDate(row.createdAt) }}
        </div>
      </div>
    </div>

    <div v-if="nextCursor" class="flex justify-center py-4 px-4">
      <Button
        label="Load more"
        severity="secondary"
        :loading="loadingMore"
        :disabled="loadingMore"
        @click="loadMore"
      />
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { formatDateTime } from '~/utils/time-format'

definePageMeta({
  layout: 'app',
  title: 'Search',
  middleware: 'admin',
})

usePageSeo({
  title: 'Search',
  description: 'Recent user searches.',
  canonicalPath: '/admin/search',
  noindex: true,
})

type AdminSearchItem = {
  id: string
  query: string
  createdAt: string
  user: { id: string; username: string | null; name: string | null }
}

const filterQuery = ref('')
const { items, nextCursor, loading, loadingMore, hasLoaded: searchedOnce, error, refresh, loadMore } = useCursorFeed<AdminSearchItem>({
  stateKey: 'admin-searches',
  stateMode: 'local',
  clearOnError: true,
  buildRequest: (cursor) => {
    const query: Record<string, string> = { limit: '50' }
    if (filterQuery.value.trim()) query.q = filterQuery.value.trim()
    if (cursor) query.cursor = cursor
    return { path: '/admin/searches', query }
  },
  defaultErrorMessage: 'Failed to load searches.',
})

function formatSearchDate(iso: string) {
  return formatDateTime(iso, { dateStyle: 'short', timeStyle: 'short', fallback: iso })
}

function runFilter() {
  void refresh()
}

onMounted(() => {
  void refresh()
})
</script>
