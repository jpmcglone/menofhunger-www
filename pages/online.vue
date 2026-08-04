<template>
  <AppPageContent bottom="standard">
  <div class="w-full">
    <div class="px-4 pt-4 pb-0 sm:pb-6">
      <h1 class="flex items-center gap-2 text-xl font-bold tracking-tight text-green-600 dark:text-green-400">
        <span class="relative flex h-3 w-3 shrink-0" aria-hidden="true">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span class="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        Online now
      </h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
        <span v-if="totalOnline !== null">{{ totalOnline }} {{ totalOnline === 1 ? 'person is' : 'people are' }} online now.</span>
        <span v-else>People currently active or recently around. Updates in real time.</span>
      </p>
    </div>

    <div v-if="error" class="px-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else-if="loading && users.length === 0" class="px-4 py-8 flex justify-center">
      <AppLogoLoader />
    </div>

    <div v-else-if="users.length === 0" class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
      No one here right now.
    </div>

    <TransitionGroup
      v-else
      name="online-users-list"
      tag="div"
      class="divide-y divide-gray-200 dark:divide-zinc-800 transition-opacity duration-150"
    >
      <AppUserRow v-for="u in users" :key="u.id" :user="u" :show-follow-button="true" :platforms="u.platforms" />
    </TransitionGroup>

    <!-- Recently / older online (verified viewers only) -->
    <template v-if="viewerCanSeeLastOnline">
      <div class="px-4 pt-8 pb-2">
        <h2 class="text-base font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Recently
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Men who were online within the last hour.
        </p>
      </div>

      <!-- Only take over the section when there is nothing to show. A failure while
           paginating keeps the rows already on screen and retries inline below. -->
      <div v-if="recentError && recentUsers.length === 0" class="px-4 pb-4">
        <AppInlineAlert severity="danger">
          {{ recentError }}
        </AppInlineAlert>
      </div>

      <div v-else-if="recentLoading && recentUsers.length === 0" class="px-4 py-8 flex justify-center">
        <AppLogoLoader compact />
      </div>

      <div v-else-if="recentUsers.length === 0" class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
        No one recently around.
      </div>

      <template v-else>
        <TransitionGroup
          v-if="recentlyOnlineUsers.length"
          name="online-users-list"
          tag="div"
          class="divide-y divide-gray-200 dark:divide-zinc-800 transition-opacity duration-150"
        >
          <AppUserRow
            v-for="u in recentlyOnlineUsers"
            :key="u.id"
            :user="u"
            :show-follow-button="true"
            :name-meta="recentLastOnlineLabel(u.lastOnlineAt)"
          />
        </TransitionGroup>

        <div v-else class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
          No one in the last hour.
        </div>

        <div v-if="olderOnlineUsers.length" class="px-4 pt-8 pb-2">
          <h2 class="text-base font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Older
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Men who were around earlier.
          </p>
        </div>

        <TransitionGroup
          v-if="olderOnlineUsers.length"
          name="online-users-list"
          tag="div"
          class="divide-y divide-gray-200 dark:divide-zinc-800 transition-opacity duration-150"
        >
          <AppUserRow
            v-for="u in olderOnlineUsers"
            :key="u.id"
            :user="u"
            :show-follow-button="true"
            :name-meta="recentLastOnlineLabel(u.lastOnlineAt)"
          />
        </TransitionGroup>

        <!-- Auto-pagination sentinel. It sits one viewport ahead of the real bottom
             (useLoadMoreObserver's default rootMargin), so the next page is usually
             already in flight by the time the viewer gets there. -->
        <div
          v-if="recentNextCursor"
          class="relative flex justify-center items-center py-6 min-h-12"
        >
          <div
            ref="loadMoreSentinelEl"
            class="absolute bottom-0 left-0 right-0 h-px"
            aria-hidden="true"
          />
          <div v-if="recentLoadMoreFailed" class="flex flex-col items-center gap-2 px-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ recentError || 'Failed to load more.' }}
            </p>
            <Button label="Try again" severity="secondary" rounded @click="loadMoreRecent" />
          </div>
          <div
            v-else
            class="transition-opacity duration-150"
            :class="recentLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'"
            :aria-hidden="!recentLoading"
          >
            <AppLogoLoader compact />
          </div>
        </div>
      </template>
    </template>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { GetPresenceOnlineData, GetPresenceOnlinePageData, GetPresenceRecentData, OnlineUser, RecentlyOnlineUser } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { formatListTime } from '~/utils/time-format'

definePageMeta({
  layout: 'app',
  title: 'Online',
  hideTopBar: true,
  ssr: false,
})

usePageSeo({
  title: 'Online now',
  description: 'People currently active or recently around.',
  canonicalPath: '/online',
  noindex: true,
})

const { apiFetch } = useApiClient()
const {
  subscribeOnlineFeed,
  unsubscribeOnlineFeed,
  addOnlineFeedCallback,
  removeOnlineFeedCallback,
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
const loading = useState<boolean>('online-page-loading', () => true)
const error = useState<string | null>('online-page-error', () => null)

const recentUsers = useState<RecentlyOnlineUser[]>('online-page-recent-users', () => [])
const recentNextCursor = useState<string | null>('online-page-recent-next-cursor', () => null)
const recentLoading = useState<boolean>('online-page-recent-loading', () => false)
const recentError = useState<string | null>('online-page-recent-error', () => null)

const { user: authUser } = useAuth()
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
  if (t === 'now') return '· <1m ago'
  if (/^\d+[mhd]$/.test(t)) return `· ${t} ago`
  return `· ${t}`
}

const feedCallback: {
  onOnline?: (p: { userId: string; user?: OnlineUser; lastConnectAt?: number; platforms?: string[] }) => void
  onOffline?: (p: { userId: string; user?: OnlineUser; lastOnlineAt?: string }) => void
  onSnapshot?: (p: { users: OnlineUser[]; totalOnline?: number }) => void
  onPlatformsChanged?: (p: { userId: string; platforms: string[] }) => void
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
    const recentUser = userData ?? existing
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
      .map((user) => ({
        ...user,
        platforms: user.platforms ?? previousById.get(user.id)?.platforms,
      }))
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
  },
  onPlatformsChanged(payload) {
    users.value = users.value.map((user) =>
      user.id === payload.userId ? { ...user, platforms: payload.platforms } : user,
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
    users.value = online.sort(sortOnlineUsers)
    totalOnline.value =
      typeof res?.pagination?.totalOnline === 'number' ? res.pagination.totalOnline : users.value.length

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
    // Keep "recently online" from becoming stale if this call fails.
    if (viewerCanSeeLastOnline.value) {
      recentUsers.value = []
      recentNextCursor.value = null
    }
  } finally {
    loading.value = false
  }
}

/** Resolves to whether the fetch succeeded, so the caller can stop auto-paginating. */
async function fetchRecent(params?: { cursor?: string | null }): Promise<boolean> {
  if (!viewerCanSeeLastOnline.value) return false
  recentLoading.value = true
  recentError.value = null
  try {
    const res = await apiFetch<GetPresenceRecentData>('/presence/recent', {
      method: 'GET',
      query: {
        limit: 30,
        ...(params?.cursor ? { cursor: params.cursor } : {}),
      },
    })
    const data = res.data ?? []
    addStatusesFromRest(data.map((u) => u.status))
    const next = res.pagination?.nextCursor ?? null
    if (params?.cursor) recentUsers.value = [...recentUsers.value, ...data.filter((u) => !u.isBot)]
    else recentUsers.value = data.filter((u) => !u.isBot)
    recentNextCursor.value = typeof next === 'string' && next.trim() ? next : null
    return true
  } catch (e: unknown) {
    recentError.value = getApiErrorMessage(e) || 'Failed to load recently online.'
    if (!params?.cursor) {
      recentUsers.value = []
      recentNextCursor.value = null
    }
    return false
  } finally {
    recentLoading.value = false
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
  const ok = await fetchRecent({ cursor: recentNextCursor.value })
  recentLoadMoreFailed.value = !ok
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

onMounted(async () => {
  addOnlineFeedCallback(feedCallback)
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
  removeOnlineFeedCallback(feedCallback)
  if (users.value.length > 0) {
    removeInterest(users.value.map((u) => u.id))
  }
})
</script>

<style scoped>
.online-users-list-enter-active,
.online-users-list-leave-active {
  transition: opacity 0.16s ease;
}

.online-users-list-enter-from,
.online-users-list-leave-to {
  opacity: 0;
}

.online-users-list-move {
  transition: transform 0.2s ease;
}
</style>
