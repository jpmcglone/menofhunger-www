<template>
  <AppTrendingListCard
    title="Trending topics"
    :loading="loading"
    :error="error"
    :items="items"
    empty-text="No tags yet."
    footer-to="/articles"
    footer-label="Browse all topics"
  />
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
import { formatTaxonomyLabel } from '~/utils/taxonomy-format'

type TrendingArticleTag = {
  slug: string
  label: string
  kind: 'topic' | 'subtopic' | 'tag'
  score: number
}

const { apiFetchData } = useApiClient()

const tags = ref<TrendingArticleTag[]>([])
const items = computed(() => tags.value.map((t) => ({
  key: t.slug,
  to: `/topics/${encodeURIComponent(t.slug)}`,
  label: formatTaxonomyLabel(t.label),
  meta: t.kind,
})))
const loading = ref(true)
const error = ref<string | null>(null)

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetchData<TrendingArticleTag[]>('/taxonomy/search', {
      method: 'GET',
      query: { q: '', limit: 10 },
    })
    tags.value = (res ?? []).slice(0, 10)
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load trending tags.'
    tags.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refresh()
})
</script>
