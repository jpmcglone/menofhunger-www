<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="px-4 pt-4 pb-2">
        <AppPageHeader
          title="Check-ins"
          icon="tabler:calendar-check"
          description="Recent and trending daily check-ins."
        />
      </div>

      <div class="px-4 pb-2 flex items-center gap-2">
        <Button
          label="Trending"
          :severity="activeTab === 'trending' ? 'primary' : 'secondary'"
          rounded
          size="small"
          @click="() => (activeTab = 'trending')"
        />
        <Button
          label="New"
          :severity="activeTab === 'new' ? 'primary' : 'secondary'"
          rounded
          size="small"
          @click="() => (activeTab = 'new')"
        />
        <Button
          label="Leaderboard"
          :severity="activeTab === 'leaderboard' ? 'primary' : 'secondary'"
          rounded
          size="small"
          @click="() => (activeTab = 'leaderboard')"
        >
          <template #icon>
            <Icon name="tabler:trophy" aria-hidden="true" />
          </template>
        </Button>
      </div>

      <!-- Feed tabs -->
      <template v-if="activeTab !== 'leaderboard'">
        <div v-if="error" class="px-4 pb-3">
          <AppInlineAlert severity="danger">
            {{ error }}
          </AppInlineAlert>
        </div>

        <div v-if="loading && posts.length === 0" class="flex justify-center py-12">
          <AppLogoLoader />
        </div>

        <div v-else-if="posts.length === 0" class="px-4 py-6 text-sm moh-text-muted">
          No check-ins yet.
        </div>

        <div v-else class="space-y-0">
          <TransitionGroup name="moh-post" tag="div" class="space-y-0">
            <AppFeedPostRow
              v-for="p in posts"
              :key="p.id"
              :post="p"
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
      </template>

      <!-- Leaderboard tab -->
      <template v-else>
        <div v-if="leaderboardError" class="px-4 pb-3">
          <AppInlineAlert severity="danger">{{ leaderboardError }}</AppInlineAlert>
        </div>

        <div v-if="leaderboardLoading && leaderboardUsers.length === 0" class="flex justify-center py-12">
          <AppLogoLoader />
        </div>

        <div v-else-if="leaderboardUsers.length === 0" class="px-4 py-6 text-sm moh-text-muted">
          No active streaks yet.
        </div>

        <div v-else class="divide-y moh-divide">
          <div
            v-for="(u, i) in leaderboardUsers"
            :key="u.id"
            class="flex items-center gap-3 px-4 py-3"
          >
            <!-- Rank -->
            <div
              class="shrink-0 w-7 text-center text-sm font-bold tabular-nums"
              :class="
                i === 0
                  ? 'text-amber-500'
                  : i === 1
                    ? 'text-gray-400 dark:text-gray-500'
                    : i === 2
                      ? 'text-amber-700 dark:text-amber-600'
                      : 'moh-text-muted'
              "
            >
              {{ i + 1 }}
            </div>

            <!-- Avatar + identity -->
            <NuxtLink
              v-if="u.username"
              :to="`/u/${encodeURIComponent(u.username)}`"
              class="flex-1 min-w-0 flex items-center gap-2.5 hover:opacity-90"
            >
              <AppUserAvatar :user="u" size-class="h-9 w-9" />
              <AppUserIdentityLine :user="u" badge-size="xs" />
            </NuxtLink>
            <div v-else class="flex-1 min-w-0 flex items-center gap-2.5">
              <AppUserAvatar :user="u" size-class="h-9 w-9" />
              <AppUserIdentityLine :user="u" badge-size="xs" />
            </div>

            <!-- Streak -->
            <div class="shrink-0 flex items-center gap-1 text-sm font-semibold" style="color: var(--moh-checkin)">
              <Icon name="tabler:flame" aria-hidden="true" />
              {{ u.checkinStreakDays }}d
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'

definePageMeta({
  layout: 'app',
  title: 'Check-ins',
  hideTopBar: true,
})

usePageSeo({
  title: 'Check-ins',
  description: 'Recent and trending check-ins on Men of Hunger.',
  canonicalPath: '/check-ins',
  noindex: true,
})

const route = useRoute()
const router = useRouter()

type Tab = 'trending' | 'new' | 'leaderboard'

const activeTab = ref<Tab>((route.query.tab as Tab) || 'trending')
const sort = computed<'trending' | 'new'>(() =>
  activeTab.value === 'leaderboard' ? 'trending' : activeTab.value
)

watch(activeTab, (tab) => {
  void router.replace({ query: tab !== 'trending' ? { tab } : {} })
  if (tab === 'leaderboard' && leaderboardUsers.value.length === 0) {
    void refreshLeaderboard()
  }
})

const { items: posts, nextCursor, loading, loadingMore, error, refresh, loadMore } = useCursorFeed<FeedPost>({
  stateKey: 'check-ins-feed',
  buildRequest: (cursor) => ({
    path: '/posts',
    query: {
      limit: 30,
      cursor: cursor ?? undefined,
      sort: sort.value,
      kind: 'checkin',
      visibility: 'all',
      followingOnly: false,
    },
  }),
  getItemId: (p) => p.id,
  defaultErrorMessage: 'Failed to load check-ins.',
  loadMoreErrorMessage: 'Failed to load more check-ins.',
})

function onDeleted(id: string) {
  posts.value = posts.value.filter((p) => p.id !== id)
}

function onEdited(payload: { id: string; post: FeedPost }) {
  posts.value = posts.value.map((p) => (p.id === payload.id ? payload.post : p))
}

if (import.meta.server) await refresh()
onMounted(() => {
  if (posts.value.length === 0 && !loading.value && activeTab.value !== 'leaderboard') void refresh()
  if (activeTab.value === 'leaderboard') void refreshLeaderboard()
})

watch(
  () => activeTab.value,
  (tab) => {
    if (tab !== 'leaderboard') void refresh()
  },
)

// Leaderboard
const { users: leaderboardUsers, loading: leaderboardLoading, error: leaderboardError, refresh: refreshLeaderboard } = useCheckinsLeaderboard()
</script>
