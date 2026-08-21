<template>
  <div class="mt-2 rounded-xl border moh-border moh-surface overflow-hidden">
    <!-- Activity share -->
    <template v-if="share.snapshot.type === 'activity'">
      <div class="px-4 py-3 flex items-center gap-3">
        <Icon :name="activityIcon(share.snapshot.data.activityType)" class="text-gray-700 dark:text-gray-100 text-xl flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold capitalize">{{ share.snapshot.data.activityType }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{{ formatDuration(share.snapshot.data.durationSec) }}</span>
            <template v-if="share.snapshot.data.distanceM">
              <span>·</span>
              <span>{{ formatDistance(share.snapshot.data.distanceM) }}</span>
            </template>
            <template v-if="share.snapshot.data.effortScore">
              <span>·</span>
              <span>{{ share.snapshot.data.effortScore }} effort</span>
            </template>
          </div>
          <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {{ formatDate(share.snapshot.data.startedAt) }}
          </div>
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wide flex-shrink-0" style="color: #FC4C02;">Strava</span>
      </div>
    </template>

    <!-- Weight share -->
    <template v-else-if="share.snapshot.type === 'weight'">
      <div class="px-4 py-3 flex items-center gap-3">
        <Icon name="tabler:scale" class="text-gray-700 dark:text-gray-100 text-xl flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold">{{ formatWeight(share.snapshot.data.weightKg) }}</div>
          <div v-if="share.snapshot.data.deltaKg !== null" class="text-xs mt-0.5" :class="deltaClass(share.snapshot.data.deltaKg)">
            {{ formatDelta(share.snapshot.data.deltaKg) }} from last entry
          </div>
          <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {{ formatDate(share.snapshot.data.measuredAt) }}
          </div>
        </div>
        <Icon name="tabler:chart-line" class="text-gray-500 dark:text-gray-400 text-base flex-shrink-0" />
      </div>
    </template>

    <!-- VO2 max progress share -->
    <template v-else-if="share.snapshot.type === 'vo2max'">
      <div class="px-4 py-3 flex items-center gap-3">
        <Icon name="tabler:lungs" class="text-gray-700 dark:text-gray-100 text-xl flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold">
            {{ share.snapshot.data.vo2maxMlKgMin.toFixed(1) }}
            <span class="font-normal text-xs text-gray-500 dark:text-gray-400">ml/kg/min</span>
          </div>
          <div v-if="share.snapshot.data.deltaMlKgMin !== null" class="text-xs mt-0.5" :class="vo2DeltaClass(share.snapshot.data.deltaMlKgMin)">
            {{ formatVo2Delta(share.snapshot.data.deltaMlKgMin) }}
            <template v-if="share.snapshot.data.startedAt"> since {{ formatDate(share.snapshot.data.startedAt) }}</template>
          </div>
          <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {{ formatDate(share.snapshot.data.measuredAt) }}
          </div>
        </div>
        <span class="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 flex-shrink-0">VO2 Max</span>
      </div>
    </template>

    <!-- Progress share -->
    <template v-else-if="share.snapshot.type === 'progress'">
      <div class="px-4 py-3">
        <div class="flex items-center gap-2 mb-2">
          <Icon name="tabler:target" class="text-gray-700 dark:text-gray-100 text-xl flex-shrink-0" />
          <span class="text-sm font-semibold">Weight progress</span>
        </div>
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{{ formatWeight(share.snapshot.data.startKg) }}</span>
          <span>Goal: {{ formatWeight(share.snapshot.data.targetKg) }}</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
          <div
            class="bg-green-500 h-2 rounded-full transition-all"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Current: {{ formatWeight(share.snapshot.data.currentKg) }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FitnessSharePreview, FitnessActivityType } from '~/types/api'

const props = defineProps<{
  share: FitnessSharePreview
}>()

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDistance(meters: number): string {
  // Default to miles (US); a future enhancement could read user preference.
  return `${(meters / 1609.34).toFixed(1)} mi`
}

function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return '—'
  return `${(kg * 2.20462).toFixed(1)} lbs`
}

function formatDelta(deltaKg: number): string {
  const lbs = Math.abs(deltaKg * 2.20462).toFixed(1)
  return deltaKg < 0 ? `↓ ${lbs} lbs` : `↑ ${lbs} lbs`
}

function deltaClass(deltaKg: number): string {
  return deltaKg < 0
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-500 dark:text-red-400'
}

function formatVo2Delta(delta: number): string {
  const abs = Math.abs(delta).toFixed(1)
  if (delta === 0) return 'No change'
  return delta > 0 ? `↑ ${abs}` : `↓ ${abs}`
}

function vo2DeltaClass(delta: number): string {
  if (delta > 0) return 'text-green-600 dark:text-green-400'
  if (delta < 0) return 'text-red-500 dark:text-red-400'
  return 'text-gray-500 dark:text-gray-400'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function activityIcon(type: FitnessActivityType): string {
  const map: Record<FitnessActivityType, string> = {
    run: 'tabler:run',
    ride: 'tabler:bike',
    walk: 'tabler:walk',
    swim: 'tabler:wave-sine',
    workout: 'tabler:barbell',
    hike: 'tabler:mountain',
    yoga: 'tabler:activity',
    other: 'tabler:heart-rate-monitor',
  }
  return map[type] ?? 'tabler:heart-rate-monitor'
}

const progressPercent = computed(() => {
  if (props.share.snapshot.type !== 'progress') return 0
  const { startKg, currentKg, targetKg } = props.share.snapshot.data
  if (!startKg || !currentKg || !targetKg) return 0
  const total = Math.abs(targetKg - startKg)
  if (total === 0) return 100
  const done = Math.abs(currentKg - startKg)
  return Math.min(100, Math.round((done / total) * 100))
})
</script>
