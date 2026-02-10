<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="px-4 pt-4 pb-2">
        <AppPageHeader
          title="Trending hashtags"
          icon="tabler:hash"
          description="What’s being talked about lately."
        />
      </div>

      <div v-if="error" class="px-4 pb-3">
        <AppInlineAlert severity="warning">
          {{ error }}
        </AppInlineAlert>
      </div>

      <div v-if="loading && tags.length === 0" class="flex justify-center py-12">
        <AppLogoLoader />
      </div>

      <div v-else-if="tags.length === 0" class="px-4 py-6 text-sm moh-text-muted">
        No trends yet.
      </div>

      <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
        <NuxtLink
          v-for="t in tags"
          :key="t.value"
          :to="{ path: '/explore', query: { q: `#${t.value}` } }"
          class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
        >
          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">#{{ t.label }}</div>
              <div class="text-xs moh-text-muted">{{ formatCount(t.usageCount) }} posts lately</div>
            </div>
            <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
          </div>
        </NuxtLink>
      </div>

      <div class="px-4 py-6 flex justify-center">
        <Button
          v-if="nextCursor"
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
import type { GetTrendingHashtagsData, HashtagResult } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Trending hashtags',
  hideTopBar: true,
})

usePageSeo({
  title: 'Trending hashtags',
  description: 'Trending hashtags on Men of Hunger.',
  canonicalPath: '/hashtags/trending',
  noindex: true,
})

const { apiFetch } = useApiClient()

const tags = ref<HashtagResult[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

function formatCount(n: number): string {
  const num = Math.max(0, Math.floor(Number(n) || 0))
  const trim = (s: string) => (s.endsWith('.0') ? s.slice(0, -2) : s)
  if (num >= 1_000_000) return `${trim((num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1))}m`
  if (num >= 1_000) return `${trim((num / 1_000).toFixed(num >= 10_000 ? 0 : 1))}k`
  return String(num)
}

async function fetchPage(cursor: string | null) {
  const res = await apiFetch<GetTrendingHashtagsData>('/hashtags/trending', {
    method: 'GET',
    query: { limit: 30, cursor },
  })
  return {
    items: res.data ?? [],
    next: res.pagination?.nextCursor ?? null,
  }
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const r = await fetchPage(null)
    tags.value = r.items
    nextCursor.value = r.next
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load trending hashtags.'
    tags.value = []
    nextCursor.value = null
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  const c = nextCursor.value
  if (!c || loadingMore.value) return
  loadingMore.value = true
  error.value = null
  try {
    const r = await fetchPage(c)
    const existing = new Set(tags.value.map((t) => t.value))
    for (const t of r.items) {
      if (!existing.has(t.value)) tags.value.push(t)
    }
    nextCursor.value = r.next
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load more.'
  } finally {
    loadingMore.value = false
  }
}

if (import.meta.server) await refresh()
onMounted(() => {
  // Avoid duplicate fetch after SSR/hydration; only refetch if we have no data.
  if (tags.value.length === 0 && !loading.value) void refresh()
})
</script>

