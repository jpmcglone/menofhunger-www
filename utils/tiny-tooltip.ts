export type TinyTooltipConfig =
  | null
  | {
      value: string
      class: string
    }

/**
 * Standard tiny tooltip config (X-like).
 * Returns null on SSR to avoid hydration differences.
 */
export function tinyTooltip(text: string | null | undefined): TinyTooltipConfig {
  if (!import.meta.client) return null
  const value = (text ?? '').trim()
  if (!value) return null
  return { value, class: 'moh-tooltip-tiny' }
}

