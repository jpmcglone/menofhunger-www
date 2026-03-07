<template>
  <Card class="moh-card moh-card-matte !rounded-2xl">
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
          class="flex items-center gap-2.5 py-1.5"
        >
          <div
            class="shrink-0 w-5 text-center text-xs font-bold tabular-nums"
            :style="{ color: tierColor(u) }"
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
            <div class="flex items-center justify-end gap-0.5 text-xs font-semibold moh-text">
              <Icon name="tabler:flame" class="text-[11px] moh-text-muted" aria-hidden="true" />
              {{ u.checkinStreakDays > 0 ? `${u.checkinStreakDays}d` : '—' }}
            </div>
            <div class="text-[10px] moh-text-muted">
              best {{ u.longestStreakDays > 0 ? `${u.longestStreakDays}d` : '—' }}
            </div>
          </div>
        </div>

        <NuxtLink
          to="/leaderboard"
          class="inline-block pt-3 text-sm font-medium hover:underline underline-offset-2"
          :class="tierCtaTextClass"
        >
          See full leaderboard
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
const { user: authUser } = useAuth()

function tierColor(u: LeaderboardUser): string {
  if (u.premiumPlus || u.stewardBadgeEnabled) return 'var(--moh-steward)'
  if (u.premium) return 'var(--moh-premium)'
  if (u.verifiedStatus !== 'none') return 'var(--moh-verified)'
  return 'var(--moh-text-muted)'
}
const tierCtaTextClass = computed(() => {
  if (authUser.value?.premiumPlus) return 'text-[color:var(--moh-steward)]'
  if (authUser.value?.premium) return 'text-[color:var(--moh-premium)]'
  if ((authUser.value?.verifiedStatus ?? 'none') !== 'none') return 'text-[color:var(--moh-verified)]'
  return 'moh-text-muted'
})

onMounted(() => void refresh())
</script>
