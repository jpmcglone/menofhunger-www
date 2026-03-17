<template>
  <div class="moh-card moh-card-matte rounded-2xl overflow-hidden">
    <!-- Header -->
    <div class="px-4 pt-4 pb-2">
      <span class="moh-h2">Trending Articles</span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && articles.length === 0" class="animate-pulse" aria-hidden="true">
      <div v-for="i in 4" :key="i" class="flex items-center gap-2.5 border-t moh-border-subtle pl-3 pr-4 py-3">
        <div class="h-6 w-6 rounded-md bg-gray-200 dark:bg-zinc-800 shrink-0" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 bg-gray-200 dark:bg-zinc-800 rounded-full w-full" />
          <div class="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded-full w-24" />
        </div>
        <div class="h-9 w-14 rounded-md bg-gray-200 dark:bg-zinc-800 shrink-0" />
      </div>
      <div class="border-t moh-border-subtle px-4 py-3">
        <div class="h-3 w-40 bg-gray-200 dark:bg-zinc-800 rounded-full" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="articles.length === 0" class="px-4 pb-4 text-sm moh-text-muted">
      No trending articles yet.
    </div>

    <!-- Rows: compact right-rail variant -->
    <div v-else>
      <NuxtLink
        v-for="(article, i) in articles"
        :key="article.id"
        :to="`/a/${article.id}`"
        :class="['relative flex items-center gap-3 border-t moh-border-subtle pl-3 pr-4 py-3 transition-colors moh-focus', rowHoverClass(article)]"
      >
        <div :class="['absolute right-0 top-0 bottom-0 w-[3px]', accentBarClass(article)]" aria-hidden="true" />

        <!-- Rank number -->
        <div
          class="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black tabular-nums leading-none"
          :class="i === 0
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
            : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500'"
        >
          {{ i + 1 }}
        </div>

        <div class="flex-1 min-w-0">
          <p class="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
            {{ article.title }}
          </p>
          <p class="mt-0.5 text-xs moh-text-muted truncate">
            {{ article.author.name || article.author.username }}
          </p>
        </div>

        <img
          v-if="article.thumbnailUrl"
          :src="article.thumbnailUrl"
          :alt="article.title"
          class="shrink-0 w-14 rounded-md object-cover border border-gray-200 dark:border-zinc-700"
          style="aspect-ratio: 16/9;"
        >
      </NuxtLink>

      <!-- Footer link -->
      <div class="border-t moh-border-subtle px-4 py-3">
        <NuxtLink
          to="/articles?sort=trending"
          class="flex items-center justify-between gap-2 group moh-focus"
        >
          <span class="text-sm font-medium moh-text-muted group-hover:moh-text transition-colors">
            Browse trending articles
          </span>
          <Icon name="tabler:chevron-right" class="text-xs moh-text-muted shrink-0" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'
import { articleVisibilityBarClass, articleVisibilityHoverClass } from '~/utils/article-visibility'

const { apiFetchData } = useApiClient()

const articles = ref<Article[]>([])
const loading = ref(true)

async function refresh() {
  loading.value = true
  try {
    const res = await apiFetchData<Article[]>('/articles', {
      query: {
        limit: 4,
        sort: 'trending',
        includeRestricted: true,
      },
    })
    articles.value = Array.isArray(res) ? res : []
  } catch {
    articles.value = []
  } finally {
    loading.value = false
  }
}

let refreshTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  stopPolling()
  refreshTimer = setInterval(() => {
    if (!document.hidden) void refresh()
  }, 2 * 60 * 1000)
}

function stopPolling() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function onVisibilityChange() {
  if (!document.hidden) void refresh()
}

onMounted(() => {
  void refresh()
  startPolling()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

const accentBarClass = (article: Article) => articleVisibilityBarClass(article.visibility)
const rowHoverClass = (article: Article) => articleVisibilityHoverClass(article.visibility)

</script>
