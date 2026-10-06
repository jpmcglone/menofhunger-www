import { getAuthGeneration } from '~/composables/auth/authState'
import type { GetNotificationsUnreadCountResponse } from '~/types/api'

export function useNotificationsBadge() {
  const { user } = useAuth()
  const { apiFetch } = useApiClient()
  const {
    notificationUndeliveredCount,
    hasUnreadNotifications,
    notificationBadgeRevision,
    setNotificationUndeliveredCount,
    setNotificationUnreadCommentCount,
    setNotificationNavUnread,
  } = usePresence()

  const count = computed(() => Math.max(0, Number(notificationUndeliveredCount.value) || 0))
  /** Unseen arrivals take numeric precedence over remaining unread activity. */
  const show = computed(() => count.value > 0 || hasUnreadNotifications.value)
  /** Display text: count, or "99+" when 99 or more. Only used when show is true (count > 0). */
  const displayCount = computed(() => {
    const n = count.value
    return n >= 99 ? '99+' : String(n)
  })

  const toneClass = useActivityBadgeTone()

  async function fetchUndeliveredCount() {
    const generation = getAuthGeneration()
    const userId = user.value?.id
    if (!userId) return
    const revision = notificationBadgeRevision.value
    try {
      const res = await apiFetch<GetNotificationsUnreadCountResponse['data']>('/notifications/unread-count')
      if (generation !== getAuthGeneration() || user.value?.id !== userId || notificationBadgeRevision.value !== revision) return
      const raw = res?.data?.count ?? 0
      setNotificationUndeliveredCount(raw)
      // Same endpoint also seeds the "waiting on you" dot so we don't pay for a second round-trip.
      const waitingRaw = res?.data?.unreadCommentCount ?? 0
      setNotificationUnreadCommentCount(waitingRaw)
      setNotificationNavUnread(res?.data ?? {})
    } catch {
      // Ignore; badge will update on next socket event or page load
    }
  }

  return { count, hasUnreadNotifications, show, displayCount, toneClass, fetchUndeliveredCount }
}
