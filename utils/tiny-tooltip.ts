export type TinyTooltipConfig =
  | null
  | {
      value: string
      class: string
      position?: 'top' | 'bottom' | 'left' | 'right'
    }

/**
 * Standard tiny tooltip config (X-like).
 * Returns null on SSR and until app mount to avoid hydration mismatches.
 */
export function tinyTooltip(text: string | null | undefined): TinyTooltipConfig {
  if (!import.meta.client) return null
  // Hydration safety: PrimeVue's tooltip directive can mutate DOM during hydration.
  // Keep tooltips disabled until the app is mounted on the client.
  const hydrated = useState<boolean>('moh-hydrated', () => false)
  if (!hydrated.value) return null
  const value = (text ?? '').trim()
  if (!value) return null
  // Keep these consistent everywhere: centered under the target, no arrow.
  return { value, class: 'moh-tooltip-tiny', position: 'bottom' }
}

