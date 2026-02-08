export const ET_ZONE = 'America/New_York'

function easternParts(
  d: Date,
  opts: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ET_ZONE, ...opts }).formatToParts(d)
}

export function easternDateKey(d: Date = new Date()): string {
  const parts = easternParts(d, { year: 'numeric', month: '2-digit', day: '2-digit' })
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function easternYmd(d: Date): { y: number; m: number; d: number } {
  const parts = easternParts(d, { year: 'numeric', month: '2-digit', day: '2-digit' })
  const y = Number(parts.find((p) => p.type === 'year')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'month')?.value ?? 1)
  const dd = Number(parts.find((p) => p.type === 'day')?.value ?? 1)
  return { y, m, d: dd }
}

function easternYmdHms(d: Date): { y: number; m: number; d: number; hh: number; mm: number } {
  const parts = easternParts(d, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const y = Number(parts.find((p) => p.type === 'year')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'month')?.value ?? 1)
  const dd = Number(parts.find((p) => p.type === 'day')?.value ?? 1)
  const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return { y, m, d: dd, hh, mm }
}

/** Milliseconds until next midnight in Eastern Time. */
export function msUntilNextEasternMidnight(now: Date = new Date()): number {
  // Always land in “tomorrow” in ET (covers DST transitions).
  const tomorrowEt = easternYmd(new Date(now.getTime() + 36 * 60 * 60 * 1000))
  // ET is UTC-4/UTC-5; midnight ET will be in a small UTC hour band.
  for (let utcHour = 0; utcHour <= 12; utcHour++) {
    const cand = new Date(Date.UTC(tomorrowEt.y, tomorrowEt.m - 1, tomorrowEt.d, utcHour, 0, 0))
    const p = easternYmdHms(cand)
    if (p.y === tomorrowEt.y && p.m === tomorrowEt.m && p.d === tomorrowEt.d && p.hh === 0 && p.mm === 0) {
      return cand.getTime() - now.getTime()
    }
  }
  return 24 * 60 * 60 * 1000
}

