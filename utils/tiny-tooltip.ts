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
 *
 * Pass `{ class: '...' }` to render with a different tooltip skin (e.g.
 * `moh-tooltip-status` for the white pill that mirrors the profile status).
 */
export function tinyTooltip(
  text: string | null | undefined,
  options?: { class?: string },
): TinyTooltipConfig {
  if (!import.meta.client) return null
  // Hydration safety: PrimeVue's tooltip directive can mutate DOM during hydration.
  // Keep tooltips disabled until the app is mounted on the client.
  const hydrated = useState<boolean>('moh-hydrated', () => false)
  if (!hydrated.value) return null
  const value = (text ?? '').trim()
  if (!value) return null
  // Keep these consistent everywhere: centered under the target, no arrow.
  return { value, class: options?.class ?? 'moh-tooltip-tiny', position: 'bottom' }
}

