/** Parse dollars without floating-point rounding or accepting exponential notation. */
export function integrationMicros(text: string): number | null {
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) return null
  const [whole = '0', fraction = ''] = text.split('.')
  const value = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'))
  return value <= 2_000_000_000n ? Number(value) : null
}
export const integrationDollars = (micros: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(micros / 1_000_000)
