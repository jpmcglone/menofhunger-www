type DateStyle = NonNullable<Intl.DateTimeFormatOptions['dateStyle']>
type TimeStyle = NonNullable<Intl.DateTimeFormatOptions['timeStyle']>

/** Fixed locale for SSR: server and client must produce identical output to avoid hydration mismatches. */
const SSR_LOCALE = 'en-US'

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function formatDateTime(
  iso: string | null | undefined,
  options?: {
    dateStyle?: DateStyle
    timeStyle?: TimeStyle
    dateOptions?: Intl.DateTimeFormatOptions
    timeOptions?: Intl.DateTimeFormatOptions
    separator?: string
    fallback?: string
  },
): string {
  const fallback = options?.fallback ?? '—'
  const d = toDate(iso)
  if (!d) return fallback
  if (options?.dateStyle || options?.timeStyle) {
    return d.toLocaleString(SSR_LOCALE, {
      dateStyle: options?.dateStyle,
      timeStyle: options?.timeStyle,
    })
  }
  const date = new Intl.DateTimeFormat(
    SSR_LOCALE,
    options?.dateOptions ?? { year: 'numeric', month: 'short', day: '2-digit' },
  ).format(d)
  const time = new Intl.DateTimeFormat(
    SSR_LOCALE,
    options?.timeOptions ?? { hour: 'numeric', minute: '2-digit' },
  ).format(d)
  return `${date}${options?.separator ?? ' · '}${time}`
}

export function formatDateOnly(
  iso: string | null | undefined,
  options?: {
    dateStyle?: DateStyle
    dateOptions?: Intl.DateTimeFormatOptions
    fallback?: string
  },
): string {
  const fallback = options?.fallback ?? '—'
  const d = toDate(iso)
  if (!d) return fallback
  if (options?.dateStyle) {
    return d.toLocaleDateString(SSR_LOCALE, { dateStyle: options.dateStyle })
  }
  return new Intl.DateTimeFormat(
    SSR_LOCALE,
    options?.dateOptions ?? { year: 'numeric', month: 'short', day: '2-digit' },
  ).format(d)
}

export function formatRelativeTime(
  iso: string | null,
  options?: { fallback?: string; nowMs?: number },
): string {
  const fallback = options?.fallback ?? 'Never'
  if (!iso?.trim()) return fallback
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const now = options?.nowMs ?? Date.now()
  const diffMs = now - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec} seconds ago`
  if (diffMin === 1) return '1 minute ago'
  if (diffMin < 60) return `${diffMin} minutes ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr === 1) return '1 hour ago'
  if (diffHr < 24) return `${diffHr} hours ago`
  return date.toLocaleTimeString(SSR_LOCALE, { hour: 'numeric', minute: '2-digit' })
}

export function formatListTime(iso: string | null, nowMs?: number) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const now = nowMs ?? Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString(SSR_LOCALE, { month: 'short', day: 'numeric' })
}

export function formatMessageTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  // In chat, always prefer a clock time over "Just now".
  if (diffMin < 1) return date.toLocaleTimeString(SSR_LOCALE, { hour: 'numeric', minute: '2-digit' })
  if (diffMin < 60) return `${diffMin}m`
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString(SSR_LOCALE, { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDay < 6) {
    return date.toLocaleDateString(SSR_LOCALE, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  }

  const showYear = diffDay >= 364
  return date.toLocaleDateString(SSR_LOCALE, {
    month: 'short',
    day: 'numeric',
    year: showYear ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatMessageTimeFull(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(SSR_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDayDividerLabel(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Earlier'
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return 'Today'
  const yday = new Date(now)
  yday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yday.getFullYear() &&
    date.getMonth() === yday.getMonth() &&
    date.getDate() === yday.getDate()
  if (isYesterday) return 'Yesterday'
  return date.toLocaleDateString(SSR_LOCALE, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "Mar 4" or, with `year`, "Mar 4, 2026". Fixed locale so SSR and client agree. */
export function formatShortDate(
  iso: string | null | undefined,
  options?: { year?: boolean; fallback?: string; timeZone?: string },
): string {
  const d = toDate(iso)
  if (!d) return options?.fallback ?? ''
  return new Intl.DateTimeFormat(SSR_LOCALE, {
    month: 'short',
    day: 'numeric',
    year: options?.year ? 'numeric' : undefined,
    timeZone: options?.timeZone,
  }).format(d)
}

/** "March 2026". */
export function formatMonthYear(iso: string | null | undefined, fallback = ''): string {
  const d = toDate(iso)
  if (!d) return fallback
  return new Intl.DateTimeFormat(SSR_LOCALE, { month: 'long', year: 'numeric' }).format(d)
}

/** Numeric date, e.g. "3/4/2026". */
export function formatNumericDate(iso: string | null | undefined, fallback = ''): string {
  const d = toDate(iso)
  if (!d) return fallback
  return new Intl.DateTimeFormat(SSR_LOCALE).format(d)
}

/** "Mar 4 · 5:30 PM" (or with year). */
export function formatShortDateTime(
  iso: string | null | undefined,
  options?: { year?: boolean; fallback?: string },
): string {
  const d = toDate(iso)
  if (!d) return options?.fallback ?? ''
  const date = formatShortDate(iso, { year: options?.year })
  const time = new Intl.DateTimeFormat(SSR_LOCALE, { hour: 'numeric', minute: '2-digit' }).format(d)
  return `${date} · ${time}`
}

/** Compact age for comments: "12s", "5m", "3h", "2d", then a numeric date after a week. */
export function formatCompactAge(iso: string | null | undefined, nowMs?: number): string {
  const d = toDate(iso)
  if (!d) return ''
  const seconds = Math.max(0, Math.floor(((nowMs ?? Date.now()) - d.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return formatNumericDate(iso)
}

/** "just now", "5m ago", "3h ago", "2d ago". */
export function formatAgoShort(iso: string | null | undefined, nowMs?: number): string {
  const d = toDate(iso)
  if (!d) return ''
  const sec = Math.max(0, Math.round(((nowMs ?? Date.now()) - d.getTime()) / 1000))
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}

/** Future-facing day count: "soon", "in 1 day", "in 5 days". */
export function formatFutureRelative(iso: string | null | undefined, nowMs?: number): string {
  const d = toDate(iso)
  if (!d) return ''
  const days = Math.round((d.getTime() - (nowMs ?? Date.now())) / 86_400_000)
  if (days <= 0) return 'soon'
  if (days === 1) return 'in 1 day'
  return `in ${days} days`
}

/** Clock time only (e.g. `3:05 PM`), fixed en-US for SSR parity. */
export function formatClockTime(iso: string | null | undefined, fallback = ''): string {
  const d = toDate(iso)
  if (!d) return fallback
  return d.toLocaleTimeString(SSR_LOCALE, { hour: 'numeric', minute: '2-digit' })
}

type DateInput = Date | string | number
type LocaleDateOptions = Intl.DateTimeFormatOptions

/** `toLocaleDateString` with the fixed SSR locale. Same output as the inline calls it replaced. */
export function formatLocaleDate(input: DateInput, options?: LocaleDateOptions): string {
  return new Date(input).toLocaleDateString(SSR_LOCALE, options)
}

/** `toLocaleString` (date + time) with the fixed SSR locale. */
export function formatLocaleDateTime(input: DateInput, options?: LocaleDateOptions): string {
  return new Date(input).toLocaleString(SSR_LOCALE, options)
}

/** `toLocaleTimeString` with the fixed SSR locale. */
export function formatLocaleTime(input: DateInput, options?: LocaleDateOptions): string {
  return new Date(input).toLocaleTimeString(SSR_LOCALE, options)
}
