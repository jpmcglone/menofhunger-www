import { io, type Socket } from 'socket.io-client'
import { appConfig } from '~/config/app'
import type { FollowListUser } from '~/types/api'

const PRESENCE_STATE_KEY = 'presence-online-ids'
const PRESENCE_IDLE_IDS_KEY = 'presence-idle-ids'
const PRESENCE_SOCKET_KEY = 'presence-socket'
const PRESENCE_ONLINE_FEED_SUBSCRIBED_KEY = 'presence-online-feed-subscribed'
const PRESENCE_INTEREST_KEY = 'presence-interest-refs'
const PRESENCE_DISCONNECTED_DUE_TO_IDLE_KEY = 'presence-disconnected-due-to-idle'
const NOTIFICATIONS_UNDELIVERED_COUNT_KEY = 'notifications-undelivered-count'
const NOTIFICATION_SOUND_PATH = '/sounds/notification.mp3'

export type PresenceOnlinePayload = { userId: string; user?: FollowListUser; lastConnectAt?: number; idle?: boolean }
export type PresenceOfflinePayload = { userId: string }
export type PresenceOnlineFeedSnapshotPayload = { users: Array<FollowListUser & { lastConnectAt?: number; idle?: boolean }>; totalOnline?: number }
export type OnlineFeedCallback = {
  onOnline?: (payload: PresenceOnlinePayload) => void
  onOffline?: (payload: PresenceOfflinePayload) => void
  onSnapshot?: (payload: PresenceOnlineFeedSnapshotPayload) => void
}

function apiBaseUrlToWsUrl(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl.replace(/\/+$/, '').trim()
  if (trimmed.startsWith('https://')) return `wss://${trimmed.slice(8)}`
  if (trimmed.startsWith('http://')) return `ws://${trimmed.slice(7)}`
  return trimmed
}

/**
 * Presence over WebSocket. Subscribe to specific users or the online feed.
 * Call from layout when authenticated.
 */
export function usePresence() {
  const onlineUserIds = useState<string[]>(PRESENCE_STATE_KEY, () => [])
  const idleUserIds = useState<Set<string>>(PRESENCE_IDLE_IDS_KEY, () => new Set())
  const socketRef = useState<Socket | null>(PRESENCE_SOCKET_KEY, () => null)
  const interestRefs = useState<Map<string, number>>(PRESENCE_INTEREST_KEY, () => new Map())
  const onlineFeedCallbacks = useState<Set<OnlineFeedCallback>>('presence-online-feed-callbacks', () => new Set())
  const onlineFeedSubscribed = useState(PRESENCE_ONLINE_FEED_SUBSCRIBED_KEY, () => false)
  const disconnectedDueToIdle = useState<boolean>(PRESENCE_DISCONNECTED_DUE_TO_IDLE_KEY, () => false)
  const notificationUndeliveredCount = useState<number>(NOTIFICATIONS_UNDELIVERED_COUNT_KEY, () => 0)
  /** Previous undelivered count so we only play in-app sound when count increases (not on load or mark-read). */
  const previousNotificationCountRef = ref<number | null>(null)
  const isSocketConnected = ref(false)
  const isSocketConnecting = ref(false)
  /** Brief "just reconnected" state for connection bar green flash before hide. */
  const connectionBarJustConnected = ref(false)
  let connectionBarJustConnectedTimer: ReturnType<typeof setTimeout> | null = null

  function isOnline(userId: string): boolean {
    return onlineUserIds.value.includes(userId)
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

  const { user } = useAuth()
  const route = useRoute()
  const { apiBaseUrl } = useApiClient()

  function emitSubscribe(userIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && userIds.length > 0) {
      console.log('[presence] SUBSCRIBE_OUT', { userIds, socketId: socket.id })
      socket.emit('presence:subscribe', { userIds })
    }
  }

  function emitUnsubscribe(userIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && userIds.length > 0) {
      console.log('[presence] UNSUBSCRIBE_OUT', { userIds, socketId: socket.id })
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
    if (toAdd.length > 0) emitSubscribe(toAdd)
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
    for (const [uid, count] of entries) {
      if (refs.size - removed <= appConfig.presenceMaxInterest) break
      refs.delete(uid)
      removed++
      emitUnsubscribe([uid])
    }
    if (removed > 0) {
      interestRefs.value = new Map(refs)
    }
  }

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
    const next = [...onlineUserIds.value]
    for (const id of userIds) {
      if (id && !next.includes(id)) next.push(id)
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

  /** Resolve when socket is connected, or after timeout. Returns true if connected, false if timed out. */
  function whenSocketConnected(timeoutMs = 10000): Promise<boolean> {
    const socket = socketRef.value
    if (socket?.connected) return Promise.resolve(true)
    if (!socket) return Promise.resolve(false)
    return new Promise((resolve) => {
      const done = (connected: boolean) => {
        clearTimeout(timer)
        socket.off('connect', onConnect)
        resolve(connected)
      }
      const onConnect = () => done(true)
      socket.once('connect', onConnect)
      const timer = setTimeout(() => done(false), timeoutMs)
    })
  }

  function connect() {
    if (!import.meta.client) return
    if (!user.value?.id || !apiBaseUrl) return
    if (socketRef.value?.connected) return
    // Don't replace a socket that's still connecting (avoids "closed before connection" when multiple components mount).
    if (socketRef.value && !socketRef.value.connected) return

    isSocketConnecting.value = true
    const wsUrl = apiBaseUrlToWsUrl(apiBaseUrl)
    const socket = io(wsUrl, {
      path: '/socket.io',
      withCredentials: true,
      query: { client: 'web' },
      transports: ['websocket', 'polling'],
      // Auto-reconnect on network/server drops (best practice)
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    function applyUserPresence(userId: string, online: boolean, idle: boolean) {
      const next = [...onlineUserIds.value]
      const nextIdle = new Set(idleUserIds.value)
      if (online) {
        if (!next.includes(userId)) next.push(userId)
        if (idle) nextIdle.add(userId)
        else nextIdle.delete(userId)
      } else {
        const i = next.indexOf(userId)
        if (i >= 0) next.splice(i, 1)
        nextIdle.delete(userId)
      }
      onlineUserIds.value = next
      idleUserIds.value = nextIdle
    }

    socket.on('presence:subscribed', (data: { users?: Array<{ userId: string; online: boolean; idle?: boolean }> }) => {
      console.log('[presence] SUBSCRIBED_IN', data)
      const users = Array.isArray(data?.users) ? data.users : []
      for (const u of users) {
        const id = u?.userId
        if (!id) continue
        applyUserPresence(id, u.online, u.idle ?? false)
      }
    })

    socket.on('presence:online', (data: PresenceOnlinePayload) => {
      console.log('[presence] ONLINE_IN', { userId: data?.userId, onlineFeedSubscribed: onlineFeedSubscribed.value, callbacksCount: onlineFeedCallbacks.value.size })
      const id = data?.userId
      if (id) {
        applyUserPresence(id, true, data.idle ?? false)
      }
      if (onlineFeedSubscribed.value && onlineFeedCallbacks.value.size > 0) {
        for (const cb of onlineFeedCallbacks.value) {
          cb.onOnline?.(data)
        }
      }
    })

    socket.on('presence:onlineFeedSnapshot', (data: PresenceOnlineFeedSnapshotPayload) => {
      console.log('[presence] ONLINE_FEED_SNAPSHOT_IN', { usersCount: data?.users?.length, totalOnline: data?.totalOnline })
      const users = Array.isArray(data?.users) ? data.users : []
      for (const u of users) {
        const id = u?.id
        if (id) applyUserPresence(id, true, u.idle ?? false)
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
        applyUserPresence(id, false, false)
      }
      if (onlineFeedSubscribed.value && onlineFeedCallbacks.value.size > 0) {
        for (const cb of onlineFeedCallbacks.value) {
          cb.onOffline?.(data)
        }
      }
    })

    socket.on('presence:idle', (data: { userId?: string }) => {
      const id = data?.userId
      if (id) setUserIdle(id)
    })

    socket.on('presence:active', (data: { userId?: string }) => {
      const id = data?.userId
      if (id) setUserActive(id)
    })

    socket.on('presence:idleDisconnected', () => {
      disconnectedDueToIdle.value = true
    })

    socket.on('notifications:updated', (data: { undeliveredCount?: number }) => {
      const raw = typeof data?.undeliveredCount === 'number' ? data.undeliveredCount : 0
      const newCount = Math.max(0, Math.floor(raw))
      const prev = previousNotificationCountRef.value ?? 0
      notificationUndeliveredCount.value = newCount
      if (newCount > prev && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          const audio = new Audio(NOTIFICATION_SOUND_PATH)
          void audio.play().catch(() => {})
        } catch {
          // no-op if sound missing or play fails
        }
      }
      previousNotificationCountRef.value = newCount
    })

    function syncSubscriptions() {
      const refs = interestRefs.value
      console.log('[presence] syncSubscriptions', { interests: refs.size, onlineFeedSubscribed: onlineFeedSubscribed.value, socketId: socket.id })
      if (refs.size > 0) {
        emitSubscribe([...refs.keys()])
      }
      if (onlineFeedSubscribed.value) {
        socket.emit('presence:subscribeOnlineFeed')
      }
    }
    socket.on('connect', () => {
      console.log('[presence] socket CONNECTED', socket.id)
      isSocketConnected.value = true
      isSocketConnecting.value = false
      if (disconnectedDueToIdle.value) {
        disconnectedDueToIdle.value = false
        connectionBarJustConnected.value = true
        if (connectionBarJustConnectedTimer) clearTimeout(connectionBarJustConnectedTimer)
        connectionBarJustConnectedTimer = setTimeout(() => {
          connectionBarJustConnected.value = false
          connectionBarJustConnectedTimer = null
        }, 1500)
      }
      syncSubscriptions()
    })
    socket.on('disconnect', (reason) => {
      console.log('[presence] socket DISCONNECTED', reason)
      isSocketConnected.value = false
      isSocketConnecting.value = false
    })
    if (socket.connected) {
      isSocketConnected.value = true
      isSocketConnecting.value = false
      syncSubscriptions()
    }

    socketRef.value = socket
  }

  function emitLogout() {
    const socket = socketRef.value
    if (socket?.connected) {
      socket.emit('presence:logout')
    }
  }

  function disconnect() {
    const socket = socketRef.value
    if (socket) {
      socket.disconnect()
      socketRef.value = null
    }
    isSocketConnecting.value = false
    disconnectedDueToIdle.value = false
    connectionBarJustConnected.value = false
    if (connectionBarJustConnectedTimer) {
      clearTimeout(connectionBarJustConnectedTimer)
      connectionBarJustConnectedTimer = null
    }
    onlineUserIds.value = []
    idleUserIds.value = new Set()
    onlineFeedSubscribed.value = false
  }

  /** Reconnect presence socket (e.g. after being disconnected due to idle). */
  function reconnect() {
    const socket = socketRef.value
    if (socket && !socket.connected) {
      isSocketConnecting.value = true
      socket.connect()
    }
  }

  if (import.meta.client) {
    watch(
      () => user.value?.id ?? null,
      (userId) => {
        if (userId) connect()
        else disconnect()
      },
      { immediate: true },
    )

    // Unlock audio on first user interaction so the first notification sound can play (browsers block play() until then).
    let audioUnlocked = false
    let unlockListenersAdded = false
    function unlockNotificationAudio() {
      if (audioUnlocked) return
      audioUnlocked = true
      try {
        const a = new Audio(NOTIFICATION_SOUND_PATH)
        a.volume = 0
        void a.play().then(() => a.pause()).catch(() => {})
      } catch {
        // ignore
      }
    }
    watch(
      () => user.value?.id ?? null,
      (userId) => {
        if (!userId || unlockListenersAdded) return
        unlockListenersAdded = true
        document.addEventListener('click', unlockNotificationAudio, { once: true, passive: true })
        document.addEventListener('keydown', unlockNotificationAudio, { once: true, passive: true })
        document.addEventListener('touchstart', unlockNotificationAudio, { once: true, passive: true })
      },
      { immediate: true },
    )

    // Activity: send presence:active (fire-and-forget ping), throttled unless clearing idle. Idle is server-driven (3 min no pings).
    let lastActivityPingAt = 0

    function onActivity() {
      const uid = user.value?.id
      const socket = socketRef.value
      if (!uid || !socket?.connected) return
      const now = Date.now()
      const throttleMs = appConfig.presenceActivityThrottleMs ?? 30_000
      const isIdle = idleUserIds.value.has(uid)
      const shouldPing = isIdle || now - lastActivityPingAt >= throttleMs
      if (shouldPing) {
        lastActivityPingAt = now
        socket.emit('presence:active')
        if (isIdle) setUserActive(uid)
      }
    }

    watch(
      () => [isSocketConnected.value, user.value?.id ?? null] as const,
      ([connected, userId]) => {
        if (!connected || !userId) return
        const opts = { passive: true, capture: true }
        document.addEventListener('mousemove', onActivity, opts)
        document.addEventListener('mousedown', onActivity, opts)
        document.addEventListener('keydown', onActivity, opts)
        document.addEventListener('scroll', onActivity, opts)
        document.addEventListener('touchstart', onActivity, opts)

        const stopRoute = watch(
          () => route.path,
          () => onActivity(),
          { flush: 'sync' },
        )

        return () => {
          document.removeEventListener('mousemove', onActivity, opts)
          document.removeEventListener('mousedown', onActivity, opts)
          document.removeEventListener('keydown', onActivity, opts)
          document.removeEventListener('scroll', onActivity, opts)
          document.removeEventListener('touchstart', onActivity, opts)
          stopRoute()
        }
      },
      { immediate: true },
    )
  }

  return {
    onlineUserIds: readonly(onlineUserIds),
    isOnline,
    getPresenceStatus,
    isSocketConnected: readonly(isSocketConnected),
    isSocketConnecting: readonly(isSocketConnecting),
    disconnectedDueToIdle: readonly(disconnectedDueToIdle),
    connectionBarJustConnected: readonly(connectionBarJustConnected),
    notificationUndeliveredCount: readonly(notificationUndeliveredCount),
    setNotificationUndeliveredCount(count: number) {
      const c = Math.max(0, Math.floor(Number(count)) || 0)
      notificationUndeliveredCount.value = c
    },
    reconnect,
    addInterest,
    removeInterest,
    addOnlineIdsFromRest,
    addIdleFromRest,
    whenSocketConnected,
    subscribeOnlineFeed,
    unsubscribeOnlineFeed,
    addOnlineFeedCallback,
    removeOnlineFeedCallback,
    connect,
    disconnect,
    emitLogout,
  }
}
