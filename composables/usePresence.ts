import { appConfig } from '~/config/app'
import { usePresenceSocketCore, usePresenceSocketRef } from '~/composables/presence/usePresenceSocketCore'
import { usePresenceOnline } from '~/composables/presence/usePresenceOnline'
import { usePresenceBadges } from '~/composables/presence/usePresenceBadges'
import { usePresenceDomains } from '~/composables/presence/usePresenceDomains'
import { usePresenceSubscriptions } from '~/composables/presence/usePresenceSubscriptions'
import { createPresenceEmitters, syncStickyRooms } from '~/composables/presence/createPresenceEmitters'

// All realtime payload/callback types live in composables/presence/types.ts;
// re-export them so the many existing `import type { X } from '~/composables/usePresence'`
// call sites keep working unchanged.
export * from './presence/types'

/**
 * The connect watcher and the activity listeners are app-scoped, not
 * component-scoped: dozens of components call usePresence() and they must all
 * share one socket and one set of DOM listeners. Without this guard every
 * caller registers its own `immediate: true` watcher, which on the first run
 * fires a connect for a socket that is already connecting — that is what
 * produced the "Insufficient resources" WebSocket storm.
 *
 * Stored on globalThis so a Vite HMR of this module cannot start a second
 * detached effectScope (module-scope `let` resets; the old scope does not).
 */
const PRESENCE_LIFECYCLE_FLAG = '__mohPresenceLifecycleStarted'

function claimPresenceLifecycle(): boolean {
  if (!import.meta.client) return false
  const g = globalThis as unknown as Record<string, boolean>
  if (g[PRESENCE_LIFECYCLE_FLAG]) return false
  g[PRESENCE_LIFECYCLE_FLAG] = true
  return true
}

/**
 * Presence over WebSocket — facade over the composables in `composables/presence/`:
 *
 * - `usePresenceSocketCore` — socket lifecycle, connection flags, reconnect banner
 * - `usePresenceOnline` — who-is-online state, statuses, interest refs, online feed
 * - `usePresenceBadges` — notification/message badge counts + sounds
 * - `usePresenceDomains` — per-domain callback registries + event fan-out
 * - `usePresenceSubscriptions` — post/article/group room subscriptions (refcounted)
 * - `createPresenceEmitters` — fire-and-forget emits (radio, spaces, typing, …)
 *
 * Subscribe to specific users or the online feed. Works for authenticated and
 * anonymous viewers.
 */
export function usePresence() {
  const socketRef = usePresenceSocketRef()
  const online = usePresenceOnline(socketRef)
  const badges = usePresenceBadges()
  const domains = usePresenceDomains()
  const subscriptions = usePresenceSubscriptions(socketRef)
  const emitters = createPresenceEmitters(socketRef)

  const core = usePresenceSocketCore({
    registerHandlers: (socket) => {
      online.registerSocketHandlers(socket)
      // Badges before domains so counts are committed before callbacks fire
      // (page callbacks often read the shared count state).
      badges.registerSocketHandlers(socket)
      domains.registerSocketHandlers(socket)
    },
    syncSubscriptions: (socket) => {
      online.syncPresenceSubscriptions(socket)
      subscriptions.syncContentSubscriptions()
      // Process-local rooms (spaces, radio, open chat) die with the old socket.
      syncStickyRooms(emitters)
    },
    onConnected: () => {
      badges.onSocketConnected()
      online.markSelfOnline()
    },
    onDisconnected: () => {
      online.resetPresenceState()
    },
    onTeardown: () => {
      online.onlineFeedSubscribed.value = false
    },
  })

  const { user, didAttempt } = useAuth()
  const route = useRoute()

  if (claimPresenceLifecycle()) {
    // Detached scope: these watchers outlive whichever component happened to
    // call usePresence() first, so the socket survives that component unmounting.
    effectScope(true).run(() => {
      watch(
        () => ({
          attempted: didAttempt.value,
          userId: user.value?.id ?? null,
          path: route.path,
        }),
        (curr) => {
          if (!curr.attempted) return
          // Login is an auth wall, not browsing. A redirect here (or a leftover
          // preview tab) must not count as a guest.
          if (!curr.userId && curr.path === '/login') {
            if (socketRef.value) core.disconnect()
            return
          }
          // connect() compares the live socket's identity itself and replaces
          // the socket only when the identity actually changed.
          core.connect()
        },
        { immediate: true },
      )

      // Activity: send presence:active (fire-and-forget ping), throttled unless clearing idle. Idle is server-driven (3 min no pings).
      let lastActivityPingAt = 0

      function onActivity() {
        const uid = user.value?.id
        const socket = socketRef.value
        if (!uid) return
        if (!socket?.connected) {
          if (socket && !core.isSocketConnecting.value) {
            core.reconnect()
          }
          return
        }
        const now = Date.now()
        const throttleMs = appConfig.presenceActivityThrottleMs ?? 30_000
        const isIdle = online.idleUserIds.value.has(uid)
        const shouldPing = isIdle || now - lastActivityPingAt >= throttleMs
        if (shouldPing) {
          lastActivityPingAt = now
          socket.emit('presence:active')
          if (isIdle) online.setUserActive(uid)
        }
      }

      watch(
        () => user.value?.id ?? null,
        (userId, _prev, onCleanup) => {
          if (!userId) return
          const opts = { passive: true, capture: true }
          document.addEventListener('mousemove', onActivity, opts)
          document.addEventListener('mousedown', onActivity, opts)
          document.addEventListener('keydown', onActivity, opts)
          document.addEventListener('scroll', onActivity, opts)
          document.addEventListener('touchstart', onActivity, opts)

          const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') onActivity()
          }
          document.addEventListener('visibilitychange', onVisibilityChange)

          const stopRoute = watch(
            () => route.path,
            () => onActivity(),
          )

          onCleanup(() => {
            document.removeEventListener('mousemove', onActivity, opts)
            document.removeEventListener('mousedown', onActivity, opts)
            document.removeEventListener('keydown', onActivity, opts)
            document.removeEventListener('scroll', onActivity, opts)
            document.removeEventListener('touchstart', onActivity, opts)
            document.removeEventListener('visibilitychange', onVisibilityChange)
            stopRoute()
          })
        },
        { immediate: true },
      )
    })
  }

  return {
    onlineUserIds: readonly(online.onlineUserIds),
    isOnline: online.isOnline,
    getPresenceStatus: online.getPresenceStatus,
    isPresenceKnown: online.isPresenceKnown,
    getUserStatus: online.getUserStatus,
    statusByUserId: readonly(online.statusByUserId),
    addStatusesFromRest: online.addStatusesFromRest,
    fetchStatusesForUsers: online.fetchStatusesForUsers,
    setMyStatus: online.setMyStatus,
    editMyStatus: online.editMyStatus,
    clearMyStatus: online.clearMyStatus,
    userCurrentSpaceById: readonly(online.userCurrentSpaceById),
    getCurrentSpaceForUser(userId: string): string | null {
      return userId ? (online.userCurrentSpaceById.value[userId] ?? null) : null
    },
    /** Seed current space for users (e.g. from spaces:members so UI is correct before any users:spaceChanged). */
    setCurrentSpaceForUsers(userIds: string[], spaceId: string | null) {
      if (!userIds.length) return
      const next = { ...online.userCurrentSpaceById.value }
      for (const uid of userIds) {
        if (uid) next[uid] = spaceId
      }
      online.userCurrentSpaceById.value = next
    },
    isSocketConnected: readonly(core.isSocketConnected),
    isSocketConnecting: readonly(core.isSocketConnecting),
    disconnectedDueToIdle: readonly(core.disconnectedDueToIdle),
    wasSocketConnectedOnce: readonly(core.wasSocketConnectedOnce),
    socketDisconnectedWhileVisible: readonly(core.socketDisconnectedWhileVisible),
    connectionBarJustConnected: readonly(core.connectionBarJustConnected),
    notificationUndeliveredCount: readonly(badges.notificationUndeliveredCount),
    notificationUnreadCommentCount: readonly(badges.notificationUnreadCommentCount),
    messageUnreadCounts: readonly(badges.messageUnreadCounts),
    groupsUnread: readonly(badges.groupsUnread),
    suppressMessageUnreadBumpsForMs: badges.suppressMessageUnreadBumpsForMs,
    setNotificationUndeliveredCount: badges.setNotificationUndeliveredCount,
    setNotificationUnreadCommentCount: badges.setNotificationUnreadCommentCount,
    setMessageUnreadCounts: badges.setMessageUnreadCounts,
    setGroupsUnread: badges.setGroupsUnread,
    reconnect: core.reconnect,
    addInterest: online.addInterest,
    removeInterest: online.removeInterest,
    addOnlineIdsFromRest: online.addOnlineIdsFromRest,
    addIdleFromRest: online.addIdleFromRest,
    whenSocketConnected: core.whenSocketConnected,
    subscribeOnlineFeed: online.subscribeOnlineFeed,
    unsubscribeOnlineFeed: online.unsubscribeOnlineFeed,
    addOnlineFeedCallback: online.addOnlineFeedCallback,
    removeOnlineFeedCallback: online.removeOnlineFeedCallback,
    addMessagesCallback: domains.messages.add,
    removeMessagesCallback: domains.messages.remove,
    addRadioCallback: domains.radio.add,
    removeRadioCallback: domains.radio.remove,
    addSpacesCallback: domains.spaces.add,
    removeSpacesCallback: domains.spaces.remove,
    addNotificationsCallback: domains.notifications.add,
    removeNotificationsCallback: domains.notifications.remove,
    addAccountsCallback: domains.accounts.add,
    removeAccountsCallback: domains.accounts.remove,
    addFollowsCallback: domains.follows.add,
    removeFollowsCallback: domains.follows.remove,
    addPostsCallback: domains.posts.add,
    removePostsCallback: domains.posts.remove,
    subscribePosts: subscriptions.subscribePosts,
    unsubscribePosts: subscriptions.unsubscribePosts,
    addArticlesCallback: domains.articles.add,
    removeArticlesCallback: domains.articles.remove,
    subscribeArticles: subscriptions.subscribeArticles,
    unsubscribeArticles: subscriptions.unsubscribeArticles,
    addAdminCallback: domains.admin.add,
    removeAdminCallback: domains.admin.remove,
    addUsersCallback: domains.users.add,
    removeUsersCallback: domains.users.remove,
    addCrewCallback: domains.crew.add,
    removeCrewCallback: domains.crew.remove,
    addGroupInviteCallback: domains.groupInvites.add,
    removeGroupInviteCallback: domains.groupInvites.remove,
    addGroupFeedCallback: domains.groupFeeds.add,
    removeGroupFeedCallback: domains.groupFeeds.remove,
    subscribeGroups: subscriptions.subscribeGroups,
    unsubscribeGroups: subscriptions.unsubscribeGroups,
    addCheckinsCallback: domains.checkins.add,
    removeCheckinsCallback: domains.checkins.remove,
    addMarvCallback: domains.marv.add,
    removeMarvCallback: domains.marv.remove,
    addReferralCallback: domains.referrals.add,
    removeReferralCallback: domains.referrals.remove,
    addScheduledCallback: domains.scheduled.add,
    removeScheduledCallback: domains.scheduled.remove,
    addDailyContentCallback: domains.dailyContent.add,
    removeDailyContentCallback: domains.dailyContent.remove,
    ...emitters,
    connect: core.connect,
    disconnect: core.disconnect,
    emitLogout: core.emitLogout,
  }
}
