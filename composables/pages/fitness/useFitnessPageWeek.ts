import { formatFitnessDistance } from '~/utils/fitness-format'
import type { FitnessActivityType, FitnessDailySummary } from '~/types/api'
import { easternDateKey } from '~/utils/eastern-time'
import { indexAlongWidth } from '~/utils/fitness-chart'
import { averageStepsPerDay } from '~/utils/fitness-week'
import type { useFitnessPageState } from './useFitnessPage'
import type { useFitnessPageCharts } from './useFitnessPageCharts'

/**
 * Recovery summary, the week bars and day inspection, and activity formatting.
 */
export function useFitnessPageWeek(ctx: ReturnType<typeof useFitnessPageState> & ReturnType<typeof useFitnessPageCharts>) {
  const { fitnessPage, isPremium, accentBg, chartData, vo2maxChartData, stepsChartData, formatSteps } = ctx

  // ─── Recovery strip ───────────────────────────────────────────────────────────

  const recoveryDays = computed(() =>
    (fitnessPage.value?.weekSummary.days ?? []).filter(
      (d) => d.sleepMinutes != null || d.hrvMs != null,
    ),
  )

  const avgSleep = computed(() => {
    const withSleep = recoveryDays.value.filter((d) => d.sleepMinutes != null)
    if (withSleep.length === 0) return null
    const avg = withSleep.reduce((s, d) => s + (d.sleepMinutes ?? 0), 0) / withSleep.length
    return (avg / 60).toFixed(1)
  })

  const avgHrv = computed(() => {
    const withHrv = recoveryDays.value.filter((d) => d.hrvMs != null)
    if (withHrv.length === 0) return null
    return Math.round(withHrv.reduce((s, d) => s + (d.hrvMs ?? 0), 0) / withHrv.length)
  })

  const recoveryLine = computed(() => {
    if (!isPremium.value) return ''
    const parts: string[] = []
    if (avgSleep.value != null) parts.push(`${avgSleep.value} hrs sleep`)
    if (avgHrv.value != null) parts.push(`${avgHrv.value} ms HRV`)
    return parts.length ? parts.join(' · ') : ''
  })

  const avgStepsPerDay = computed(() =>
    fitnessPage.value ? averageStepsPerDay(fitnessPage.value.weekSummary.days) : null,
  )

  const weekBarsEl = ref<HTMLElement | null>(null)
  const inspectedDayKey = ref<string | null>(null)
  const hoverWeightIndex = ref<number | null>(null)
  const hoverVo2Index = ref<number | null>(null)
  const hoverStepsIndex = ref<number | null>(null)

  const inspectedDay = computed(() => {
    const days = fitnessPage.value?.weekSummary.days
    if (!days || !inspectedDayKey.value) return null
    return days.find((day) => day.dayKey === inspectedDayKey.value) ?? null
  })

  const inspectedDayCaption = computed(() => {
    const day = inspectedDay.value
    if (!day) return ''
    const steps = day.stepsCount != null && day.stepsCount > 0 ? formatSteps(day.stepsCount) : '—'
    return `${dayLabel(day.dayKey)} · ${steps} steps`
  })

  const displayedWeight = computed(() => {
    const idx = hoverWeightIndex.value
    if (idx != null && chartData.value[idx]) return chartData.value[idx] ?? null
    return fitnessPage.value?.latestWeight ?? null
  })

  const displayedVo2Max = computed(() => {
    const idx = hoverVo2Index.value
    if (idx != null && vo2maxChartData.value[idx]) return vo2maxChartData.value[idx] ?? null
    return fitnessPage.value?.latestVo2Max ?? null
  })

  const displayedSteps = computed(() => {
    const idx = hoverStepsIndex.value
    if (idx != null && stepsChartData.value[idx]) return stepsChartData.value[idx] ?? null
    return fitnessPage.value?.stepsHistory[0] ?? null
  })

  function inspectDayAtClientX(clientX: number) {
    const el = weekBarsEl.value
    const days = fitnessPage.value?.weekSummary.days
    if (!el || !days?.length) return
    const rect = el.getBoundingClientRect()
    const idx = indexAlongWidth(days.length, clientX - rect.left, rect.width)
    if (idx == null) return
    inspectedDayKey.value = days[idx]?.dayKey ?? null
  }

  function onWeekPointerDown(e: PointerEvent) {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    inspectDayAtClientX(e.clientX)
  }

  function onWeekPointerMove(e: PointerEvent) {
    inspectDayAtClientX(e.clientX)
  }

  function onWeekPointerUp(e: PointerEvent) {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') inspectedDayKey.value = null
  }

  function clearInspectedDay() {
    inspectedDayKey.value = null
  }

  function dayBarOpacity(day: FitnessDailySummary): number {
    if (!inspectedDayKey.value) return 1
    return day.dayKey === inspectedDayKey.value ? 1 : 0.4
  }

  function dayAriaLabel(day: FitnessDailySummary): string {
    const name = dayLabel(day.dayKey)
    if (isDayFuture(day)) return `${name}, upcoming`
    if (day.stepsCount != null && day.stepsCount > 0) return `${name}, ${day.stepsCount} steps`
    return `${name}, no step data`
  }

  // ─── Activity helpers ─────────────────────────────────────────────────────────

  function activityLabel(type: FitnessActivityType): string {
    const map: Record<FitnessActivityType, string> = {
      run: 'Run', ride: 'Ride', walk: 'Walk', swim: 'Swim',
      workout: 'Workout', hike: 'Hike', yoga: 'Yoga', other: 'Activity',
    }
    return map[type] ?? type
  }

  /** Returns pace string (mm:ss) or null if not applicable */
  function activityPace(activity: { activityType: FitnessActivityType; durationSec: number; distanceM: number | null }): string | null {
    if (!activity.distanceM || activity.distanceM < 10) return null
    const hasPace = ['run', 'walk', 'hike', 'ride'].includes(activity.activityType)
    if (!hasPace) return null
    const page = fitnessPage.value
    const distUnit = page?.units === 'us' ? activity.distanceM / 1609.34 : activity.distanceM / 1000
    if (distUnit < 0.01) return null
    const secPerUnit = activity.durationSec / distUnit
    const mins = Math.floor(secPerUnit / 60)
    const secs = Math.round(secPerUnit % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function formatDistance(meters: number | null): string {
    if (!meters) return '0'
    return formatFitnessDistance(meters, fitnessPage.value?.units)
  }

  const maxSteps = computed(() => {
    if (!fitnessPage.value) return 1
    return Math.max(1, ...fitnessPage.value.weekSummary.days.map((d) => d.stepsCount ?? 0))
  })

  const { now } = useEasternMidnightRollover()
  const todayKey = computed(() => easternDateKey(now.value))

  function isDayToday(day: FitnessDailySummary): boolean {
    return day.dayKey === todayKey.value
  }
  function isDayFuture(day: FitnessDailySummary): boolean {
    return day.dayKey > todayKey.value
  }

  function dayBarClass(day: FitnessDailySummary): string {
    if ((day.workoutMinutes ?? 0) > 0) return accentBg.value
    if (isDayFuture(day)) return 'bg-gray-200/30 dark:bg-white/10'
    return 'bg-gray-300 dark:bg-zinc-600'
  }

  function dayBarHeight(day: FitnessDailySummary): string {
    const hasActivity = (day.workoutMinutes ?? 0) > 0
    if (isDayFuture(day)) return '4px'
    const ratio = (day.stepsCount ?? 0) / maxSteps.value
    // Active days get a minimum height bump so the color difference is obvious
    return `${hasActivity ? Math.max(12, 4 + ratio * 36) : Math.max(4, ratio * 36)}px`
  }

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  function dayLabel(dayKey: string): string {
    const d = new Date(`${dayKey}T12:00:00Z`)
    return DAY_LABELS[d.getUTCDay()] ?? ''
  }

  function activityIcon(type: FitnessActivityType): string {
    const map: Record<FitnessActivityType, string> = {
      run: 'tabler:run',
      ride: 'tabler:bike',
      walk: 'tabler:walk',
      swim: 'tabler:wave-sine',
      workout: 'tabler:barbell',
      hike: 'tabler:mountain',
      yoga: 'tabler:activity',
      other: 'tabler:heart-rate-monitor',
    }
    return map[type] ?? 'tabler:heart-rate-monitor'
  }

  return {
    recoveryLine,
    avgStepsPerDay,
    weekBarsEl,
    inspectedDayKey,
    hoverWeightIndex,
    hoverVo2Index,
    hoverStepsIndex,
    inspectedDayCaption,
    displayedWeight,
    displayedVo2Max,
    displayedSteps,
    onWeekPointerDown,
    onWeekPointerMove,
    onWeekPointerUp,
    clearInspectedDay,
    dayBarOpacity,
    dayAriaLabel,
    activityLabel,
    activityPace,
    formatDistance,
    isDayToday,
    dayBarClass,
    dayBarHeight,
    dayLabel,
    activityIcon,
  }
}
