<template>
  <Card class="moh-card moh-card-matte !rounded-2xl">
    <template #title>
      <span class="moh-h2">Trending topics</span>
    </template>
    <template #content>
      <div v-if="loading && tags.length === 0" class="space-y-0.5 animate-pulse" aria-hidden="true">
        <div v-for="i in 5" :key="i" class="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <div class="h-6 w-6 rounded-md bg-gray-200 dark:bg-zinc-800 shrink-0" />
          <div class="flex-1 space-y-1.5">
            <div class="h-3 bg-gray-200 dark:bg-zinc-800 rounded-full w-3/4" />
            <div class="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded-full w-1/2" />
          </div>
        </div>
      </div>

      <div v-else-if="error" class="text-sm moh-text-muted">
        {{ error }}
      </div>

      <div v-else-if="tags.length === 0" class="text-sm moh-text-muted">
        No tags yet.
      </div>

      <div v-else class="space-y-0.5">
        <NuxtLink
          v-for="(t, i) in tags"
          :key="`${t.slug}-${i}`"
          :to="`/topics/${encodeURIComponent(t.slug)}`"
          class="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10 moh-focus"
        >
          <div
            class="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black tabular-nums leading-none"
            :class="i === 0
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
              : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500'"
          >
            {{ i + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm moh-text truncate">
              {{ formatTaxonomyLabel(t.label) }}
            </div>
            <div class="moh-meta">
              {{ t.kind }}
            </div>
          </div>
          <Icon name="tabler:chevron-right" class="shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
        </NuxtLink>

        <NuxtLink
          to="/articles"
          class="flex items-center justify-between gap-2 border-t moh-border-subtle pt-3 mt-2 group moh-focus"
        >
          <span class="text-sm font-medium moh-text-muted group-hover:moh-text transition-colors">
            Browse all topics
          </span>
          <Icon name="tabler:chevron-right" class="text-xs moh-text-muted shrink-0" aria-hidden="true" />
        </NuxtLink>
      </div>
    </template>
  </Card>
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
