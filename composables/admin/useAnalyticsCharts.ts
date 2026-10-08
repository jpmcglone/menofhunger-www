import { formatLocaleDate } from '~/utils/time-format'
import { Chart } from 'chart.js'
import type { Ref } from 'vue'
import type { AdminAnalytics, AnalyticsGranularity, AnalyticsRange } from '~/types/api'

export type SeriesPoint = { bucket: string; count: number }

/**
 * Chart.js line charts for the analytics page: canvases, bucket alignment, theming,
 * rendering, and teardown on unmount.
 */
export function useAnalyticsCharts(data: Ref<AdminAnalytics | null>, selectedRange: Ref<AnalyticsRange>) {
  const signupsCanvas = ref<HTMLCanvasElement | null>(null)
  const contentCanvas = ref<HTMLCanvasElement | null>(null)
  const connectionsCanvas = ref<HTMLCanvasElement | null>(null)
  const coinsMintedCanvas = ref<HTMLCanvasElement | null>(null)
  const aiInteractionsCanvas = ref<HTMLCanvasElement | null>(null)

  let signupsChart: Chart | null = null
  let contentChart: Chart | null = null
  let connectionsChart: Chart | null = null
  let coinsMintedChart: Chart | null = null
  let aiInteractionsChart: Chart | null = null

  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

  // ─── Chart helpers ────────────────────────────────────────────────────────────

  function formatBucket(bucket: string, granularity: AnalyticsGranularity) {
    const d = new Date(bucket + 'T00:00:00Z')
    if (granularity === 'month') {
      return formatLocaleDate(d, { month: 'short', year: '2-digit', timeZone: 'UTC' })
    }
    if (granularity === 'week') {
      return 'Wk ' + formatLocaleDate(d, { month: 'short', day: 'numeric', timeZone: 'UTC' })
    }
    return formatLocaleDate(d, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }

  /**
   * Merges sparse series onto a full selected-scope axis,
   * filling 0 for any bucket that's missing in a given series.
   */
  function alignSeries(
    seriesList: SeriesPoint[][],
    granularity: AnalyticsGranularity,
    range: AnalyticsRange,
    asOfIso: string,
  ) {
    const sortedBuckets = buildBucketAxis(seriesList, granularity, range, asOfIso)
    const labels = sortedBuckets.map((bucket) => formatBucket(bucket, granularity))
    const counts = seriesList.map((series) => {
      const map = new Map(series.map((point) => [point.bucket, point.count]))
      return sortedBuckets.map((bucket) => map.get(bucket) ?? 0)
    })
    return { labels, counts, totalPoints: sortedBuckets.length }
  }

  function buildBucketAxis(
    seriesList: SeriesPoint[][],
    granularity: AnalyticsGranularity,
    range: AnalyticsRange,
    asOfIso: string,
  ) {
    const asOf = new Date(asOfIso)
    if (Number.isNaN(asOf.getTime())) return []

    // Use the viewer's local date for the axis end so we never show a date that
    // hasn't arrived yet in the viewer's timezone (e.g. showing "May 9" at 11 PM Eastern).
    // Backend bucket keys are UTC YYYY-MM-DD strings, so we construct a UTC midnight
    // Date using the local year/month/day — the axis key will then match correctly.
    const localNow = new Date()
    const localTodayUtc = new Date(Date.UTC(localNow.getFullYear(), localNow.getMonth(), localNow.getDate()))

    const isAll = range === 'all'
    const rangeDays = analyticsRangeDays(range)
    let startDate: Date
    let endDate: Date

    if (isAll) {
      const allBuckets = seriesList.flatMap((series) => series.map((point) => point.bucket))
      if (allBuckets.length === 0) return []
      const sorted = [...new Set(allBuckets)].sort()
      startDate = parseUtcBucket(sorted[0]!)
      endDate = truncateToGranularity(localTodayUtc, granularity)
    } else {
      // Match backend range semantics: since = now - N days.
      const since = new Date(asOf.getTime() - (rangeDays * 86400000))
      startDate = truncateToGranularity(since, granularity)
      endDate = truncateToGranularity(localTodayUtc, granularity)
    }

    if (startDate.getTime() > endDate.getTime()) {
      const tmp = startDate
      startDate = endDate
      endDate = tmp
    }

    const buckets: string[] = []
    let cursor = new Date(startDate)
    while (cursor.getTime() <= endDate.getTime()) {
      buckets.push(toBucketKey(cursor))
      cursor = incrementBucket(cursor, granularity)
    }
    return buckets
  }

  function analyticsRangeDays(range: AnalyticsRange): number {
    if (range === '7d') return 7
    if (range === '30d') return 30
    if (range === '3m') return 90
    if (range === '1y') return 365
    return 0
  }

  function parseUtcBucket(bucket: string): Date {
    return new Date(`${bucket}T00:00:00Z`)
  }

  function toBucketKey(date: Date): string {
    return date.toISOString().slice(0, 10)
  }

  function truncateToGranularity(date: Date, granularity: AnalyticsGranularity): Date {
    const y = date.getUTCFullYear()
    const m = date.getUTCMonth()
    const d = date.getUTCDate()

    if (granularity === 'month') {
      return new Date(Date.UTC(y, m, 1))
    }
    if (granularity === 'week') {
      const weekday = date.getUTCDay()
      const daysFromMonday = (weekday + 6) % 7
      return new Date(Date.UTC(y, m, d - daysFromMonday))
    }
    return new Date(Date.UTC(y, m, d))
  }

  function incrementBucket(date: Date, granularity: AnalyticsGranularity): Date {
    if (granularity === 'month') {
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
    }
    if (granularity === 'week') {
      return new Date(date.getTime() + 7 * 86400000)
    }
    return new Date(date.getTime() + 86400000)
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
      // Exclude touch events so Chart.js doesn't capture swipes — lets the page scroll normally on mobile.
      events: ['mousemove', 'mouseout', 'click', 'mouseenter', 'mouseleave'] as (keyof HTMLElementEventMap)[],
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
      const { labels, counts, totalPoints } = alignSeries(
        [data.value.signups],
        granularity,
        selectedRange.value,
        data.value.asOf,
      )
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
      const { labels, counts, totalPoints } = alignSeries(
        [data.value.posts, data.value.checkins, data.value.articles.published, data.value.aiPosts, data.value.board.threads, data.value.board.comments],
        granularity,
        selectedRange.value,
        data.value.asOf,
      )
      contentChart?.destroy()
      contentChart = new Chart(contentCanvas.value, {
        type: 'line',
        data: {
          labels,
          datasets: [
            makeLineDataset('Posts', counts[0] ?? [], '#10b981', totalPoints),
            makeLineDataset('Check-ins', counts[1] ?? [], '#f59e0b', totalPoints),
            makeLineDataset('Articles', counts[2] ?? [], '#a855f7', totalPoints),
            makeLineDataset('M.A.R.V. Posts', counts[3] ?? [], '#6366f1', totalPoints),
            makeLineDataset('Board posts', counts[4] ?? [], '#ea580c', totalPoints),
            makeLineDataset('Board comments', counts[5] ?? [], '#fb923c', totalPoints),
          ],
        },
        options: opts,
      })
    }

    if (connectionsCanvas.value) {
      const { labels, counts, totalPoints } = alignSeries(
        [data.value.messages, data.value.aiMessages, data.value.follows],
        granularity,
        selectedRange.value,
        data.value.asOf,
      )
      connectionsChart?.destroy()
      connectionsChart = new Chart(connectionsCanvas.value, {
        type: 'line',
        data: {
          labels,
          datasets: [
            makeLineDataset('Messages', counts[0] ?? [], '#8b5cf6', totalPoints),
            makeLineDataset('M.A.R.V. Messages', counts[1] ?? [], '#06b6d4', totalPoints),
            makeLineDataset('Follows', counts[2] ?? [], '#ec4899', totalPoints),
          ],
        },
        options: opts,
      })
    }

    if (aiInteractionsCanvas.value && data.value.ai.interactions.length > 0) {
      const { labels, counts, totalPoints } = alignSeries(
        [data.value.ai.interactions],
        granularity,
        selectedRange.value,
        data.value.asOf,
      )
      aiInteractionsChart?.destroy()
      aiInteractionsChart = new Chart(aiInteractionsCanvas.value, {
        type: 'line',
        data: {
          labels,
          datasets: [makeLineDataset('Successful interactions', counts[0] ?? [], '#6366f1', totalPoints)],
        },
        options: opts,
      })
    }

    if (coinsMintedCanvas.value && data.value.coins.minted.length > 0) {
      const { labels, counts, totalPoints } = alignSeries(
        [data.value.coins.minted],
        granularity,
        selectedRange.value,
        data.value.asOf,
      )
      coinsMintedChart?.destroy()
      coinsMintedChart = new Chart(coinsMintedCanvas.value, {
        type: 'line',
        data: {
          labels,
          datasets: [makeLineDataset('Coins minted', counts[0] ?? [], '#f59e0b', totalPoints)],
        },
        options: opts,
      })
    }
  }
  onUnmounted(() => {
    signupsChart?.destroy()
    contentChart?.destroy()
    connectionsChart?.destroy()
    coinsMintedChart?.destroy()
    aiInteractionsChart?.destroy()
  })

  return {
    signupsCanvas,
    contentCanvas,
    connectionsCanvas,
    coinsMintedCanvas,
    aiInteractionsCanvas,
    renderCharts,
  }
}
