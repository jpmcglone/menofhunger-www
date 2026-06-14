/**
 * Modal shown when a verified (non-premium) user tries to schedule a post.
 */
export function useSchedulePremiumModal() {
  const open = useState<boolean>('schedule-premium-modal-open', () => false)

  function show() {
    open.value = true
    useNuxtApp().$posthog?.capture('premium_upsell_viewed', { kind: 'schedule' })
  }

  function hide() {
    open.value = false
  }

  return { open, show, hide }
}
