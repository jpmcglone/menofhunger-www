<template>
  <section class="space-y-4">
  <AppAdminKitSectionHeading>Monetization</AppAdminKitSectionHeading>
  <!-- Monetization (always all-time) -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Tier Breakdown <span class="text-gray-400 font-normal">(all time)</span></div>
    <div class="rounded-xl border moh-border p-4 space-y-5">

      <!-- Paying subscribers -->
      <div>
        <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Paying (Stripe)</div>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3">
            <div class="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">{{ formatCount(totalPaying) }}</div>
            <div class="text-xs text-green-600 dark:text-green-500 mt-1">Total paying</div>
          </div>
          <div class="rounded-lg border moh-border p-3">
            <div class="text-2xl font-bold tabular-nums">{{ formatCount(data.monetization.payingPremium) }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium</div>
          </div>
          <div class="rounded-lg border moh-border p-3">
            <div class="text-2xl font-bold tabular-nums">{{ formatCount(data.monetization.payingPremiumPlus) }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium+</div>
          </div>
        </div>
      </div>

      <!-- Comped -->
      <div>
        <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Comped (grants)</div>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
            <div class="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{{ formatCount(totalComped) }}</div>
            <div class="text-xs text-amber-600 dark:text-amber-500 mt-1">Active comped</div>
          </div>
          <div class="rounded-lg border moh-border p-3">
            <div class="text-2xl font-bold tabular-nums">{{ formatCount(data.monetization.compedPremium) }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium</div>
          </div>
          <div class="rounded-lg border moh-border p-3">
            <div class="text-2xl font-bold tabular-nums">{{ formatCount(data.monetization.compedPremiumPlus) }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium+</div>
          </div>
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
          <span>Users with banked free months (incl. unverified)</span>
          <span class="font-semibold tabular-nums">{{ formatCount(data.summary.usersWithActiveGrants) }}</span>
        </div>
      </div>

      <!-- Free -->
      <div class="flex items-center justify-between text-sm border-t moh-border pt-4">
        <span class="text-gray-500 dark:text-gray-400">Free users</span>
        <span class="font-semibold tabular-nums">{{ formatCount(data.monetization.free) }}</span>
      </div>

      <!-- Visual bar -->
      <div v-if="data.summary.totalUsers > 0">
        <div class="flex rounded-full overflow-hidden h-2">
          <div class="bg-gray-200 dark:bg-zinc-700" :style="{ width: freePct + '%' }" :title="`Free: ${freePct}%`" />
          <div class="bg-amber-400" :style="{ width: compedPct + '%' }" :title="`Comped: ${compedPct}%`" />
          <div class="bg-green-500" :style="{ width: payingPct + '%' }" :title="`Paying: ${payingPct}%`" />
        </div>
        <div class="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <div class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-full bg-gray-200 dark:bg-zinc-700" />Free ({{ freePct }}%)</div>
          <div class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-full bg-amber-400" />Comped ({{ compedPct }}%)</div>
          <div class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-full bg-green-500" />Paying ({{ payingPct }}%)</div>
        </div>
      </div>

      <!-- Stripe status breakdown (only if Stripe is connected) -->
      <div v-if="Object.keys(data.monetization.byStatus).length > 0" class="border-t moh-border pt-4 space-y-1">
        <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Stripe subscription status</div>
        <div
          v-for="(count, status) in data.monetization.byStatus"
          :key="status"
          class="flex items-center justify-between text-sm"
        >
          <span class="font-mono text-xs">{{ status }}</span>
          <span class="tabular-nums font-medium">{{ formatCount(Number(count)) }}</span>
        </div>
      </div>
      <div v-else class="border-t moh-border pt-4 text-xs text-gray-400 dark:text-gray-500 italic">
        Stripe not yet connected — no subscription data available.
      </div>
    </div>
  </div>

  <!-- ─── Referrals ───────────────────────────────────────────────────── -->
  <div class="px-4 space-y-4">
    <div class="font-semibold text-sm">Referrals <span class="text-gray-400 font-normal">(all time)</span></div>
    <div v-if="referralAnalyticsLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
    <template v-else-if="referralAnalytics">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="rounded-xl border moh-border p-4 space-y-1">
          <div class="text-xs font-semibold text-gray-600 dark:text-gray-300">Referral Codes</div>
          <div class="text-2xl font-bold">{{ formatCount(referralAnalytics.totalCodesCreated) }}</div>
        </div>
        <div class="rounded-xl border moh-border p-4 space-y-1">
          <div class="text-xs font-semibold text-gray-600 dark:text-gray-300">Total Recruits</div>
          <div class="text-2xl font-bold">{{ formatCount(referralAnalytics.totalRecruits) }}</div>
        </div>
        <div class="rounded-xl border moh-border p-4 space-y-1">
          <div class="text-xs font-semibold text-gray-600 dark:text-gray-300">Bonuses Granted</div>
          <div class="text-2xl font-bold">{{ formatCount(referralAnalytics.totalBonusesGranted) }}</div>
        </div>
        <div class="rounded-xl border moh-border p-4 space-y-1">
          <div class="text-xs font-semibold text-gray-600 dark:text-gray-300">Conversion Rate</div>
          <div class="text-2xl font-bold">{{ referralAnalytics.conversionRatePct }}%</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">recruits → premium</div>
        </div>
      </div>

      <!-- Top recruiters -->
      <div v-if="referralAnalytics.topRecruiters.length > 0" class="rounded-xl border moh-border p-4 space-y-2">
        <div class="text-xs font-semibold text-gray-600 dark:text-gray-300">Top Recruiters</div>
        <div class="moh-divide">
          <div
            v-for="(r, i) in referralAnalytics.topRecruiters"
            :key="r.userId"
            class="flex items-center justify-between gap-3 py-1.5 text-sm"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs text-gray-400 w-5 text-right shrink-0">{{ i + 1 }}.</span>
              <NuxtLink
                v-if="r.username"
                :to="`/admin/users/${encodeURIComponent(r.username)}`"
                class="font-medium hover:underline truncate"
              >@{{ r.username }}</NuxtLink>
              <span v-else class="truncate text-gray-500">{{ r.name ?? r.userId }}</span>
            </div>
            <span class="shrink-0 font-semibold text-amber-700 dark:text-amber-300">{{ r.recruitCount }} recruit{{ r.recruitCount === 1 ? '' : 's' }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- ─── Signup sources ──────────────────────────────────────────────── -->
  <div v-if="acquisition" class="rounded-xl border moh-border p-4 space-y-3">
    <div class="font-semibold text-sm">
      Signups by source <span class="text-gray-400 font-normal">(last {{ acquisition.days }} days)</span>
    </div>
    <div class="text-xs text-gray-500 dark:text-gray-400">
      {{ formatCount(acquisition.totalSignups) }} signups, {{ formatCount(acquisition.totalVerified) }} verified,
      {{ formatCount(acquisition.distinctRecruiters) }} members recruited someone
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <div v-for="group in [{ title: 'Source', rows: acquisition.bySource }, { title: 'Campaign', rows: acquisition.byCampaign }]" :key="group.title">
        <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{{ group.title }}</div>
        <div class="moh-divide">
          <div v-for="row in group.rows" :key="row.key" class="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span class="truncate">{{ row.key }}</span>
            <span class="shrink-0 tabular-nums">{{ row.signups }} / {{ row.verified }} verified</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  </section>
</template>

<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import type { AdminAnalytics } from '~/types/api'
import { useAdminAnalyticsContext } from '~/composables/pages/admin/useAdminAnalyticsPage'

defineProps<{ data: AdminAnalytics }>()

const {
  totalPaying,
  totalComped,
  freePct,
  compedPct,
  payingPct,
  referralAnalyticsLoading,
  referralAnalytics,
  acquisition,
} = useAdminAnalyticsContext()
</script>

