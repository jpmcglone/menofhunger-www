import type { FitnessSharePreview, FitnessStepsDay } from '~/types/api'
import { layoutSparkline } from '~/utils/fitness-chart'
import { effectiveGoalStartKg, goalProgressPercent as computeGoalProgress } from '~/utils/fitness-goal'
import { averageStepsPerDay } from '~/utils/fitness-week'
import type { useFitnessPageState } from './useFitnessPage'

/**
 * Weight, VO2 max, and steps charts, the goal, and sharing.
 */
export function useFitnessPageCharts(ctx: ReturnType<typeof useFitnessPageState>) {
  const { apiFetchData, toast, fitnessPage, showLogWeight, logWeightInput, savingWeight, showSetGoal, goalTargetInput, savingGoal, shareDialog, shareBody, shareVisibility, sharingPost, loadPage } = ctx
  const { run } = useAsyncAction()

  // ─── Weight ──────────────────────────────────────────────────────────────────

  function formatWeight(kg: number | null | undefined): string {
    if (kg == null) return '—'
    const page = fitnessPage.value
    if (page?.units === 'us') return (kg * 2.20462).toFixed(1)
    return kg.toFixed(1)
  }

  /** Delta between latest and oldest entry in the history (kg). */
  const weightDelta = computed((): number | null => {
    const history = fitnessPage.value?.weightHistory
    if (!history || history.length < 2) return null
    return (history[0]?.weightKg ?? 0) - (history.at(-1)?.weightKg ?? 0)
  })

  const weightDeltaClass = computed(() => {
    const delta = weightDelta.value
    const goal = fitnessPage.value?.activeGoal
    if (delta == null) return 'text-gray-400'
    // If goal is to lose weight, down is good; if to gain, up is good
    const losingGoal = goal && goal.targetKg != null && goal.startKg != null && goal.targetKg < goal.startKg
    const isGood = losingGoal ? delta < 0 : delta > 0
    if (Math.abs(delta) < 0.1) return 'text-gray-400'
    return isGood ? 'text-green-500 dark:text-green-400' : 'text-red-400 dark:text-red-400'
  })

  function weightEntryDelta(current: number, previous: number): string {
    const page = fitnessPage.value
    const diff = current - previous
    const display = page?.units === 'us' ? diff * 2.20462 : diff
    if (Math.abs(display) < 0.05) return '—'
    const sign = display >= 0 ? '+' : ''
    return `${sign}${display.toFixed(1)}`
  }

  function weightEntryDeltaClass(current: number, previous: number): string {
    const diff = current - previous
    if (Math.abs(diff) < 0.05) return 'text-gray-400'
    return diff > 0 ? 'text-red-400' : 'text-green-500'
  }

  const actionSounds = useActionSounds()
  async function submitLogWeight() {
    const raw = parseFloat(logWeightInput.value)
    if (!raw || raw <= 0) return
    const page = fitnessPage.value
    const weightKg = page?.units === 'us' ? raw / 2.20462 : raw
    savingWeight.value = true
    await run(async () => {
      await apiFetchData<unknown>('/fitness/weight', { method: 'POST', body: { weightKg } })
      void actionSounds.play('save')
      toast.push({ title: 'Weight logged.', tone: 'success' })
      showLogWeight.value = false
      logWeightInput.value = ''
      await loadPage()
    }, { error: () => 'Failed to save weight.' })
    savingWeight.value = false
  }

  // ─── Weight sparkline ─────────────────────────────────────────────────────────

  /** weight history oldest→newest for the chart */
  const chartData = computed(() => {
    const history = fitnessPage.value?.weightHistory
    if (!history || history.length < 2) return []
    return [...history].reverse()
  })

  const weightSparkline = computed(() =>
    layoutSparkline(chartData.value.map((d) => ({
      value: d.weightKg,
      at: new Date(d.measuredAt).getTime(),
    }))),
  )
  const sparklinePoints = computed(() => weightSparkline.value.points)
  const sparklinePath = computed(() => weightSparkline.value.linePath)
  const sparklineAreaPath = computed(() => weightSparkline.value.areaPath)

  // ─── VO2 Max sparkline ────────────────────────────────────────────────────────

  const vo2maxChartData = computed(() => {
    const history = fitnessPage.value?.vo2maxHistory
    if (!history || history.length < 2) return []
    return [...history].reverse()
  })

  const vo2Sparkline = computed(() =>
    layoutSparkline(vo2maxChartData.value.map((d) => ({
      value: d.weightKg,
      at: new Date(d.measuredAt).getTime(),
    }))),
  )
  const vo2maxPoints = computed(() => vo2Sparkline.value.points)
  const vo2maxPath = computed(() => vo2Sparkline.value.linePath)
  const vo2maxAreaPath = computed(() => vo2Sparkline.value.areaPath)

  // ─── Steps sparkline ──────────────────────────────────────────────────────────

  const stepsChartData = computed((): FitnessStepsDay[] => {
    const history = fitnessPage.value?.stepsHistory
    if (!history || history.length < 2) return []
    return [...history].reverse()
  })

  const stepsSparkline = computed(() =>
    layoutSparkline(stepsChartData.value.map((d) => ({
      value: d.stepsCount,
      at: new Date(`${d.dayKey}T12:00:00Z`).getTime(),
    }))),
  )

  const stepsAvgPerDay = computed(() =>
    fitnessPage.value ? averageStepsPerDay(fitnessPage.value.stepsHistory) : null,
  )

  // ─── Formatters ───────────────────────────────────────────────────────────────

  function formatSteps(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
  }

  function stepsEntryDelta(current: number, previous: number): string {
    const diff = current - previous
    if (Math.abs(diff) < 50) return '—'
    const sign = diff >= 0 ? '+' : ''
    return `${sign}${formatSteps(diff)}`
  }

  function stepsEntryDeltaClass(current: number, previous: number): string {
    const diff = current - previous
    if (Math.abs(diff) < 50) return 'text-gray-400'
    return diff > 0 ? 'text-green-500' : 'text-red-400'
  }

  function vo2maxCategory(value: number): { label: string; color: string } {
    if (value >= 60) return { label: 'Superior', color: 'text-indigo-500' }
    if (value >= 52) return { label: 'Excellent', color: 'text-green-500' }
    if (value >= 46) return { label: 'Good', color: 'text-green-400' }
    if (value >= 38) return { label: 'Fair', color: 'text-yellow-500' }
    if (value >= 30) return { label: 'Poor', color: 'text-orange-400' }
    return { label: 'Very poor', color: 'text-red-500' }
  }

  // ─── Goal ─────────────────────────────────────────────────────────────────────

  const goalStartKg = computed(() => {
    const page = fitnessPage.value
    if (!page?.activeGoal) return null
    return effectiveGoalStartKg(page.activeGoal.startKg, page.weightHistory.at(-1)?.weightKg)
  })

  const goalProgressPercent = computed(() => {
    const page = fitnessPage.value
    if (!page?.activeGoal) return 0
    return computeGoalProgress({
      startKg: goalStartKg.value,
      targetKg: page.activeGoal.targetKg,
      currentKg: page.latestWeight?.weightKg,
    })
  })

  const goalRemainingLabel = computed(() => {
    const page = fitnessPage.value
    if (!page?.activeGoal || !page.latestWeight) return ''
    const { targetKg } = page.activeGoal
    if (targetKg == null) return ''
    const diff = Math.abs(page.latestWeight.weightKg - targetKg)
    const display = page.units === 'us' ? diff * 2.20462 : diff
    if (display < 0.1) return 'Goal reached!'
    return `${display.toFixed(1)} ${page.units === 'us' ? 'lbs' : 'kg'} to go · ${goalProgressPercent.value}% complete`
  })

  async function submitSetGoal() {
    const raw = parseFloat(goalTargetInput.value)
    if (!raw || raw <= 0) return
    const page = fitnessPage.value
    const targetKg = page?.units === 'us' ? raw / 2.20462 : raw
    const startKg = page?.activeGoal?.startKg ?? page?.latestWeight?.weightKg ?? page?.weightHistory.at(-1)?.weightKg
    savingGoal.value = true
    await run(async () => {
      await apiFetchData<unknown>('/fitness/goals', { method: 'PUT', body: { kind: 'weight', targetKg, startKg } })
      void actionSounds.play('save')
      toast.push({ title: 'Goal saved.', tone: 'success' })
      showSetGoal.value = false
      goalTargetInput.value = ''
      await loadPage()
    }, { error: () => 'Failed to save goal.' })
    savingGoal.value = false
  }

  // ─── Share ────────────────────────────────────────────────────────────────────

  const sharePostBtnClass = computed(() => {
    switch (shareVisibility.value) {
      case 'verifiedOnly': return 'bg-blue-500 hover:bg-blue-600'
      case 'premiumOnly': return 'bg-amber-500 hover:bg-amber-600'
      default: return 'bg-gray-600 hover:bg-gray-500 dark:bg-zinc-600 dark:hover:bg-zinc-500'
    }
  })

  const shareTypeLabel = computed(() => {
    switch (shareDialog.value?.type) {
      case 'activity': return 'workout'
      case 'weight': return 'weight'
      case 'progress': return 'progress'
      case 'vo2max': return 'VO2 max'
      default: return ''
    }
  })

  function openShare(type: 'activity' | 'weight' | 'progress' | 'vo2max', refId: string) {
    const page = fitnessPage.value
    if (!page) return

    let preview: FitnessSharePreview | null = null

    if (type === 'activity') {
      const act = page.recentActivities.find(a => a.id === refId)
      if (act) {
        preview = {
          id: 'preview',
          shareType: 'activity',
          snapshot: {
            type: 'activity',
            data: {
              activityType: act.activityType,
              startedAt: act.startedAt,
              durationSec: act.durationSec,
              distanceM: act.distanceM,
              effortScore: act.effortScore,
              stepsCount: act.stepsCount,
              calories: act.calories,
              avgHeartrate: act.avgHeartrate,
              maxHeartrate: act.maxHeartrate,
              totalElevationM: act.totalElevationM,
            },
          },
        }
      }
    } else if (type === 'weight') {
      const idx = page.weightHistory.findIndex(m => m.id === refId)
      const metric = idx >= 0 ? page.weightHistory[idx] : page.latestWeight
      if (metric) {
        const prev = idx >= 0 ? (page.weightHistory[idx + 1] ?? null) : null
        preview = {
          id: 'preview',
          shareType: 'weight',
          snapshot: {
            type: 'weight',
            data: {
              weightKg: metric.weightKg,
              measuredAt: metric.measuredAt,
              previousWeightKg: prev?.weightKg ?? null,
              deltaKg: prev ? metric.weightKg - prev.weightKg : null,
            },
          },
        }
      }
    } else if (type === 'progress') {
      const goal = page.activeGoal
      if (goal) {
        preview = {
          id: 'preview',
          shareType: 'progress',
          snapshot: {
            type: 'progress',
            data: {
              startKg: goal.startKg,
              currentKg: page.latestWeight?.weightKg ?? null,
              targetKg: goal.targetKg,
              startedAt: goal.startedAt,
            },
          },
        }
      }
    } else if (type === 'vo2max') {
      const latest = page.vo2maxHistory.find(m => m.id === refId) ?? page.latestVo2Max
      const oldest = page.vo2maxHistory.at(-1)
      if (latest) {
        const start = oldest && oldest.id !== latest.id ? oldest : null
        preview = {
          id: 'preview',
          shareType: 'vo2max',
          snapshot: {
            type: 'vo2max',
            data: {
              vo2maxMlKgMin: latest.weightKg,
              measuredAt: latest.measuredAt,
              startVo2maxMlKgMin: start?.weightKg ?? null,
              startedAt: start?.measuredAt ?? null,
              deltaMlKgMin: start ? latest.weightKg - start.weightKg : null,
            },
          },
        }
      }
    }

    if (!preview) return
    shareDialog.value = { type, refId, preview }
    shareBody.value = ''
    shareVisibility.value = 'public'
  }

  async function submitShare() {
    const dialog = shareDialog.value
    if (!dialog) return
    sharingPost.value = true
    await run(async () => {
      const body: Record<string, unknown> = {
        shareType: dialog.type,
        body: shareBody.value,
        visibility: shareVisibility.value,
      }
      if (dialog.type === 'activity') body.activityId = dialog.refId
      else if (dialog.type === 'weight' || dialog.type === 'vo2max') body.bodyMetricId = dialog.refId
      else if (dialog.type === 'progress') body.goalId = dialog.refId

      const result = await apiFetchData<{ post: { id: string } }>('/fitness/share', { method: 'POST', body })
      shareDialog.value = null
      toast.push({ title: 'Posted!', to: `/p/${result.post.id}`, tone: 'success', durationMs: 6000 })
    }, { error: () => 'Failed to share.' })
    sharingPost.value = false
  }

  return {
    formatWeight,
    weightDelta,
    weightDeltaClass,
    weightEntryDelta,
    weightEntryDeltaClass,
    submitLogWeight,
    chartData,
    sparklinePoints,
    sparklinePath,
    sparklineAreaPath,
    vo2maxChartData,
    vo2maxPoints,
    vo2maxPath,
    vo2maxAreaPath,
    stepsChartData,
    stepsSparkline,
    stepsAvgPerDay,
    formatSteps,
    stepsEntryDelta,
    stepsEntryDeltaClass,
    vo2maxCategory,
    goalStartKg,
    goalProgressPercent,
    goalRemainingLabel,
    submitSetGoal,
    sharePostBtnClass,
    shareTypeLabel,
    openShare,
    submitShare,
  }
}
