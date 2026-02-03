import type { GetNotificationsUnreadCountResponse } from '~/types/api'

export function useNotificationsBadge() {
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const { notificationUndeliveredCount, setNotificationUndeliveredCount } = usePresence()

  const count = computed(() => notificationUndeliveredCount.value)
  /** Only show badge when there is at least one notification (never show for 0). */
  const show = computed(() => Number(notificationUndeliveredCount.value) > 0)

  const toneClass = computed(() => {
    const u = user.value
    if (u?.premium) return 'moh-notif-badge-premium'
    if (u?.verifiedStatus && u.verifiedStatus !== 'none') return 'moh-notif-badge-verified'
    return 'moh-notif-badge-normal'
  })

  async function fetchUnreadCount() {
    if (!user.value?.id) return
    try {
      const res = await apiFetchData<GetNotificationsUnreadCountResponse['data']>(
        '/notifications/unread-count',
      )
      const c = res?.count ?? 0
      setNotificationUndeliveredCount(c)
    } catch {
      // Ignore; badge will update on next socket event or page load
    }
  }

  watch(
    () => user.value?.id,
    (userId) => {
      if (userId) fetchUnreadCount()
      else setNotificationUndeliveredCount(0)
    },
    { immediate: true },
  )

  return { count, show, toneClass, fetchUnreadCount }
}
