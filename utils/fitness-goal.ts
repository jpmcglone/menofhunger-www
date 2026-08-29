/** Prefer the stored start. If a goal was saved without one, use the oldest log. */
export function effectiveGoalStartKg(
  startKg: number | null | undefined,
  oldestWeightKg: number | null | undefined,
): number | null {
  if (startKg != null && startKg > 0) return startKg
  if (oldestWeightKg != null && oldestWeightKg > 0) return oldestWeightKg
  return null
}

export function goalProgressPercent(opts: {
  startKg: number | null | undefined
  targetKg: number | null | undefined
  currentKg: number | null | undefined
}): number {
  const start = opts.startKg
  const target = opts.targetKg
  const current = opts.currentKg
  if (start == null || target == null || current == null) return 0
  const total = Math.abs(target - start)
  if (total === 0) return 100
  return Math.min(100, Math.round((Math.abs(current - start) / total) * 100))
}
