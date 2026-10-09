import { isRecord } from '~/utils/primitives'
import type { Socket } from 'socket.io-client'
import { suppressSoundsFor } from '~/utils/sound-policy'

const NOTIFICATIONS_UNDELIVERED_COUNT_KEY = 'notifications-undelivered-count'
const NOTIFICATIONS_UNREAD_COMMENT_COUNT_KEY = 'notifications-unread-comment-count'
const MESSAGES_UNREAD_COUNTS_KEY = 'messages-unread-counts'
const GROUPS_UNREAD_KEY = 'groups-unread'
const NOTIFICATIONS_NAV_UNREAD_KEY = 'notifications-nav-unread'

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
  const hasUnreadNotifications = useState<boolean>('notifications-has-unread', () => false)
  const notificationBadgeRevision = useState<number>('notifications-badge-revision', () => 0)
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
  /** Unread Board / Articles notifications — drives the nav dots. Updated via `notifications:navUnreadChanged`. */
  const notificationNavUnread = useState<{ board: number; boardMentions: number; articles: number }>(NOTIFICATIONS_NAV_UNREAD_KEY, () => ({
    board: 0,
    boardMentions: 0,
    articles: 0,
  }))
  // When the viewer is actively reading a chat, the server may briefly bump unread counts
  // before the client's mark-read request is processed. Suppress those transient increases.
  const suppressMessageUnreadBumpsUntilMs = useState<number>('presence-messages-unread-suppress-until', () => 0)

  const { user } = useAuth()

  const sounds = useSoundPolicy()

  /** Called from the socket 'connect' handler: mute dings during backlog sync, preload sounds. */
  function onSocketConnected() {
    suppressSoundsFor(1500)
    sounds.preload(['notification', 'message', 'channel-message', 'channel-mention'])
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

  function setNotificationNavUnread(data: { undeliveredCount?: number; boardUnreadCount?: number; boardMentionCount?: number; articlesUnreadCount?: number; hasUnreadNotifications?: boolean }) {
    notificationBadgeRevision.value += 1
    if (typeof data.undeliveredCount === 'number') notificationUndeliveredCount.value = Math.max(0, data.undeliveredCount)
    if (typeof data.hasUnreadNotifications === 'boolean') hasUnreadNotifications.value = data.hasUnreadNotifications
    notificationNavUnread.value = {
      board: data.boardUnreadCount === undefined ? notificationNavUnread.value.board : Math.max(0, Math.floor(Number(data.boardUnreadCount)) || 0),
      boardMentions: data.boardMentionCount === undefined ? notificationNavUnread.value.boardMentions : Math.max(0, Math.floor(Number(data.boardMentionCount)) || 0),
      articles: data.articlesUnreadCount === undefined ? notificationNavUnread.value.articles : Math.max(0, Math.floor(Number(data.articlesUnreadCount)) || 0),
    }
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
      notificationBadgeRevision.value += 1
      const raw = typeof data?.undeliveredCount === 'number' ? data.undeliveredCount : 0
      notificationUndeliveredCount.value = Math.max(0, Math.floor(raw))
    })

    socket.on('notifications:new', (data: { silent?: boolean }) => {
      // Silent events only repaint a row the viewer has already seen (e.g. a status
      // reworded in place) — no arrival to announce.
      if (data?.silent) return
      // Play sound for realtime arrivals, even if viewer is on /notifications.
      // (Count updates can be suppressed if the page marks delivered immediately.)
      sounds.play('notification')
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

    socket.on('notifications:navUnreadChanged', (data: { undeliveredCount?: number; boardUnreadCount?: number; boardMentionCount?: number; articlesUnreadCount?: number; hasUnreadNotifications?: boolean }) => {
      setNotificationNavUnread(data)
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
        sounds.play('message')
      }
    })
  }

  return {
    hasUnreadNotifications,
    notificationBadgeRevision,
    notificationUndeliveredCount,
    notificationUnreadCommentCount,
    messageUnreadCounts,
    groupsUnread,
    notificationNavUnread,
    suppressMessageUnreadBumpsForMs,
    setNotificationUndeliveredCount,
    setNotificationUnreadCommentCount,
    setMessageUnreadCounts,
    setGroupsUnread,
    setNotificationNavUnread,
    onSocketConnected,
    registerSocketHandlers,
  }
}
