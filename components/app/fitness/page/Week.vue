<template>
  <!-- ─── This week ─────────────────────────────────────────────────── -->
  <div class="moh-gutter-x py-3">
    <div class="rounded-xl border moh-border moh-surface-2 p-4 space-y-4">
      <div class="flex items-center">
        <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">This week</span>
        <button
          v-if="stravaConnection"
          :disabled="syncing || stravaCooldownRemaining > 0"
          class="ml-auto p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
          :title="stravaCooldownRemaining > 0 ? `Sync again in ${formatCooldown(stravaCooldownRemaining)}` : 'Sync'"
          @click="syncStrava"
        >
          <svg
            class="w-3.5 h-3.5 transition-transform"
            :class="syncing ? 'animate-spin' : ''"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </button>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="text-center">
          <div class="text-xl font-bold tabular-nums">
            <span v-if="fitnessPage.weekSummary.totalSteps > 0">{{ formatSteps(fitnessPage.weekSummary.totalSteps) }}</span>
            <span v-else class="text-gray-400 font-normal">—</span>
          </div>
          <div
            v-if="avgStepsPerDay != null"
            class="text-[10px] tabular-nums mt-0.5 text-gray-400"
          >{{ formatSteps(avgStepsPerDay) }} / day</div>
          <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center justify-center gap-0.5">
            <Icon name="tabler:footprint" class="text-[11px]" aria-hidden="true" />
            <span>steps</span>
          </div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold tabular-nums">
            <span v-if="fitnessPage.weekSummary.totalWorkoutMinutes > 0">{{ fitnessPage.weekSummary.totalWorkoutMinutes }}</span>
            <span v-else class="text-gray-400 font-normal">—</span>
          </div>
          <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">min active</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold tabular-nums">
            <span v-if="fitnessPage.weekSummary.totalDistanceM > 0">{{ formatDistance(fitnessPage.weekSummary.totalDistanceM) }}</span>
            <span v-else class="text-gray-400 font-normal">—</span>
          </div>
          <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{{ fitnessPage.units === 'us' ? 'miles' : 'km' }}</div>
        </div>
      </div>

      <!-- Day bars (scrub to inspect a day's steps) -->
      <div
        class="select-none touch-none"
        @pointerdown="onWeekPointerDown"
        @pointermove="onWeekPointerMove"
        @pointerup="onWeekPointerUp"
        @pointercancel="clearInspectedDay"
        @pointerleave="clearInspectedDay"
      >
        <div class="h-4 text-[10px] tabular-nums text-center text-gray-400">
          {{ inspectedDayCaption || '\u00a0' }}
        </div>
        <div ref="weekBarsEl" class="flex items-end gap-1">
          <button
            v-for="day in fitnessPage.weekSummary.days"
            :key="day.dayKey"
            type="button"
            class="flex-1 flex flex-col items-center gap-1 pointer-events-none"
            :aria-label="dayAriaLabel(day)"
            @focus="inspectedDayKey = day.dayKey"
            @blur="clearInspectedDay"
          >
            <div
              class="w-full rounded-sm transition-[height,opacity,background-color] duration-[var(--moh-duration-base)]"
              :class="dayBarClass(day)"
              :style="{ height: dayBarHeight(day), opacity: dayBarOpacity(day) }"
            />
            <span
              class="text-[10px] transition-colors"
              :class="isDayToday(day) ? 'text-white font-semibold' : 'text-gray-500 dark:text-gray-500'"
            >{{ dayLabel(day.dayKey) }}</span>
            <span
              class="w-1 h-1 rounded-full -mt-0.5 transition-opacity"
              :class="[accentBg, isDayToday(day) ? 'opacity-100' : 'opacity-0']"
            />
          </button>
        </div>
      </div>
      <p v-if="recoveryLine" class="text-xs text-gray-400 tabular-nums">{{ recoveryLine }}</p>
    </div>
  </div>

  <div
    v-if="fitnessPage.connections.length === 0"
    class="moh-gutter-x py-8 text-center space-y-2"
  >
    <p class="text-sm text-gray-500 dark:text-gray-400">{{ connectEmptyCopy }}</p>
    <NuxtLink
      to="/settings/fitness"
      class="inline-block text-sm font-medium text-orange-600 dark:text-orange-400"
    >
      Connect in Settings
    </NuxtLink>
  </div>
  <NuxtLink
    v-else
    to="/settings/fitness"
    class="moh-gutter-x py-2 flex items-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
  >
    <span>{{ connectionLine }}</span>
    <Icon name="tabler:chevron-right" class="ml-auto text-[14px]" />
  </NuxtLink>
</template>

<script setup lang="ts">
import type { FitnessPage } from '~/types/api'
import { useFitnessPageContext } from '~/composables/pages/fitness/useFitnessPage'

defineProps<{ fitnessPage: FitnessPage }>()

const {
  stravaConnection,
  syncing,
  stravaCooldownRemaining,
  formatCooldown,
  syncStrava,
  formatSteps,
  avgStepsPerDay,
  formatDistance,
  onWeekPointerDown,
  onWeekPointerMove,
  onWeekPointerUp,
  clearInspectedDay,
  inspectedDayCaption,
  dayAriaLabel,
  inspectedDayKey,
  dayBarClass,
  dayBarHeight,
  dayBarOpacity,
  isDayToday,
  dayLabel,
  accentBg,
  recoveryLine,
  connectEmptyCopy,
  connectionLine,
  weekBarsEl,
} = useFitnessPageContext()
</script>

