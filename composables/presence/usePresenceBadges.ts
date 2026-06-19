import type { Socket } from 'socket.io-client'

const NOTIFICATIONS_UNDELIVERED_COUNT_KEY = 'notifications-undelivered-count'
const NOTIFICATIONS_UNREAD_COMMENT_COUNT_KEY = 'notifications-unread-comment-count'
const MESSAGES_UNREAD_COUNTS_KEY = 'messages-unread-counts'
const GROUPS_UNREAD_KEY = 'groups-unread'
const NOTIFICATION_SOUND_PATH = '/sounds/notification.mp3'
const MESSAGE_SOUND_PATH = '/sounds/new-message.mp3'
/** Min ms between plays so we don't ding repeatedly (e.g. multiple sockets on mobile or burst of events). */
const NOTIFICATION_SOUND_COOLDOWN_MS = 3000
const MESSAGE_SOUND_COOLDOWN_MS = 1800

/** Suppress sounds during initial sync after (re)connect. Module-scoped: only the socket-owning tab plays sounds. */
let suppressSoundsUntilMs = 0
let lastNotificationSoundPlayedAt = 0
let lastMessageSoundPlayedAt = 0

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

/**
 * Badge counts (notification bell, "waiting on you" dot, message unread) and
 * the in-app notification/message sounds. Owns the count-bearing socket
 * handlers; callback fan-out for the same events lives in usePresenceDomains.
 */
export function usePresenceBadges() {
  const notificationUndeliveredCount = useState<number>(NOTIFICATIONS_UNDELIVERED_COUNT_KEY, () => 0)
  /**
   * "Waiting on you" dot — count of unread reply notifications.
   * Drives the dot on the Home tab. Updated via `notifications:waitingCountChanged`.
   */
  const notificationUnreadCommentCount = useState<number>(NOTIFICATIONS_UNREAD_COMMENT_COUNT_KEY, () => 0)
  const messageUnreadCounts = useState<{ primary: number; requests: number }>(MESSAGES_UNREAD_COUNTS_KEY, () => ({
    primary: 0,
    requests: 0,
  }))
  /** Groups badge: total undelivered count + per-group breakdown. Updated via `groups:unreadChanged`. */
  const groupsUnread = useState<{ total: number; byGroupId: Record<string, number> }>(GROUPS_UNREAD_KEY, () => ({
    total: 0,
    byGroupId: {},
  }))
  // When the viewer is actively reading a chat, the server may briefly bump unread counts
  // before the client's mark-read request is processed. Suppress those transient increases.
  const suppressMessageUnreadBumpsUntilMs = useState<number>('presence-messages-unread-suppress-until', () => 0)

  const { user } = useAuth()
  const sfx = useSfx()

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

  /** Called from the socket 'connect' handler: mute dings during backlog sync, preload sounds. */
  function onSocketConnected() {
    suppressSoundsUntilMs = Date.now() + 1500
    void sfx.preloadUrls([NOTIFICATION_SOUND_PATH, MESSAGE_SOUND_PATH])
  }

  function suppressMessageUnreadBumpsForMs(ms: number) {
    const dur = Math.max(0, Math.floor(Number(ms) || 0))
    if (dur <= 0) return
    suppressMessageUnreadBumpsUntilMs.value = Date.now() + dur
  }

  function setNotificationUndeliveredCount(count: number) {
    const c = Math.max(0, Math.floor(Number(count)) || 0)
    notificationUndeliveredCount.value = c
  }

  function setNotificationUnreadCommentCount(count: number) {
    const c = Math.max(0, Math.floor(Number(count)) || 0)
    notificationUnreadCommentCount.value = c
  }

  function setMessageUnreadCounts(counts: { primary?: number; requests?: number }) {
    const nextPrimary = Math.max(0, Math.floor(Number(counts.primary)) || 0)
    const nextRequests = Math.max(0, Math.floor(Number(counts.requests)) || 0)
    messageUnreadCounts.value = { primary: nextPrimary, requests: nextRequests }
  }

  function setGroupsUnread(data: { total?: number; byGroupId?: Record<string, number> }) {
    const total = Math.max(0, Math.floor(Number(data?.total)) || 0)
    const byGroupId: Record<string, number> = {}
    if (data?.byGroupId && typeof data.byGroupId === 'object') {
      for (const [id, count] of Object.entries(data.byGroupId)) {
        const n = Math.max(0, Math.floor(Number(count)) || 0)
        if (n > 0) byGroupId[id] = n
      }
    }
    groupsUnread.value = { total, byGroupId }
  }

  function registerSocketHandlers(socket: Socket) {
    socket.on('notifications:updated', (data: { undeliveredCount?: number }) => {
      const raw = typeof data?.undeliveredCount === 'number' ? data.undeliveredCount : 0
      notificationUndeliveredCount.value = Math.max(0, Math.floor(raw))
    })

    socket.on('notifications:new', () => {
      // Play sound for realtime arrivals, even if viewer is on /notifications.
      // (Count updates can be suppressed if the page marks delivered immediately.)
      maybePlayNotificationSound()
    })

    socket.on('notifications:waitingCountChanged', (data: { unreadCommentCount?: number }) => {
      const raw = typeof data?.unreadCommentCount === 'number' ? data.unreadCommentCount : 0
      notificationUnreadCommentCount.value = Math.max(0, Math.floor(raw))
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

    socket.on('groups:unreadChanged', (data: { total?: number; byGroupId?: Record<string, number> }) => {
      setGroupsUnread(data)
    })

    socket.on('messages:new', (data: { conversationId?: string; message?: unknown }) => {
      // Play sound only for realtime deliveries (not initial unread count sync).
      // Avoid playing for your own sent message when sender id is present.
      const meId = user.value?.id ?? null
      const senderId = getSenderIdFromMessageNewPayload(data)
      if (!meId || !senderId || senderId !== meId) {
        maybePlayMessageSound()
      }
    })
  }

  return {
    notificationUndeliveredCount,
    notificationUnreadCommentCount,
    messageUnreadCounts,
    groupsUnread,
    suppressMessageUnreadBumpsForMs,
    setNotificationUndeliveredCount,
    setNotificationUnreadCommentCount,
    setMessageUnreadCounts,
    setGroupsUnread,
    onSocketConnected,
    registerSocketHandlers,
  }
}
