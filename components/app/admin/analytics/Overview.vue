<template>
  <section class="space-y-4">
  <AppAdminKitSectionHeading>Overview</AppAdminKitSectionHeading>
  <!-- Summary cards -->
  <div class="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
    <div v-for="card in summaryCards" :key="card.label" class="rounded-xl border moh-border p-4 space-y-1.5">
      <div class="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-tight">{{ card.label }}</div>
      <div class="text-2xl font-bold tabular-nums leading-none">{{ card.value }}</div>
      <div v-if="card.sub" class="text-xs text-gray-500 dark:text-gray-400 leading-tight">{{ card.sub }}</div>
    </div>
  </div>

  <!-- Growth chart -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">New Signups <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
    <div class="rounded-xl border moh-border p-4" style="touch-action: pan-y;">
      <canvas ref="signupsCanvas" height="180" />
    </div>
  </div>
  </section>
</template>

<script setup lang="ts">
import type { AdminAnalytics } from '~/types/api'
import { useAdminAnalyticsContext } from '~/composables/pages/admin/useAdminAnalyticsPage'

defineProps<{ data: AdminAnalytics }>()

const {
  summaryCards,
  rangeLabel,
  signupsCanvas,
} = useAdminAnalyticsContext()
</script>

