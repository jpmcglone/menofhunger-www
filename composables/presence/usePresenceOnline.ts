import type { Ref } from 'vue'
import type { Socket } from 'socket.io-client'
import { appConfig } from '~/config/app'
import type {
  GetPresenceStatusesData,
  UserStatus,
  WsPresenceStatusClearedPayload,
  WsPresenceStatusUpdatedPayload,
} from '~/types/api'
import type {
  OnlineFeedCallback,
  PresenceOnlinePayload,
  PresenceOfflinePayload,
  PresenceOnlineFeedSnapshotPayload,
} from './types'

const PRESENCE_STATE_KEY = 'presence-online-ids'
const PRESENCE_IDLE_IDS_KEY = 'presence-idle-ids'
const PRESENCE_ONLINE_FEED_SUBSCRIBED_KEY = 'presence-online-feed-subscribed'
const PRESENCE_INTEREST_KEY = 'presence-interest-refs'
const PRESENCE_KNOWN_IDS_KEY = 'presence-known-ids'
const PRESENCE_USER_CURRENT_SPACE_KEY = 'presence-user-current-space-by-id'
const PRESENCE_STATUS_BY_USER_ID_KEY = 'presence-status-by-user-id'
const PRESENCE_STATUS_FETCHED_AT_KEY = 'presence-status-fetched-at'
const STATUS_FETCH_TTL_MS = 60_000
let statusExpiryTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Who-is-online state: online/idle/known user ids, per-user statuses, current
 * space tracking, interest refcounting, and the online-feed subscription.
 * Owns the `presence:*` socket handlers.
 */
export function usePresenceOnline(socketRef: Ref<Socket | null>) {
  const onlineUserIds = useState<Set<string>>(PRESENCE_STATE_KEY, () => new Set())
  const idleUserIds = useState<Set<string>>(PRESENCE_IDLE_IDS_KEY, () => new Set())
  const interestRefs = useState<Map<string, number>>(PRESENCE_INTEREST_KEY, () => new Map())
  /** User IDs we've received at least one presence update for (subscribed/online/offline). Used to avoid showing "last online" until status is known. */
  const presenceKnownUserIds = useState<Set<string>>(PRESENCE_KNOWN_IDS_KEY, () => new Set())
  /** userId -> current spaceId (null if not in a space). Updated via users:spaceChanged. */
  const userCurrentSpaceById = useState<Record<string, string | null>>(PRESENCE_USER_CURRENT_SPACE_KEY, () => ({}))
  const statusByUserId = useState<Record<string, UserStatus>>(PRESENCE_STATUS_BY_USER_ID_KEY, () => ({}))
  const statusFetchedAtByUserId = useState<Record<string, number>>(PRESENCE_STATUS_FETCHED_AT_KEY, () => ({}))
  const onlineFeedCallbacks = useState<Set<OnlineFeedCallback>>('presence-online-feed-callbacks', () => new Set())
  const onlineFeedSubscribed = useState(PRESENCE_ONLINE_FEED_SUBSCRIBED_KEY, () => false)

  const { user } = useAuth()
  const { apiFetchData } = useApiClient()

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

  function isStatusActive(status: UserStatus | null | undefined): status is UserStatus {
    if (!status?.userId || !status.text) return false
    const expiresAtMs = Date.parse(status.expiresAt)
    return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now()
  }

  function applyUserStatus(status: UserStatus | null | undefined) {
    const uid = status?.userId
    if (!uid) return
    const next = { ...statusByUserId.value }
    if (isStatusActive(status)) next[uid] = status
    else delete next[uid]
    statusByUserId.value = next
    statusFetchedAtByUserId.value = {
      ...statusFetchedAtByUserId.value,
      [uid]: Date.now(),
    }
    scheduleStatusExpiryPrune()
  }

  function clearUserStatus(userId: string) {
    const uid = String(userId ?? '').trim()
    if (!uid) return
    const next = { ...statusByUserId.value }
    delete next[uid]
    statusByUserId.value = next
    statusFetchedAtByUserId.value = {
      ...statusFetchedAtByUserId.value,
      [uid]: Date.now(),
    }
    scheduleStatusExpiryPrune()
  }

  function getUserStatus(userId: string): UserStatus | null {
    const uid = String(userId ?? '').trim()
    if (!uid) return null
    const status = statusByUserId.value[uid] ?? null
    if (!isStatusActive(status)) return null
    return status
  }

  function pruneExpiredStatuses() {
    const next = { ...statusByUserId.value }
    let changed = false
    for (const [uid, status] of Object.entries(next)) {
      if (!isStatusActive(status)) {
        delete next[uid]
        changed = true
      }
    }
    if (changed) statusByUserId.value = next
  }

  function scheduleStatusExpiryPrune() {
    if (!import.meta.client) return
    if (statusExpiryTimer) {
      clearTimeout(statusExpiryTimer)
      statusExpiryTimer = null
    }

    const now = Date.now()
    let nextExpiryMs = Number.POSITIVE_INFINITY
    for (const status of Object.values(statusByUserId.value)) {
      const expiresAtMs = Date.parse(status.expiresAt)
      if (Number.isFinite(expiresAtMs) && expiresAtMs > now) {
        nextExpiryMs = Math.min(nextExpiryMs, expiresAtMs)
      }
    }
    if (!Number.isFinite(nextExpiryMs)) return

    statusExpiryTimer = setTimeout(() => {
      statusExpiryTimer = null
      pruneExpiredStatuses()
      scheduleStatusExpiryPrune()
    }, Math.max(0, nextExpiryMs - now + 50))
  }

  function addStatusesFromRest(statuses: Array<UserStatus | null | undefined>) {
    for (const status of statuses) {
      if (status?.userId) applyUserStatus(status)
    }
  }

  async function fetchStatusesForUsers(userIds: string[]) {
    if (!import.meta.client) return
    const now = Date.now()
    const ids = Array.from(new Set((userIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean)))
      .filter((id) => now - (statusFetchedAtByUserId.value[id] ?? 0) > STATUS_FETCH_TTL_MS)
      .slice(0, 100)
    if (ids.length === 0) return
    statusFetchedAtByUserId.value = {
      ...statusFetchedAtByUserId.value,
      ...Object.fromEntries(ids.map((id) => [id, now])),
    }
    try {
      const statuses = await apiFetchData<GetPresenceStatusesData>('/presence/statuses', {
        method: 'GET',
        query: { userIds: ids.join(',') },
        mohCache: false,
      })
      const returnedIds = new Set((statuses ?? []).map((status) => status.userId))
      for (const status of statuses ?? []) applyUserStatus(status)
      for (const id of ids) {
        if (!returnedIds.has(id)) clearUserStatus(id)
      }
    } catch {
      // Status bubbles are contextual; presence itself should not fail if this fetch does.
    }
  }

  async function setMyStatus(text: string): Promise<UserStatus> {
    const cleanText = String(text ?? '').trim()
    const status = await apiFetchData<UserStatus>('/presence/status', {
      method: 'PUT',
      body: { text: cleanText },
    })
    applyUserStatus(status)
    return status
  }

  async function clearMyStatus(): Promise<void> {
    await apiFetchData<{ cleared: true }>('/presence/status', { method: 'DELETE' })
    const id = user.value?.id
    if (id) clearUserStatus(id)
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
      emitSubscribe(toAdd)
      void fetchStatusesForUsers(toAdd)
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
      emitSubscribe([...refs.keys()])
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
