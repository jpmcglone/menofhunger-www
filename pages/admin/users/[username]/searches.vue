<template>
  <div class="py-4 space-y-4">
    <AppAdminUserSubpageHeader
      title="User Searches"
      icon="tabler:search"
      description="Paginated admin view of user search history."
      :username="username"
    />

    <div v-if="loading" class="px-4 py-16 flex justify-center">
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
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'User Searches',
  middleware: 'admin',
  ssr: false,
})

const route = useRoute()
const { apiFetch } = useApiClient()
const username = computed(() => String(route.params.username ?? '').trim())
const items = ref<AdminUserRecentSearch[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

async function fetchPage(cursor?: string) {
  const res = await apiFetch<AdminUserRecentSearch[]>(
    `/admin/users/by-username/${encodeURIComponent(username.value)}/recent/searches`,
    { query: { limit: 25, cursor } },
  )
  return { data: res.data ?? [], next: res.pagination?.nextCursor ?? null }
}

async function loadInitial() {
  if (!username.value) return
  loading.value = true
  error.value = null
  try {
    const page = await fetchPage()
    items.value = page.data
    nextCursor.value = page.next
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load searches.'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await fetchPage(nextCursor.value)
    items.value = [...items.value, ...page.data]
    nextCursor.value = page.next
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load more searches.'
  } finally {
    loadingMore.value = false
  }
}

watch(() => username.value, () => void loadInitial(), { immediate: true })
</script>
