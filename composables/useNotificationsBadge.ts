import type { GetNotificationsResponse, NotificationFeedItem } from '~/types/api'
import { userColorTier } from '~/utils/user-tier'

export function useNotificationsBadge() {
  const { user } = useAuth()
  const { apiFetch } = useApiClient()
  const { notificationUndeliveredCount, setNotificationUndeliveredCount, isSocketConnected } = usePresence()

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
    if (!user.value?.id) return
    try {
      const res = await apiFetch<NotificationFeedItem[]>('/notifications?limit=1') as {
        data: NotificationFeedItem[]
        pagination?: GetNotificationsResponse['pagination']
      }
      const raw = res?.pagination?.undeliveredCount ?? 0
      setNotificationUndeliveredCount(raw)
    } catch {
      // Ignore; badge will update on next socket event or page load
    }
  }

  watch(
    () => user.value?.id,
    (userId) => {
      if (userId) fetchUndeliveredCount()
      else setNotificationUndeliveredCount(0)
    },
    { immediate: true },
  )

  // Refetch when socket connects/reconnects (catches missed events)
  watch(isSocketConnected, (connected) => {
    if (connected && user.value?.id) void fetchUndeliveredCount()
  })

  // Refetch when tab becomes visible (recovers from missed socket events)
  if (import.meta.client) {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user.value?.id) void fetchUndeliveredCount()
    }
    onMounted(() => document.addEventListener('visibilitychange', onVisible))
    onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
  }

  return { count, show, displayCount, toneClass, fetchUndeliveredCount }
}
