import { easternDateKey, ET_ZONE } from './eastern-time'

export const CHECKIN_CLOSED_MESSAGE = 'Check-ins open at 5pm ET. Answer daily from 5pm–11:59pm ET.'

export function isCheckinOpen(now: Date): boolean {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: ET_ZONE, hour: 'numeric', hourCycle: 'h23' }).format(now))
  return hour >= 17
}

export function checkinWindowKey(now: Date): string {
  return `${easternDateKey(now)}:${isCheckinOpen(now) ? 'open' : 'closed'}`
}

/** The next 5pm or midnight ET, using local calendar parts rather than a fixed UTC offset. */
export function nextCheckinBoundary(now: Date): number {
  const current = checkinWindowKey(now)
  const hour = 3_600_000
  let candidate = Math.floor(now.getTime() / hour) * hour + hour
  while (checkinWindowKey(new Date(candidate)) === current) candidate += hour
  return candidate
}
