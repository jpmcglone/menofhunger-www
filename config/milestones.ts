/**
 * Men of Hunger badge + milestone system.
 *
 * Badges are earned through `longestStreakDays` so they never regress once
 * unlocked. They show up behind a single "Badges" entry point on the profile —
 * not as inline tags — and the dialog renders the full set with locked tiles
 * for tiers the user hasn't earned yet (Reddit/video-game style).
 *
 * Guiding principles:
 *   - Badges reflect discipline + consistency, not clout.
 *   - Thresholds are achievable but meaningful.
 *   - No negative badges. Locked tiers are simply dim, never punitive.
 */

export type BadgeTier = 'bronze' | 'silver' | 'gold'

export type Badge = {
  id: string
  name: string
  /** Short, plain description shown on hover/tap. */
  description: string
  /** Iconify name (Tabler set). */
  icon: string
  tier: BadgeTier
  /** Minimum `longestStreakDays` required to earn this badge. */
  minStreakDays: number
}

/**
 * Ordered ascending so the dialog renders bronze → silver → gold in reading
 * order. Add new tiers here only when there's something genuinely worth
 * chasing — every additional tile dilutes the rarer badges.
 */
export const BADGES: readonly Badge[] = [
  {
    id: 'builder',
    name: 'Builder',
    description: 'Hit a 7-day posting streak. The work is starting to compound.',
    icon: 'tabler:hammer',
    tier: 'bronze',
    minStreakDays: 7,
  },
  {
    id: 'iron',
    name: 'Iron',
    description: 'Hit a 30-day posting streak. Forged through discipline.',
    icon: 'tabler:bolt',
    tier: 'silver',
    minStreakDays: 30,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Hit a 100-day posting streak. Exceptional consistency.',
    icon: 'tabler:shield-star',
    tier: 'gold',
    minStreakDays: 100,
  },
] as const

export function isBadgeEarned(badge: Badge, longestStreakDays: number): boolean {
  return longestStreakDays >= badge.minStreakDays
}

export function getEarnedBadges(longestStreakDays: number): Badge[] {
  return BADGES.filter((b) => isBadgeEarned(b, longestStreakDays))
}

export function hasAnyBadge(longestStreakDays: number): boolean {
  return getEarnedBadges(longestStreakDays).length > 0
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
