<template>
  <!-- ─── Card 2: Weight + Goal ──────────────────────────────────────── -->
  <div class="moh-gutter-x py-3">
    <div class="rounded-xl border moh-border moh-surface-2 moh-divide">

  <!-- Weight -->
  <div class="p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Weight</div>
      <div class="flex items-center gap-2">
        <AppFitnessOverflow
          v-if="fitnessPage.latestWeight"
          @share="openShare('weight', fitnessPage.latestWeight.id)"
        />
        <button
          class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          @click="showLogWeight = true"
        >
          Log weight
        </button>
      </div>
    </div>

    <!-- Current weight + delta (updates while scrubbing the chart) -->
    <div v-if="displayedWeight" class="flex items-end justify-between">
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-bold tabular-nums">{{ formatWeight(displayedWeight.weightKg) }}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ fitnessPage.units === 'us' ? 'lbs' : 'kg' }}</span>
      </div>
      <div class="text-right">
        <div v-if="weightDelta !== null" class="text-sm font-medium" :class="weightDeltaClass">
          {{ weightDelta > 0 ? '+' : '' }}{{ formatWeight(weightDelta / (fitnessPage.units === 'us' ? 1 / 2.20462 : 1)) }}
          {{ fitnessPage.units === 'us' ? 'lbs' : 'kg' }}
        </div>
        <div class="text-xs text-gray-400">{{ formatFitnessDate(displayedWeight.measuredAt) }}</div>
      </div>
    </div>
    <div v-else class="text-sm text-gray-500 dark:text-gray-400">
      No weight logged yet.
    </div>

    <!-- Sparkline chart -->
    <div v-if="sparklinePoints.length >= 2" class="relative">
      <AppFitnessSparkline
        :points="sparklinePoints"
        :line-path="sparklinePath"
        :area-path="sparklineAreaPath"
        :color="accentRgb"
        gradient-id="wt-grad"
        chart-label="Weight history. Drag to inspect a reading."
        @hover="hoverWeightIndex = $event"
      />
      <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{{ formatFitnessDate(fitnessPage.weightHistory.at(-1)!.measuredAt) }}</span>
        <span>{{ fitnessPage.weightHistory.length }} entries</span>
        <span>{{ formatFitnessDate(fitnessPage.weightHistory.at(0)!.measuredAt) }}</span>
      </div>
    </div>

    <div
      v-if="fitnessPage.weightHistory.length > 1"
      class="rounded-lg moh-surface-1 moh-divide overflow-hidden"
    >
      <div
        v-for="(metric, idx) in fitnessPage.weightHistory.slice(0, 5)"
        :key="metric.id"
        class="flex items-center justify-between px-3 py-2"
      >
        <div>
          <div class="text-sm font-medium tabular-nums">{{ formatWeight(metric.weightKg) }} {{ fitnessPage.units === 'us' ? 'lbs' : 'kg' }}</div>
          <div class="text-[10px] text-gray-400">{{ formatFitnessDate(metric.measuredAt) }}</div>
        </div>
        <div
          v-if="fitnessPage.weightHistory[idx + 1]"
          class="text-xs tabular-nums"
          :class="weightEntryDeltaClass(metric.weightKg, fitnessPage.weightHistory[idx + 1]!.weightKg)"
        >
          {{ weightEntryDelta(metric.weightKg, fitnessPage.weightHistory[idx + 1]!.weightKg) }}
        </div>
      </div>
    </div>

    <!-- Log weight form (inline) -->
    <div v-if="showLogWeight" class="pt-2 space-y-2">
      <div class="flex items-center gap-2">
        <input
          v-model="logWeightInput"
          type="number"
          step="0.1"
          min="1"
          :placeholder="fitnessPage.units === 'us' ? 'Weight (lbs)' : 'Weight (kg)'"
          class="flex-1 rounded-lg border moh-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          @keydown.enter="submitLogWeight"
        >
        <button
          class="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium disabled:opacity-50"
          :disabled="savingWeight || !logWeightInput"
          @click="submitLogWeight"
        >
          {{ savingWeight ? 'Saving…' : 'Save' }}
        </button>
        <button
          class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          @click="showLogWeight = false; logWeightInput = ''"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>

  <!-- Goal -->
  <div class="p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Goal</div>
      <div class="flex items-center gap-2">
        <AppFitnessOverflow
          v-if="fitnessPage.activeGoal"
          @share="openShare('progress', fitnessPage.activeGoal.id)"
        />
        <button
          class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          @click="showSetGoal = true"
        >
          {{ fitnessPage.activeGoal ? 'Edit goal' : 'Set goal' }}
        </button>
      </div>
    </div>

    <div v-if="fitnessPage.activeGoal">
      <div class="flex items-center justify-between text-xs mb-2">
        <div class="text-center">
          <div class="font-medium tabular-nums">{{ formatWeight(goalStartKg) }}</div>
          <div class="text-gray-400">start</div>
        </div>
        <div class="text-center">
          <div class="font-semibold tabular-nums" :class="accentText">
            {{ fitnessPage.latestWeight ? formatWeight(fitnessPage.latestWeight.weightKg) : '—' }}
          </div>
          <div class="text-gray-400">current</div>
        </div>
        <div class="text-center">
          <div class="font-medium tabular-nums">{{ formatWeight(fitnessPage.activeGoal.targetKg) }}</div>
          <div class="text-gray-400">goal</div>
        </div>
      </div>
      <div class="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
        <div
          class="h-2 rounded-full transition-[width] duration-[var(--moh-duration-slow)]"
          :class="accentBg"
          :style="{ width: `${goalProgressPercent}%` }"
        />
      </div>
      <div v-if="goalRemainingLabel" class="text-[10px] text-gray-400 mt-1">
        {{ goalRemainingLabel }}
      </div>
    </div>
    <div v-else class="text-sm text-gray-500 dark:text-gray-400">
      No active weight goal.
    </div>

    <!-- Set goal form (inline) -->
    <div v-if="showSetGoal" class="pt-2 space-y-2">
      <div class="flex items-center gap-2 flex-wrap">
        <input
          v-model="goalTargetInput"
          type="number"
          step="0.1"
          min="1"
          :placeholder="fitnessPage.units === 'us' ? 'Target (lbs)' : 'Target (kg)'"
          class="w-36 rounded-lg border moh-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2"
          :class="accentRing"
          @keydown.enter="submitSetGoal"
        >
        <button
          class="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          :class="accentBg"
          :disabled="savingGoal || !goalTargetInput"
          @click="submitSetGoal"
        >
          {{ savingGoal ? 'Saving…' : 'Save' }}
        </button>
        <button
          class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          @click="showSetGoal = false; goalTargetInput = ''"
        >
          Cancel
        </button>
      </div>
    </div>
  </div><!-- /Goal -->
    </div><!-- /card inner -->
  </div><!-- /Card 2 outer -->
</template>

<script setup lang="ts">
import type { FitnessPage } from '~/types/api'
import { formatFitnessDate } from '~/utils/fitness-format'
import { useFitnessPageContext } from '~/composables/pages/fitness/useFitnessPage'

defineProps<{ fitnessPage: FitnessPage }>()

const {
  openShare,
  showLogWeight,
  displayedWeight,
  formatWeight,
  weightDelta,
  weightDeltaClass,
  sparklinePoints,
  sparklinePath,
  sparklineAreaPath,
  accentRgb,
  hoverWeightIndex,
  weightEntryDeltaClass,
  weightEntryDelta,
  logWeightInput,
  submitLogWeight,
  savingWeight,
  showSetGoal,
  goalStartKg,
  accentText,
  accentBg,
  goalProgressPercent,
  goalRemainingLabel,
  goalTargetInput,
  accentRing,
  submitSetGoal,
  savingGoal,
} = useFitnessPageContext()
</script>

