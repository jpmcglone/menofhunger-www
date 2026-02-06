<template>
  <div class="py-4 space-y-4">
    <div class="px-4">
      <AppPageHeader title="Search" icon="pi-search" description="Recent user searches.">
      <template #leading>
        <Button
          class="md:hidden"
          text
          severity="secondary"
          icon="pi pi-chevron-left"
          aria-label="Back"
          @click="navigateTo('/admin')"
        />
      </template>
      </AppPageHeader>
    </div>

    <div class="px-4 flex items-center gap-2">
      <InputText
        v-model="filterQuery"
        class="w-full"
        placeholder="Search search terms…"
        @keydown.enter.prevent="runFilter"
      />
      <Button
        label="Search"
        icon="pi pi-search"
        severity="secondary"
        :loading="loading"
        :disabled="loading"
        @click="runFilter"
      />
    </div>

    <div v-if="error" class="px-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-if="searchedOnce && items.length === 0" class="px-4 text-sm text-gray-600 dark:text-gray-300">
      No searches found.
    </div>

    <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
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
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
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

const { apiFetch } = useApiClient()

const filterQuery = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const searchedOnce = ref(false)
const error = ref<string | null>(null)
const items = ref<AdminSearchItem[]>([])
const nextCursor = ref<string | null>(null)

function formatSearchDate(iso: string) {
  return formatDateTime(iso, { dateStyle: 'short', timeStyle: 'short', fallback: iso })
}

async function fetchPage(params: { cursor: string | null; append: boolean }) {
  if (params.append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  error.value = null
  if (!params.append) searchedOnce.value = true

  try {
    const query: Record<string, string> = {
      limit: '50',
    }
    if (filterQuery.value.trim()) query.q = filterQuery.value.trim()
    if (params.cursor) query.cursor = params.cursor

    const res = await apiFetch<AdminSearchItem[]>('/admin/searches', {
      method: 'GET',
      query,
    })

    const data = (res.data ?? []) as AdminSearchItem[]
    if (params.append) {
      items.value = [...items.value, ...data]
    } else {
      items.value = data
    }
    nextCursor.value = (res.pagination as { nextCursor?: string | null })?.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load searches.'
    if (!params.append) items.value = []
    nextCursor.value = null
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function runFilter() {
  nextCursor.value = null
  void fetchPage({ cursor: null, append: false })
}

function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  void fetchPage({ cursor: nextCursor.value, append: true })
}

onMounted(() => {
  void fetchPage({ cursor: null, append: false })
})
</script>
