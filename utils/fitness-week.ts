/** Days that actually recorded steps. Zero and missing both count as no data. */
export function daysWithStepData(days: Array<{ stepsCount?: number | null }>): number[] {
  return days
    .map((day) => day.stepsCount)
    .filter((steps): steps is number => steps != null && steps > 0)
}

/**
 * This-week average. Needs two or more days with data so a single walk
 * does not look like a daily habit.
 */
export function averageStepsPerDay(days: Array<{ stepsCount?: number | null }>): number | null {
  const counted = daysWithStepData(days)
  if (counted.length < 2) return null
  return Math.round(counted.reduce((sum, steps) => sum + steps, 0) / counted.length)
}
