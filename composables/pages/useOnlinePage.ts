import { formatCount } from '~/utils/number-format'
import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import type { GetPresenceOnlineData, GetPresenceOnlinePageData, OnlineUser, RecentlyOnlineUser } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { hydrateFollowRelationship } from '~/utils/follow-relationship'
import { formatListTime } from '~/utils/time-format'

export async function useOnlinePage() {


const { apiFetch } = useApiClient()
const {
  subscribeOnlineFeed,
  unsubscribeOnlineFeed,
  addInterest,
  removeInterest,
  addOnlineIdsFromRest,
  addIdleFromRest,
  addStatusesFromRest,
  whenSocketConnected,
} = usePresence()

// IMPORTANT: these must be `useState` (not local refs) because this page SSR-renders.
// Otherwise the client will re-initialize them during hydration and Vue will warn about mismatches.
const users = useState<OnlineUser[]>('online-page-users', () => [])
const totalOnline = useState<number | null>('online-page-total-online', () => null)
const anonymousOnline = useState<number | null>('online-page-anonymous-online', () => null)
const loading = useState<boolean>('online-page-loading', () => true)
const error = useState<string | null>('online-page-error', () => null)

// The first recent page arrives with /presence/online-page; this feed only pages it further.
const recentFeed = useCursorFeed<RecentlyOnlineUser>({
  stateKey: 'online-page-recent-users',
  buildRequest: (cursor) => (cursor && viewerCanSeeLastOnline.value ? { path: '/presence/recent', query: { limit: 30, cursor } } : null),
  mergeOnLoadMore: (incoming) => incoming.filter((u) => !u.isBot),
  onDataLoaded: (data) => addStatusesFromRest(data.map((u) => u.status)),
  defaultErrorMessage: 'Failed to load recently online.',
  loadMoreErrorMessage: 'Failed to load recently online.',
})
const { items: recentUsers, nextCursor: recentNextCursor, loadingMore: recentLoading, error: recentError } = recentFeed

const { user: authUser } = useAuth()
const { membersVisible } = useMembersAccess()

// Server-rendered counts so search results and link previews show the live number.
const ssrCountsRequest = useAsyncData('online-page-counts', () =>
  apiFetch<GetPresenceOnlineData>('/presence/online', { method: 'GET', query: { includeSelf: '1', summary: '1' } })
    .then((res) => ({ total: res?.pagination?.totalOnline ?? 0, guests: res?.pagination?.anonymousOnline ?? 0 }))
    .catch(() => null),
)
const { data: ssrCounts } = ssrCountsRequest
const displayTotal = computed(() => totalOnline.value ?? ssrCounts.value?.total ?? null)
const displayGuests = computed(() => anonymousOnline.value ?? ssrCounts.value?.guests ?? 0)

const onlineSeoDescription = computed(() => {
  const total = displayTotal.value
  if (total === null) return 'See how many men are online on Men of Hunger right now. Updates live.'
  const guests = displayGuests.value
  const guestsText = guests > 0 ? `, plus ${formatCount(guests)} ${guests === 1 ? 'guest' : 'guests'} browsing` : ''
  return `${formatCount(total)} ${total === 1 ? 'man is' : 'men are'} online on Men of Hunger right now${guestsText}. A live count of the brotherhood, updated in real time.`
})

usePageSeo({
  title: "Who's online now",
  description: onlineSeoDescription,
  canonicalPath: '/online',
  image: computed(() => `/og/online.png?v=${displayTotal.value ?? 0}-${displayGuests.value}`),
  imageAlt: computed(() => `${displayTotal.value ?? 0} men online on Men of Hunger right now`),
  imageWidth: 1200,
  imageHeight: 630,
})
const { nowMs } = useNowTicker({ everyMs: 15_000 })
const viewerCanSeeLastOnline = computed(() => Boolean(authUser.value))
const RECENTLY_ONLINE_MS = 60 * 60 * 1000

function lastOnlineMs(lastOnlineAt: string | null): number | null {
  if (!lastOnlineAt) return null
  const value = Date.parse(lastOnlineAt)
  return Number.isFinite(value) ? value : null
}

function isRecentlyOnline(user: RecentlyOnlineUser) {
  const value = lastOnlineMs(user.lastOnlineAt)
  if (value == null) return false
  return nowMs.value - value <= RECENTLY_ONLINE_MS
}

const recentlyOnlineUsers = computed(() => recentUsers.value.filter(isRecentlyOnline))
const olderOnlineUsers = computed(() => recentUsers.value.filter((u) => !isRecentlyOnline(u)))

function recentLastOnlineLabel(lastOnlineAt: string | null) {
  if (!viewerCanSeeLastOnline.value) return null
  const t = formatListTime(lastOnlineAt, nowMs.value)
  if (!t || t === '—') return null
  if (t === 'now') return '<1m ago'
  if (/^\d+[mhd]$/.test(t)) return `${t} ago`
  return t
}

const feedCallback: {
  onOnline?: (p: { userId: string; user?: OnlineUser; lastConnectAt?: number; platforms?: string[] }) => void
  onOffline?: (p: { userId: string; user?: OnlineUser; lastOnlineAt?: string }) => void
  onSnapshot?: (p: { users: OnlineUser[]; totalOnline?: number; anonymousOnline?: number }) => void
  onPlatformsChanged?: (p: { userId: string; platforms: string[] }) => void
  onAnonymousCount?: (p: { anonymousOnline: number }) => void
  onOnlineCount?: (p: { totalOnline: number; anonymousOnline: number }) => void
  onCallChanged?: (p: { userId: string; inCall: boolean }) => void
} = {
  onOnline(payload) {
    const { userId, user: userData, lastConnectAt = Date.now(), platforms } = payload
    if (!userId) return
    // Remove from "recently online" -- they're online now.
    recentUsers.value = recentUsers.value.filter((u) => u.id !== userId)
    const existing = users.value.find((u) => u.id === userId)
    if (existing) {
      users.value = users.value.map((u) => u.id === userId
        ? {
            ...u,
            ...userData,
            relationship: hydrateFollowRelationship(u.relationship, userData?.relationship) ?? u.relationship,
            lastConnectAt,
            platforms: platforms ?? userData?.platforms ?? u.platforms,
          }
        : u).sort(sortOnlineUsers)
      return
    }
    addInterest([userId])
    if (typeof totalOnline.value === 'number') totalOnline.value += 1
    if (userData) {
      const withTime = { ...userData, lastConnectAt, platforms: platforms ?? userData.platforms }
      const next = [withTime, ...users.value].sort(sortOnlineUsers)
      users.value = next
      addStatusesFromRest([withTime.status])
    } else {
      void mergeUserFromRefetch(userId)
    }
  },
  onOffline(payload) {
    const { userId, user: userData, lastOnlineAt } = payload
    if (!userId) return
    const existing = users.value.find((u) => u.id === userId)
    users.value = users.value.filter((u) => u.id !== userId)
    if (typeof totalOnline.value === 'number') totalOnline.value = Math.max(0, totalOnline.value - 1)
    removeInterest([userId])
    const recentUser = userData
      ? {
          ...existing,
          ...userData,
          relationship: hydrateFollowRelationship(existing?.relationship, userData.relationship)
            ?? existing?.relationship
            ?? userData.relationship,
        }
      : existing
    if (recentUser && !recentUser.isBot) {
      recentUsers.value = [
        { ...recentUser, lastOnlineAt: lastOnlineAt ?? new Date().toISOString() },
        ...recentUsers.value.filter((u) => u.id !== userId),
      ]
    }
  },
  onSnapshot(payload) {
    const snap = payload?.users ?? []
    // Replace the online list with the authoritative snapshot (handles reconnect staleness).
    const previousById = new Map(users.value.map((user) => [user.id, user]))
    const snapOnline = (snap as OnlineUser[])
      .map((user) => {
        const prev = previousById.get(user.id)
        return {
          ...prev,
          ...user,
          relationship: hydrateFollowRelationship(prev?.relationship, user.relationship) ?? user.relationship,
          platforms: user.platforms ?? prev?.platforms,
        }
      })
      .sort(sortOnlineUsers)
    users.value = snapOnline
    const ids = snapOnline.map((x) => x.id).filter(Boolean)
    if (ids.length) {
      addOnlineIdsFromRest(ids)
      addStatusesFromRest(snapOnline.map((u) => u.status))
      const idleIds = snapOnline.filter((x) => x.idle && x.id).map((x) => x.id)
      if (idleIds.length) addIdleFromRest(idleIds)
      addInterest(ids)
    }
    // Remove snapshot users from "recently online" -- they're online now.
    const snapIds = new Set(ids)
    if (snapIds.size > 0) {
      recentUsers.value = recentUsers.value.filter((u) => !snapIds.has(u.id))
    }
    if (typeof payload?.totalOnline === 'number') totalOnline.value = payload.totalOnline
    if (typeof payload?.anonymousOnline === 'number') {
      anonymousOnline.value = Math.max(0, Math.floor(payload.anonymousOnline))
    }
  },
  onOnlineCount(payload) {
    totalOnline.value = Math.max(0, Math.floor(payload.totalOnline))
    anonymousOnline.value = Math.max(0, Math.floor(payload.anonymousOnline))
  },
  onAnonymousCount(payload) {
    if (typeof payload?.anonymousOnline !== 'number') return
    anonymousOnline.value = Math.max(0, Math.floor(payload.anonymousOnline))
  },
  onPlatformsChanged(payload) {
    users.value = users.value.map((user) =>
      user.id === payload.userId ? { ...user, platforms: payload.platforms } : user,
    )
  },
  onCallChanged(payload) {
    users.value = users.value.map((user) =>
      user.id === payload.userId ? { ...user, inCall: payload.inCall } : user,
    )
  },
}

function sortOnlineUsers(a: OnlineUser, b: OnlineUser) {
  // Bots (Marv) always pin to the top, even if a real user just connected at the
  // same instant. The API marks Marv with `isBot: true` only when MARV_ENABLED is
  // true, so this guarantees he's the first row whenever he's listed at all.
  if (a.isBot && !b.isBot) return -1
  if (!a.isBot && b.isBot) return 1
  const ta = a.lastConnectAt ?? 0
  const tb = b.lastConnectAt ?? 0
  if (ta !== tb) return tb - ta
  return a.id.localeCompare(b.id)
}

let mergeRefetchTimeout: ReturnType<typeof setTimeout> | null = null
async function mergeUserFromRefetch(userId: string) {
  if (users.value.some((u) => u.id === userId)) return
  if (mergeRefetchTimeout) {
    clearTimeout(mergeRefetchTimeout)
  }
  mergeRefetchTimeout = setTimeout(async () => {
    mergeRefetchTimeout = null
    try {
      const res = await apiFetch<GetPresenceOnlineData>('/presence/online', { method: 'GET', query: { includeSelf: '1' } })
      const fromApi = res?.data ?? []
      const next = [...users.value]
      for (const u of fromApi) {
        if (u.id && !next.some((x) => x.id === u.id)) {
          next.push(u)
        }
      }
      addStatusesFromRest(fromApi.map((u) => u.status))
      if (typeof res?.pagination?.totalOnline === 'number') totalOnline.value = res.pagination.totalOnline
      if (typeof res?.pagination?.anonymousOnline === 'number') {
        anonymousOnline.value = Math.max(0, Math.floor(res.pagination.anonymousOnline))
      }
      if (next.length !== users.value.length) {
        users.value = next.sort(sortOnlineUsers)
        const ids = next.map((u) => u.id).filter(Boolean)
        addOnlineIdsFromRest(ids)
        const idleIds = next.filter((u) => u.idle && u.id).map((u) => u.id)
        if (idleIds.length) addIdleFromRest(idleIds)
        addInterest(ids)
      }
    } catch {
      // Ignore refetch errors
    }
  }, 100)
}

async function fetchOnlinePage() {
  loading.value = true
  error.value = null
  // If the viewer can see "recent", we fetch it in the same call to keep the snapshot consistent.
  if (!viewerCanSeeLastOnline.value) {
    recentUsers.value = []
    recentNextCursor.value = null
  }
  try {
    const res = await apiFetch<GetPresenceOnlinePageData>('/presence/online-page', {
      method: 'GET',
      query: {
        includeSelf: '1',
        ...(viewerCanSeeLastOnline.value ? { recentLimit: 30 } : {}),
      },
    })
    const online = (res?.data?.online ?? []) as OnlineUser[]
    const previousById = new Map(users.value.map((user) => [user.id, user]))
    users.value = online
      .map((user) => {
        const prev = previousById.get(user.id)
        return {
          ...user,
          relationship: hydrateFollowRelationship(prev?.relationship, user.relationship) ?? user.relationship,
        }
      })
      .sort(sortOnlineUsers)
    totalOnline.value =
      typeof res?.pagination?.totalOnline === 'number' ? res.pagination.totalOnline : users.value.length
    anonymousOnline.value =
      typeof res?.pagination?.anonymousOnline === 'number'
        ? Math.max(0, Math.floor(res.pagination.anonymousOnline))
        : anonymousOnline.value

    if (users.value.length > 0) {
      const ids = users.value.map((u) => u.id).filter(Boolean)
      addOnlineIdsFromRest(ids)
      addStatusesFromRest(users.value.map((u) => u.status))
      const idleIds = users.value.filter((u) => u.idle && u.id).map((u) => u.id)
      if (idleIds.length) addIdleFromRest(idleIds)
      addInterest(ids)
    }

    if (viewerCanSeeLastOnline.value) {
      const recent = ((res?.data?.recent ?? []) as RecentlyOnlineUser[]).filter((u) => !u.isBot)
      const next = (res as any)?.pagination?.recentNextCursor ?? null
      recentUsers.value = recent
      addStatusesFromRest(recent.map((u) => u.status))
      recentNextCursor.value = typeof next === 'string' && next.trim() ? next : null
    }
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load online users.'
    users.value = []
    totalOnline.value = null
    anonymousOnline.value = null
    // Keep "recently online" from becoming stale if this call fails.
    if (viewerCanSeeLastOnline.value) {
      recentUsers.value = []
      recentNextCursor.value = null
    }
  } finally {
    loading.value = false
  }
}

/**
 * A failed page leaves the cursor intact and the sentinel on screen, so without
 * this latch the observer would re-fire the moment loading flips false and spin
 * the API in a tight loop. Cleared only when the viewer retries by hand.
 */
const recentLoadMoreFailed = ref(false)

async function loadMoreRecent() {
  if (!viewerCanSeeLastOnline.value) return
  if (!recentNextCursor.value) return
  if (recentLoading.value) return
  // Release the latch up front so a retry shows the inline spinner, not the button.
  recentLoadMoreFailed.value = false
  await recentFeed.loadMore()
  recentLoadMoreFailed.value = Boolean(recentError.value)
}

const loadMoreSentinelEl = ref<HTMLElement | null>(null)
const middleScrollerRef = useMiddleScroller()

useLoadMoreObserver(
  loadMoreSentinelEl,
  middleScrollerRef,
  computed(
    () => Boolean(recentNextCursor.value) && !recentLoading.value && !recentLoadMoreFailed.value,
  ),
  () => {
    void loadMoreRecent()
  },
)

usePresenceCallback('OnlineFeed', feedCallback)
onMounted(async () => {
  // Wait for socket so we're registered before REST returns our listing; subscribe before fetch for real-time.
  await whenSocketConnected(12000)
  subscribeOnlineFeed()

  // If we already have an SSR-hydrated list, ensure presence store is warmed up.
  if (users.value.length > 0) {
    const ids = users.value.map((u) => u.id).filter(Boolean)
    if (ids.length) {
      addOnlineIdsFromRest(ids)
      addStatusesFromRest(users.value.map((u) => u.status))
      const idleIds = users.value.filter((u) => u.idle && u.id).map((u) => u.id)
      if (idleIds.length) addIdleFromRest(idleIds)
      addInterest(ids)
    }
  }

  // Always refetch after socket connect.
  // Reason: presence is tracked in-memory on the API and the viewer may not be counted as "online"
  // until their socket connection is established. SSR can undercount (often showing 0 when only you are online).
  await fetchOnlinePage()
  // If the combined call didn't include recent (or viewer can't see it), keep the existing recent fetch path for load-more only.
})

onBeforeUnmount(() => {
  if (mergeRefetchTimeout) {
    clearTimeout(mergeRefetchTimeout)
    mergeRefetchTimeout = null
  }
  unsubscribeOnlineFeed()
  if (users.value.length > 0) {
    removeInterest(users.value.map((u) => u.id))
  }
})
const loadingInitial = useInitialLoading(loading, () => users.value.length > 0, error)
const recentLoadingInitial = useInitialLoading(recentLoading, () => recentUsers.value.length > 0, recentError)
await ssrCountsRequest
  return {
    recentLastOnlineLabel,
    loadMoreRecent,
    users,
    anonymousOnline,
    loading,
    error,
    displayTotal,
    displayGuests,
    viewerCanSeeLastOnline,
    recentlyOnlineUsers,
    olderOnlineUsers,
    recentLoadMoreFailed,
    loadMoreSentinelEl,
    loadingInitial,
    recentLoadingInitial,
    recentUsers,
    recentNextCursor,
    recentLoading,
    recentError,
    membersVisible,
  }
}
