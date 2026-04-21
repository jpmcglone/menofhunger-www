<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="px-4 pt-4 pb-3">
        <AppPageHeader
          title="Leaderboard"
          icon="tabler:trophy"
          :description="tabDescription"
        />
      </div>

      <!-- Tab switcher -->
      <div class="flex px-4 pb-3 gap-1.5">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="px-3 py-1 rounded-full text-sm font-semibold transition-colors"
          :class="activeTab === tab.id
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
            : 'moh-surface-hover moh-text-muted border moh-border'"
          @click="switchTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeError" class="px-4 pb-3">
        <AppInlineAlert severity="danger">{{ activeError }}</AppInlineAlert>
      </div>

      <!-- Initial load (nothing to show yet) -->
      <div v-if="initialLoading" class="flex justify-center py-12">
        <AppLogoLoader />
      </div>

      <div v-else-if="displayUsers.length === 0 && hasFetched" class="px-4 py-6 text-sm moh-text-muted">
        No activity yet.
      </div>

      <!-- Persistent list: never removed once populated -->
      <div v-else class="relative">
        <!-- Dim overlay + spinner while waiting for a new tab's data -->
        <div
          v-if="pending"
          class="absolute inset-0 z-10 flex items-start justify-center pt-12 bg-white/40 dark:bg-zinc-950/40"
        >
          <AppLogoLoader compact />
        </div>

        <TransitionGroup tag="div" name="lb-row">
          <div
            v-for="(u, i) in displayUsers"
            :key="u.id"
            class="flex items-center gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5"
          >
            <!-- Rank -->
            <div
              class="shrink-0 w-7 text-center text-sm font-bold tabular-nums"
              :style="{ color: tierColor(u) }"
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

            <!-- Stats (changes based on which tab is displayed) -->
            <div class="shrink-0 text-right tabular-nums">
              <template v-if="displayTab === 'weekly'">
                <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
                  <Icon name="tabler:calendar-check" class="moh-text-muted" aria-hidden="true" />
                  {{ u.daysThisWeek ?? 0 }}d
                </div>
                <div class="text-[11px] moh-text-muted">this week</div>
              </template>
              <template v-else-if="displayTab === 'best'">
                <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
                  <Icon name="tabler:trophy" class="moh-text-muted" aria-hidden="true" />
                  {{ u.longestStreakDays > 0 ? `${u.longestStreakDays}d` : '—' }}
                </div>
                <div class="text-[11px] moh-text-muted">
                  now {{ u.checkinStreakDays > 0 ? `${u.checkinStreakDays}d` : '—' }}
                </div>
              </template>
              <template v-else>
                <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
                  <Icon name="tabler:flame" class="moh-text-muted" aria-hidden="true" />
                  {{ u.checkinStreakDays > 0 ? `${u.checkinStreakDays}d` : '—' }}
                </div>
                <div class="text-[11px] moh-text-muted">
                  best {{ u.longestStreakDays > 0 ? `${u.longestStreakDays}d` : '—' }}
                </div>
              </template>
            </div>
          </div>
        </TransitionGroup>

        <!-- Pinned viewer rank (outside TransitionGroup — static position at bottom) -->
        <div
          v-if="displayViewerRank"
          class="flex items-center gap-3 px-4 py-3 bg-gray-50/60 dark:bg-zinc-900/40"
        >
          <div class="shrink-0 w-7 text-center text-sm font-bold tabular-nums moh-text-muted">
            #{{ displayViewerRank.rank }}
          </div>

          <NuxtLink
            v-if="displayViewerRank.user.username"
            :to="`/u/${encodeURIComponent(displayViewerRank.user.username)}`"
            class="flex-1 min-w-0 flex items-center gap-2.5 hover:opacity-90"
          >
            <AppUserAvatar :user="displayViewerRank.user" size-class="h-9 w-9" />
            <AppUserIdentityLine :user="displayViewerRank.user" badge-size="xs" />
          </NuxtLink>
          <div v-else class="flex-1 min-w-0 flex items-center gap-2.5">
            <AppUserAvatar :user="displayViewerRank.user" size-class="h-9 w-9" />
            <AppUserIdentityLine :user="displayViewerRank.user" badge-size="xs" />
          </div>

          <div class="shrink-0 text-right tabular-nums">
            <template v-if="displayTab === 'weekly'">
              <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
                <Icon name="tabler:calendar-check" class="moh-text-muted" aria-hidden="true" />
                {{ displayViewerRank.user.daysThisWeek ?? 0 }}d
              </div>
              <div class="text-[11px] moh-text-muted">this week</div>
            </template>
            <template v-else-if="displayTab === 'best'">
              <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
                <Icon name="tabler:trophy" class="moh-text-muted" aria-hidden="true" />
                {{ displayViewerRank.user.longestStreakDays > 0 ? `${displayViewerRank.user.longestStreakDays}d` : '—' }}
              </div>
              <div class="text-[11px] moh-text-muted">
                now {{ displayViewerRank.user.checkinStreakDays > 0 ? `${displayViewerRank.user.checkinStreakDays}d` : '—' }}
              </div>
            </template>
            <template v-else>
              <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
                <Icon name="tabler:flame" class="moh-text-muted" aria-hidden="true" />
                {{ displayViewerRank.user.checkinStreakDays > 0 ? `${displayViewerRank.user.checkinStreakDays}d` : '—' }}
              </div>
              <div class="text-[11px] moh-text-muted">
                best {{ displayViewerRank.user.longestStreakDays > 0 ? `${displayViewerRank.user.longestStreakDays}d` : '—' }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { LeaderboardUser, LeaderboardViewerRank } from '~/types/api'

type TabId = 'all' | 'best' | 'weekly'

definePageMeta({
  layout: 'app',
  title: 'Leaderboard',
  hideTopBar: true,
  ssr: false,
})

usePageSeo({
  title: 'Leaderboard',
  description: 'Members with the longest active posting streaks on Men of Hunger.',
  canonicalPath: '/leaderboard',
  noindex: true,
})

const tabs: { id: TabId; label: string; description: string }[] = [
  { id: 'all', label: 'Active Streak', description: 'Ranked by current active streak, then best streak as tiebreaker.' },
  { id: 'best', label: 'Best Streak', description: 'Ranked by highest streak ever achieved — current or past.' },
  { id: 'weekly', label: 'This Week', description: 'Most active this week — distinct posting days since Monday ET.' },
]

const activeTab = ref<TabId>('all')
const displayTab = ref<TabId>('all')
const displayUsers = ref<LeaderboardUser[]>([])
const displayViewerRank = ref<LeaderboardViewerRank | null>(null)
const initialLoading = ref(true)
const hasFetched = ref(false)

const active = useCheckinsLeaderboard({ scope: 'all' })
const best = useCheckinsLeaderboard({ scope: 'best' })
const weekly = useCheckinsLeaderboard({ scope: 'weekly' })

const scopeMap = { all: active, best, weekly } as const

const pending = computed(() => activeTab.value !== displayTab.value)
const activeError = computed(() => scopeMap[activeTab.value].error.value)
const tabDescription = computed(() => tabs.find(t => t.id === activeTab.value)?.description ?? '')

function commitScope(tabId: TabId) {
  const scope = scopeMap[tabId]
  displayUsers.value = scope.users.value
  displayViewerRank.value = scope.viewerRank.value
  displayTab.value = tabId
  initialLoading.value = false
  hasFetched.value = true
}

for (const tabId of ['all', 'best', 'weekly'] as const) {
  watch(scopeMap[tabId].users, (users) => {
    if (activeTab.value === tabId && users.length > 0) {
      commitScope(tabId)
    }
  })
  watch(scopeMap[tabId].loading, (loading) => {
    if (!loading && activeTab.value === tabId) {
      initialLoading.value = false
      hasFetched.value = true
    }
  })
}

function switchTab(tab: TabId) {
  activeTab.value = tab
  const scope = scopeMap[tab]
  if (scope.users.value.length > 0) {
    commitScope(tab)
  } else {
    void scope.refresh()
  }
}

function tierColor(u: LeaderboardUser): string {
  if (u.premiumPlus || u.stewardBadgeEnabled) return 'var(--moh-steward)'
  if (u.premium) return 'var(--moh-premium)'
  if (u.verifiedStatus !== 'none') return 'var(--moh-verified)'
  return 'var(--moh-text-muted)'
}

if (import.meta.client) {
  switchTab('all')
}
</script>

<style scoped>
.lb-row-move {
  transition: transform 0.3s ease;
}
.lb-row-enter-active {
  transition: opacity 0.2s ease;
}
.lb-row-enter-from {
  opacity: 0;
}
.lb-row-leave-active {
  transition: opacity 0.15s ease;
  position: absolute;
  left: 0;
  right: 0;
}
.lb-row-leave-to {
  opacity: 0;
}
</style>
