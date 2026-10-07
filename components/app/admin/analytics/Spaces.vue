<template>
  <section class="space-y-4">
  <AppAdminKitSectionHeading>Spaces</AppAdminKitSectionHeading>
  <!-- Spaces -->

  <!-- Spaces KPI cards -->
  <div class="px-4 space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="c in spaceKpiCards"
        :key="c.label"
        class="rounded-xl border moh-border p-4 space-y-1.5"
      >
        <div class="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-tight">{{ c.label }}</div>
        <div class="text-2xl font-bold tabular-nums leading-none">{{ c.value }}</div>
        <div v-if="c.sub" class="text-xs text-gray-500 dark:text-gray-400 leading-tight">{{ c.sub }}</div>
      </div>
    </div>

    <!-- Currently active spaces table -->
    <AppAdminKitTableShell>
      <thead>
        <tr class="border-b moh-border text-left text-gray-500 dark:text-gray-400">
          <th class="px-4 py-3 font-medium">Space</th>
          <th class="px-4 py-3 font-medium">Owner</th>
          <th class="px-4 py-3 font-medium text-right">Mode</th>
          <th class="px-4 py-3 font-medium text-right">Last live</th>
          <th class="px-4 py-3 font-medium text-right">Created</th>
        </tr>
      </thead>
      <tbody class="moh-divide">
        <tr
          v-for="s in data.spaces?.topSpaces ?? []"
          :key="s.id"
          class="relative hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer"
          @click="onAnalyticsRowClick(`/s/${encodeURIComponent(s.ownerUsername)}`, $event)"
          @auxclick="onAnalyticsRowAuxClick(`/s/${encodeURIComponent(s.ownerUsername)}`, $event)"
        >
          <td class="px-4 py-3">
            <NuxtLink :to="`/s/${encodeURIComponent(s.ownerUsername)}`" class="absolute inset-0 z-0" tabindex="-1" aria-hidden="true" />
            <div class="relative z-[1] font-medium">{{ s.title }}</div>
          </td>
          <td class="px-4 py-3 text-gray-500 dark:text-gray-400">
            @{{ s.ownerUsername }}
          </td>
          <td class="px-4 py-3 text-right">
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="s.mode === 'WATCH_PARTY'
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                : s.mode === 'RADIO'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400'"
            >
              {{ s.mode === 'WATCH_PARTY' ? 'Watch party' : s.mode === 'RADIO' ? 'Radio' : 'Idle' }}
            </span>
          </td>
          <td class="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {{ s.activatedAt ? articleAge(s.activatedAt) : '—' }}
          </td>
          <td class="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {{ articleAge(s.createdAt) }}
          </td>
        </tr>
        <tr v-if="!data.spaces?.topSpaces?.length">
          <td colspan="5" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            No active spaces
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
  spaceKpiCards,
  onAnalyticsRowClick,
  onAnalyticsRowAuxClick,
  articleAge,
} = useAdminAnalyticsContext()
</script>

