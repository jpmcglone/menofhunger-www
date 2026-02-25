import { io, type Socket } from 'socket.io-client'
import { appConfig } from '~/config/app'
import type {
  FollowListUser,
  RadioChatMessage,
  RadioChatSnapshot,
  RadioLobbyCounts,
  RadioListener,
  SpaceChatSender,
  SpaceChatMessage,
  SpaceChatSnapshot,
  SpaceLobbyCounts,
  SpaceMember,
  SpaceReactionEvent,
  WsAdminUpdatedPayload,
  WsFollowsChangedPayload,
  WsNotificationsDeletedPayload,
  WsNotificationsNewPayload,
  WsPostsLiveUpdatedPayload,
  WsPostsInteractionPayload,
  WsUsersMeUpdatedPayload,
  WsUsersSelfUpdatedPayload,
  WsUsersSpaceChangedPayload,
} from '~/types/api'
import { useUsersStore } from '~/composables/useUsersStore'

const PRESENCE_STATE_KEY = 'presence-online-ids'
const PRESENCE_IDLE_IDS_KEY = 'presence-idle-ids'
const PRESENCE_SOCKET_KEY = 'presence-socket'
const PRESENCE_ONLINE_FEED_SUBSCRIBED_KEY = 'presence-online-feed-subscribed'
const PRESENCE_INTEREST_KEY = 'presence-interest-refs'
const PRESENCE_KNOWN_IDS_KEY = 'presence-known-ids'
const PRESENCE_USER_CURRENT_SPACE_KEY = 'presence-user-current-space-by-id'
const PRESENCE_DISCONNECTED_DUE_TO_IDLE_KEY = 'presence-disconnected-due-to-idle'
const PRESENCE_SOCKET_CONNECTED_KEY = 'presence-socket-connected'
const PRESENCE_SOCKET_CONNECTING_KEY = 'presence-socket-connecting'
const NOTIFICATIONS_UNDELIVERED_COUNT_KEY = 'notifications-undelivered-count'
const MESSAGES_UNREAD_COUNTS_KEY = 'messages-unread-counts'
const NOTIFICATION_SOUND_PATH = '/sounds/notification.mp3'
const MESSAGE_SOUND_PATH = '/sounds/new-message.mp3'
/** Min ms between plays so we don't ding repeatedly (e.g. multiple sockets on mobile or burst of events). */
const NOTIFICATION_SOUND_COOLDOWN_MS = 3000
const MESSAGE_SOUND_COOLDOWN_MS = 1800

export type PresenceOnlinePayload = { userId: string; user?: FollowListUser; lastConnectAt?: number; idle?: boolean }
export type PresenceOfflinePayload = { userId: string }
export type PresenceOnlineFeedSnapshotPayload = { users: Array<FollowListUser & { lastConnectAt?: number; idle?: boolean }>; totalOnline?: number }
export type OnlineFeedCallback = {
  onOnline?: (payload: PresenceOnlinePayload) => void
  onOffline?: (payload: PresenceOfflinePayload) => void
  onSnapshot?: (payload: PresenceOnlineFeedSnapshotPayload) => void
}

export type RadioListenersPayload = { stationId: string; listeners: RadioListener[] }
export type RadioLobbyCountsPayload = RadioLobbyCounts
export type RadioChatSnapshotPayload = RadioChatSnapshot
export type RadioChatMessagePayload = { stationId: string; message: RadioChatMessage }
export type RadioCallback = {
  onListeners?: (payload: RadioListenersPayload) => void
  onLobbyCounts?: (payload: RadioLobbyCountsPayload) => void
  onChatSnapshot?: (payload: RadioChatSnapshotPayload) => void
  onChatMessage?: (payload: RadioChatMessagePayload) => void
  /** Called when this tab's radio was closed because the user started playing in another tab. */
  onReplaced?: () => void
}

export type SpacesMembersPayload = { spaceId: string; members: SpaceMember[] }
export type SpacesLobbyCountsPayload = SpaceLobbyCounts
export type SpacesChatSnapshotPayload = SpaceChatSnapshot
export type SpacesChatMessagePayload = { spaceId: string; message: SpaceChatMessage }
export type SpacesTypingPayload = { spaceId: string; sender: SpaceChatSender; typing?: boolean }
export type SpacesReactionPayload = SpaceReactionEvent
export type SpacesCallback = {
  onMembers?: (payload: SpacesMembersPayload) => void
  onLobbyCounts?: (payload: SpacesLobbyCountsPayload) => void
  onChatSnapshot?: (payload: SpacesChatSnapshotPayload) => void
  onChatMessage?: (payload: SpacesChatMessagePayload) => void
  onTyping?: (payload: SpacesTypingPayload) => void
  onReaction?: (payload: SpacesReactionPayload) => void
}

export type MessagesCallback = {
  onMessage?: (payload: { conversationId?: string; message?: unknown }) => void
  onTyping?: (payload: { conversationId?: string; userId?: string; typing?: boolean }) => void
  onRead?: (payload: { conversationId?: string; userId?: string; lastReadAt?: string }) => void
}

export type WsNotificationsUpdatedPayload = { undeliveredCount?: number }

export type NotificationsCallback = {
  /**
   * Fired when badge/undelivered count changes (e.g. new notification, mark delivered/read/ignored).
   * Useful to refresh the notifications feed while user is on-screen.
   */
  onUpdated?: (payload: WsNotificationsUpdatedPayload) => void
  onNew?: (payload: WsNotificationsNewPayload) => void
  onDeleted?: (payload: WsNotificationsDeletedPayload) => void
}

export type FollowsCallback = {
  onChanged?: (payload: WsFollowsChangedPayload) => void
}

export type PostsCallback = {
  onInteraction?: (payload: WsPostsInteractionPayload) => void
  onLiveUpdated?: (payload: WsPostsLiveUpdatedPayload) => void
}

export type AdminCallback = {
  onUpdated?: (payload: WsAdminUpdatedPayload) => void
}

export type UsersCallback = {
  onSelfUpdated?: (payload: WsUsersSelfUpdatedPayload) => void
  onMeUpdated?: (payload: WsUsersMeUpdatedPayload) => void
  onSpaceChanged?: (payload: WsUsersSpaceChangedPayload) => void
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v && typeof v === 'object')
}

function getSenderIdFromMessageNewPayload(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const message = payload.message
  if (!isRecord(message)) return null
  const sender = message.sender
  if (!isRecord(sender)) return null
  const id = sender.id
  return typeof id === 'string' ? id : null
}

function pickPublicUserEntity(u: unknown): import('~/composables/useUsersStore').PublicUserEntity | null {
  if (!isRecord(u)) return null
  const id = typeof u.id === 'string' ? u.id : null
  if (!id) return null
  return {
    id,
    username: typeof u.username === 'string' ? u.username : null,
    name: typeof u.name === 'string' ? u.name : null,
    bio: typeof u.bio === 'string' ? u.bio : null,
    premium: typeof u.premium === 'boolean' ? u.premium : undefined,
    premiumPlus: typeof u.premiumPlus === 'boolean' ? u.premiumPlus : undefined,
    verifiedStatus: typeof u.verifiedStatus === 'string' ? u.verifiedStatus : undefined,
    avatarUrl: typeof u.avatarUrl === 'string' ? u.avatarUrl : null,
    bannerUrl: typeof u.bannerUrl === 'string' ? u.bannerUrl : null,
    pinnedPostId: typeof u.pinnedPostId === 'string' ? u.pinnedPostId : null,
    lastOnlineAt: typeof u.lastOnlineAt === 'string' ? u.lastOnlineAt : null,
  }
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
  const usersStore = useUsersStore()
  const onlineUserIds = useState<Set<string>>(PRESENCE_STATE_KEY, () => new Set())
  const idleUserIds = useState<Set<string>>(PRESENCE_IDLE_IDS_KEY, () => new Set())
  const socketRef = useState<Socket | null>(PRESENCE_SOCKET_KEY, () => null)
  const interestRefs = useState<Map<string, number>>(PRESENCE_INTEREST_KEY, () => new Map())
  /** User IDs we've received at least one presence update for (subscribed/online/offline). Used to avoid showing "last online" until status is known. */
  const presenceKnownUserIds = useState<Set<string>>(PRESENCE_KNOWN_IDS_KEY, () => new Set())
  /** userId -> current spaceId (null if not in a space). Updated via users:spaceChanged. */
  const userCurrentSpaceById = useState<Record<string, string | null>>(PRESENCE_USER_CURRENT_SPACE_KEY, () => ({}))
  const onlineFeedCallbacks = useState<Set<OnlineFeedCallback>>('presence-online-feed-callbacks', () => new Set())
  const messagesCallbacks = useState<Set<MessagesCallback>>('presence-messages-callbacks', () => new Set())
  const radioCallbacks = useState<Set<RadioCallback>>('presence-radio-callbacks', () => new Set())
  const spacesCallbacks = useState<Set<SpacesCallback>>('presence-spaces-callbacks', () => new Set())
  const notificationsCallbacks = useState<Set<NotificationsCallback>>('presence-notifications-callbacks', () => new Set())
  const followsCallbacks = useState<Set<FollowsCallback>>('presence-follows-callbacks', () => new Set())
  const postsCallbacks = useState<Set<PostsCallback>>('presence-posts-callbacks', () => new Set())
  const adminCallbacks = useState<Set<AdminCallback>>('presence-admin-callbacks', () => new Set())
  const usersCallbacks = useState<Set<UsersCallback>>('presence-users-callbacks', () => new Set())
  const onlineFeedSubscribed = useState(PRESENCE_ONLINE_FEED_SUBSCRIBED_KEY, () => false)
  const disconnectedDueToIdle = useState<boolean>(PRESENCE_DISCONNECTED_DUE_TO_IDLE_KEY, () => false)
  const notificationUndeliveredCount = useState<number>(NOTIFICATIONS_UNDELIVERED_COUNT_KEY, () => 0)
  const messageUnreadCounts = useState<{ primary: number; requests: number }>(MESSAGES_UNREAD_COUNTS_KEY, () => ({
    primary: 0,
    requests: 0,
  }))
  // When the viewer is actively reading a chat, the server may briefly bump unread counts
  // before the client's mark-read request is processed. Suppress those transient increases.
  const suppressMessageUnreadBumpsUntilMs = useState<number>('presence-messages-unread-suppress-until', () => 0)
  /** Previous undelivered count so we only play in-app sound when count increases (not on load or mark-read). */
  const previousNotificationCountRef = ref<number | null>(null)
  /** Suppress sounds during initial sync after (re)connect. */
  let suppressSoundsUntilMs = 0
  const isSocketConnected = useState(PRESENCE_SOCKET_CONNECTED_KEY, () => false)
  const isSocketConnecting = useState(PRESENCE_SOCKET_CONNECTING_KEY, () => false)
  /** Brief "just reconnected" state for connection bar green flash before hide. */
  const connectionBarJustConnected = ref(false)
  let connectionBarJustConnectedTimer: ReturnType<typeof setTimeout> | null = null
  /** True after first successful connect; used to show "disconnected" banner only after a real disconnect (not on initial load). */
  const wasSocketConnectedOnce = useState<boolean>('presence-was-socket-connected-once', () => false)
  /**
   * True when the most recent socket disconnect happened while the page was visible.
   * Only in that case does the user need a "Reconnecting…" banner — if the drop happened
   * in the background (tab hidden / app backgrounded) we reconnect silently.
   */
  const socketDisconnectedWhileVisible = useState<boolean>('presence-socket-disconnected-while-visible', () => false)
  /** True between emitLogout() and the resulting disconnect; prevents auto-reconnect after explicit logout. */
  let pendingLogout = false
  let serverDisconnectReconnectTimer: ReturnType<typeof setTimeout> | null = null

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

  const { user } = useAuth()
  const route = useRoute()
  const { apiBaseUrl } = useApiClient()
  const sfx = useSfx()

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

  function emitPostsSubscribe(postIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && postIds.length > 0) {
      socket.emit('posts:subscribe', { postIds })
    }
  }

  function emitPostsUnsubscribe(postIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && postIds.length > 0) {
      socket.emit('posts:unsubscribe', { postIds })
    }
  }

  function subscribePosts(postIds: string[]) {
    if (!import.meta.client) return
    const cleaned = (postIds ?? []).map((s) => String(s ?? '').trim()).filter(Boolean)
    if (cleaned.length === 0) return
    emitPostsSubscribe(cleaned)
  }

  function unsubscribePosts(postIds: string[]) {
    if (!import.meta.client) return
    const cleaned = (postIds ?? []).map((s) => String(s ?? '').trim()).filter(Boolean)
    if (cleaned.length === 0) return
    emitPostsUnsubscribe(cleaned)
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

  function addMessagesCallback(cb: MessagesCallback) {
    messagesCallbacks.value.add(cb)
  }

  function removeMessagesCallback(cb: MessagesCallback) {
    messagesCallbacks.value.delete(cb)
  }

  function addRadioCallback(cb: RadioCallback) {
    radioCallbacks.value.add(cb)
  }

  function removeRadioCallback(cb: RadioCallback) {
    radioCallbacks.value.delete(cb)
  }

  function addSpacesCallback(cb: SpacesCallback) {
    spacesCallbacks.value.add(cb)
  }

  function removeSpacesCallback(cb: SpacesCallback) {
    spacesCallbacks.value.delete(cb)
  }

  function addNotificationsCallback(cb: NotificationsCallback) {
    notificationsCallbacks.value.add(cb)
  }

  function removeNotificationsCallback(cb: NotificationsCallback) {
    notificationsCallbacks.value.delete(cb)
  }

  function addFollowsCallback(cb: FollowsCallback) {
    followsCallbacks.value.add(cb)
  }

  function removeFollowsCallback(cb: FollowsCallback) {
    followsCallbacks.value.delete(cb)
  }

  function addPostsCallback(cb: PostsCallback) {
    postsCallbacks.value.add(cb)
  }

  function removePostsCallback(cb: PostsCallback) {
    postsCallbacks.value.delete(cb)
  }

  function addAdminCallback(cb: AdminCallback) {
    adminCallbacks.value.add(cb)
  }

  function removeAdminCallback(cb: AdminCallback) {
    adminCallbacks.value.delete(cb)
  }

  function addUsersCallback(cb: UsersCallback) {
    usersCallbacks.value.add(cb)
  }

  function removeUsersCallback(cb: UsersCallback) {
    usersCallbacks.value.delete(cb)
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
    if (isSocketConnecting.value) return
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

    socket.on('presence:subscribed', (data: { users?: Array<{ userId: string; online: boolean; idle?: boolean; spaceId?: string | null }> }) => {
      const users = Array.isArray(data?.users) ? data.users : []
      const nextSpaces = { ...userCurrentSpaceById.value }
      let spacesChanged = false
      for (const u of users) {
        const id = u?.userId
        if (!id) continue
        markPresenceKnown(id)
        applyUserPresence(id, u.online, u.idle ?? false)
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

    socket.on('presence:idleDisconnected', () => {
      disconnectedDueToIdle.value = true
    })

    let lastNotificationSoundPlayedAt = 0
    let lastMessageSoundPlayedAt = 0
    function maybePlayNotificationSound() {
      const now = Date.now()
      if (now < suppressSoundsUntilMs) return
      const withinCooldown = now - lastNotificationSoundPlayedAt < NOTIFICATION_SOUND_COOLDOWN_MS
      if (withinCooldown) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      lastNotificationSoundPlayedAt = now
      void sfx.playUrl(NOTIFICATION_SOUND_PATH, { volume: 0.9 })
    }
    function maybePlayMessageSound() {
      const now = Date.now()
      if (now < suppressSoundsUntilMs) return
      const withinCooldown = now - lastMessageSoundPlayedAt < MESSAGE_SOUND_COOLDOWN_MS
      if (withinCooldown) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      lastMessageSoundPlayedAt = now
      void sfx.playUrl(MESSAGE_SOUND_PATH, { volume: 0.5 })
    }

    socket.on('notifications:updated', (data: { undeliveredCount?: number }) => {
      const raw = typeof data?.undeliveredCount === 'number' ? data.undeliveredCount : 0
      const newCount = Math.max(0, Math.floor(raw))
      notificationUndeliveredCount.value = newCount
      previousNotificationCountRef.value = newCount
      if (!notificationsCallbacks.value.size) return
      for (const cb of notificationsCallbacks.value) {
        cb.onUpdated?.(data)
      }
    })

    socket.on('notifications:new', (data: WsNotificationsNewPayload) => {
      // Play sound for realtime arrivals, even if viewer is on /notifications.
      // (Count updates can be suppressed if the page marks delivered immediately.)
      maybePlayNotificationSound()
      if (!notificationsCallbacks.value.size) return
      for (const cb of notificationsCallbacks.value) {
        cb.onNew?.(data)
      }
    })

    socket.on('notifications:deleted', (data: WsNotificationsDeletedPayload) => {
      if (!notificationsCallbacks.value.size) return
      for (const cb of notificationsCallbacks.value) {
        cb.onDeleted?.(data)
      }
    })

    socket.on('messages:updated', (data: { primaryUnreadCount?: number; requestUnreadCount?: number }) => {
      const primaryRaw = typeof data?.primaryUnreadCount === 'number' ? data.primaryUnreadCount : 0
      const requestRaw = typeof data?.requestUnreadCount === 'number' ? data.requestUnreadCount : 0
      const incoming = {
        primary: Math.max(0, Math.floor(primaryRaw)),
        requests: Math.max(0, Math.floor(requestRaw)),
      }
      const now = Date.now()
      if (now < (suppressMessageUnreadBumpsUntilMs.value ?? 0)) {
        const prev = messageUnreadCounts.value
        messageUnreadCounts.value = {
          primary: Math.min(Math.max(0, Number(prev.primary) || 0), incoming.primary),
          requests: Math.min(Math.max(0, Number(prev.requests) || 0), incoming.requests),
        }
        return
      }
      messageUnreadCounts.value = incoming
    })

    socket.on('messages:new', (data: { conversationId?: string; message?: unknown }) => {
      // Play sound only for realtime deliveries (not initial unread count sync).
      // Avoid playing for your own sent message when sender id is present.
      const meId = user.value?.id ?? null
      const senderId = getSenderIdFromMessageNewPayload(data)
      if (!meId || !senderId || senderId !== meId) {
        maybePlayMessageSound()
      }
      if (!messagesCallbacks.value.size) return
      for (const cb of messagesCallbacks.value) {
        cb.onMessage?.(data)
      }
    })

    socket.on('radio:listeners', (data: { stationId?: string; listeners?: RadioListener[] }) => {
      if (!radioCallbacks.value.size) return
      const stationId = String(data?.stationId ?? '').trim()
      const listeners = Array.isArray(data?.listeners) ? data.listeners : []
      for (const cb of radioCallbacks.value) {
        cb.onListeners?.({ stationId, listeners })
      }
    })

    socket.on('radio:lobbyCounts', (data: { countsByStationId?: Record<string, number> }) => {
      if (!radioCallbacks.value.size) return
      const countsByStationId = (data?.countsByStationId ?? {}) as Record<string, number>
      for (const cb of radioCallbacks.value) {
        cb.onLobbyCounts?.({ countsByStationId })
      }
    })

    socket.on('radio:chatSnapshot', (data: { stationId?: string; messages?: RadioChatMessage[] }) => {
      if (!radioCallbacks.value.size) return
      const stationId = String(data?.stationId ?? '').trim()
      const messages = Array.isArray(data?.messages) ? data.messages : []
      for (const cb of radioCallbacks.value) {
        cb.onChatSnapshot?.({ stationId, messages })
      }
    })

    socket.on('radio:chatMessage', (data: { stationId?: string; message?: RadioChatMessage }) => {
      if (!radioCallbacks.value.size) return
      const stationId = String(data?.stationId ?? '').trim()
      const message = data?.message
      if (!stationId || !message?.id) return
      for (const cb of radioCallbacks.value) {
        cb.onChatMessage?.({ stationId, message })
      }
    })

    socket.on('radio:replaced', () => {
      for (const cb of radioCallbacks.value) {
        cb.onReplaced?.()
      }
    })

    socket.on('spaces:members', (data: { spaceId?: string; members?: SpaceMember[] }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      const members = Array.isArray(data?.members) ? data.members : []
      for (const cb of spacesCallbacks.value) {
        cb.onMembers?.({ spaceId, members })
      }
    })

    socket.on('spaces:lobbyCounts', (data: { countsBySpaceId?: Record<string, number> }) => {
      if (!spacesCallbacks.value.size) return
      const countsBySpaceId = (data?.countsBySpaceId ?? {}) as Record<string, number>
      for (const cb of spacesCallbacks.value) {
        cb.onLobbyCounts?.({ countsBySpaceId })
      }
    })

    socket.on('spaces:chatSnapshot', (data: { spaceId?: string; messages?: SpaceChatMessage[] }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      const messages = Array.isArray(data?.messages) ? data.messages : []
      for (const cb of spacesCallbacks.value) {
        cb.onChatSnapshot?.({ spaceId, messages })
      }
    })

    socket.on('spaces:chatMessage', (data: { spaceId?: string; message?: SpaceChatMessage }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      const message = data?.message
      if (!spaceId || !message?.id) return
      for (const cb of spacesCallbacks.value) {
        cb.onChatMessage?.({ spaceId, message })
      }
    })

    socket.on('spaces:typing', (data: { spaceId?: string; sender?: SpaceChatSender; typing?: boolean }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      const sender = data?.sender
      if (!spaceId || !sender?.id) return
      const typing = typeof data?.typing === 'boolean' ? data.typing : undefined
      for (const cb of spacesCallbacks.value) {
        cb.onTyping?.({ spaceId, sender, typing })
      }
    })

    socket.on('spaces:reaction', (data: SpaceReactionEvent) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String((data as any)?.spaceId ?? '').trim()
      const userId = String((data as any)?.userId ?? '').trim()
      const reactionId = String((data as any)?.reactionId ?? '').trim()
      const emoji = String((data as any)?.emoji ?? '').trim()
      if (!spaceId || !userId || !emoji) return
      for (const cb of spacesCallbacks.value) {
        cb.onReaction?.({ spaceId, userId, reactionId, emoji })
      }
    })

    socket.on('messages:typing', (data: { conversationId?: string; userId?: string; typing?: boolean }) => {
      if (!messagesCallbacks.value.size) return
      for (const cb of messagesCallbacks.value) {
        cb.onTyping?.(data)
      }
    })

    socket.on('messages:read', (data: { conversationId?: string; userId?: string; lastReadAt?: string }) => {
      if (!messagesCallbacks.value.size) return
      for (const cb of messagesCallbacks.value) {
        cb.onRead?.(data)
      }
    })

    socket.on('follows:changed', (data: WsFollowsChangedPayload) => {
      if (!followsCallbacks.value.size) return
      for (const cb of followsCallbacks.value) {
        cb.onChanged?.(data)
      }
    })

    socket.on('posts:interaction', (data: WsPostsInteractionPayload) => {
      if (!postsCallbacks.value.size) return
      for (const cb of postsCallbacks.value) {
        cb.onInteraction?.(data)
      }
    })

    socket.on('posts:liveUpdated', (data: WsPostsLiveUpdatedPayload) => {
      if (!postsCallbacks.value.size) return
      for (const cb of postsCallbacks.value) {
        cb.onLiveUpdated?.(data)
      }
    })

    socket.on('admin:updated', (data: WsAdminUpdatedPayload) => {
      if (!adminCallbacks.value.size) return
      for (const cb of adminCallbacks.value) {
        cb.onUpdated?.(data)
      }
    })

    socket.on('users:selfUpdated', (data: WsUsersSelfUpdatedPayload) => {
      // Normalize immediately so any UI referencing this user updates everywhere.
      const picked = pickPublicUserEntity(data?.user)
      if (picked) usersStore.upsert(picked)
      if (!usersCallbacks.value.size) return
      for (const cb of usersCallbacks.value) {
        cb.onSelfUpdated?.(data)
      }
    })

    socket.on('users:meUpdated', (data: WsUsersMeUpdatedPayload) => {
      if (!usersCallbacks.value.size) return
      for (const cb of usersCallbacks.value) {
        cb.onMeUpdated?.(data)
      }
    })

    socket.on('users:spaceChanged', (data: WsUsersSpaceChangedPayload) => {
      const uid = data?.userId
      if (!uid) return
      const next = { ...userCurrentSpaceById.value }
      next[uid] = data.spaceId ?? null
      userCurrentSpaceById.value = next
      for (const cb of usersCallbacks.value) {
        cb.onSpaceChanged?.(data)
      }
    })

    function syncSubscriptions() {
      const refs = interestRefs.value
      if (refs.size > 0) {
        emitSubscribe([...refs.keys()])
      }
      if (onlineFeedSubscribed.value) {
        socket.emit('presence:subscribeOnlineFeed')
      }
    }
    socket.on('connect', () => {
      pendingLogout = false
      if (serverDisconnectReconnectTimer) {
        clearTimeout(serverDisconnectReconnectTimer)
        serverDisconnectReconnectTimer = null
      }
      const isReconnect = wasSocketConnectedOnce.value
      const wasDisconnectedWhileVisible = socketDisconnectedWhileVisible.value
      wasSocketConnectedOnce.value = true
      isSocketConnected.value = true
      isSocketConnecting.value = false
      socketDisconnectedWhileVisible.value = false
      // Prevent dings on initial load/reconnect while the server syncs unread counts / backlog.
      suppressSoundsUntilMs = Date.now() + 1500
      // Preload notification + message sounds for low-latency playback (best-effort).
      void sfx.preloadUrls([NOTIFICATION_SOUND_PATH, MESSAGE_SOUND_PATH])
      // Show current user as online immediately (avatar / status) until server sends real presence
      const me = user.value?.id
      if (me) applyUserPresence(me, true, false)
      // Only flash the "Reconnected." green bar when the banner was actually visible to the user
      // (idle kick, or a disconnect that happened while the page was in the foreground).
      if (disconnectedDueToIdle.value || (isReconnect && wasDisconnectedWhileVisible)) {
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
    socket.on('disconnect', (reason: string) => {
      isSocketConnected.value = false
      isSocketConnecting.value = false
      connectionBarJustConnected.value = false
      if (connectionBarJustConnectedTimer) {
        clearTimeout(connectionBarJustConnectedTimer)
        connectionBarJustConnectedTimer = null
      }
      // Only raise the reconnecting banner when the user was actively viewing the app.
      // A background disconnect (tab hidden / app backgrounded) should reconnect silently.
      socketDisconnectedWhileVisible.value =
        typeof document !== 'undefined' && document.visibilityState === 'visible'
      // Clear presence state so UI (e.g. avatar green dot, status page) doesn't show stale "online"
      onlineUserIds.value = new Set()
      idleUserIds.value = new Set()
      presenceKnownUserIds.value = new Set()
      // For server-initiated disconnects (e.g. idle timeout), Socket.IO does NOT auto-reconnect.
      // Schedule a delayed reconnect unless this was an explicit logout.
      if (reason === 'io server disconnect' && !pendingLogout) {
        serverDisconnectReconnectTimer = setTimeout(() => {
          serverDisconnectReconnectTimer = null
          if (!socketRef.value?.connected && !isSocketConnecting.value) {
            reconnect()
          }
        }, 3000)
      }
    })
    if (socket.connected) {
      wasSocketConnectedOnce.value = true
      isSocketConnected.value = true
      isSocketConnecting.value = false
      const me = user.value?.id
      if (me) applyUserPresence(me, true, false)
      syncSubscriptions()
    }

    socketRef.value = socket
  }

  function emitLogout() {
    pendingLogout = true
    const socket = socketRef.value
    if (socket?.connected) {
      socket.emit('presence:logout')
    }
  }

  function disconnect() {
    pendingLogout = false
    if (serverDisconnectReconnectTimer) {
      clearTimeout(serverDisconnectReconnectTimer)
      serverDisconnectReconnectTimer = null
    }
    const socket = socketRef.value
    if (socket) {
      socket.disconnect()
      socketRef.value = null
    }
    wasSocketConnectedOnce.value = false
    isSocketConnecting.value = false
    disconnectedDueToIdle.value = false
    socketDisconnectedWhileVisible.value = false
    connectionBarJustConnected.value = false
    if (connectionBarJustConnectedTimer) {
      clearTimeout(connectionBarJustConnectedTimer)
      connectionBarJustConnectedTimer = null
    }
    onlineUserIds.value = new Set()
    idleUserIds.value = new Set()
    presenceKnownUserIds.value = new Set()
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

    // Activity: send presence:active (fire-and-forget ping), throttled unless clearing idle. Idle is server-driven (3 min no pings).
    let lastActivityPingAt = 0

    function onActivity() {
      const uid = user.value?.id
      const socket = socketRef.value
      if (!uid) return
      if (!socket?.connected) {
        if (socket && !isSocketConnecting.value) {
          reconnect()
        }
        return
      }
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
      () => user.value?.id ?? null,
      (userId) => {
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
          { flush: 'sync' },
        )

        return () => {
          document.removeEventListener('mousemove', onActivity, opts)
          document.removeEventListener('mousedown', onActivity, opts)
          document.removeEventListener('keydown', onActivity, opts)
          document.removeEventListener('scroll', onActivity, opts)
          document.removeEventListener('touchstart', onActivity, opts)
          document.removeEventListener('visibilitychange', onVisibilityChange)
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
    isPresenceKnown,
    userCurrentSpaceById: readonly(userCurrentSpaceById),
    getCurrentSpaceForUser(userId: string): string | null {
      return userId ? (userCurrentSpaceById.value[userId] ?? null) : null
    },
    /** Seed current space for users (e.g. from spaces:members so UI is correct before any users:spaceChanged). */
    setCurrentSpaceForUsers(userIds: string[], spaceId: string | null) {
      if (!userIds.length) return
      const next = { ...userCurrentSpaceById.value }
      for (const uid of userIds) {
        if (uid) next[uid] = spaceId
      }
      userCurrentSpaceById.value = next
    },
    isSocketConnected: readonly(isSocketConnected),
    isSocketConnecting: readonly(isSocketConnecting),
    disconnectedDueToIdle: readonly(disconnectedDueToIdle),
    wasSocketConnectedOnce: readonly(wasSocketConnectedOnce),
    socketDisconnectedWhileVisible: readonly(socketDisconnectedWhileVisible),
    connectionBarJustConnected: readonly(connectionBarJustConnected),
    notificationUndeliveredCount: readonly(notificationUndeliveredCount),
    messageUnreadCounts: readonly(messageUnreadCounts),
    suppressMessageUnreadBumpsForMs(ms: number) {
      const dur = Math.max(0, Math.floor(Number(ms) || 0))
      if (dur <= 0) return
      suppressMessageUnreadBumpsUntilMs.value = Date.now() + dur
    },
    setNotificationUndeliveredCount(count: number) {
      const c = Math.max(0, Math.floor(Number(count)) || 0)
      notificationUndeliveredCount.value = c
    },
    setMessageUnreadCounts(counts: { primary?: number; requests?: number }) {
      const nextPrimary = Math.max(0, Math.floor(Number(counts.primary)) || 0)
      const nextRequests = Math.max(0, Math.floor(Number(counts.requests)) || 0)
      messageUnreadCounts.value = { primary: nextPrimary, requests: nextRequests }
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
    addMessagesCallback,
    removeMessagesCallback,
    addRadioCallback,
    removeRadioCallback,
    addSpacesCallback,
    removeSpacesCallback,
    addNotificationsCallback,
    removeNotificationsCallback,
    addFollowsCallback,
    removeFollowsCallback,
    addPostsCallback,
    removePostsCallback,
    subscribePosts,
    unsubscribePosts,
    addAdminCallback,
    removeAdminCallback,
    addUsersCallback,
    removeUsersCallback,
    emitRadioJoin(stationId: string) {
      const socket = socketRef.value
      const id = (stationId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('radio:join', { stationId: id })
    },
    emitRadioWatch(stationId: string) {
      const socket = socketRef.value
      const id = (stationId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('radio:watch', { stationId: id })
    },
    emitRadioPause() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:pause', {})
    },
    emitRadioLeave() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:leave', {})
    },
    emitRadioMute(muted: boolean) {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:mute', { muted: Boolean(muted) })
    },
    emitRadioLobbiesSubscribe() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:lobbies:subscribe', {})
    },
    emitRadioLobbiesUnsubscribe() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:lobbies:unsubscribe', {})
    },
    emitRadioChatSubscribe(stationId: string) {
      const socket = socketRef.value
      const id = String(stationId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('radio:chatSubscribe', { stationId: id })
    },
    emitRadioChatUnsubscribe() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:chatUnsubscribe', {})
    },
    emitRadioChatSend(stationId: string, body: string) {
      const socket = socketRef.value
      const id = String(stationId ?? '').trim()
      const text = String(body ?? '')
      if (!socket?.connected || !id) return
      socket.emit('radio:chatSend', { stationId: id, body: text })
    },
    emitSpacesJoin(spaceId: string) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('spaces:join', { spaceId: id })
    },
    emitSpacesPause() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:pause', {})
    },
    emitSpacesLeave() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:leave', {})
    },
    emitSpacesMute(muted: boolean) {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:mute', { muted: Boolean(muted) })
    },
    emitSpacesLobbiesSubscribe() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:lobbies:subscribe', {})
    },
    emitSpacesLobbiesUnsubscribe() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:lobbies:unsubscribe', {})
    },
    emitSpacesChatSubscribe(spaceId: string) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('spaces:chatSubscribe', { spaceId: id })
    },
    emitSpacesChatUnsubscribe() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:chatUnsubscribe', {})
    },
    emitSpacesChatSend(spaceId: string, body: string) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      const text = String(body ?? '')
      if (!socket?.connected || !id) return
      socket.emit('spaces:chatSend', { spaceId: id, body: text })
    },
    emitSpacesTyping(spaceId: string, typing: boolean) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('spaces:typing', { spaceId: id, typing: Boolean(typing) })
    },
    emitSpacesReaction(spaceId: string, reactionId: string) {
      const socket = socketRef.value
      const sid = String(spaceId ?? '').trim()
      const rid = String(reactionId ?? '').trim()
      if (!socket?.connected || !sid || !rid) return
      socket.emit('spaces:reaction', { spaceId: sid, reactionId: rid })
    },
    emitMessagesScreen(active: boolean) {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('messages:screen', { active: Boolean(active) })
    },
    emitMessagesTyping(conversationId: string, typing: boolean) {
      const socket = socketRef.value
      const id = (conversationId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('messages:typing', { conversationId: id, typing: Boolean(typing) })
    },
    connect,
    disconnect,
    emitLogout,
  }
}
