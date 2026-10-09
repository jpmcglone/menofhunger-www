export type PremiumUpsellKind = 'media' | 'schedule'

/**
 * Global "Premium required" prompt (rendered once by GlobalOverlays) shown when a non-premium user
 * tries to attach media or schedule a post.
 */
export function usePremiumUpsell() {
  const kind = useState<PremiumUpsellKind | null>('premium-upsell-kind', () => null)

  function show(next: PremiumUpsellKind) {
    kind.value = next
    useNuxtApp().$posthog?.capture('premium_upsell_viewed', { kind: next })
  }

  function hide() {
    kind.value = null
  }

  return { kind, show, hide }
}
