<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="px-4 pt-4 pb-3">
        <AppPageHeader
          title="Streak Leaderboard"
          icon="tabler:flame"
          description="Ranks by current streak first, then best streak all-time. Any post counts."
        />
      </div>

      <div v-if="error" class="px-4 pb-3">
        <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
      </div>

      <div v-if="loading && users.length === 0" class="flex justify-center py-12">
        <AppLogoLoader />
      </div>

      <div v-else-if="users.length === 0" class="px-4 py-6 text-sm moh-text-muted">
        No streaks yet.
      </div>

      <div v-else class="divide-y divide-black/5 dark:divide-white/5">
        <div
          v-for="(u, i) in users"
          :key="u.id"
          class="flex items-center gap-3 px-4 py-3"
        >
          <!-- Rank — colored by the user's tier -->
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

          <!-- Streak stats: current + best -->
          <div class="shrink-0 text-right">
            <div class="flex items-center justify-end gap-1 text-sm font-semibold moh-text">
              <Icon name="tabler:flame" class="moh-text-muted" aria-hidden="true" />
              {{ u.checkinStreakDays }}d
            </div>
            <div class="text-[11px] moh-text-muted">
              best {{ u.longestStreakDays }}d
            </div>
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
  title: 'Streak Leaderboard',
  description: 'Members with the longest active posting streaks on Men of Hunger.',
  canonicalPath: '/leaderboard',
  noindex: true,
})

const { users, loading, error, refresh } = useCheckinsLeaderboard()

function tierColor(u: LeaderboardUser): string {
  if (u.premiumPlus || u.stewardBadgeEnabled) return 'var(--moh-steward)'
  if (u.premium) return 'var(--moh-premium)'
  if (u.verifiedStatus !== 'none') return 'var(--moh-verified)'
  return 'var(--moh-text-muted)'
}

if (import.meta.server) await refresh()
onMounted(() => {
  if (users.value.length === 0 && !loading.value) void refresh()
})
</script>
