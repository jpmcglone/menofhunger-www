<template>
  <div class="px-3 pb-3 pt-2 sm:px-4">
    <div
      class="relative rounded-xl border transition-opacity"
      :class="
        mission.status === 'complete'
          ? 'border-amber-300/50 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/8'
          : 'moh-border moh-surface'
      "
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
        <NuxtLink
          to="/leaderboard"
          class="flex-1 min-w-0"
          @click="onCardClick"
        >
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
        </NuxtLink>

        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full moh-text-muted transition-colors hover:bg-black/[0.05] hover:moh-text dark:hover:bg-white/[0.08]"
            aria-label="Share this week's mission"
            @click="shareWeeklyMission"
          >
            <Icon name="tabler:share-2" class="text-base" aria-hidden="true" />
          </button>
          <NuxtLink
            to="/leaderboard"
            class="inline-flex h-9 w-9 items-center justify-center"
            aria-label="Open leaderboard"
            @click="onCardClick"
          >
            <Icon
              name="tabler:chevron-right"
              class="text-sm moh-text-muted"
              aria-hidden="true"
            />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { deriveWeeklyMission } from '~/config/milestones'
import { siteConfig } from '~/config/site'
import { appendShareParams, weeklyMissionShareText } from '~/utils/acquisition-share'

const props = defineProps<{
  checkinStreakDays: number
}>()

const mission = computed(() => deriveWeeklyMission(props.checkinStreakDays))
const { share: nativeShare, isSupported: nativeShareSupported } = useWebShare()
const { copyText } = useCopyToClipboard()
const { referralCode, ensureReferralCode } = useEnsureReferralCode()
const toast = useAppToast()

function onCardClick() {
  useNuxtApp().$posthog?.capture('weekly_mission_card_clicked', {
    days_completed: mission.value.daysCompleted,
    status: mission.value.status,
  })
}

async function shareWeeklyMission() {
  try {
    await ensureReferralCode()
    const text = weeklyMissionShareText(props.checkinStreakDays || 1)
    const url = appendShareParams(siteConfig.url, { ref: referralCode.value ?? null })
    if (nativeShareSupported.value) {
      const shared = await nativeShare({ title: 'Men of Hunger', text, url })
      if (shared) return
    }
    await copyText(`${text}\n${url}`)
    toast.push({ title: 'Invite copied', tone: 'success', durationMs: 1400 })
  } catch {
    toast.push({ title: 'Share failed', tone: 'error', durationMs: 1800 })
  }
}
</script>
