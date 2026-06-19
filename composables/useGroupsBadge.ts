import { userColorTier } from '~/utils/user-tier'

/**
 * Badge state for the Groups nav icon: total count of unseen group posts across
 * all the viewer's groups, plus a per-group breakdown for card badges.
 *
 * Mirrors the pattern used by `useCrewInvitesBadge` — the state is shared via
 * `useState` so multiple badge mount points stay in sync, and is refreshed on
 * auth change, socket reconnect, tab visibility, and `groups:unreadChanged` events.
 */
export function useGroupsBadge() {
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const { groupsUnread, setGroupsUnread, isSocketConnected } = usePresence()

  const toneClass = computed(() => {
    const tier = userColorTier(user.value)
    if (tier === 'organization' || tier === 'premium') return 'moh-notif-badge-premium'
    if (tier === 'verified') return 'moh-notif-badge-verified'
    return 'moh-notif-badge-normal'
  })

  const total = computed(() => groupsUnread.value.total)
  const show = computed(() => total.value > 0)
  const displayCount = computed(() => (total.value >= 99 ? '99+' : String(total.value)))

  function getCountForGroup(groupId: string): number {
    return groupsUnread.value.byGroupId[groupId] ?? 0
  }

  async function refresh() {
    if (!user.value?.id) {
      if (groupsUnread.value.total !== 0) setGroupsUnread({ total: 0, byGroupId: {} })
      return
    }
    try {
      const data = await apiFetchData<{ total: number; byGroupId: Record<string, number> }>('/notifications/groups-unread')
      setGroupsUnread(data)
    } catch {
      // Non-fatal — count will refresh on the next event or reconnect.
    }
  }

  watch(
    () => user.value?.id,
    (uid) => {
      if (uid) void refresh()
      else setGroupsUnread({ total: 0, byGroupId: {} })
    },
    { immediate: true },
  )

  watch(isSocketConnected, (connected) => {
    if (connected && user.value?.id) void refresh()
  })

  if (import.meta.client) {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user.value?.id) void refresh()
    }
    onMounted(() => document.addEventListener('visibilitychange', onVisible))
    onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
  }

  return { total, show, displayCount, toneClass, getCountForGroup, refresh }
}
