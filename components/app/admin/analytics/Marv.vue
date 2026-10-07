<template>
  <section class="space-y-4">
  <AppAdminKitSectionHeading>M.A.R.V.</AppAdminKitSectionHeading>
  <!-- M.A.R.V. / AI -->

  <div v-if="data.ai" class="px-4 space-y-3">
    <!-- KPI cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div
        v-for="c in aiKpiCards"
        :key="c.label"
        class="rounded-xl border moh-border p-4 space-y-1"
      >
        <div class="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{{ c.label }}</div>
        <div class="text-xl font-bold tabular-nums leading-tight">{{ c.value }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{{ c.sub }}</div>
      </div>
    </div>

    <!-- Interactions time series chart -->
    <div v-if="data.ai.interactions.length > 0" class="rounded-xl border moh-border p-4" style="touch-action: pan-y;">
      <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3">Successful Interactions Over Time</div>
      <canvas ref="aiInteractionsCanvas" height="160" />
    </div>
    <div v-else class="rounded-xl border moh-border p-4 text-sm text-gray-400 dark:text-gray-500 italic">
      No successful interactions in this period.
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <!-- Source breakdown -->
      <div class="rounded-xl border moh-border p-4 space-y-3">
        <div class="text-xs font-semibold text-gray-600 dark:text-gray-300">By Source</div>
        <div v-if="!aiSourceRows.length" class="text-sm text-gray-400 dark:text-gray-500 italic">No data.</div>
        <template v-else>
          <div v-for="row in aiSourceRows" :key="row.key" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full" :class="row.dot" />
                <span class="font-medium">{{ row.label }}</span>
              </div>
              <div class="flex items-center gap-3 tabular-nums">
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ row.pct }}%</span>
                <span class="font-semibold">{{ row.count.toLocaleString() }}</span>
              </div>
            </div>
            <div class="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
              <div class="h-full rounded-full transition-[width]" :class="row.bar" :style="{ width: row.pct + '%' }" />
            </div>
          </div>
        </template>
      </div>

      <!-- Mode breakdown -->
      <div class="rounded-xl border moh-border p-4 space-y-3">
        <div class="text-xs font-semibold text-gray-600 dark:text-gray-300">By Effective Mode <span class="font-normal text-gray-400">(successful only)</span></div>
        <div v-if="!aiModeRows.length" class="text-sm text-gray-400 dark:text-gray-500 italic">No data.</div>
        <template v-else>
          <div v-for="row in aiModeRows" :key="row.key" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full" :class="row.dot" />
                <span class="font-medium">{{ row.label }}</span>
              </div>
              <div class="flex items-center gap-3 tabular-nums">
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ row.pct }}%</span>
                <span class="font-semibold">{{ row.count.toLocaleString() }}</span>
              </div>
            </div>
            <div class="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
              <div class="h-full rounded-full transition-[width]" :class="row.bar" :style="{ width: row.pct + '%' }" />
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Outcome breakdown -->
    <div class="rounded-xl border moh-border p-4 space-y-3">
      <div class="text-xs font-semibold text-gray-600 dark:text-gray-300">Outcome Breakdown <span class="font-normal text-gray-400">(all interactions)</span></div>
      <div v-if="!aiOutcomeRows.length" class="text-sm text-gray-400 dark:text-gray-500 italic">No data.</div>
      <template v-else>
        <div v-for="row in aiOutcomeRows" :key="row.key" class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full" :class="row.dot" />
              <span class="font-medium">{{ row.label }}</span>
            </div>
            <div class="flex items-center gap-3 tabular-nums">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ row.pct }}%</span>
              <span class="font-semibold">{{ row.count.toLocaleString() }}</span>
            </div>
          </div>
          <div class="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
            <div
              class="h-full rounded-full transition-[width]"
              :class="row.key === 'success' ? 'bg-green-500' : 'bg-red-400'"
              :style="{ width: row.pct + '%' }"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
  </section>
</template>

<script setup lang="ts">
import type { AdminAnalytics } from '~/types/api'
import { useAdminAnalyticsContext } from '~/composables/pages/admin/useAdminAnalyticsPage'

defineProps<{ data: AdminAnalytics }>()

const {
  aiKpiCards,
  aiSourceRows,
  aiModeRows,
  aiOutcomeRows,
  aiInteractionsCanvas,
} = useAdminAnalyticsContext()
</script>

