/**
 * Split a YYYY-MM-DD string into its three parts for the date-of-birth input.
 * Returns empty strings for any part if the value is absent or malformed.
 */
export function splitBirthdate(value: string): { mm: string; dd: string; yyyy: string } {
  const raw = (value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { mm: '', dd: '', yyyy: '' }
  const [yyyy, mm, dd] = raw.split('-') as [string, string, string]
  return { mm, dd, yyyy }
}

/**
 * Assemble a YYYY-MM-DD string from the three parts.
 * Returns '' if any part is incomplete or the resulting date is not a real calendar date.
 */
export function assembleBirthdate(mm: string, dd: string, yyyy: string): string {
  const m = mm.trim()
  const d = dd.trim()
  const y = yyyy.trim()
  if (!m || !d || !y || y.length !== 4) return ''
  const mn = Number(m)
  const dn = Number(d)
  const yn = Number(y)
  if (
    Number.isNaN(mn) || Number.isNaN(dn) || Number.isNaN(yn) ||
    mn < 1 || mn > 12 ||
    dn < 1 || dn > 31 ||
    yn < 1900 || yn > 9999
  ) return ''
  const candidate = new Date(Date.UTC(yn, mn - 1, dn))
  if (
    candidate.getUTCFullYear() !== yn ||
    candidate.getUTCMonth() !== mn - 1 ||
    candidate.getUTCDate() !== dn
  ) {
    // Date overflowed (e.g. Feb 31)
    return ''
  }
  const mm2 = String(mn).padStart(2, '0')
  const dd2 = String(dn).padStart(2, '0')
  const yyyy2 = String(yn).padStart(4, '0')
  return `${yyyy2}-${mm2}-${dd2}`
}
