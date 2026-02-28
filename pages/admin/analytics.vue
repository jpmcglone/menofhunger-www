<template>
  <AppPageContent bottom="standard">
    <div class="py-4 space-y-6">
      <div class="px-4">
        <AppPageHeader title="Analytics" icon="tabler:chart-bar" description="KPIs, engagement trends, and monetization.">
          <template #leading>
            <Button
              class="md:hidden"
              text
              severity="secondary"
              aria-label="Back"
              @click="navigateTo('/admin')"
            >
              <template #icon>
                <Icon name="tabler:chevron-left" aria-hidden="true" />
              </template>
            </Button>
          </template>
          <template #trailing>
            <Button
              text
              severity="secondary"
              :loading="loading"
              aria-label="Refresh"
              @click="load"
            >
              <template #icon>
                <Icon name="tabler:refresh" aria-hidden="true" />
              </template>
            </Button>
          </template>
        </AppPageHeader>
      </div>

      <!-- Range selector -->
      <div class="px-4">
        <div class="inline-flex rounded-lg border moh-border overflow-hidden text-sm">
          <button
            v-for="opt in rangeOptions"
            :key="opt.value"
            class="px-3 py-1.5 font-medium transition-colors"
            :class="selectedRange === opt.value
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800'"
            @click="setRange(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <AppInlineAlert v-if="error" severity="danger" :message="error" class="mx-4" />

      <div v-if="loading && !data" class="px-4 text-sm text-gray-500 dark:text-gray-400">Loading…</div>

      <template v-if="data">
        <!-- Summary cards -->
        <div class="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div v-for="card in summaryCards" :key="card.label" class="rounded-xl border moh-border p-4 space-y-1">
            <div class="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{{ card.label }}</div>
            <div class="text-2xl font-bold tabular-nums">{{ card.value }}</div>
            <div v-if="card.sub" class="text-xs text-gray-500 dark:text-gray-400">{{ card.sub }}</div>
          </div>
        </div>

        <!-- Growth chart -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">New Signups <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
          <div class="rounded-xl border moh-border p-4">
            <canvas ref="signupsCanvas" height="180" />
          </div>
        </div>

        <!-- Content chart -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Content Created <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
          <div class="rounded-xl border moh-border p-4">
            <canvas ref="contentCanvas" height="180" />
          </div>
        </div>

        <!-- Post visibility breakdown -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">
            Post Visibility Breakdown
            <span class="text-gray-400 font-normal">({{ rangeLabel }}, regular posts only)</span>
          </div>
          <div class="rounded-xl border moh-border p-4 space-y-3">
            <div v-if="totalPostsByVisibility === 0" class="text-sm text-gray-400 dark:text-gray-500 italic">
              No posts in this period.
            </div>
            <template v-else>
              <div
                v-for="vis in visibilityRows"
                :key="vis.key"
                class="space-y-1"
              >
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <span class="inline-block w-2.5 h-2.5 rounded-full" :class="vis.dot" />
                    <span class="font-medium">{{ vis.label }}</span>
                    <span class="text-xs text-gray-400 dark:text-gray-500">{{ vis.description }}</span>
                  </div>
                  <div class="flex items-center gap-3 tabular-nums">
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ vis.pct }}%</span>
                    <span class="font-semibold">{{ vis.count.toLocaleString() }}</span>
                  </div>
                </div>
                <div class="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="vis.bar" :style="{ width: vis.pct + '%' }" />
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Connections chart -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Messages & Follows <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
          <div class="rounded-xl border moh-border p-4">
            <canvas ref="connectionsCanvas" height="180" />
          </div>
        </div>

        <!-- Retention table (always 10-week window) -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Weekly Cohort Retention <span class="text-gray-400 font-normal">(last 10 weeks)</span></div>
          <div class="rounded-xl border moh-border overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-b moh-border text-left text-gray-500 dark:text-gray-400">
                  <th class="px-4 py-3 font-medium">Cohort week</th>
                  <th class="px-4 py-3 font-medium text-right">Users</th>
                  <th class="px-4 py-3 font-medium text-right">W1 retained</th>
                  <th class="px-4 py-3 font-medium text-right">W1 %</th>
                  <th class="px-4 py-3 font-medium text-right">W4 retained</th>
                  <th class="px-4 py-3 font-medium text-right">W4 %</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                <tr v-for="row in retentionRows" :key="row.cohortWeek" class="hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                  <td class="px-4 py-3 font-mono text-xs">{{ row.cohortWeek }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ row.size.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ row.w1.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">
                    <span :class="retentionColor(row.w1Pct)">{{ row.w1Pct }}%</span>
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ row.w4.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">
                    <span :class="retentionColor(row.w4Pct)">{{ row.w4Pct }}%</span>
                  </td>
                </tr>
                <tr v-if="!retentionRows.length">
                  <td colspan="6" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">No data yet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Engagement health (always fixed windows) -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Engagement Health</div>
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
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">MAU who posted or checked in (30 days)</div>
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

          </div>
        </div>

        <!-- Monetization (always all-time) -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Tier Breakdown <span class="text-gray-400 font-normal">(all time)</span></div>
          <div class="rounded-xl border moh-border p-4 space-y-5">

            <!-- Paying subscribers -->
            <div>
              <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Paying (Stripe)</div>
              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3">
                  <div class="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">{{ totalPaying.toLocaleString() }}</div>
                  <div class="text-xs text-green-600 dark:text-green-500 mt-1">Total paying</div>
                </div>
                <div class="rounded-lg border moh-border p-3">
                  <div class="text-2xl font-bold tabular-nums">{{ data.monetization.payingPremium.toLocaleString() }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium</div>
                </div>
                <div class="rounded-lg border moh-border p-3">
                  <div class="text-2xl font-bold tabular-nums">{{ data.monetization.payingPremiumPlus.toLocaleString() }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium+</div>
                </div>
              </div>
            </div>

            <!-- Comped -->
            <div>
              <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Comped (manually granted)</div>
              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
                  <div class="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{{ totalComped.toLocaleString() }}</div>
                  <div class="text-xs text-amber-600 dark:text-amber-500 mt-1">Total comped</div>
                </div>
                <div class="rounded-lg border moh-border p-3">
                  <div class="text-2xl font-bold tabular-nums">{{ data.monetization.compedPremium.toLocaleString() }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium</div>
                </div>
                <div class="rounded-lg border moh-border p-3">
                  <div class="text-2xl font-bold tabular-nums">{{ data.monetization.compedPremiumPlus.toLocaleString() }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium+</div>
                </div>
              </div>
            </div>

            <!-- Free -->
            <div class="flex items-center justify-between text-sm border-t moh-border pt-4">
              <span class="text-gray-500 dark:text-gray-400">Free users</span>
              <span class="font-semibold tabular-nums">{{ data.monetization.free.toLocaleString() }}</span>
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
                <span class="tabular-nums font-medium">{{ Number(count).toLocaleString() }}</span>
              </div>
            </div>
            <div v-else class="border-t moh-border pt-4 text-xs text-gray-400 dark:text-gray-500 italic">
              Stripe not yet connected — no subscription data available.
            </div>
          </div>
        </div>

        <div class="px-4 text-xs text-gray-400 dark:text-gray-500">
          Last updated {{ asOfDisplay }}
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js'
import type { AdminAnalytics, AdminAnalyticsEngagement, AnalyticsGranularity, AnalyticsRange } from '~/types/api'

definePageMeta({ middleware: 'admin', layout: 'app' })

Chart.register(...registerables)

const { apiFetchData } = useApiClient()

const data = ref<AdminAnalytics | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const signupsCanvas = ref<HTMLCanvasElement | null>(null)
const contentCanvas = ref<HTMLCanvasElement | null>(null)
const connectionsCanvas = ref<HTMLCanvasElement | null>(null)

let signupsChart: Chart | null = null
let contentChart: Chart | null = null
let connectionsChart: Chart | null = null

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// ─── Range selector ───────────────────────────────────────────────────────────

const rangeOptions: { label: string; value: AnalyticsRange }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '3M', value: '3m' },
  { label: '1Y', value: '1y' },
  { label: 'All', value: 'all' },
]

const selectedRange = ref<AnalyticsRange>('30d')

const rangeLabel = computed(() => {
  const found = rangeOptions.find((o) => o.value === selectedRange.value)
  return found?.label ?? '30D'
})

function setRange(range: AnalyticsRange) {
  if (range === selectedRange.value) return
  selectedRange.value = range
  load()
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await apiFetchData<AdminAnalytics>(`/admin/analytics?range=${selectedRange.value}`)
    await nextTick()
    renderCharts()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load analytics'
  } finally {
    loading.value = false
  }
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

function formatBucket(bucket: string, granularity: AnalyticsGranularity) {
  const d = new Date(bucket + 'T00:00:00Z')
  if (granularity === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  }
  if (granularity === 'week') {
    return 'Wk ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

type SeriesPoint = { bucket: string; count: number }

/**
 * Merges multiple sparse series onto a single sorted date axis,
 * filling 0 for any bucket that's missing in a given series.
 */
function alignSeries(seriesList: SeriesPoint[][], granularity: AnalyticsGranularity) {
  const bucketSet = new Set<string>()
  for (const series of seriesList) {
    for (const p of series) bucketSet.add(p.bucket)
  }
  const sortedBuckets = Array.from(bucketSet).sort()
  const labels = sortedBuckets.map((b) => formatBucket(b, granularity))
  const counts = seriesList.map((series) => {
    const map = new Map(series.map((p) => [p.bucket, p.count]))
    return sortedBuckets.map((b) => map.get(b) ?? 0)
  })
  return { labels, counts, totalPoints: sortedBuckets.length }
}

function makeLineDataset(label: string, data: number[], color: string, totalPoints: number) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color + '22',
    fill: true,
    tension: 0.3,
    pointRadius: totalPoints > 60 ? 0 : 2,
    pointHoverRadius: 5,
  }
}

function chartDefaults() {
  return {
    gridColor: isDark.value ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    tickColor: isDark.value ? '#9ca3af' : '#6b7280',
  }
}

function lineChartOptions(gridColor: string, tickColor: string) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { labels: { color: tickColor, boxWidth: 12, font: { size: 12 } } } },
    scales: {
      x: { ticks: { color: tickColor, font: { size: 11 }, maxRotation: 45 }, grid: { color: gridColor } },
      y: { beginAtZero: true, ticks: { color: tickColor, font: { size: 11 }, precision: 0 }, grid: { color: gridColor } },
    },
  }
}

function renderCharts() {
  if (!data.value) return
  const { gridColor, tickColor } = chartDefaults()
  const opts = lineChartOptions(gridColor, tickColor)
  const granularity = data.value.granularity

  if (signupsCanvas.value) {
    const { labels, counts, totalPoints } = alignSeries([data.value.signups], granularity)
    signupsChart?.destroy()
    signupsChart = new Chart(signupsCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [makeLineDataset('Signups', counts[0] ?? [], '#3b82f6', totalPoints)],
      },
      options: opts,
    })
  }

  if (contentCanvas.value) {
    const { labels, counts, totalPoints } = alignSeries([data.value.posts, data.value.checkins], granularity)
    contentChart?.destroy()
    contentChart = new Chart(contentCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          makeLineDataset('Posts', counts[0] ?? [], '#10b981', totalPoints),
          makeLineDataset('Check-ins', counts[1] ?? [], '#f59e0b', totalPoints),
        ],
      },
      options: opts,
    })
  }

  if (connectionsCanvas.value) {
    const { labels, counts, totalPoints } = alignSeries([data.value.messages, data.value.follows], granularity)
    connectionsChart?.destroy()
    connectionsChart = new Chart(connectionsCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          makeLineDataset('Messages', counts[0] ?? [], '#8b5cf6', totalPoints),
          makeLineDataset('Follows', counts[1] ?? [], '#ec4899', totalPoints),
        ],
      },
      options: opts,
    })
  }
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const summaryCards = computed(() => {
  if (!data.value) return []
  const { summary } = data.value
  const dauMauPct = summary.mau > 0 ? Math.round((summary.dau / summary.mau) * 100) : 0
  return [
    { label: 'Total Users', value: summary.totalUsers.toLocaleString(), sub: undefined },
    { label: 'DAU', value: summary.dau.toLocaleString(), sub: '30-day avg' },
    { label: 'MAU', value: summary.mau.toLocaleString(), sub: '30-day window' },
    { label: 'DAU/MAU', value: dauMauPct + '%', sub: 'Stickiness' },
    { label: 'Premium', value: summary.premiumUsers.toLocaleString(), sub: `incl. ${summary.premiumPlusUsers} Premium+` },
  ]
})

const VISIBILITY_META: Record<string, { label: string; description: string; dot: string; bar: string }> = {
  public:       { label: 'Public',       description: 'visible to everyone',    dot: 'bg-blue-500',   bar: 'bg-blue-500' },
  verifiedOnly: { label: 'Verified Only', description: 'verified members only',  dot: 'bg-violet-500', bar: 'bg-violet-500' },
  premiumOnly:  { label: 'Premium Only',  description: 'premium members only',   dot: 'bg-amber-500',  bar: 'bg-amber-500' },
  onlyMe:       { label: 'Only Me',       description: 'private / journal',      dot: 'bg-gray-400',   bar: 'bg-gray-400' },
}

const VISIBILITY_ORDER = ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe']

const totalPostsByVisibility = computed(() => {
  if (!data.value) return 0
  return Object.values(data.value.postsByVisibility).reduce((a, b) => a + b, 0)
})

const visibilityRows = computed(() => {
  if (!data.value) return []
  const total = totalPostsByVisibility.value
  return VISIBILITY_ORDER.map((key) => {
    const count = data.value!.postsByVisibility[key] ?? 0
    const meta = VISIBILITY_META[key] ?? { label: key, description: '', dot: 'bg-gray-400', bar: 'bg-gray-400' }
    return {
      key,
      ...meta,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }
  }).filter((r) => r.count > 0 || VISIBILITY_ORDER.includes(r.key))
})

const retentionRows = computed(() => {
  if (!data.value) return []
  return data.value.retention.map((r) => ({
    ...r,
    w1Pct: r.size > 0 ? Math.round((r.w1 / r.size) * 100) : 0,
    w4Pct: r.size > 0 ? Math.round((r.w4 / r.size) * 100) : 0,
  }))
})

function retentionColor(pct: number): string {
  if (pct >= 40) return 'text-green-600 dark:text-green-400 font-semibold'
  if (pct >= 20) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

/** Returns a color class based on low/high thresholds for a metric */
function engagementColor(pct: number, low: number, high: number): string {
  if (pct >= high) return 'text-green-600 dark:text-green-400'
  if (pct >= low)  return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

const totalPaying = computed(() => {
  if (!data.value) return 0
  return data.value.monetization.payingPremium + data.value.monetization.payingPremiumPlus
})
const totalComped = computed(() => {
  if (!data.value) return 0
  return data.value.monetization.compedPremium + data.value.monetization.compedPremiumPlus
})
const freePct = computed(() => {
  if (!data.value || data.value.summary.totalUsers === 0) return 100
  return Math.round((data.value.monetization.free / data.value.summary.totalUsers) * 100)
})
const compedPct = computed(() => {
  if (!data.value || data.value.summary.totalUsers === 0) return 0
  return Math.round((totalComped.value / data.value.summary.totalUsers) * 100)
})
const payingPct = computed(() => {
  if (!data.value || data.value.summary.totalUsers === 0) return 0
  return Math.round((totalPaying.value / data.value.summary.totalUsers) * 100)
})

const asOfDisplay = computed(() => {
  if (!data.value) return ''
  return new Date(data.value.asOf).toLocaleString()
})

onMounted(load)
onUnmounted(() => {
  signupsChart?.destroy()
  contentChart?.destroy()
  connectionsChart?.destroy()
})
</script>
