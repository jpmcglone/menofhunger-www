<template>
  <section class="space-y-4">
  <AppAdminKitSectionHeading>Groups</AppAdminKitSectionHeading>
  <!-- Community groups -->
  <div class="px-4 space-y-3">
    <div class="font-semibold text-sm">
      Activity
      <span class="text-gray-400 font-normal">({{ rangeLabel }})</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="c in groupKpiCards"
        :key="c.label"
        class="rounded-xl border moh-border p-4 space-y-1.5"
      >
        <div class="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-tight">{{ c.label }}</div>
        <div class="text-2xl font-bold tabular-nums leading-none">{{ c.value }}</div>
        <div v-if="c.sub" class="text-xs text-gray-500 dark:text-gray-400 leading-tight">{{ c.sub }}</div>
      </div>
    </div>
    <AppAdminKitTableShell>
      <thead>
        <tr class="border-b moh-border text-left text-gray-500 dark:text-gray-400">
          <th class="px-4 py-3 font-medium">Group</th>
          <th class="px-4 py-3 font-medium text-right">Members</th>
          <th class="px-4 py-3 font-medium text-right">Root posts</th>
          <th class="px-4 py-3 font-medium text-right">≥1 reply in 24h</th>
        </tr>
      </thead>
      <tbody class="moh-divide">
        <tr
          v-for="g in data.groups.topGroups"
          :key="g.id"
          class="relative hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer"
          @click="onAnalyticsRowClick(`/g/${encodeURIComponent(g.slug)}`, $event)"
          @auxclick="onAnalyticsRowAuxClick(`/g/${encodeURIComponent(g.slug)}`, $event)"
        >
          <td class="px-4 py-3">
            <NuxtLink :to="`/g/${encodeURIComponent(g.slug)}`" class="absolute inset-0 z-0" tabindex="-1" aria-hidden="true" />
            <div class="relative z-[1] font-medium">{{ g.name }}</div>
            <div class="relative z-[1] text-xs text-gray-400 dark:text-gray-500 font-mono">{{ g.slug }}</div>
          </td>
          <td class="px-4 py-3 text-right tabular-nums">{{ g.memberCount.toLocaleString() }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ g.rootPostsInRange.toLocaleString() }}</td>
          <td class="px-4 py-3 text-right tabular-nums">
            <span v-if="g.replyRate24hPct !== null">{{ g.replyRate24hPct }}%</span>
            <span v-else class="text-gray-400">—</span>
          </td>
        </tr>
        <tr v-if="!data.groups.topGroups.length">
          <td colspan="4" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            No groups yet
          </td>
        </tr>
      </tbody>
    </AppAdminKitTableShell>
  </div>
  </section>
</template>

<script setup lang="ts">
import type { AdminAnalytics } from '~/types/api'
import { useAdminAnalyticsContext } from '~/composables/pages/admin/useAdminAnalyticsPage'

defineProps<{ data: AdminAnalytics }>()

const {
  rangeLabel,
  groupKpiCards,
  onAnalyticsRowClick,
  onAnalyticsRowAuxClick,
} = useAdminAnalyticsContext()
</script>

