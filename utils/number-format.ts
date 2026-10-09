/** Fixed locale for SSR: server and client must produce identical output to avoid hydration mismatches. */
const NUMBER_LOCALE = 'en-US'

/** Full grouped integer/decimal, e.g. `12,345`. */
export function formatCount(n: number | bigint): string {
  return n.toLocaleString(NUMBER_LOCALE)
}

/** Compact notation for large values, e.g. `12.3K`. Values below `compactFrom` stay standard. */
export function formatCompact(n: number, options?: { compactFrom?: number; maximumFractionDigits?: number }): string {
  const compactFrom = options?.compactFrom ?? 0
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    notation: n >= compactFrom ? 'compact' : 'standard',
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  }).format(n)
}

/** Currency amount, e.g. `$1,234.50`. */
export function formatCurrency(n: number, options?: { currency?: string; maximumFractionDigits?: number }): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    style: 'currency',
    currency: options?.currency ?? 'USD',
    ...(options?.maximumFractionDigits === undefined ? {} : { maximumFractionDigits: options.maximumFractionDigits }),
  }).format(n)
}

/** Ratio (0..1) as a percentage, e.g. `0.256` -> `26%` (digits = 0). */
export function formatPercent(ratio: number, digits = 0): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, { style: 'percent', maximumFractionDigits: digits }).format(ratio)
}

/** Compact file size: "0 KB", "512 KB", "1.2 MB", "15 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  const megabytes = bytes / (1024 * 1024)
  return `${megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes)} MB`
}
