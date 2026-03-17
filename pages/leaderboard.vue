<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="px-4 pt-4 pb-3">
        <AppPageHeader
          title="Leaderboard"
          icon="tabler:trophy"
          :description="activeTab === 'weekly'
            ? 'Most active this week — distinct posting days since Monday ET.'
            : 'Ranks by current streak first, then best streak all-time. Any post counts.'"
        />
      </div>

      <!-- Tab switcher -->
      <div class="flex px-4 pb-3 gap-1.5">
        <button
          type="button"
          class="px-3 py-1 rounded-full text-sm font-semibold transition-colors"
          :class="activeTab === 'all'
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
            : 'moh-surface-hover moh-text-muted border moh-border'"
          @click="switchTab('all')"
        >
          All-time
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded-full text-sm font-semibold transition-colors"
          :class="activeTab === 'weekly'
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
            : 'moh-surface-hover moh-text-muted border moh-border'"
          @click="switchTab('weekly')"
        >
          This week
        </button>
      </div>

      <div v-if="activeError" class="px-4 pb-3">
        <AppInlineAlert severity="danger">{{ activeError }}</AppInlineAlert>
      </div>

      <div v-if="activeLoading && activeUsers.length === 0" class="flex justify-center py-12">
        <AppLogoLoader />
      </div>

      <div v-else-if="activeUsers.length === 0" class="px-4 py-6 text-sm moh-text-muted">
        No activity yet.
      </div>

      <div v-else class="divide-y divide-black/5 dark:divide-white/5">
        <div
          v-for="(u, i) in activeUsers"
          :key="u.id"
          class="flex items-center gap-3 px-4 py-3"
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

          <!-- Stats -->
          <div class="shrink-0 text-right">
            <template v-if="activeTab === 'weekly'">
              <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
                <Icon name="tabler:calendar-check" class="moh-text-muted" aria-hidden="true" />
                {{ u.daysThisWeek ?? 0 }}d
              </div>
              <div class="text-[11px] moh-text-muted">this week</div>
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

        <!-- Pinned viewer rank (shown when viewer is not in the top-N list) -->
        <div
          v-if="activeViewerRank"
          class="flex items-center gap-3 px-4 py-3 bg-gray-50/60 dark:bg-zinc-900/40"
        >
          <div class="shrink-0 w-7 text-center text-sm font-bold tabular-nums moh-text-muted">
            #{{ activeViewerRank.rank }}
          </div>

          <NuxtLink
            v-if="activeViewerRank.user.username"
            :to="`/u/${encodeURIComponent(activeViewerRank.user.username)}`"
            class="flex-1 min-w-0 flex items-center gap-2.5 hover:opacity-90"
          >
            <AppUserAvatar :user="activeViewerRank.user" size-class="h-9 w-9" />
            <AppUserIdentityLine :user="activeViewerRank.user" badge-size="xs" />
          </NuxtLink>
          <div v-else class="flex-1 min-w-0 flex items-center gap-2.5">
            <AppUserAvatar :user="activeViewerRank.user" size-class="h-9 w-9" />
            <AppUserIdentityLine :user="activeViewerRank.user" badge-size="xs" />
          </div>

          <div class="shrink-0 text-right">
            <template v-if="activeTab === 'weekly'">
              <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
                <Icon name="tabler:calendar-check" class="moh-text-muted" aria-hidden="true" />
                {{ activeViewerRank.user.daysThisWeek ?? 0 }}d
              </div>
              <div class="text-[11px] moh-text-muted">this week</div>
            </template>
            <template v-else>
              <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
                <Icon name="tabler:flame" class="moh-text-muted" aria-hidden="true" />
                {{ activeViewerRank.user.checkinStreakDays > 0 ? `${activeViewerRank.user.checkinStreakDays}d` : '—' }}
              </div>
              <div class="text-[11px] moh-text-muted">
                best {{ activeViewerRank.user.longestStreakDays > 0 ? `${activeViewerRank.user.longestStreakDays}d` : '—' }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { LeaderboardUser } from '~/types/api'

definePageMeta({
  layout: 'app',
  title: 'Leaderboard',
  hideTopBar: true,
})

usePageSeo({
  title: 'Leaderboard',
  description: 'Members with the longest active posting streaks on Men of Hunger.',
  canonicalPath: '/leaderboard',
  noindex: true,
})

const activeTab = ref<'all' | 'weekly'>('all')

const allTime = useCheckinsLeaderboard({ scope: 'all' })
const weekly = useCheckinsLeaderboard({ scope: 'weekly' })

const activeUsers = computed(() => activeTab.value === 'weekly' ? weekly.users.value : allTime.users.value)
const activeViewerRank = computed(() => activeTab.value === 'weekly' ? weekly.viewerRank.value : allTime.viewerRank.value)
const activeLoading = computed(() => activeTab.value === 'weekly' ? weekly.loading.value : allTime.loading.value)
const activeError = computed(() => activeTab.value === 'weekly' ? weekly.error.value : allTime.error.value)

function switchTab(tab: 'all' | 'weekly') {
  activeTab.value = tab
  if (tab === 'weekly' && weekly.users.value.length === 0) {
    void weekly.refresh()
  }
  if (tab === 'all' && allTime.users.value.length === 0) {
    void allTime.refresh()
  }
}

function tierColor(u: LeaderboardUser): string {
  if (u.premiumPlus || u.stewardBadgeEnabled) return 'var(--moh-steward)'
  if (u.premium) return 'var(--moh-premium)'
  if (u.verifiedStatus !== 'none') return 'var(--moh-verified)'
  return 'var(--moh-text-muted)'
}

onMounted(() => {
  if (allTime.users.value.length === 0) void allTime.refresh()
})
</script>
