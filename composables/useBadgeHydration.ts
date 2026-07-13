const badgeRefreshByApp = new WeakMap<object, { userId: string; promise: Promise<void> }>()
const BADGE_REFRESH_STALE_MS = 30_000

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function useBadgeHydration() {
  const nuxtApp = useNuxtApp()
  const { user } = useAuth()
  const notifications = useNotificationsBadge()
  const messages = useMessagesBadge()
  const groups = useGroupsBadge()
  const crewInvites = useCrewInvitesBadge()
  const {
    isSocketConnected,
    addCrewCallback,
    removeCrewCallback,
    setNotificationUndeliveredCount,
    setNotificationUnreadCommentCount,
    setMessageUnreadCounts,
    setGroupsUnread,
  } = usePresence()
  const hydratedUserId = useState<string | null>('badge-hydration:user-id', () => null)
  const hydratedAt = useState<number>('badge-hydration:hydrated-at', () => 0)
  const hasSeenSocketConnection = ref(isSocketConnected.value)

  function clear() {
    setNotificationUndeliveredCount(0)
    setNotificationUnreadCommentCount(0)
    setMessageUnreadCounts({ primary: 0, requests: 0 })
    setGroupsUnread({ total: 0, byGroupId: {} })
    crewInvites.setCount(0)
    hydratedUserId.value = null
    hydratedAt.value = 0
  }

  async function refresh(options?: { force?: boolean }) {
    const authUser = user.value
    if (!authUser?.id) {
      clear()
      return
    }
    if (!options?.force && hydratedUserId.value === authUser.id) return

    const existing = badgeRefreshByApp.get(nuxtApp)
    if (existing?.userId === authUser.id) return await existing.promise

    const request = (async () => {
      const force = options?.force === true
      const hasNotificationCount = isCount(authUser.notificationUndeliveredCount)
      const hasUnreadCommentCount = isCount(authUser.notificationUnreadCommentCount)
      const hasMessageCounts =
        isCount(authUser.messageUnreadCounts?.primary)
        && isCount(authUser.messageUnreadCounts?.requests)
      const hasGroupsUnread =
        isCount(authUser.groupsUnread?.total)
        && authUser.groupsUnread?.byGroupId != null
      const hasCrewInviteCount = isCount(authUser.crewInviteInboxCount)

      if (!force && hasNotificationCount) {
        setNotificationUndeliveredCount(authUser.notificationUndeliveredCount!)
      }
      if (!force && hasUnreadCommentCount) {
        setNotificationUnreadCommentCount(authUser.notificationUnreadCommentCount!)
      }
      if (!force && hasMessageCounts) {
        setMessageUnreadCounts(authUser.messageUnreadCounts!)
      }
      if (!force && hasGroupsUnread) {
        setGroupsUnread(authUser.groupsUnread!)
      }
      if (!force && hasCrewInviteCount) {
        crewInvites.setCount(authUser.crewInviteInboxCount!)
      }

      const fallbacks: Promise<unknown>[] = []
      if (force || !hasNotificationCount || !hasUnreadCommentCount) {
        fallbacks.push(notifications.fetchUndeliveredCount())
      }
      if (force || !hasMessageCounts) fallbacks.push(messages.fetchUnreadCounts())
      if (force || !hasGroupsUnread) fallbacks.push(groups.refresh())
      if (force || !hasCrewInviteCount) fallbacks.push(crewInvites.refresh())
      await Promise.allSettled(fallbacks)

      if (user.value?.id === authUser.id) {
        hydratedUserId.value = authUser.id
        hydratedAt.value = Date.now()
      }
    })().finally(() => {
      if (badgeRefreshByApp.get(nuxtApp)?.promise === request) badgeRefreshByApp.delete(nuxtApp)
    })

    badgeRefreshByApp.set(nuxtApp, { userId: authUser.id, promise: request })
    await request
  }

  function refreshIfStale() {
    if (!user.value?.id) return
    if (Date.now() - hydratedAt.value < BADGE_REFRESH_STALE_MS) return
    void refresh({ force: true })
  }

  watch(
    () => user.value?.id ?? null,
    (userId) => {
      if (!userId) clear()
      else void refresh()
    },
    { immediate: true },
  )

  watch(isSocketConnected, (connected) => {
    if (!connected) return
    if (!hasSeenSocketConnection.value) {
      hasSeenSocketConnection.value = true
      return
    }
    refreshIfStale()
  })

  const crewCallback = {
    onInviteReceived: () => { void crewInvites.refresh() },
    onInviteUpdated: () => { void crewInvites.refresh() },
  }

  onMounted(() => {
    addCrewCallback(crewCallback)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })
  onBeforeUnmount(() => {
    removeCrewCallback(crewCallback)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && user.value?.id) {
      refreshIfStale()
    }
  }

  return { refresh }
}
