import type { MarvinCostsDto, MarvinModeDto } from '~/types/api'

export const MARVIN_MODE_ORDER = ['auto', 'fast', 'regular', 'smart'] as const

type ModeCosts = Pick<MarvinCostsDto, 'fast' | 'regular' | 'smart'>

const DEFAULT_COSTS: ModeCosts = { fast: 1, regular: 2, smart: 5 }

export function marvinModeLabel(mode: MarvinModeDto): string {
  if (mode === 'auto') return 'Auto'
  if (mode === 'fast') return 'Standard'
  if (mode === 'regular') return 'Search'
  return 'Deep'
}

function costFor(mode: Exclude<MarvinModeDto, 'auto'>, costs?: ModeCosts | null): number {
  const src = costs ?? DEFAULT_COSTS
  if (mode === 'fast') return src.fast
  if (mode === 'regular') return src.regular
  return src.smart
}

function compactCost(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString()
}

function creditPhrase(n: number): string {
  return `${compactCost(n)} ${n === 1 ? 'credit' : 'credits'}`
}

/** Catch me up compact dropdown — Figma MARV/Mode trigger. */
export function marvinModePickerCaption(mode: MarvinModeDto, costs?: ModeCosts | null): string {
  if (mode === 'auto') return 'Picks for you'
  const n = compactCost(costFor(mode, costs))
  if (mode === 'fast') return `No web · ${n}`
  if (mode === 'regular') return `Web · ${n}`
  return `Think · ${n}`
}

/** Marv DM menu — Figma MARV/Mode menu. */
export function marvinModeMenuCaption(mode: MarvinModeDto, costs?: ModeCosts | null): string {
  if (mode === 'auto') return 'Picks for you'
  const phrase = creditPhrase(costFor(mode, costs))
  if (mode === 'fast') return `No web · ${phrase}`
  if (mode === 'regular') return `Web · ${phrase}`
  return `More thinking · ${phrase}`
}
