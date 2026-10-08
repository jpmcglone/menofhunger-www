<template>
  <section class="space-y-4">
  <AppAdminKitSectionHeading>Coins</AppAdminKitSectionHeading>
  <!-- Coins -->

  <!-- Coin KPI cards -->
  <div class="px-4 space-y-2">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div v-for="card in coinKpiCards" :key="card.label" class="rounded-xl border moh-border p-4 space-y-1">
        <div class="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{{ card.label }}</div>
        <div class="text-2xl font-bold tabular-nums" :class="card.color ?? ''">{{ card.value }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{{ card.sub }}</div>
      </div>
    </div>
  </div>

  <!-- Coins minted chart -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Coins Minted from Streaks <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
    <div class="rounded-xl border moh-border p-4" style="touch-action: pan-y;">
      <canvas ref="coinsMintedCanvas" height="180" />
    </div>
  </div>

  <!-- Multiplier breakdown -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Streak Multiplier Distribution <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
    <div class="rounded-xl border moh-border p-4 space-y-3">
      <div v-if="coinMultiplierTotal === 0" class="text-sm text-gray-400 dark:text-gray-500 italic">
        No streak rewards yet.
      </div>
      <template v-else>
        <div v-for="row in coinMultiplierRows" :key="row.label" class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full" :class="row.dot" />
              <span class="font-medium">{{ row.label }}</span>
              <span class="text-xs text-gray-400 dark:text-gray-500">{{ row.desc }}</span>
            </div>
            <div class="flex items-center gap-3 tabular-nums">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ row.pct }}%</span>
              <span class="font-semibold">{{ formatCount(row.count) }}</span>
            </div>
          </div>
          <div class="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
            <div class="h-full rounded-full transition-[width]" :class="row.bar" :style="{ width: row.pct + '%' }" />
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Economy health -->
  <div class="px-4 grid grid-cols-2 gap-3">
    <div class="rounded-xl border moh-border p-4 space-y-1">
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Velocity</div>
      <div class="text-2xl font-bold tabular-nums" :class="velocityColor">
        {{ data?.coins.velocityRatio != null ? data.coins.velocityRatio.toFixed(2) : '—' }}
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">transferred ÷ minted ({{ rangeLabel }})</div>
    </div>
    <div class="rounded-xl border moh-border p-4 space-y-1">
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Gini</div>
      <div class="text-2xl font-bold tabular-nums" :class="giniColor">
        {{ data?.coins.giniCoefficient != null ? data.coins.giniCoefficient.toFixed(2) : '—' }}
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">0 = equal · 1 = one holder</div>
    </div>
  </div>

  <!-- ─── Articles ──────────────────────────────────────────────── -->
  </section>
</template>

<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import type { AdminAnalytics } from '~/types/api'
import { useAdminAnalyticsContext } from '~/composables/pages/admin/useAdminAnalyticsPage'

defineProps<{ data: AdminAnalytics }>()

const {
  coinKpiCards,
  rangeLabel,
  coinMultiplierTotal,
  coinMultiplierRows,
  velocityColor,
  giniColor,
  coinsMintedCanvas,
} = useAdminAnalyticsContext()
</script>

