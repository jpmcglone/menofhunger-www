/**
 * Men of Hunger milestone + status label system.
 *
 * Status labels are derived purely from existing data — no new scoring model.
 * Labels appear in profile headers and can be shown in feed metadata.
 *
 * Guiding principles:
 *   - Labels reflect discipline + consistency, not clout
 *   - Thresholds are achievable but meaningful
 *   - No negative labels (system stays invisible at zero)
 */

export type StatusLabel = {
  id: string
  label: string
  icon: string
  /** CSS custom property color variable or tailwind color class prefix */
  color: 'amber' | 'blue' | 'orange' | 'red' | 'green' | 'gray'
  description: string
  /** Minimum streak days required */
  minStreakDays: number
}

/**
 * Ordered from highest to lowest. Use the first one the user qualifies for.
 * All thresholds are based on `longestStreakDays` so they never regress.
 */
export const STATUS_LABELS: StatusLabel[] = [
  {
    id: 'centurion',
    label: 'Centurion',
    icon: 'tabler:shield-star',
    color: 'amber',
    description: '100-day streak or longer — exceptional consistency.',
    minStreakDays: 100,
  },
  {
    id: 'iron',
    label: 'Iron',
    icon: 'tabler:bolt',
    color: 'orange',
    description: '30-day streak — forged through discipline.',
    minStreakDays: 30,
  },
  {
    id: 'builder',
    label: 'Builder',
    icon: 'tabler:hammer',
    color: 'blue',
    description: '7-day streak — putting in the work.',
    minStreakDays: 7,
  },
  {
    id: 'on_track',
    label: 'On Track',
    icon: 'tabler:trending-up',
    color: 'green',
    description: 'Active streak — keep going.',
    minStreakDays: 2,
  },
] as const

/**
 * Return the highest status label a user has earned, or null if none.
 * Uses `longestStreakDays` so the label doesn't disappear when streak resets.
 */
export function getStatusLabel(longestStreakDays: number): StatusLabel | null {
  return STATUS_LABELS.find((s) => longestStreakDays >= s.minStreakDays) ?? null
}

// ── Weekly Mission ──────────────────────────────────────────────────────────

export type WeeklyMissionStatus = 'not_started' | 'in_progress' | 'complete'

export type WeeklyMission = {
  daysCompleted: number
  daysTarget: number
  status: WeeklyMissionStatus
  headline: string
  subline: string
}

/**
 * Derive a weekly mission from the current streak.
 * The week "resets" every 7 days of the streak.
 * If streak is 0, we treat days-this-week as 0.
 */
export function deriveWeeklyMission(checkinStreakDays: number): WeeklyMission {
  const target = 7
  const daysCompleted = checkinStreakDays >= target
    ? target
    : checkinStreakDays

  const status: WeeklyMissionStatus =
    daysCompleted === 0
      ? 'not_started'
      : daysCompleted >= target
        ? 'complete'
        : 'in_progress'

  const remaining = target - daysCompleted

  const headlines: Record<WeeklyMissionStatus, string> = {
    not_started: 'Start this week\'s mission.',
    in_progress: daysCompleted === 1
      ? 'Day 1 — keep the momentum.'
      : daysCompleted < 4
        ? `${daysCompleted} days in — hold the line.`
        : `${daysCompleted} of ${target} — almost there.`,
    complete: `${target} of ${target} — mission complete.`,
  }

  const sublines: Record<WeeklyMissionStatus, string> = {
    not_started: 'Check in or post today to begin.',
    in_progress: remaining === 1
      ? 'One more day seals the week.'
      : `${remaining} more day${remaining > 1 ? 's' : ''} to seal the week.`,
    complete: 'Exceptional. See how you stack up.',
  }

  return {
    daysCompleted,
    daysTarget: target,
    status,
    headline: headlines[status],
    subline: sublines[status],
  }
}
