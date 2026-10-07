<template>
  <!-- ─── Recent ───────────────────────────────────────────────────── -->
  <div>
    <div class="moh-gutter-x pt-4 pb-2 flex items-center justify-between">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Recent
        <span v-if="fitnessPage.weekSummary.activityCount > 0" class="normal-case font-normal text-gray-400 ml-1">
          · {{ fitnessPage.weekSummary.activityCount }} this week
        </span>
      </div>
      <button
        v-if="hasMoreActivities"
        class="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        @click="showAllActivities = !showAllActivities"
      >{{ showAllActivities ? 'Show less' : 'See all' }}</button>
    </div>

    <div v-if="fitnessPage.recentActivities.length === 0 && fitnessPage.connections.length > 0" class="moh-gutter-x py-6 text-center space-y-1">
      <p class="text-sm text-gray-500 dark:text-gray-400">No recent activities</p>
      <p class="text-xs text-gray-400">Sync to pull in your latest workouts.</p>
    </div>

    <div v-else-if="fitnessPage.recentActivities.length > 0" class="moh-divide">
      <div
        v-for="activity in displayedActivities"
        :key="activity.id"
        class="relative cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900"
        role="link"
        tabindex="0"
        @click="onRowClick(activityHref(activity.id), $event)"
        @auxclick="onRowAuxClick(activityHref(activity.id), $event)"
        @keydown.enter.prevent="navigateTo(activityHref(activity.id))"
        @keydown.space.prevent="navigateTo(activityHref(activity.id))"
      >
        <NuxtLink
          :to="activityHref(activity.id)"
          class="absolute inset-0 z-[1]"
          tabindex="-1"
          aria-hidden="true"
        />
        <div class="relative z-[2] moh-gutter-x py-3 flex items-start gap-3">
        <!-- icon -->
        <div class="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/[0.07] flex items-center justify-center">
          <Icon :name="activityIcon(activity.activityType)" class="text-gray-600 dark:text-gray-200 text-base" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <span class="text-sm font-semibold capitalize">{{ activity.name || activityLabel(activity.activityType) }}</span>
            <span class="text-xs text-gray-400 flex-shrink-0">{{ formatFitnessActivityDateTime(activity.startedAt) }}</span>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
            <span class="font-medium text-gray-700 dark:text-gray-300">{{ formatFitnessDuration(activity.durationSec) }}</span>
            <template v-if="activity.distanceM">
              <span class="text-gray-300 dark:text-gray-600">·</span>
              <span>{{ formatDistance(activity.distanceM) }} {{ fitnessPage.units === 'us' ? 'mi' : 'km' }}</span>
            </template>
            <template v-if="activityPace(activity)">
              <span class="text-gray-300 dark:text-gray-600">·</span>
              <span>{{ activityPace(activity) }}<span class="text-gray-400">/{{ fitnessPage.units === 'us' ? 'mi' : 'km' }}</span></span>
            </template>
            <template v-if="activity.stepsCount != null && activity.stepsCount > 0">
              <span class="text-gray-300 dark:text-gray-600">·</span>
              <span class="inline-flex items-center gap-0.5" :aria-label="`${activity.stepsCount} steps`">
                <Icon name="tabler:footprint" class="text-gray-400 text-[11px]" aria-hidden="true" />
                {{ formatSteps(activity.stepsCount) }}
              </span>
            </template>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FitnessPage } from '~/types/api'
import { formatFitnessActivityDateTime, formatFitnessDuration } from '~/utils/fitness-format'
import { useFitnessPageContext } from '~/composables/pages/fitness/useFitnessPage'

defineProps<{ fitnessPage: FitnessPage }>()

const {
  hasMoreActivities,
  showAllActivities,
  displayedActivities,
  onRowClick,
  activityHref,
  onRowAuxClick,
  activityIcon,
  activityLabel,
  formatDistance,
  activityPace,
  formatSteps,
} = useFitnessPageContext()
</script>

