<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="px-4 pt-4 pb-2">
        <AppPageHeader
          :title="pageTitle"
          icon="tabler:calendar-check"
          :description="pageDescription"
        />
      </div>

      <div class="px-4 pb-2 flex items-center gap-2">
        <button
          type="button"
          :class="[
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            sort === 'trending'
              ? 'bg-primary-500 text-white'
              : 'bg-surface-100 dark:bg-zinc-800 moh-text-muted hover:bg-surface-200 dark:hover:bg-zinc-700',
          ]"
          @click="setSort('trending')"
        >
          Trending
        </button>
        <button
          type="button"
          :class="[
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            sort === 'new'
              ? 'bg-primary-500 text-white'
              : 'bg-surface-100 dark:bg-zinc-800 moh-text-muted hover:bg-surface-200 dark:hover:bg-zinc-700',
          ]"
          @click="setSort('new')"
        >
          New
        </button>
      </div>

      <div v-if="error" class="px-4 pb-3">
        <AppInlineAlert severity="danger">
          {{ error }}
        </AppInlineAlert>
      </div>

      <AppSubtleSectionLoader :loading="showInitialLoader" min-height-class="min-h-[220px]">
        <div v-if="posts.length === 0" class="px-4 py-6 text-sm moh-text-muted">
          No check-ins for this day yet.
        </div>

        <div v-else class="space-y-0 transition-opacity duration-150">
          <TransitionGroup name="moh-post" tag="div" class="space-y-0">
            <AppFeedPostRow
              v-for="p in posts"
              :key="p.id"
              :post="p"
              hide-reply-footers
              @deleted="(id) => onDeleted(id)"
              @edited="onEdited"
            />
          </TransitionGroup>
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
      </AppSubtleSectionLoader>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'

definePageMeta({
  layout: 'app',
  title: 'Check-in Day',
  hideTopBar: true,
  ssr: false,
})

const route = useRoute()

const dayKey = computed(() => {
  const raw = Array.isArray(route.params.dayKey) ? route.params.dayKey[0] : route.params.dayKey
  return (raw ?? '').trim()
})

// Sort is stored in ?sort= query param; default to trending.
// Uses history.replaceState so switching sort is in-place (no remount / scroll jump).
const sort = ref<'trending' | 'new'>('trending')

function syncSortFromUrl() {
  const q = typeof route.query.sort === 'string' ? route.query.sort : ''
  sort.value = q === 'new' ? 'new' : 'trending'
}

function setSort(next: 'trending' | 'new') {
  if (sort.value === next) return
  sort.value = next
  const url = new URL(window.location.href)
  if (next === 'trending') {
    url.searchParams.delete('sort')
  } else {
    url.searchParams.set('sort', next)
  }
  history.replaceState(history.state, '', url.toString())
  void refresh()
}

// Sync sort from URL on popstate (back/forward navigation).
if (import.meta.client) {
  syncSortFromUrl()
  window.addEventListener('popstate', syncSortFromUrl)
  onBeforeUnmount(() => window.removeEventListener('popstate', syncSortFromUrl))
}

// ─── Feed ────────────────────────────────────────────────────────────────────
// No realtime wiring — per-day feeds are static snapshots that change infrequently.

const { items: posts, nextCursor, loading, loadingMore, error, refresh, loadMore } = useCursorFeed<FeedPost>({
  stateKey: `check-in-day-${dayKey.value}`,
  stateMode: 'local',
  buildRequest: (cursor) => ({
    path: '/posts',
    query: {
      limit: 30,
      cursor: cursor ?? undefined,
      sort: sort.value,
      kind: 'checkin',
      checkinDayKey: dayKey.value,
      visibility: 'all',
      // NOTE: do not send `followingOnly: false` — the API parses query booleans and a
      // literal `false` would otherwise scope the feed to followed authors only. Omit it.
      includeSelf: true,
    },
  }),
  getItemId: (p) => p.id,
  defaultErrorMessage: 'Failed to load check-ins.',
  loadMoreErrorMessage: 'Failed to load more check-ins.',
})
const showInitialLoader = computed(() => loading.value && posts.value.length === 0)

// Derive the prompt from the first loaded post, fall back to the day key.
const dayPrompt = computed<string | null>(() => posts.value[0]?.checkinPrompt ?? null)
const pageTitle = computed(() => dayPrompt.value ?? dayKey.value)
const pageDescription = computed(() =>
  dayKey.value
    ? `Check-ins for ${dayKey.value}`
    : 'Check-ins for this day',
)

usePageSeo({
  title: computed(() => (dayPrompt.value ? `Check-ins: ${dayPrompt.value}` : `Check-ins: ${dayKey.value}`)),
  description: pageDescription,
  noindex: true,
})

function onDeleted(id: string) {
  posts.value = posts.value.filter((p) => p.id !== id)
}

function onEdited(payload: { id: string; post: FeedPost }) {
  posts.value = posts.value.map((p) => (p.id === payload.id ? payload.post : p))
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(() => {
  syncSortFromUrl()
  if (posts.value.length === 0 && !loading.value) void refresh()
})
</script>
