/**
 * App icon badge (PWA home screen icon).
 *
 * Uses the Badging API when available (Chrome on Android, Chrome/Edge desktop).
 * Count only: dots never contribute. Sums the acting identity plus every other
 * identity in the operator cluster.
 */
export function useAppIconBadge() {
  const { cappedTotal } = useAttentionTotals()

  function updateBadge() {
    if (import.meta.server) return
    const nav = navigator as Navigator & { setAppBadge?: (count: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (typeof nav.setAppBadge !== 'function' || typeof nav.clearAppBadge !== 'function') return
    const count = cappedTotal.value
    if (count > 0) void nav.setAppBadge(count)
    else void nav.clearAppBadge()
  }

  watch(cappedTotal, updateBadge, { immediate: true })
}
