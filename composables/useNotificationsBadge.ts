import type { GetNotificationsUnreadCountResponse } from '~/types/api'
import { userColorTier } from '~/utils/user-tier'

export function useNotificationsBadge() {
  const { user } = useAuth()
  const { apiFetch } = useApiClient()
  const {
    notificationUndeliveredCount,
    setNotificationUndeliveredCount,
    setNotificationUnreadCommentCount,
  } = usePresence()

  const count = computed(() => Math.max(0, Number(notificationUndeliveredCount.value) || 0))
  /** Only show badge when there is at least one unseen notification (never show for 0). */
  const show = computed(() => count.value > 0)
  /** Display text: count, or "99+" when 99 or more. Only used when show is true (count > 0). */
  const displayCount = computed(() => {
    const n = count.value
    return n >= 99 ? '99+' : String(n)
  })

  const toneClass = computed(() => {
    const tier = userColorTier(user.value)
    if (tier === 'organization' || tier === 'premium') return 'moh-notif-badge-premium'
    if (tier === 'verified') return 'moh-notif-badge-verified'
    return 'moh-notif-badge-normal'
  })

  async function fetchUndeliveredCount() {
    const userId = user.value?.id
    if (!userId) return
    try {
      const res = await apiFetch<GetNotificationsUnreadCountResponse['data']>('/notifications/unread-count')
      if (user.value?.id !== userId) return
      const raw = res?.data?.count ?? 0
      setNotificationUndeliveredCount(raw)
      // Same endpoint also seeds the "waiting on you" dot so we don't pay for a second round-trip.
      const waitingRaw = res?.data?.unreadCommentCount ?? 0
      setNotificationUnreadCommentCount(waitingRaw)
    } catch {
      // Ignore; badge will update on next socket event or page load
    }
  }

  return { count, show, displayCount, toneClass, fetchUndeliveredCount }
}
