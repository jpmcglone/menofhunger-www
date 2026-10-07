import { userActionColor } from '~/utils/user-tier'
import { notificationFilterCategory } from '~/utils/notification-category'
import type { Notification, NotificationKind } from '~/types/api'
import { VOICE } from '~/config/voice'
import { closeBrowserNotificationsForHref } from '~/utils/browser-notifications'

export function useNotificationsPage() {
/** Kinds that render as a full AppPostRow when `notification.post` is hydrated. */
const POST_ROW_KINDS = new Set<NotificationKind>(['comment', 'mention', 'followed_post', 'checkin_post', 'community_group_post', 'repost'])

function notificationShowsPostRow(n: Notification): boolean {
  if (!n.post || !POST_ROW_KINDS.has(n.kind)) return false
  // A flat repost (kind=repost, no body) only renders usefully when repostedPost is hydrated.
  // Without it PostRow shows an empty shell; fall back to NotificationRow which shows the snippet.
  if (n.kind === 'repost' && n.post.kind === 'repost' && !n.post.repostedPost) return false
  return true
}

function notificationIsFlatRepost(n: Notification): boolean {
  return Boolean(
    n.post && n.kind === 'repost' && n.post.kind === 'repost' && n.post.repostedPost,
  )
}



const {
  notifications,
  nextCursor,
  loading,
  hasFetched,
  fetchError,
  pendingRefresh,
  activeKind,
  unreadByKind,
  unreadByCategory,
  setKind,
  fetchList,
  markDelivered,
  markReadById,
  markAllRead,
  clearUnreadKind,
  decrementUnreadKind,
  itemHref,
} = useNotifications()
const notifBadge = useNotificationsBadge()

async function retryFetch() {
  await fetchList({ forceRefresh: true })
}
const notificationsTabReturnGate = useTabReturnRefreshGate('notifications')

const kindChips = computed(() => {
  const chips: { label: string; kind: NotificationKind | 'other' | 'board' | null }[] = [
    { label: 'All', kind: null },
    { label: 'Posts', kind: 'followed_post' },
    { label: 'Replies', kind: 'comment' },
    { label: 'Mentions', kind: 'mention' },
    { label: 'Statuses', kind: 'status_update' },
    { label: 'Follows', kind: 'follow' },
    { label: 'Boosts', kind: 'boost' },
    { label: 'Other', kind: 'other' },
  ]
  return chips
})

const router = useRouter()
const route = useRoute()

async function onChipSelect(kind: NotificationKind | 'other' | 'board' | null) {
  await setKind(kind)
  const query = { ...route.query }
  if (kind) {
    query.kind = kind
  } else {
    delete query.kind
  }
  void router.replace({ query })
}

const {
  addInterest,
  removeInterest,
  addCrewCallback,
  removeCrewCallback,
  addGroupInviteCallback,
  removeGroupInviteCallback,
} = usePresence()
const loadingMore = ref(false)
const markingAllRead = ref(false)
const visitHighlights = useNotificationVisitHighlights(notifications)
const stickyHighlightedItemKeys = visitHighlights.keys
visitHighlights.begin()

const showInitialLoader = computed(() => !hasFetched.value && !fetchError.value && notifications.value.length === 0)

function chipHasUnseenNotifications(kind: NotificationKind | 'other' | 'board' | null): boolean {
  if (kind === 'board') return false
  const category = notificationFilterCategory(kind)
  const count = unreadByCategory.value[category]
  if (count !== undefined) return count > 0
  return (unreadByKind.value[kind === 'other' ? 'generic' : kind ?? 'all'] ?? 0) > 0
}

function nudgeActorIdForItem(item: (typeof notifications.value)[number]): string | null {
  if (item.type === 'single') {
    if (item.notification.kind !== 'nudge') return null
    return item.notification.actor?.id ?? null
  }
  if (item.type !== 'group') return null
  if (item.group.kind !== 'nudge') return null
  return item.group.actors?.[0]?.id ?? null
}

function itemKey(item: (typeof notifications.value)[number]): string {
  if (item.type === 'single') return `single:${item.notification.id}`
  if (item.type === 'group') return `group:${item.group.id}`
  return `rollup:${item.rollup.id}`
}

// Only show the "Nudge back" action on the newest nudge row/group per actor.
const nudgeIsTopmostByIndex = computed(() => {
  const seen = new Set<string>()
  return notifications.value.map((item) => {
    const actorId = nudgeActorIdForItem(item)
    if (!actorId) return false
    if (seen.has(actorId)) return false
    seen.add(actorId)
    return true
  })
})

// Presence: subscribe to notification actors so avatars show online/offline (works after hard refresh).
const notificationActorIds = computed(() => {
  const ids = new Set<string>()
  for (const item of notifications.value) {
    if (item.type === 'single') {
      const id = item.notification.actor?.id
      if (id) ids.add(id)
      continue
    }
    if (item.type === 'group') {
      for (const a of item.group.actors ?? []) {
        const id = a?.id
        if (id) ids.add(id)
      }
    }
  }
  return [...ids]
})
const presenceAddedIds = ref<Set<string>>(new Set())
watch(
  notificationActorIds,
  (newIds) => {
    const added = presenceAddedIds.value
    const toRemove = [...added].filter((id) => !newIds.includes(id))
    const toAdd = newIds.filter((id) => !added.has(id))
    if (toRemove.length) {
      removeInterest(toRemove)
      toRemove.forEach((id) => added.delete(id))
    }
    if (toAdd.length) {
      addInterest(toAdd)
      toAdd.forEach((id) => added.add(id))
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  const added = [...presenceAddedIds.value]
  if (added.length) removeInterest(added)
})

// Realtime: when a crew invite's status changes (accepted / declined / cancelled
// / expired) — possibly from another tab or device — patch any matching
// `crew_invite_received` rows in place so their inline buttons swap to the
// terminal indicator without requiring a refresh.
const crewCb = {
  onInviteUpdated(payload: { invite: { id: string; status: string } }) {
    const inviteId = payload?.invite?.id
    const status = payload?.invite?.status as
      | 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired' | undefined
    if (!inviteId || !status) return
    let mutated = false
    const next = notifications.value.map((item) => {
      if (item.type !== 'single') return item
      const n = item.notification
      if (n.kind !== 'crew_invite_received') return item
      if (n.subjectCrewInviteId !== inviteId) return item
      mutated = true
      return {
        ...item,
        notification: { ...n, subjectCrewInviteStatus: status },
      }
    })
    if (mutated) notifications.value = next
  },
}
onMounted(() => addCrewCallback(crewCb))
onBeforeUnmount(() => removeCrewCallback(crewCb))

// Realtime: same pattern for community group invites — keep the row's terminal
// state in sync when the invite is accepted / declined / cancelled / expired
// from another tab or device.
const groupInviteCb = {
  onUpdated(payload: { invite: { id: string; status: string } }) {
    const inviteId = payload?.invite?.id
    const status = payload?.invite?.status as
      | 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired' | undefined
    if (!inviteId || !status) return
    let mutated = false
    const next = notifications.value.map((item) => {
      if (item.type !== 'single') return item
      const n = item.notification
      if (n.kind !== 'community_group_invite_received') return item
      if (n.subjectCommunityGroupInviteId !== inviteId) return item
      mutated = true
      return {
        ...item,
        notification: { ...n, subjectCommunityGroupInviteStatus: status },
      }
    })
    if (mutated) notifications.value = next
  },
}
onMounted(() => addGroupInviteCallback(groupInviteCb))
onBeforeUnmount(() => removeGroupInviteCallback(groupInviteCb))

const notificationReadToast = useAppToast()
async function onMarkAllRead() {
  const account = notificationViewer.value?.id
  const ids = new Set(notifications.value.map(item => item.type === 'single' ? item.notification.id : item.type === 'group' ? item.group.id : item.rollup.id))
  markingAllRead.value = true
  try {
    await markAllRead()
    if (account !== notificationViewer.value?.id) return
    clearUnreadKind('all')
    visitHighlights.clear()
    const now = new Date().toISOString()
    notifications.value = notifications.value.map((item) => {
      const id = item.type === 'single' ? item.notification.id : item.type === 'group' ? item.group.id : item.rollup.id
      if (!ids.has(id)) return item
      if (item.type === 'single') {
        return { ...item, notification: { ...item.notification, readAt: now } }
      }
      if (item.type === 'group') return { ...item, group: { ...item.group, readAt: now } }
      return { ...item, rollup: { ...item.rollup, readAt: now } }
    })
    await Promise.all([fetchList({ forceRefresh: true }), notifBadge.fetchUndeliveredCount()])
  } catch {
    notificationReadToast.push({ title: 'Couldn’t mark notifications read. Try again.', tone: 'error' })
  } finally {
    markingAllRead.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    await fetchList({ cursor: nextCursor.value })
  } finally {
    loadingMore.value = false
  }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(
    el.closest(
      [
        'a',
        'button',
        'iframe',
        'video',
        'audio',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '[role="menu"]',
        '[role="menuitem"]',
        '[contenteditable="true"]',
        '[data-pc-section]',
      ].join(','),
    ),
  )
}

/**
 * Optimistically mark a feed item as read+seen in local state and on the server.
 * Used when the user opens a notification (including new-tab opens) so the row
 * updates read counts immediately, instead of waiting for the destination
 * page to fire markReadBySubject + the websocket to round-trip.
 *
 * Groups/rollups carry a representative id; markReadById on that id won't clear
 * every underlying notification — but the row's visible "unread" styling reads
 * off the group/rollup's own readAt, which we update locally. The destination
 * page's `markReadBySubject` will then clear the rest server-side.
 */
function markItemReadOptimistic(item: (typeof notifications.value)[number]) {
  const now = new Date().toISOString()
  let id: string | null = null
  let unreadKind: NotificationKind | null = null
  let changed = false
  notifications.value = notifications.value.map((curr) => {
    if (curr.type === 'single') {
      if (item.type !== 'single' || curr.notification.id !== item.notification.id) return curr
      id = curr.notification.id
      if (curr.notification.readAt) return curr
      unreadKind = curr.notification.kind
      changed = true
      return {
        ...curr,
        notification: {
          ...curr.notification,
          readAt: now,
          deliveredAt: curr.notification.deliveredAt ?? now,
        },
      }
    }
    if (curr.type === 'group') {
      if (item.type !== 'group' || curr.group.id !== item.group.id) return curr
      id = curr.group.id
      if (curr.group.readAt) return curr
      unreadKind = curr.group.kind
      changed = true
      return {
        ...curr,
        group: { ...curr.group, readAt: now, deliveredAt: curr.group.deliveredAt ?? now },
      }
    }
    if (item.type !== 'followed_posts_rollup' || curr.rollup.id !== item.rollup.id) return curr
    if (curr.rollup.readAt) return curr
    unreadKind = 'followed_post'
    changed = true
    return {
      ...curr,
      rollup: { ...curr.rollup, readAt: now, deliveredAt: curr.rollup.deliveredAt ?? now },
    }
  })
  if (changed) decrementUnreadKind(unreadKind)
  if (id) {
    const account = notificationViewer.value?.id
    void markReadById(id).then(() => {
      if (account === notificationViewer.value?.id) void notifBadge.fetchUndeliveredCount()
    }).catch(() => {
      if (account !== notificationViewer.value?.id) return
      notificationReadToast.push({ title: 'Couldn’t mark notification read. Try again.', tone: 'error' })
      void fetchList({ forceRefresh: true })
    })
  }
  closeBrowserNotificationsForHref(itemHref(item))
}

function onNotificationInteractionCapture(item: (typeof notifications.value)[number]) {
  if (item.type !== 'single') return
  if (!notificationShowsPostRow(item.notification)) return
  markItemReadOptimistic(item)
}

function onNotificationClick(item: (typeof notifications.value)[number], e: MouseEvent) {
  const href = itemHref(item)
  if (!href) return
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    markItemReadOptimistic(item)
    window.open(href, '_blank')
    return
  }
  markItemReadOptimistic(item)
  void navigateTo(href)
}

function onNotificationAuxClick(item: (typeof notifications.value)[number], e: MouseEvent) {
  if (e.button !== 1) return
  const href = itemHref(item)
  if (!href) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  markItemReadOptimistic(item)
  window.open(href, '_blank')
}

function onNotificationKeydown(item: (typeof notifications.value)[number]) {
  const href = itemHref(item)
  if (!href) return
  markItemReadOptimistic(item)
  void navigateTo(href)
}

function kindFromQuery(): NotificationKind | 'other' | 'board' | null {
  const q = route.query.kind
  if (q === 'other') return 'other'
  if (q === 'board') return 'board'
  if (q === 'checkin_post') return 'followed_post'
  const valid: NotificationKind[] = ['comment', 'boost', 'repost', 'follow', 'followed_post', 'followed_article', 'mention', 'nudge', 'coin_transfer', 'poll_results_ready', 'generic', 'status_update', 'checkin_post', 'account_verified', 'premium_started', 'premium_ended']
  return (typeof q === 'string' && valid.includes(q as NotificationKind)) ? (q as NotificationKind) : null
}

let lastDeliveredMarkAt = 0
function markDeliveredInBackground(force = false) {
  if (import.meta.client && document.visibilityState !== 'visible') return
  const now = Date.now()
  if (!force && now - lastDeliveredMarkAt < 1_000) return
  lastDeliveredMarkAt = now
  const account = notificationViewer.value?.id
  void markDelivered().then(() => {
    if (account === notificationViewer.value?.id) void notifBadge.fetchUndeliveredCount()
  }).catch(() => {
    if (account !== notificationViewer.value?.id) return
    notificationReadToast.push({ title: 'Couldn’t acknowledge notifications. Try again.', tone: 'error' })
  })
}

let entrySyncPromise: Promise<void> | null = null
function syncNotificationsOnEntry() {
  if (entrySyncPromise) return entrySyncPromise
  entrySyncPromise = (async () => {
    const badgeCountAtEntry = notifBadge.count.value
    const kind = kindFromQuery()
    const missedWhileAway = pendingRefresh.value
    if (route.query.kind === 'checkin_post') void router.replace({ query: { ...route.query, kind: 'followed_post' } })
    if (kind !== activeKind.value || !hasFetched.value) {
      await setKind(kind)
      notificationsTabReturnGate.markSuccess()
    } else if (badgeCountAtEntry > 0 || missedWhileAway || notificationsTabReturnGate.shouldRefresh()) {
      await fetchList({ forceRefresh: true })
      notificationsTabReturnGate.markSuccess()
    }
    markDeliveredInBackground(true)
  })().finally(() => {
    entrySyncPromise = null
  })
  return entrySyncPromise
}

onMounted(() => {
  void syncNotificationsOnEntry()
})

onActivated(() => {
  visitHighlights.begin()
  void syncNotificationsOnEntry()
})

onDeactivated(() => visitHighlights.end())
onBeforeUnmount(() => visitHighlights.end())
const { user: notificationViewer } = useAuth()
const notificationActivityColor = computed(() => userActionColor(notificationViewer.value))
watch(() => notificationViewer.value?.id, () => {
  visitHighlights.end()
  if (route.path === '/notifications') visitHighlights.begin()
})

watch(() => route.query.kind, async () => {
  const kind = kindFromQuery()
  if (kind !== activeKind.value) {
    await setKind(kind)
  }
})

onUnmounted(() => {
  notifBadge.fetchUndeliveredCount?.()
})

// Refetch list when socket says new notifications arrived (count increased).
// Use forceRefresh so we refetch even when we already have data (user is on the page).
// Only auto-mark delivered if the page is currently visible; if it's a background tab,
// skip so the badge isn't silently cleared before the user returns to the app.
const { notificationUndeliveredCount } = usePresence()
watch(notificationUndeliveredCount, (newVal, oldVal) => {
  if (typeof newVal === 'number' && typeof oldVal === 'number' && newVal > oldVal) {
    // KeepAlive leaves this page mounted on /home. Fetching + mark-delivered
    // there cleared the badge and pendingRefresh, so All stayed stale until
    // a hard refresh. Only treat arrivals as seen while this route is open.
    if (route.path !== '/notifications') return
    if (import.meta.client && document.visibilityState !== 'visible') return
    void fetchList({ forceRefresh: true }).then(() => {
      markDeliveredInBackground(true)
    })
  }
})

// No SSR fetch: notifications use a useState key derived from me.value?.id,
// which may not be resolved during client hydration, causing a state-key mismatch
// and hydration errors. The page is auth-gated so SSR data provides no SEO value.
  return {
    notificationShowsPostRow,
    notificationIsFlatRepost,
    retryFetch,
    onChipSelect,
    chipHasUnseenNotifications,
    nudgeActorIdForItem,
    itemKey,
    onMarkAllRead,
    loadMore,
    isInteractiveTarget,
    markItemReadOptimistic,
    onNotificationInteractionCapture,
    onNotificationClick,
    onNotificationAuxClick,
    onNotificationKeydown,
    kindFromQuery,
    markDeliveredInBackground,
    syncNotificationsOnEntry,
    POST_ROW_KINDS,
    notifBadge,
    notificationsTabReturnGate,
    kindChips,
    router,
    route,
    loadingMore,
    markingAllRead,
    visitHighlights,
    stickyHighlightedItemKeys,
    showInitialLoader,
    nudgeIsTopmostByIndex,
    notificationActorIds,
    presenceAddedIds,
    crewCb,
    groupInviteCb,
    notificationReadToast,
    lastDeliveredMarkAt,
    notificationActivityColor,
    notifications,
    nextCursor,
    loading,
    hasFetched,
    fetchError,
    pendingRefresh,
    activeKind,
    unreadByKind,
    unreadByCategory,
    setKind,
    fetchList,
    markDelivered,
    markReadById,
    markAllRead,
    clearUnreadKind,
    decrementUnreadKind,
    itemHref,
    addInterest,
    removeInterest,
    addCrewCallback,
    removeCrewCallback,
    addGroupInviteCallback,
    removeGroupInviteCallback,
    notificationViewer,
    notificationUndeliveredCount,
    VOICE,
  }
}
