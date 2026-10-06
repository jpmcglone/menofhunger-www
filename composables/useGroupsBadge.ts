import { getAuthGeneration } from '~/composables/auth/authState'

/**
 * Badge state for the Groups nav icon: unseen group posts plus pending invites
 * the viewer still needs to accept or decline. Per-group counts stay post-only.
 *
 * State is shared through `usePresence`; `useBadgeHydration` owns automatic
 * bootstrap/recovery while `refresh` remains available for explicit callers.
 */
export function useGroupsBadge() {
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const { groupsUnread, setGroupsUnread } = usePresence()
  const { count: pendingInviteCount } = useGroupInvitesBadge()

  const toneClass = useActivityBadgeTone()

  const unreadPosts = computed(() => groupsUnread.value.total)
  const total = computed(() => unreadPosts.value + pendingInviteCount.value)
  const show = computed(() => total.value > 0)
  const displayCount = computed(() => (total.value >= 99 ? '99+' : String(total.value)))

  function getCountForGroup(groupId: string): number {
    return groupsUnread.value.byGroupId[groupId] ?? 0
  }

  async function refresh() {
    const generation = getAuthGeneration()
    const userId = user.value?.id
    if (!userId) {
      if (groupsUnread.value.total !== 0) setGroupsUnread({ total: 0, byGroupId: {} })
      return
    }
    try {
      const data = await apiFetchData<{ total: number; byGroupId: Record<string, number> }>('/notifications/groups-unread')
      if (generation !== getAuthGeneration() || user.value?.id !== userId) return
      setGroupsUnread(data)
    } catch {
      // Non-fatal — count will refresh on the next event or reconnect.
    }
  }

  return { total, show, displayCount, toneClass, getCountForGroup, refresh }
}
