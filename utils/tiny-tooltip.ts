export type TinyTooltipConfig =
  | null
  | {
      value: string
      class: string
      position?: 'top' | 'bottom' | 'left' | 'right'
    }

/**
 * Standard tiny tooltip config (X-like).
 * Returns null on SSR to avoid hydration differences.
 */
export function tinyTooltip(text: string | null | undefined): TinyTooltipConfig {
  if (!import.meta.client) return null
  const value = (text ?? '').trim()
  if (!value) return null
  // Keep these consistent everywhere: centered under the target, no arrow.
  return { value, class: 'moh-tooltip-tiny', position: 'bottom' }
}

