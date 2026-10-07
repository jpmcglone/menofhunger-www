<template>
  <!-- ─── Steps ──────────────────────────────────────────────────── -->
  <div
    v-if="fitnessPage.stepsHistory.length > 0"
    class="moh-gutter-x py-3"
  >
    <div class="rounded-xl border moh-border moh-surface-2 p-4 space-y-3">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Steps</div>

      <div v-if="displayedSteps" class="flex items-end justify-between">
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-bold tabular-nums">{{ formatSteps(displayedSteps.stepsCount) }}</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">steps</span>
        </div>
        <div class="text-right">
          <div
            v-if="stepsAvgPerDay != null && hoverStepsIndex == null"
            class="text-sm tabular-nums text-gray-400"
          >{{ formatSteps(stepsAvgPerDay) }} / day</div>
          <div class="text-xs text-gray-400">{{ formatFitnessDayKey(displayedSteps.dayKey) }}</div>
        </div>
      </div>

      <div v-if="stepsSparkline.points.length >= 2" class="relative">
        <AppFitnessSparkline
          :points="stepsSparkline.points"
          :line-path="stepsSparkline.linePath"
          :area-path="stepsSparkline.areaPath"
          color="rgb(20,184,166)"
          gradient-id="steps-grad"
          chart-label="Steps history. Drag to inspect a day."
          @hover="hoverStepsIndex = $event"
        />
        <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>{{ formatFitnessDayKey(fitnessPage.stepsHistory.at(-1)!.dayKey) }}</span>
          <span>{{ fitnessPage.stepsHistory.length }} days</span>
          <span>{{ formatFitnessDayKey(fitnessPage.stepsHistory.at(0)!.dayKey) }}</span>
        </div>
      </div>

      <div
        v-if="fitnessPage.stepsHistory.length > 1"
        class="rounded-lg moh-surface-1 moh-divide overflow-hidden"
      >
        <div
          v-for="(day, idx) in fitnessPage.stepsHistory.slice(0, 5)"
          :key="day.dayKey"
          class="flex items-center justify-between px-3 py-2"
        >
          <div>
            <div class="text-sm font-medium tabular-nums">{{ formatSteps(day.stepsCount) }} steps</div>
            <div class="text-[10px] text-gray-400">{{ formatFitnessDayKey(day.dayKey) }}</div>
          </div>
          <div
            v-if="fitnessPage.stepsHistory[idx + 1]"
            class="text-xs tabular-nums"
            :class="stepsEntryDeltaClass(day.stepsCount, fitnessPage.stepsHistory[idx + 1]!.stepsCount)"
          >
            {{ stepsEntryDelta(day.stepsCount, fitnessPage.stepsHistory[idx + 1]!.stepsCount) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FitnessPage } from '~/types/api'
import { formatFitnessDayKey } from '~/utils/fitness-format'
import { useFitnessPageContext } from '~/composables/pages/fitness/useFitnessPage'

defineProps<{ fitnessPage: FitnessPage }>()

const {
  displayedSteps,
  formatSteps,
  stepsAvgPerDay,
  hoverStepsIndex,
  stepsSparkline,
  stepsEntryDeltaClass,
  stepsEntryDelta,
} = useFitnessPageContext()
</script>

