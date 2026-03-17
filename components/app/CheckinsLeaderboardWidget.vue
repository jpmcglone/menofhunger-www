<template>
  <Card class="moh-card moh-card-matte !rounded-2xl overflow-hidden">
    <template #title>
      <span class="moh-h2">Streak Leaderboard</span>
    </template>
    <template #content>
      <div v-if="loading && users.length === 0" class="flex justify-center py-4">
        <AppLogoLoader compact />
      </div>

      <div v-else-if="users.length > 0" class="space-y-0">
        <div
          v-for="(u, i) in users.slice(0, 3)"
          :key="u.id"
          class="flex items-center gap-2.5 py-2"
        >
          <!-- Rank badge -->
          <div
            class="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black tabular-nums leading-none"
            :class="rankBadgeClass(i)"
          >
            {{ i + 1 }}
          </div>

          <NuxtLink
            v-if="u.username"
            :to="`/u/${encodeURIComponent(u.username)}`"
            class="flex-1 min-w-0 flex items-center gap-2 hover:opacity-90"
          >
            <AppUserAvatar :user="u" size-class="h-8 w-8" />
            <AppUserIdentityLine :user="u" badge-size="xs" />
          </NuxtLink>
          <div v-else class="flex-1 min-w-0 flex items-center gap-2">
            <AppUserAvatar :user="u" size-class="h-8 w-8" />
            <AppUserIdentityLine :user="u" badge-size="xs" />
          </div>

          <div class="shrink-0 text-right">
            <div class="flex items-center justify-end gap-0.5 text-xs font-bold moh-text tabular-nums">
              <Icon name="tabler:flame" class="text-[10px] text-orange-400" aria-hidden="true" />
              {{ u.checkinStreakDays > 0 ? `${u.checkinStreakDays}d` : '—' }}
            </div>
            <div class="text-[10px] moh-text-muted tabular-nums">
              best {{ u.longestStreakDays > 0 ? `${u.longestStreakDays}d` : '—' }}
            </div>
          </div>
        </div>

        <!-- Full-width CTA row -->
        <NuxtLink
          to="/leaderboard"
          class="flex items-center justify-between gap-2 border-t moh-border-subtle pt-3 mt-1 group"
        >
          <span class="text-sm font-medium moh-text-muted group-hover:moh-text transition-colors">
            See full leaderboard
          </span>
          <Icon name="tabler:chevron-right" class="text-xs moh-text-muted shrink-0" aria-hidden="true" />
        </NuxtLink>
      </div>

      <div v-else class="text-sm moh-text-muted">
        <p v-if="error">{{ error }}</p>
        <p v-else>No streaks yet.</p>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { LeaderboardUser } from '~/types/api'

const { users, loading, error, refresh } = useCheckinsLeaderboard({ limit: 3 })

function rankBadgeClass(index: number): string {
  if (index === 0) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
  if (index === 1) return 'bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-zinc-300'
  return 'bg-orange-50 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400'
}

onMounted(() => void refresh())
</script>
