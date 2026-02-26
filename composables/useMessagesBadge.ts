import type { GetMessagesUnreadCountResponse } from '~/types/api'
import { userColorTier } from '~/utils/user-tier'

export function useMessagesBadge() {
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const { messageUnreadCounts, setMessageUnreadCounts, isSocketConnected } = usePresence()

  const primaryCount = computed(() => Math.max(0, Number(messageUnreadCounts.value.primary) || 0))
  const requestCount = computed(() => Math.max(0, Number(messageUnreadCounts.value.requests) || 0))
  const totalCount = computed(() => primaryCount.value + requestCount.value)
  const showPrimary = computed(() => primaryCount.value > 0)
  const showRequests = computed(() => requestCount.value > 0)

  const displayPrimary = computed(() => {
    const n = primaryCount.value
    return n >= 99 ? '99+' : String(n)
  })
  const displayRequests = computed(() => {
    const n = requestCount.value
    return n >= 99 ? '99+' : String(n)
  })
  const displayTotal = computed(() => {
    const n = totalCount.value
    return n >= 99 ? '99+' : String(n)
  })

  const toneClass = computed(() => {
    const tier = userColorTier(user.value)
    if (tier === 'organization' || tier === 'premium') return 'moh-notif-badge-premium'
    if (tier === 'verified') return 'moh-notif-badge-verified'
    return 'moh-notif-badge-normal'
  })

  async function fetchUnreadCounts() {
    if (!user.value?.id) return
    try {
      const res = await apiFetchData<GetMessagesUnreadCountResponse['data']>('/messages/unread-count')
      const primary = Math.max(0, Number(res?.primary ?? 0) || 0)
      const requests = Math.max(0, Number(res?.requests ?? 0) || 0)
      setMessageUnreadCounts({ primary, requests })
    } catch {
      // Ignore; badge will update on next socket event or page load
    }
  }

  watch(
    () => user.value?.id,
    (userId) => {
      if (userId) fetchUnreadCounts()
      else setMessageUnreadCounts({ primary: 0, requests: 0 })
    },
    { immediate: true },
  )

  watch(isSocketConnected, (connected) => {
    if (connected && user.value?.id) void fetchUnreadCounts()
  })

  if (import.meta.client) {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user.value?.id) void fetchUnreadCounts()
    }
    onMounted(() => document.addEventListener('visibilitychange', onVisible))
    onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
  }

  return {
    primaryCount,
    requestCount,
    totalCount,
    showPrimary,
    showRequests,
    displayPrimary,
    displayRequests,
    displayTotal,
    toneClass,
    fetchUnreadCounts,
  }
}
