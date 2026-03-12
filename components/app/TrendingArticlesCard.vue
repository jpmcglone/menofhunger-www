<template>
  <div class="moh-card moh-card-matte rounded-2xl overflow-hidden">
    <!-- Header -->
    <div class="px-4 pt-4 pb-2">
      <span class="moh-h2">Trending Articles</span>
    </div>

    <!-- Loading -->
    <div v-if="loading && articles.length === 0" class="flex justify-center py-4 px-4">
      <AppLogoLoader />
    </div>

    <!-- Empty -->
    <div v-else-if="articles.length === 0" class="px-4 pb-4 text-sm moh-text-muted">
      No trending articles yet.
    </div>

    <!-- Rows: compact right-rail variant -->
    <div v-else>
      <NuxtLink
        v-for="article in articles"
        :key="article.id"
        :to="`/a/${article.id}`"
        :class="['relative flex items-center gap-3 border-t border-gray-200 dark:border-zinc-800 pl-4 pr-5 py-3 transition-colors moh-focus', rowHoverClass(article)]"
      >
        <div :class="['absolute right-0 top-0 bottom-0 w-[3px]', accentBarClass(article)]" aria-hidden="true" />

        <div class="flex-1 min-w-0">
          <p class="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
            {{ article.title }}
          </p>
          <p class="mt-0.5 text-xs moh-text-muted truncate">
            by {{ article.author.name || article.author.username }}
          </p>
        </div>

        <img
          v-if="article.thumbnailUrl"
          :src="article.thumbnailUrl"
          :alt="article.title"
          class="shrink-0 w-16 rounded object-cover border border-gray-200 dark:border-zinc-700"
          style="aspect-ratio: 16/9;"
        >
      </NuxtLink>

      <!-- Footer link -->
      <div class="border-t border-gray-200 dark:border-zinc-800 px-4 py-3">
        <NuxtLink
          to="/articles?sort=trending"
          class="text-sm font-medium hover:underline underline-offset-2 text-[var(--p-primary-color)] moh-focus"
        >
          Browse trending articles
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'

const { apiFetchData } = useApiClient()

const articles = ref<Article[]>([])
const loading = ref(false)

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

function accentBarClass(article: Article): string {
  if (article.visibility === 'premiumOnly') return 'bg-orange-500'
  if (article.visibility === 'verifiedOnly') return 'bg-blue-500'
  return 'bg-transparent'
}

function rowHoverClass(article: Article): string {
  if (article.visibility === 'premiumOnly') return 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
  if (article.visibility === 'verifiedOnly') return 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
  return 'hover:bg-gray-50 dark:hover:bg-white/5'
}

</script>
