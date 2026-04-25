<template>
  <div class="moh-card moh-card-matte rounded-2xl overflow-hidden">
    <!-- Header with tabs.
         Tabs replace three separate "Trending X" cards. The user reads one
         "Trending" label and then chooses surface (Articles / Topics / Hashtags)
         instead of scanning three card titles. -->
    <div class="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
      <span class="moh-h2">Trending</span>
    </div>
    <div role="tablist" aria-label="Trending content" class="px-2 pb-2 flex items-center gap-1">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="active === tab.id"
        :class="[
          'moh-pressable inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors moh-focus',
          active === tab.id
            ? 'bg-black/[0.06] text-gray-900 dark:bg-white/10 dark:text-white'
            : 'text-gray-500 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:bg-white/5',
        ]"
        @click="setActive(tab.id)"
      >
        <Icon :name="tab.icon" class="text-sm" aria-hidden="true" />
        {{ tab.label }}
      </button>
    </div>

    <div
      class="rail-trending-card-body"
      :class="{ 'rail-trending-card-body--ready': bodyAnimationReady }"
      :style="bodyHeightStyle"
    >
      <div ref="bodyContent" :key="active" class="rail-trending-card-body__content">
        <!-- Articles -->
        <div v-if="active === 'articles'">
          <div v-if="articles.loading && articles.items.length === 0" class="animate-pulse" aria-hidden="true">
            <div v-for="i in RAIL_TRENDING_ITEM_COUNT" :key="i" class="flex items-center gap-2.5 border-t moh-border-subtle pl-3 pr-4 py-3">
              <div class="h-6 w-6 rounded-md bg-gray-200 dark:bg-zinc-800 shrink-0" />
              <div class="flex-1 space-y-1.5">
                <div class="h-3 bg-gray-200 dark:bg-zinc-800 rounded-full w-full" />
                <div class="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded-full w-24" />
              </div>
              <div class="h-9 w-14 rounded-md bg-gray-200 dark:bg-zinc-800 shrink-0" />
            </div>
          </div>

          <div v-else-if="articles.items.length === 0" class="px-4 pb-4 text-sm moh-text-muted">
            No trending articles yet.
          </div>

          <template v-else>
            <NuxtLink
              v-for="(article, i) in articles.items"
              :key="article.id"
              :to="`/a/${article.id}`"
              :class="['relative flex items-center gap-3 border-t moh-border-subtle pl-3 pr-4 py-3 transition-colors moh-focus', articleHoverClass(article)]"
            >
              <div :class="['absolute right-0 top-0 bottom-0 w-[3px]', articleAccentBarClass(article)]" aria-hidden="true" />
              <div
                class="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black tabular-nums leading-none"
                :class="rankPillClass(i)"
              >{{ i + 1 }}</div>
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
                class="shrink-0 w-14 rounded-md object-cover moh-img-outline"
                style="aspect-ratio: 16/9;"
              >
            </NuxtLink>

            <div class="border-t moh-border-subtle px-4 py-3">
              <NuxtLink to="/articles?sort=trending" class="flex items-center justify-between gap-2 group moh-focus">
                <span class="text-sm font-medium moh-text-muted group-hover:moh-text transition-colors">
                  Browse trending articles
                </span>
                <Icon name="tabler:chevron-right" class="text-xs moh-text-muted shrink-0" aria-hidden="true" />
              </NuxtLink>
            </div>
          </template>
        </div>

        <!-- Topics (article tags) -->
        <div v-else-if="active === 'topics'">
          <div v-if="topics.loading && topics.items.length === 0" class="animate-pulse" aria-hidden="true">
            <div v-for="i in RAIL_TRENDING_ITEM_COUNT" :key="i" class="flex items-center gap-2.5 border-t moh-border-subtle pl-3 pr-4 py-3">
              <div class="h-6 w-6 rounded-md bg-gray-200 dark:bg-zinc-800 shrink-0" />
              <div class="flex-1 space-y-1.5">
                <div class="h-3 bg-gray-200 dark:bg-zinc-800 rounded-full w-3/4" />
                <div class="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded-full w-1/2" />
              </div>
            </div>
          </div>

          <div v-else-if="topics.error" class="px-4 pb-4 text-sm moh-text-muted">{{ topics.error }}</div>
          <div v-else-if="topics.items.length === 0" class="px-4 pb-4 text-sm moh-text-muted">No topics yet.</div>

          <template v-else>
            <NuxtLink
              v-for="(t, i) in topics.items"
              :key="`${t.slug}-${i}`"
              :to="`/topics/${encodeURIComponent(t.slug)}`"
              class="flex items-center gap-2.5 border-t moh-border-subtle pl-3 pr-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/10 moh-focus"
            >
              <div
                class="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black tabular-nums leading-none"
                :class="rankPillClass(i)"
              >{{ i + 1 }}</div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm moh-text truncate">
                  {{ formatTaxonomyLabel(t.label) }}
                </div>
                <div class="moh-meta">{{ t.kind }}</div>
              </div>
              <Icon name="tabler:chevron-right" class="shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
            </NuxtLink>

            <div class="border-t moh-border-subtle px-4 py-3">
              <NuxtLink to="/articles" class="flex items-center justify-between gap-2 group moh-focus">
                <span class="text-sm font-medium moh-text-muted group-hover:moh-text transition-colors">
                  Browse all topics
                </span>
                <Icon name="tabler:chevron-right" class="text-xs moh-text-muted shrink-0" aria-hidden="true" />
              </NuxtLink>
            </div>
          </template>
        </div>

        <!-- Hashtags -->
        <div v-else-if="active === 'hashtags'">
          <div v-if="hashtags.loading && hashtags.items.length === 0" class="animate-pulse" aria-hidden="true">
            <div v-for="i in RAIL_TRENDING_ITEM_COUNT" :key="i" class="flex items-center gap-2.5 border-t moh-border-subtle pl-3 pr-4 py-3">
              <div class="h-6 w-6 rounded-md bg-gray-200 dark:bg-zinc-800 shrink-0" />
              <div class="flex-1 space-y-1.5">
                <div class="h-3 bg-gray-200 dark:bg-zinc-800 rounded-full w-3/4" />
                <div class="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded-full w-1/2" />
              </div>
            </div>
          </div>

          <div v-else-if="hashtags.error" class="px-4 pb-4 text-sm moh-text-muted">{{ hashtags.error }}</div>
          <div v-else-if="hashtags.items.length === 0" class="px-4 pb-4 text-sm moh-text-muted">No trends yet.</div>

          <template v-else>
            <NuxtLink
              v-for="(t, i) in hashtags.items"
              :key="`${t.value}-${i}`"
              :to="{ path: '/explore', query: { q: `#${t.value}` } }"
              class="flex items-center gap-2.5 border-t moh-border-subtle pl-3 pr-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/10 moh-focus"
            >
              <div
                class="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black tabular-nums leading-none"
                :class="rankPillClass(i)"
              >{{ i + 1 }}</div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm moh-text truncate">{{ formatHashtagLabel(t.label) }}</div>
                <div class="moh-meta">{{ formatCount(t.usageCount) }} posts lately</div>
              </div>
              <Icon name="tabler:chevron-right" class="shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
            </NuxtLink>

            <div class="border-t moh-border-subtle px-4 py-3">
              <NuxtLink to="/hashtags/trending" class="flex items-center justify-between gap-2 group moh-focus">
                <span class="text-sm font-medium moh-text-muted group-hover:moh-text transition-colors">
                  Show more hashtags
                </span>
                <Icon name="tabler:chevron-right" class="text-xs moh-text-muted shrink-0" aria-hidden="true" />
              </NuxtLink>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article, GetTrendingHashtagsData, HashtagResult } from '~/types/api'
import { articleVisibilityBarClass, articleVisibilityHoverClass } from '~/utils/article-visibility'
import { getApiErrorMessage } from '~/utils/api-error'
import { formatTaxonomyLabel, formatHashtagLabel } from '~/utils/taxonomy-format'

type TabId = 'articles' | 'topics' | 'hashtags'
type TopicResult = { slug: string; label: string; kind: 'topic' | 'subtopic' | 'tag'; score: number }

const tabs: ReadonlyArray<{ id: TabId; label: string; icon: string }> = [
  { id: 'articles', label: 'Articles', icon: 'tabler:news' },
  { id: 'topics', label: 'Topics', icon: 'tabler:tag' },
  { id: 'hashtags', label: 'Hashtags', icon: 'tabler:hash' },
]

// Persist the chosen tab across navigations so the rail doesn't visually
// "reset" every page transition. `useState` is SSR-safe and per-request, which
// is exactly what we want — the choice is intent-of-the-user, not data.
const active = useState<TabId>('rail-trending-tab', () => 'articles')

const articles = reactive({ items: [] as Article[], loading: false, error: null as string | null, fetchedAt: 0 })
const topics = reactive({ items: [] as TopicResult[], loading: false, error: null as string | null, fetchedAt: 0 })
const hashtags = reactive({ items: [] as HashtagResult[], loading: false, error: null as string | null, fetchedAt: 0 })
const bodyContent = ref<HTMLElement | null>(null)
const bodyHeight = ref<number | null>(null)
const bodyAnimationReady = ref(false)
let bodyResizeObserver: ResizeObserver | null = null

const { apiFetchData, apiFetch } = useApiClient()

const STALE_MS = 2 * 60 * 1000
const RAIL_TRENDING_ITEM_COUNT = 5

const bodyHeightStyle = computed(() => bodyHeight.value === null ? undefined : { height: `${bodyHeight.value}px` })

function measureBodyHeight() {
  if (!import.meta.client) return
  const el = bodyContent.value
  if (!el) return
  bodyHeight.value = Math.ceil(el.getBoundingClientRect().height)
}

function observeBodyHeight(el: HTMLElement | null) {
  if (!import.meta.client) return
  bodyResizeObserver?.disconnect()
  bodyResizeObserver = null
  if (!el) return
  bodyResizeObserver = new ResizeObserver(() => measureBodyHeight())
  bodyResizeObserver.observe(el)
  measureBodyHeight()
}

async function fetchArticles() {
  if (articles.loading) return
  articles.loading = true
  articles.error = null
  try {
    const res = await apiFetchData<Article[]>('/articles', {
      query: { limit: RAIL_TRENDING_ITEM_COUNT, sort: 'trending', includeRestricted: true },
    })
    articles.items = (Array.isArray(res) ? res : []).slice(0, RAIL_TRENDING_ITEM_COUNT)
    articles.fetchedAt = Date.now()
  } catch (e: unknown) {
    articles.error = getApiErrorMessage(e) || 'Failed to load trending articles.'
  } finally {
    articles.loading = false
  }
}

async function fetchTopics() {
  if (topics.loading) return
  topics.loading = true
  topics.error = null
  try {
    const res = await apiFetchData<TopicResult[]>('/taxonomy/search', {
      method: 'GET',
      query: { q: '', limit: RAIL_TRENDING_ITEM_COUNT },
    })
    topics.items = (res ?? []).slice(0, RAIL_TRENDING_ITEM_COUNT)
    topics.fetchedAt = Date.now()
  } catch (e: unknown) {
    topics.error = getApiErrorMessage(e) || 'Failed to load trending topics.'
  } finally {
    topics.loading = false
  }
}

async function fetchHashtags() {
  if (hashtags.loading) return
  hashtags.loading = true
  hashtags.error = null
  try {
    const res = await apiFetch<GetTrendingHashtagsData>('/hashtags/trending', {
      method: 'GET',
      query: { limit: RAIL_TRENDING_ITEM_COUNT },
    })
    hashtags.items = (res.data ?? []).slice(0, RAIL_TRENDING_ITEM_COUNT)
    hashtags.fetchedAt = Date.now()
  } catch (e: unknown) {
    hashtags.error = getApiErrorMessage(e) || 'Failed to load trending hashtags.'
  } finally {
    hashtags.loading = false
  }
}

function ensureFresh(tab: TabId) {
  const now = Date.now()
  if (tab === 'articles' && now - articles.fetchedAt > STALE_MS) void fetchArticles()
  else if (tab === 'topics' && now - topics.fetchedAt > STALE_MS) void fetchTopics()
  else if (tab === 'hashtags' && now - hashtags.fetchedAt > STALE_MS) void fetchHashtags()
}

function setActive(tab: TabId) {
  active.value = tab
  ensureFresh(tab)
}

let pollTimer: ReturnType<typeof setInterval> | null = null

function onVisibilityChange() {
  if (!document.hidden) ensureFresh(active.value)
}

onMounted(() => {
  ensureFresh(active.value)
  observeBodyHeight(bodyContent.value)
  requestAnimationFrame(() => {
    bodyAnimationReady.value = true
  })
  // Refresh the active tab on a slow cadence; switching tabs lazy-loads the rest.
  pollTimer = setInterval(() => {
    if (!document.hidden) ensureFresh(active.value)
  }, STALE_MS)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  bodyResizeObserver?.disconnect()
  bodyResizeObserver = null
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

watch(bodyContent, (el) => observeBodyHeight(el), { flush: 'post' })

const articleAccentBarClass = (article: Article) => articleVisibilityBarClass(article.visibility)
const articleHoverClass = (article: Article) => articleVisibilityHoverClass(article.visibility)

function rankPillClass(i: number): string {
  return i === 0
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
    : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500'
}

function formatCount(n: number): string {
  const num = Math.max(0, Math.floor(Number(n) || 0))
  const trim = (s: string) => (s.endsWith('.0') ? s.slice(0, -2) : s)
  if (num >= 1_000_000) return `${trim((num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1))}m`
  if (num >= 1_000) return `${trim((num / 1_000).toFixed(num >= 10_000 ? 0 : 1))}k`
  return String(num)
}
</script>

<style scoped>
.rail-trending-card-body {
  overflow: hidden;
}

.rail-trending-card-body--ready {
  transition-property: height;
  transition-duration: 220ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  .rail-trending-card-body--ready {
    transition-duration: 0ms;
  }
}
</style>
