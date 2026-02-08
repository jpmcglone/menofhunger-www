<template>
  <Card>
    <template #title>Trending hashtags</template>
    <template #content>
      <div v-if="loading && tags.length === 0" class="flex justify-center py-4">
        <AppLogoLoader />
      </div>

      <div v-else-if="error" class="text-sm moh-text-muted">
        {{ error }}
      </div>

      <div v-else-if="tags.length === 0" class="text-sm moh-text-muted">
        No trends yet.
      </div>

      <div v-else class="space-y-2">
        <NuxtLink
          v-for="t in tags"
          :key="t.value"
          :to="{ path: '/explore', query: { q: `#${t.value}` } }"
          class="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        >
          <div class="min-w-0">
            <div class="font-semibold text-sm text-gray-900 dark:text-gray-50 truncate">
              #{{ t.label }}
            </div>
            <div class="text-xs moh-text-muted">
              {{ formatCount(t.usageCount) }} posts lately
            </div>
          </div>
          <Icon name="tabler:chevron-right" class="shrink-0 text-gray-400" aria-hidden="true" />
        </NuxtLink>

        <NuxtLink
          to="/hashtags/trending"
          class="inline-block pt-2 text-sm font-medium hover:underline underline-offset-2 text-[var(--p-primary-color)]"
        >
          Show more
        </NuxtLink>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { GetTrendingHashtagsData, HashtagResult } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const { apiFetch } = useApiClient()

const tags = ref<HashtagResult[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

function formatCount(n: number): string {
  const num = Math.max(0, Math.floor(Number(n) || 0))
  const trim = (s: string) => (s.endsWith('.0') ? s.slice(0, -2) : s)
  if (num >= 1_000_000) return `${trim((num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1))}m`
  if (num >= 1_000) return `${trim((num / 1_000).toFixed(num >= 10_000 ? 0 : 1))}k`
  return String(num)
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch<GetTrendingHashtagsData>('/hashtags/trending', {
      method: 'GET',
      query: { limit: 8 } as any,
    })
    tags.value = ((res.data ?? []) as HashtagResult[]).slice(0, 8)
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load trending hashtags.'
    tags.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refresh()
})
</script>

