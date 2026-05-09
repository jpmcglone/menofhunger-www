import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js'

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
 * Uses libphonenumber-js with the selected country to produce accurate E.164.
 * Falls back to the API's legacy heuristics for numbers that don't parse cleanly.
 *
 * @param input  The raw phone string the user typed (national or international format).
 * @param country ISO 3166-1 alpha-2 country code used to interpret national numbers (default 'US').
 */
export function normalizePhoneForApi(input: string, country: string = 'US'): string {
  const trimmed = (input ?? '').trim()
  if (!trimmed) return ''

  const parsed = parsePhoneNumberFromString(trimmed, country as any)
  if (parsed?.isValid()) return parsed.format('E.164')

  // Legacy fallback: mirrors the API's normalizePhone() behavior so the server
  // can still do its own validation pass.
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

