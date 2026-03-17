<template>
  <div class="px-3 pb-3 pt-2 sm:px-4">
    <NuxtLink
      to="/leaderboard"
      class="block rounded-xl border transition-opacity hover:opacity-90 active:opacity-80"
      :class="
        mission.status === 'complete'
          ? 'border-amber-300/50 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/8'
          : 'moh-border moh-surface'
      "
      @click="onCardClick"
    >
      <div class="flex items-center gap-3 px-4 py-3.5">
        <!-- Streak badge -->
        <div
          class="shrink-0 flex h-11 w-11 flex-col items-center justify-center rounded-xl"
          :class="
            mission.status === 'complete'
              ? 'bg-amber-100 dark:bg-amber-500/15'
              : 'bg-gray-100 dark:bg-zinc-800'
          "
        >
          <span
            class="text-lg font-black leading-none tabular-nums"
            :class="mission.status === 'complete' ? 'text-amber-600 dark:text-amber-400' : 'moh-text'"
          >{{ checkinStreakDays }}</span>
          <span
            class="text-[9px] font-semibold uppercase tracking-wide leading-none mt-0.5"
            :class="mission.status === 'complete' ? 'text-amber-500 dark:text-amber-400' : 'moh-text-muted'"
          >{{ checkinStreakDays === 1 ? 'day' : 'days' }}</span>
        </div>

        <!-- Text + dots -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold moh-text leading-snug">{{ mission.headline }}</div>
          <div class="text-[11px] moh-text-muted mt-0.5 leading-snug">{{ mission.subline }}</div>

          <!-- Day dots -->
          <div class="mt-2 flex items-center gap-1.5" aria-hidden="true">
            <span
              v-for="d in mission.daysTarget"
              :key="d"
              class="h-2 w-2 rounded-full transition-colors"
              :class="
                d <= mission.daysCompleted
                  ? mission.status === 'complete'
                    ? 'bg-amber-500'
                    : 'bg-[var(--moh-checkin)]'
                  : 'bg-gray-200 dark:bg-zinc-700'
              "
            />
          </div>
        </div>

        <!-- Chevron -->
        <Icon
          name="tabler:chevron-right"
          class="shrink-0 text-sm moh-text-muted"
          aria-hidden="true"
        />
      </div>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { deriveWeeklyMission } from '~/config/milestones'

const props = defineProps<{
  checkinStreakDays: number
}>()

const mission = computed(() => deriveWeeklyMission(props.checkinStreakDays))

function onCardClick() {
  useNuxtApp().$posthog?.capture('weekly_mission_card_clicked', {
    days_completed: mission.value.daysCompleted,
    status: mission.value.status,
  })
}
</script>
