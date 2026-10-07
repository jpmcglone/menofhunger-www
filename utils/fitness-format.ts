import type { FitnessUnits } from '~/types/api'
import { formatShortDate, formatShortDateTime } from '~/utils/time-format'

const METERS_PER_MILE = 1609.34
const FEET_PER_METER = 3.28084

/** Distance in miles (US) or kilometers, no unit suffix. */
export function formatFitnessDistance(meters: number, units: FitnessUnits | null | undefined, digits = 1): string {
  if (units === 'us') return (meters / METERS_PER_MILE).toFixed(digits)
  return (meters / 1000).toFixed(digits)
}

export function formatFitnessElevation(meters: number, units: FitnessUnits | null | undefined): string {
  if (units === 'us') return `${Math.round(meters * FEET_PER_METER)} ft`
  return `${Math.round(meters)} m`
}

/** "1h 5m" or "42m"; `seconds: true` adds the seconds part ("1h 5m 9s"). */
export function formatFitnessDuration(totalSeconds: number, options?: { seconds?: boolean }): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (!options?.seconds) return h > 0 ? `${h}h ${m}m` : `${m}m`
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function formatFitnessDate(iso: string, options?: { year?: boolean }): string {
  return formatShortDate(iso, { year: options?.year })
}

/** Day keys are calendar days; noon UTC keeps them on the same date in every timezone. */
export function formatFitnessDayKey(dayKey: string): string {
  return formatShortDate(`${dayKey}T12:00:00Z`)
}

export function formatFitnessActivityDateTime(iso: string, options?: { year?: boolean }): string {
  return formatShortDateTime(iso, { year: options?.year })
}

/** Full timestamp with seconds, used on the activity detail page. */
export function formatFitnessTimestamp(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}
