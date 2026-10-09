<template>
  <AppTrendingListCard
    title="Trending hashtags"
    :loading="loading"
    :error="error"
    :items="items"
    empty-text="No trends yet."
    footer-to="/hashtags/trending"
    footer-label="Show more hashtags"
  />
</template>

<script setup lang="ts">
import { formatShortCount } from '~/utils/text'
import type { GetTrendingHashtagsData, HashtagResult } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { formatHashtagLabel } from '~/utils/taxonomy-format'

const { apiFetch } = useApiClient()

const tags = ref<HashtagResult[]>([])
const items = computed(() => tags.value.map((t) => ({
  key: t.value,
  to: { path: '/explore', query: { q: `#${t.value}` } },
  label: formatHashtagLabel(t.label),
  meta: `${formatShortCount(t.usageCount)} posts lately`,
})))
const loading = ref(true)
const error = ref<string | null>(null)

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch<GetTrendingHashtagsData>('/hashtags/trending', {
      method: 'GET',
      query: { limit: 8 },
    })
    tags.value = (res.data ?? []).slice(0, 8)
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

