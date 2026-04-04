<template>
  <AppPageContent bottom="standard">
    <div class="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-zinc-800">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
        Topic
      </div>
      <div class="mt-1 flex items-center gap-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ termLabel }}
        </h1>
        <span
          class="inline-flex items-center rounded-full border border-gray-200 dark:border-zinc-700 px-2 py-0.5 text-xs text-gray-500 dark:text-zinc-400"
        >
          {{ feed.articles.value.length }} article{{ feed.articles.value.length === 1 ? '' : 's' }}
        </span>
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
        Articles connected to {{ termLabel }}.
      </p>
    </div>

    <AppSubtleSectionLoader :loading="initialLoading" min-height-class="min-h-[220px]">
      <div v-if="feed.error.value" class="py-8 text-center text-sm text-red-500">
        {{ feed.error.value }}
      </div>
      <div v-else>
        <TransitionGroup name="term-articles-list" tag="div">
          <AppArticleListCard
            v-for="article in feed.articles.value"
            :key="article.id"
            :article="article"
          />
        </TransitionGroup>
        <button
          v-if="feed.nextCursor.value"
          type="button"
          class="w-full border-t border-gray-200 dark:border-zinc-800 py-3 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
          :disabled="feed.loadingMore.value"
          @click="feed.loadMore()"
        >
          {{ feed.loadingMore.value ? 'Loading...' : 'Load more' }}
        </button>
        <p v-if="feed.hasLoadedOnce.value && feed.articles.value.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
          No articles found for this topic.
          <NuxtLink to="/articles" class="font-medium hover:underline">Browse all articles</NuxtLink>
        </p>
      </div>
    </AppSubtleSectionLoader>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', hideTopBar: true })

type TaxonomyMatch = {
  id: string
  slug: string
  label: string
  kind: 'topic' | 'subtopic' | 'tag'
}

const route = useRoute()
const { apiFetchData } = useApiClient()

const termSlug = computed(() => String(route.params.slug ?? '').trim().toLowerCase())

function toPrettyLabel(slug: string): string {
  if (!slug) return 'topic'
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Server-side taxonomy fetch — runs on SSR so usePageSeo gets a real label for
// og:title / JSON-LD. The reactive key re-fetches on client-side slug changes.
const { data: termData } = await useAsyncData(
  () => `topic-${termSlug.value}`,
  () => apiFetchData<TaxonomyMatch[]>('/taxonomy/search', {
    method: 'GET',
    query: { q: termSlug.value, limit: 10 },
  }).catch(() => null),
)

const term = computed(() =>
  (termData.value ?? []).find((r: TaxonomyMatch) => r.slug === termSlug.value) ?? null,
)

const termLabel = computed(() => term.value?.label || toPrettyLabel(termSlug.value))

const feed = useArticleFeed({
  tag: computed(() => termSlug.value || null),
})

const initialLoading = computed(
  () => (feed.loading.value || !feed.hasLoadedOnce.value) && feed.articles.value.length === 0,
)

usePageSeo({
  title: computed(() => `${termLabel.value}`),
  description: computed(() => `Read ${termLabel.value} articles on Men of Hunger.`),
  canonicalPath: computed(() => `/topics/${encodeURIComponent(termSlug.value)}`),
  jsonLdGraph: computed(() => [
    {
      '@type': 'CollectionPage',
      '@id': `https://menofhunger.com/topics/${encodeURIComponent(termSlug.value)}#webpage`,
      url: `https://menofhunger.com/topics/${encodeURIComponent(termSlug.value)}`,
      name: `${termLabel.value} - Men of Hunger`,
      description: `Articles connected to ${termLabel.value} on Men of Hunger.`,
      isPartOf: { '@id': 'https://menofhunger.com/#website' },
      inLanguage: 'en-US',
    },
  ]),
})

watch(termSlug, async () => {
  await feed.load({ force: true })
}, { immediate: true })
</script>

<style scoped>
.term-articles-list-enter-active,
.term-articles-list-leave-active {
  transition: opacity 0.2s ease;
}

.term-articles-list-enter-from,
.term-articles-list-leave-to {
  opacity: 0;
}

.term-articles-list-move {
  transition: transform 0.25s ease;
}
</style>
