<template>
  <section class="space-y-4">
  <AppAdminKitSectionHeading>Engagement</AppAdminKitSectionHeading>
  <!-- Engagement health (always fixed windows) -->
  <div class="px-4 space-y-2">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

      <!-- D30 Retention -->
      <div class="rounded-xl border moh-border p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">D30 Retention</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Users still active 30 days after signup</div>
          </div>
          <div class="text-right shrink-0">
            <div v-if="data.engagement.d30RetentionPct !== null" class="text-2xl font-bold tabular-nums" :class="engagementColor(data.engagement.d30RetentionPct, 20, 40)">
              {{ data.engagement.d30RetentionPct }}%
            </div>
            <div v-else class="text-sm text-gray-400 dark:text-gray-500 italic">No data yet</div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ data.engagement.d30RetainedCount.toLocaleString() }} of {{ data.engagement.d30CohortSize.toLocaleString() }} users retained
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          Benchmark: top apps 25–40%+
        </div>
      </div>

      <!-- Activation rate -->
      <div class="rounded-xl border moh-border p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Activation Rate</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Active within first 7 days of signup</div>
          </div>
          <div class="text-right shrink-0">
            <div v-if="data.engagement.activationPct !== null" class="text-2xl font-bold tabular-nums" :class="engagementColor(data.engagement.activationPct, 30, 60)">
              {{ data.engagement.activationPct }}%
            </div>
            <div v-else class="text-sm text-gray-400 dark:text-gray-500 italic">No data yet</div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ data.engagement.activationCount.toLocaleString() }} of {{ data.engagement.activationEligibleCount.toLocaleString() }} users activated
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          Benchmark: strong apps 50–70%+
        </div>
      </div>

      <!-- Creator % -->
      <div class="rounded-xl border moh-border p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Creator %</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">MAU who posted, published an article, or hosted a space (30 days)</div>
          </div>
          <div class="text-right shrink-0">
            <div v-if="data.engagement.creatorPct !== null" class="text-2xl font-bold tabular-nums" :class="engagementColor(data.engagement.creatorPct, 15, 30)">
              {{ data.engagement.creatorPct }}%
            </div>
            <div v-else class="text-sm text-gray-400 dark:text-gray-500 italic">No data yet</div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ data.engagement.creatorCount.toLocaleString() }} creators out of {{ data.engagement.creatorMauCount.toLocaleString() }} MAU
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          Benchmark: healthy communities 20–30%+
        </div>
      </div>

      <!-- Network density -->
      <div class="rounded-xl border moh-border p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Network Density</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Connected users (following & followed)</div>
          </div>
          <div class="text-right shrink-0">
            <div v-if="data.engagement.connectedUserPct !== null" class="text-2xl font-bold tabular-nums" :class="engagementColor(data.engagement.connectedUserPct, 30, 60)">
              {{ data.engagement.connectedUserPct }}%
            </div>
            <div v-else class="text-sm text-gray-400 dark:text-gray-500 italic">No data yet</div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ data.engagement.connectedUserCount.toLocaleString() }} connected &middot; avg {{ data.engagement.avgFollowersPerUser.toLocaleString() }} followers/user
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          Higher = stronger network effect
        </div>
      </div>

      <!-- Verification → Premium funnel -->
      <div class="rounded-xl border moh-border p-4 space-y-3 sm:col-span-2">
        <div class="font-medium text-sm">Conversion Funnel</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 -mt-1">Signup → Verified → Premium</div>
        <div class="flex items-stretch gap-0 rounded-lg overflow-hidden border moh-border text-center text-sm">
          <div class="flex-1 px-3 py-3 bg-gray-50 dark:bg-zinc-900/50">
            <div class="text-lg font-bold tabular-nums">{{ data.summary.totalUsers.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">All users</div>
          </div>
          <div class="flex items-center px-1 text-gray-300 dark:text-zinc-600 select-none">›</div>
          <div class="flex-1 px-3 py-3">
            <div class="text-lg font-bold tabular-nums" :class="engagementColor(verifiedConversionPct, 20, 50)">
              {{ data.summary.verifiedUsers.toLocaleString() }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Verified ({{ verifiedConversionPct }}%)</div>
          </div>
          <div class="flex items-center px-1 text-gray-300 dark:text-zinc-600 select-none">›</div>
          <div class="flex-1 px-3 py-3">
            <div class="text-lg font-bold tabular-nums" :class="engagementColor(premiumOfVerifiedPct, 10, 30)">
              {{ data.summary.premiumUsers.toLocaleString() }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Premium ({{ premiumOfVerifiedPct }}% of verified)</div>
          </div>
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          Verification is required for premium access — this shows your full upgrade path.
        </div>
      </div>

    </div>
  </div>

  <!-- Retention table (always 10-week window) -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Weekly Cohort Retention <span class="text-gray-500 dark:text-gray-400 font-normal">(last 10 weeks)</span></div>
    <AppAdminKitTableShell>
      <thead>
        <tr class="border-b moh-border text-left text-gray-600 dark:text-gray-300">
          <th class="px-4 py-3 font-medium">Cohort week</th>
          <th class="px-4 py-3 font-medium text-right">Users</th>
          <th class="px-4 py-3 font-medium text-right">W1 retained</th>
          <th class="px-4 py-3 font-medium text-right">W1 %</th>
          <th class="px-4 py-3 font-medium text-right">W4 retained</th>
          <th class="px-4 py-3 font-medium text-right">W4 %</th>
        </tr>
      </thead>
      <tbody class="moh-divide">
        <tr v-for="row in retentionRows" :key="row.cohortWeek" class="hover:bg-gray-50 dark:hover:bg-zinc-900/50">
          <td class="px-4 py-3 font-mono text-xs">{{ row.cohortWeek }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ row.size.toLocaleString() }}</td>
          <td class="px-4 py-3 text-right tabular-nums">
            <span v-if="row.isW1Eligible">{{ row.w1.toLocaleString() }}</span>
            <span v-else class="text-gray-500 dark:text-gray-400 font-medium">--</span>
          </td>
          <td class="px-4 py-3 text-right tabular-nums">
            <span v-if="row.isW1Eligible" :class="retentionColor(row.w1Pct)">{{ row.w1Pct }}%</span>
            <span v-else class="text-gray-500 dark:text-gray-400 font-medium">--</span>
          </td>
          <td class="px-4 py-3 text-right tabular-nums">
            <span v-if="row.isW4Eligible">{{ row.w4.toLocaleString() }}</span>
            <span v-else class="text-gray-500 dark:text-gray-400 font-medium">--</span>
          </td>
          <td class="px-4 py-3 text-right tabular-nums">
            <span v-if="row.isW4Eligible" :class="retentionColor(row.w4Pct)">{{ row.w4Pct }}%</span>
            <span v-else class="text-gray-500 dark:text-gray-400 font-medium">--</span>
          </td>
        </tr>
        <tr v-if="!retentionRows.length">
          <td colspan="6" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">No data yet</td>
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
  engagementColor,
  verifiedConversionPct,
  premiumOfVerifiedPct,
  retentionRows,
  retentionColor,
} = useAdminAnalyticsContext()
</script>

