import { AsYouType } from 'libphonenumber-js'

function keepLeadingPlusAndDigits(input: string): string {
  const trimmed = (input ?? '').trim()
  if (!trimmed) return ''
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

/** Format a phone number for display as the user types (best-effort). */
export function formatPhoneAsYouType(input: string, defaultCountry: string = 'US'): string {
  const cleaned = keepLeadingPlusAndDigits(input)
  if (!cleaned) return ''
  const ayt = new AsYouType(defaultCountry as any)
  return ayt.input(cleaned)
}

/**
 * Normalize a phone input string for the API.
 *
 * Mirrors the API's current `normalizePhone()` behavior:
 * - accept E.164-ish +[8-15 digits]
 * - if 10 digits, assume US and prefix +1
 * - if 8-15 digits, prefix +
 */
export function normalizePhoneForApi(input: string): string {
  const trimmed = (input ?? '').trim()
  if (!trimmed) return ''

  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  const normalized = hasPlus ? `+${digits}` : digits

  if (/^\+\d{8,15}$/.test(normalized)) return normalized
  if (/^\d{10}$/.test(normalized)) return `+1${normalized}`
  if (/^\d{8,15}$/.test(normalized)) return `+${normalized}`

  // Fall back to whatever the user typed; API will reject if invalid.
  return trimmed
}

export function countDigitsBeforeIndex(value: string, index: number): number {
  const slice = value.slice(0, Math.max(0, index))
  return (slice.match(/\d/g) ?? []).length
}

export function indexFromDigitCount(value: string, digitCount: number): number {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let i = 0; i < value.length; i++) {
    if (/\d/.test(value[i] ?? '')) {
      seen++
      if (seen >= digitCount) return i + 1
    }
  }
  return value.length
}

