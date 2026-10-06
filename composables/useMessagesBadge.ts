import { getAuthGeneration } from '~/composables/auth/authState'
import type { GetMessagesUnreadCountResponse } from '~/types/api'

export function useMessagesBadge() {
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const { messageUnreadCounts, setMessageUnreadCounts } = usePresence()

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

  const toneClass = useActivityBadgeTone()

  async function fetchUnreadCounts() {
    const generation = getAuthGeneration()
    const userId = user.value?.id
    if (!userId) return
    try {
      const res = await apiFetchData<GetMessagesUnreadCountResponse['data']>('/messages/unread-count')
      if (generation !== getAuthGeneration() || user.value?.id !== userId) return
      const primary = Math.max(0, Number(res?.primary ?? 0) || 0)
      const requests = Math.max(0, Number(res?.requests ?? 0) || 0)
      setMessageUnreadCounts({ primary, requests })
    } catch {
      // Ignore; badge will update on next socket event or page load
    }
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
