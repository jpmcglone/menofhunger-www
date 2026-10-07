<template>
  <!-- ─── VO2 Max (separate card) ─────────────────────────────────── -->
  <div
    v-if="fitnessPage.latestVo2Max || fitnessPage.vo2maxHistory.length > 0"
    class="moh-gutter-x py-3"
  >
    <div class="rounded-xl border moh-border moh-surface-2 p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">VO2 max</div>
      <AppFitnessOverflow
        v-if="fitnessPage.latestVo2Max"
        @share="openShare('vo2max', fitnessPage.latestVo2Max.id)"
      />
    </div>

    <div v-if="displayedVo2Max" class="flex items-end justify-between">
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-bold tabular-nums">{{ displayedVo2Max.weightKg.toFixed(1) }}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">ml/kg/min</span>
      </div>
      <div class="text-right">
        <div class="text-xs font-medium" :class="vo2maxCategory(displayedVo2Max.weightKg).color">
          {{ vo2maxCategory(displayedVo2Max.weightKg).label }}
        </div>
        <div class="text-xs text-gray-400">{{ formatFitnessDate(displayedVo2Max.measuredAt) }}</div>
      </div>
    </div>
    <div v-else class="text-sm text-gray-500 dark:text-gray-400">
      No VO2 max recorded yet. Open the iOS app to sync from Apple Health.
    </div>

    <!-- VO2 sparkline -->
    <div v-if="vo2maxPoints.length >= 2" class="relative">
      <AppFitnessSparkline
        :points="vo2maxPoints"
        :line-path="vo2maxPath"
        :area-path="vo2maxAreaPath"
        color="rgb(99,102,241)"
        gradient-id="vo2-grad"
        chart-label="VO2 max history. Drag to inspect a reading."
        @hover="hoverVo2Index = $event"
      />
      <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{{ formatFitnessDate(fitnessPage.vo2maxHistory.at(-1)!.measuredAt) }}</span>
        <span>{{ fitnessPage.vo2maxHistory.length }} readings</span>
        <span>{{ formatFitnessDate(fitnessPage.vo2maxHistory.at(0)!.measuredAt) }}</span>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FitnessPage } from '~/types/api'
import { formatFitnessDate } from '~/utils/fitness-format'
import { useFitnessPageContext } from '~/composables/pages/fitness/useFitnessPage'

defineProps<{ fitnessPage: FitnessPage }>()

const {
  openShare,
  displayedVo2Max,
  vo2maxCategory,
  vo2maxPoints,
  vo2maxPath,
  vo2maxAreaPath,
  hoverVo2Index,
} = useFitnessPageContext()
</script>

