/**
 * App icon badge (PWA home screen icon).
 *
 * Uses the Badging API when available (Chrome on Android, Chrome/Edge desktop).
 * Not supported on iOS Safari — PWAs cannot show a badge on the home screen icon.
 *
 * Badge count = notifications + chat unread (primary + requests).
 */
export function useAppIconBadge() {
  const { user } = useAuth()
  const { notificationUndeliveredCount, messageUnreadCounts } = usePresence()

  const totalCount = computed(() => {
    if (!user.value?.id) return 0
    const notif = Math.max(0, Number(notificationUndeliveredCount.value) || 0)
    const primary = Math.max(0, Number(messageUnreadCounts.value.primary) || 0)
    const requests = Math.max(0, Number(messageUnreadCounts.value.requests) || 0)
    return notif + primary + requests
  })

  const badgeCount = computed(() => Math.min(totalCount.value, 99))

  function updateBadge() {
    if (import.meta.server) return
    const nav = navigator as Navigator & { setAppBadge?: (count: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (typeof nav.setAppBadge !== 'function' || typeof nav.clearAppBadge !== 'function') return

    const count = badgeCount.value
    if (count > 0) {
      void nav.setAppBadge(count)
    } else {
      void nav.clearAppBadge()
    }
  }

  watch(badgeCount, updateBadge, { immediate: true })
}
