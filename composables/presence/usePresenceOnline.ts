import type { Ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { usePresenceStatuses } from './usePresenceStatuses'
import { appConfig } from '~/config/app'
import type {
  UserStatus,
  WsPresenceStatusClearedPayload,
  WsPresenceStatusUpdatedPayload,
  WsPresencePlatformsChangedPayload,
  WsPresenceCallChangedPayload,
} from '~/types/api'
import type {
  OnlineFeedCallback,
  PresenceOnlinePayload,
  PresenceOfflinePayload,
  PresenceOnlineFeedSnapshotPayload,
  PresenceAnonymousCountPayload,
  PresenceOnlineCountPayload,
} from './types'

const PRESENCE_STATE_KEY = 'presence-online-ids'
const PRESENCE_IDLE_IDS_KEY = 'presence-idle-ids'
const PRESENCE_ONLINE_FEED_SUBSCRIBED_KEY = 'presence-online-feed-subscribed'
const PRESENCE_INTEREST_KEY = 'presence-interest-refs'
const PRESENCE_KNOWN_IDS_KEY = 'presence-known-ids'
const PRESENCE_USER_CURRENT_SPACE_KEY = 'presence-user-current-space-by-id'
const INTEREST_BATCH_MS = 50
const SOCKET_STATUS_FALLBACK_MS = 400
let interestBatchTimer: ReturnType<typeof setTimeout> | null = null
let socketStatusFallbackTimer: ReturnType<typeof setTimeout> | null = null
const pendingInterestIds = new Set<string>()
const socketStatusFallbackAtById = new Map<string, number>()

/** Who-is-online state and `presence:*` socket handlers. */
export function usePresenceOnline(socketRef: Ref<Socket | null>) {
  const onlineUserIds = useState<Set<string>>(PRESENCE_STATE_KEY, () => new Set())
  const idleUserIds = useState<Set<string>>(PRESENCE_IDLE_IDS_KEY, () => new Set())
  const interestRefs = useState<Map<string, number>>(PRESENCE_INTEREST_KEY, () => new Map())
  /** User IDs we've received at least one presence update for (subscribed/online/offline). Used to avoid showing "last online" until status is known. */
  const presenceKnownUserIds = useState<Set<string>>(PRESENCE_KNOWN_IDS_KEY, () => new Set())
  /** userId -> current spaceId (null if not in a space). Updated via users:spaceChanged. */
  const userCurrentSpaceById = useState<Record<string, string | null>>(PRESENCE_USER_CURRENT_SPACE_KEY, () => ({}))
  const onlineFeedCallbacks = useState<Set<OnlineFeedCallback>>('presence-online-feed-callbacks', () => new Set())
  const onlineFeedSubscribed = useState(PRESENCE_ONLINE_FEED_SUBSCRIBED_KEY, () => false)

  const { user } = useAuth()
  const {
    statusByUserId,
    applyUserStatus,
    clearUserStatus,
    getUserStatus,
    addStatusesFromRest,
    fetchStatusesForUsers,
    setMyStatus,
    editMyStatus,
    clearMyStatus,
  } = usePresenceStatuses()

  function isOnline(userId: string): boolean {
    return onlineUserIds.value.has(userId)
  }

  function isUserIdle(userId: string): boolean {
    return idleUserIds.value.has(userId)
  }

  function setUserIdle(userId: string) {
    if (idleUserIds.value.has(userId)) return
    idleUserIds.value = new Set([...idleUserIds.value, userId])
  }

  function setUserActive(userId: string) {
    if (!idleUserIds.value.has(userId)) return
    const next = new Set(idleUserIds.value)
    next.delete(userId)
    idleUserIds.value = next
  }

  function getPresenceStatus(userId: string): 'online' | 'idle' | 'offline' {
    if (isOnline(userId)) return isUserIdle(userId) ? 'idle' : 'online'
    return 'offline'
  }

  function markPresenceKnown(userId: string): void {
    if (!userId) return
    if (presenceKnownUserIds.value.has(userId)) return
    presenceKnownUserIds.value = new Set([...presenceKnownUserIds.value, userId])
  }

  function isPresenceKnown(userId: string): boolean {
    return Boolean(userId && presenceKnownUserIds.value.has(userId))
  }

  function clearCurrentSpaceForUser(userId: string) {
    const uid = String(userId ?? '').trim()
    if (!uid) return
    if (userCurrentSpaceById.value[uid] == null) return
    userCurrentSpaceById.value = {
      ...userCurrentSpaceById.value,
      [uid]: null,
    }
  }

  function applyUserPresence(userId: string, online: boolean, idle: boolean) {
    const next = new Set(onlineUserIds.value)
    const nextIdle = new Set(idleUserIds.value)
    if (online) {
      next.add(userId)
      if (idle) nextIdle.add(userId)
      else nextIdle.delete(userId)
    } else {
      next.delete(userId)
      nextIdle.delete(userId)
    }
    onlineUserIds.value = next
    idleUserIds.value = nextIdle
  }

  // ─── Interest refcounting (presence:subscribe) ──────────────────────

  function emitSubscribe(userIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && userIds.length > 0) {
      socket.emit('presence:subscribe', { userIds })
    }
  }

  function emitUnsubscribe(userIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && userIds.length > 0) {
      socket.emit('presence:unsubscribe', { userIds })
    }
  }

  function armSocketStatusFallback() {
    if (socketStatusFallbackTimer) {
      clearTimeout(socketStatusFallbackTimer)
      socketStatusFallbackTimer = null
    }
    if (socketStatusFallbackAtById.size === 0) return
    const nextFallbackAt = Math.min(...socketStatusFallbackAtById.values())
    socketStatusFallbackTimer = setTimeout(() => {
      socketStatusFallbackTimer = null
      const now = Date.now()
      const unresolved: string[] = []
      for (const [id, fallbackAt] of socketStatusFallbackAtById) {
        if (fallbackAt > now) continue
        unresolved.push(id)
        socketStatusFallbackAtById.delete(id)
      }
      if (unresolved.length > 0) void fetchStatusesForUsers(unresolved)
      armSocketStatusFallback()
    }, Math.max(0, nextFallbackAt - Date.now()))
  }

  function scheduleSocketStatusFallback(userIds: string[]) {
    const fallbackAt = Date.now() + SOCKET_STATUS_FALLBACK_MS
    for (const id of userIds) socketStatusFallbackAtById.set(id, fallbackAt)
    armSocketStatusFallback()
  }

  function queueSubscribe(userIds: string[]) {
    for (const id of userIds) pendingInterestIds.add(id)
    if (interestBatchTimer) return
    interestBatchTimer = setTimeout(() => {
      interestBatchTimer = null
      const ids = [...pendingInterestIds].filter((id) => interestRefs.value.has(id))
      pendingInterestIds.clear()
      if (ids.length === 0) return
      const socket = socketRef.value
      if (!socket?.connected) {
        void fetchStatusesForUsers(ids)
        return
      }
      emitSubscribe(ids)
      scheduleSocketStatusFallback(ids)
    }, INTEREST_BATCH_MS)
  }

  function addInterest(userIds: string[]) {
    if (!import.meta.client) return
    const refs = interestRefs.value
    const toAdd: string[] = []
    for (const uid of userIds) {
      const count = refs.get(uid) ?? 0
      refs.set(uid, count + 1)
      if (count === 0) toAdd.push(uid)
    }
    trimInterestIfNeeded(refs)
    if (toAdd.length > 0) {
      queueSubscribe(toAdd)
    }
  }

  function removeInterest(userIds: string[]) {
    if (!import.meta.client) return
    const refs = interestRefs.value
    const toRemove: string[] = []
    for (const uid of userIds) {
      const count = refs.get(uid) ?? 0
      if (count <= 1) {
        refs.delete(uid)
        pendingInterestIds.delete(uid)
        socketStatusFallbackAtById.delete(uid)
        toRemove.push(uid)
      } else {
        refs.set(uid, count - 1)
      }
    }
    if (toRemove.length > 0) emitUnsubscribe(toRemove)
  }

  function trimInterestIfNeeded(refs: Map<string, number>) {
    if (refs.size <= appConfig.presenceMaxInterest) return
    const entries = [...refs.entries()].sort((a, b) => a[1] - b[1])
    let removed = 0
    for (const [uid] of entries) {
      if (refs.size - removed <= appConfig.presenceMaxInterest) break
      refs.delete(uid)
      removed++
      emitUnsubscribe([uid])
    }
    if (removed > 0) {
      interestRefs.value = new Map(refs)
    }
  }

  // ─── Online feed ────────────────────────────────────────────────────

  function subscribeOnlineFeed() {
    onlineFeedSubscribed.value = true
    const socket = socketRef.value
    if (socket?.connected) {
      socket.emit('presence:subscribeOnlineFeed')
    }
  }

  function unsubscribeOnlineFeed() {
    onlineFeedSubscribed.value = false
    const socket = socketRef.value
    if (socket?.connected) {
      socket.emit('presence:unsubscribeOnlineFeed')
    }
  }

  function addOnlineFeedCallback(cb: OnlineFeedCallback) {
    onlineFeedCallbacks.value.add(cb)
  }

  function removeOnlineFeedCallback(cb: OnlineFeedCallback) {
    onlineFeedCallbacks.value.delete(cb)
  }

  function addOnlineIdsFromRest(userIds: string[]) {
    const next = new Set(onlineUserIds.value)
    for (const id of userIds) {
      if (id) next.add(id)
    }
    onlineUserIds.value = next
  }

  /** Seed idle state from REST /presence/online (users with idle: true). So avatars and online page show clock immediately. */
  function addIdleFromRest(userIds: string[]) {
    if (!userIds.length) return
    const next = new Set(idleUserIds.value)
    for (const id of userIds) {
      if (id) next.add(id)
    }
    idleUserIds.value = next
  }

  /** Clear all presence state (socket disconnect / explicit disconnect). */
  function resetPresenceState() {
    onlineUserIds.value = new Set()
    idleUserIds.value = new Set()
    presenceKnownUserIds.value = new Set()
  }

  /** Show the signed-in user as online immediately (until server presence lands). */
  function markSelfOnline() {
    const me = user.value?.id
    if (me) applyUserPresence(me, true, false)
  }

  /** Re-emit presence interest + online feed subscription after (re)connect. */
  function syncPresenceSubscriptions(socket: Socket) {
    const refs = interestRefs.value
    if (refs.size > 0) {
      const ids = [...refs.keys()]
      socket.emit('presence:subscribe', { userIds: ids })
      scheduleSocketStatusFallback(ids)
    }
    if (onlineFeedSubscribed.value) {
      socket.emit('presence:subscribeOnlineFeed')
    }
  }

  function registerSocketHandlers(socket: Socket) {
    socket.on('presence:subscribed', (data: { users?: Array<{ userId: string; online: boolean; idle?: boolean; spaceId?: string | null; status?: UserStatus | null }> }) => {
      const users = Array.isArray(data?.users) ? data.users : []
      const nextSpaces = { ...userCurrentSpaceById.value }
      let spacesChanged = false
      for (const u of users) {
        const id = u?.userId
        if (!id) continue
        markPresenceKnown(id)
        applyUserPresence(id, u.online, u.idle ?? false)
        if ('status' in u) {
          if (u.status) applyUserStatus(u.status)
          else clearUserStatus(id)
          socketStatusFallbackAtById.delete(id)
        }
        if ('spaceId' in u) {
          nextSpaces[id] = u.spaceId ?? null
          spacesChanged = true
        }
      }
      if (spacesChanged) userCurrentSpaceById.value = nextSpaces
    })

    socket.on('presence:online', (data: PresenceOnlinePayload) => {
      const id = data?.userId
      if (id) {
        markPresenceKnown(id)
        applyUserPresence(id, true, data.idle ?? false)
        if (data.user?.status) applyUserStatus(data.user.status)
      }
      if (onlineFeedSubscribed.value && onlineFeedCallbacks.value.size > 0) {
        for (const cb of onlineFeedCallbacks.value) {
          cb.onOnline?.(data)
        }
      }
    })

    socket.on('presence:onlineFeedSnapshot', (data: PresenceOnlineFeedSnapshotPayload) => {
      const users = Array.isArray(data?.users) ? data.users : []
      for (const u of users) {
        const id = u?.id
        if (id) {
          markPresenceKnown(id)
          applyUserPresence(id, true, u.idle ?? false)
          if (u.status) applyUserStatus(u.status)
        }
      }
      if (onlineFeedSubscribed.value && onlineFeedCallbacks.value.size > 0) {
        for (const cb of onlineFeedCallbacks.value) {
          cb.onSnapshot?.(data)
        }
      }
    })

    socket.on('presence:offline', (data: PresenceOfflinePayload) => {
      const id = data?.userId
      if (id) {
        markPresenceKnown(id)
        applyUserPresence(id, false, false)
        clearCurrentSpaceForUser(id)
      }
      if (onlineFeedSubscribed.value && onlineFeedCallbacks.value.size > 0) {
        for (const cb of onlineFeedCallbacks.value) {
          cb.onOffline?.(data)
        }
      }
    })

    socket.on('presence:platforms-changed', (data: WsPresencePlatformsChangedPayload) => {
      if (!data?.userId || !Array.isArray(data.platforms)) return
      if (onlineFeedSubscribed.value && onlineFeedCallbacks.value.size > 0) {
        for (const cb of onlineFeedCallbacks.value) {
          cb.onPlatformsChanged?.(data)
        }
      }
    })

    socket.on('presence:call-changed', (data: WsPresenceCallChangedPayload) => {
      if (!data?.userId || typeof data.inCall !== 'boolean') return
      if (onlineFeedSubscribed.value && onlineFeedCallbacks.value.size > 0) {
        for (const cb of onlineFeedCallbacks.value) {
          cb.onCallChanged?.(data)
        }
      }
    })

    socket.on('presence:online-count', (data: PresenceOnlineCountPayload) => {
      if (typeof data?.totalOnline !== 'number') return
      if (onlineFeedSubscribed.value && onlineFeedCallbacks.value.size > 0) {
        for (const cb of onlineFeedCallbacks.value) {
          cb.onOnlineCount?.(data)
        }
      }
    })

    socket.on('presence:anonymous-count', (data: PresenceAnonymousCountPayload) => {
      if (typeof data?.anonymousOnline !== 'number') return
      if (onlineFeedSubscribed.value && onlineFeedCallbacks.value.size > 0) {
        for (const cb of onlineFeedCallbacks.value) {
          cb.onAnonymousCount?.(data)
        }
      }
    })

    socket.on('presence:idle', (data: { userId?: string }) => {
      const id = data?.userId
      if (id) {
        markPresenceKnown(id)
        setUserIdle(id)
      }
    })

    socket.on('presence:active', (data: { userId?: string }) => {
      const id = data?.userId
      if (id) {
        markPresenceKnown(id)
        setUserActive(id)
      }
    })

    socket.on('presence:status-updated', (data: WsPresenceStatusUpdatedPayload) => {
      applyUserStatus(data?.status)
    })

    socket.on('presence:status-cleared', (data: WsPresenceStatusClearedPayload) => {
      if (data?.userId) clearUserStatus(data.userId)
    })
  }

  return {
    onlineUserIds,
    idleUserIds,
    userCurrentSpaceById,
    statusByUserId,
    onlineFeedSubscribed,
    isOnline,
    isUserIdle,
    setUserActive,
    getPresenceStatus,
    isPresenceKnown,
    getUserStatus,
    addStatusesFromRest,
    fetchStatusesForUsers,
    setMyStatus,
    editMyStatus,
    clearMyStatus,
    addInterest,
    removeInterest,
    subscribeOnlineFeed,
    unsubscribeOnlineFeed,
    addOnlineFeedCallback,
    removeOnlineFeedCallback,
    addOnlineIdsFromRest,
    addIdleFromRest,
    resetPresenceState,
    markSelfOnline,
    syncPresenceSubscriptions,
    registerSocketHandlers,
  }
}
