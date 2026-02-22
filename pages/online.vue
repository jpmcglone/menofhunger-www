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
        <span v-if="totalOnline !== null">{{ totalOnline }} {{ totalOnline === 1 ? 'person' : 'people' }} online now.</span>
        <span v-else>People currently active. Updates in real time.</span>
      </p>
    </div>

    <div v-if="error" class="px-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else-if="loading && users.length === 0" class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
      Loading…
    </div>

    <div v-else-if="users.length === 0" class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
      No one online right now.
    </div>

    <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
      <AppUserRow v-for="u in users" :key="u.id" :user="u" :show-follow-button="true" />
    </div>

    <!-- Recently online (verified viewers only) -->
    <template v-if="viewerCanSeeLastOnline">
      <div class="px-4 pt-8 pb-2">
        <h2 class="text-base font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Recently online
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Most recent first.
        </p>
      </div>

      <div v-if="recentError" class="px-4 pb-4">
        <AppInlineAlert severity="danger">
          {{ recentError }}
        </AppInlineAlert>
      </div>

      <div v-else-if="recentLoading && recentUsers.length === 0" class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>

      <div v-else-if="recentUsers.length === 0" class="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
        No one recently online.
      </div>

      <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
        <AppUserRow
          v-for="u in recentUsers"
          :key="u.id"
          :user="u"
          :show-follow-button="true"
          :name-meta="recentLastOnlineLabel(u.lastOnlineAt)"
        />
        <div class="py-4 flex justify-center">
          <Button
            v-if="recentNextCursor"
            label="Load more"
            severity="secondary"
            rounded
            :loading="recentLoading"
            :disabled="recentLoading"
            @click="loadMoreRecent"
          />
        </div>
      </div>
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
})

usePageSeo({
  title: 'Online now',
  description: 'People currently active.',
  canonicalPath: '/online',
  noindex: true,
})

const { apiFetch, apiFetchData } = useApiClient()
const {
  subscribeOnlineFeed,
  unsubscribeOnlineFeed,
  addOnlineFeedCallback,
  removeOnlineFeedCallback,
  addInterest,
  removeInterest,
  addOnlineIdsFromRest,
  addIdleFromRest,
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
const nuxtApp = useNuxtApp()

const { user: authUser } = useAuth()
const { nowMs } = useNowTicker({ everyMs: 15_000 })
const viewerCanSeeLastOnline = computed(() => {
  const status = authUser.value?.verifiedStatus ?? 'none'
  return Boolean(authUser.value?.siteAdmin) || (typeof status === 'string' && status !== 'none')
})

function recentLastOnlineLabel(lastOnlineAt: string | null) {
  if (!viewerCanSeeLastOnline.value) return null
  const t = formatListTime(lastOnlineAt, nowMs.value)
  if (!t || t === '—') return null
  if (t === 'now') return '· <1m ago'
  if (/^\d+[mhd]$/.test(t)) return `· ${t} ago`
  return `· ${t}`
}

const feedCallback: {
  onOnline?: (p: { userId: string; user?: OnlineUser; lastConnectAt?: number }) => void
  onOffline?: (p: { userId: string }) => void
  onSnapshot?: (p: { users: OnlineUser[]; totalOnline?: number }) => void
} = {
  onOnline(payload) {
    const { userId, user: userData, lastConnectAt = Date.now() } = payload
    if (!userId) return
    // Remove from "recently online" -- they're online now.
    recentUsers.value = recentUsers.value.filter((u) => u.id !== userId)
    if (users.value.some((u) => u.id === userId)) return
    addInterest([userId])
    if (typeof totalOnline.value === 'number') totalOnline.value += 1
    if (userData) {
      const withTime = { ...userData, lastConnectAt }
      const next = [withTime, ...users.value].sort(sortByRecent)
      users.value = next
    } else {
      void mergeUserFromRefetch(userId)
    }
  },
  onOffline(payload) {
    const { userId } = payload
    if (!userId) return
    users.value = users.value.filter((u) => u.id !== userId)
    if (typeof totalOnline.value === 'number') totalOnline.value = Math.max(0, totalOnline.value - 1)
    removeInterest([userId])
  },
  onSnapshot(payload) {
    const snap = payload?.users ?? []
    // Replace the online list with the authoritative snapshot (handles reconnect staleness).
    const snapOnline = (snap as OnlineUser[]).sort(sortByRecent)
    users.value = snapOnline
    const ids = snapOnline.map((x) => x.id).filter(Boolean)
    if (ids.length) {
      addOnlineIdsFromRest(ids)
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
}

function sortByRecent(a: OnlineUser, b: OnlineUser) {
  const ta = a.lastConnectAt ?? 0
  const tb = b.lastConnectAt ?? 0
  return tb - ta
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
      if (typeof res?.pagination?.totalOnline === 'number') totalOnline.value = res.pagination.totalOnline
      if (next.length !== users.value.length) {
        users.value = next.sort(sortByRecent)
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

async function fetchOnline() {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch<GetPresenceOnlineData>('/presence/online', { method: 'GET', query: { includeSelf: '1' } })
    users.value = (res?.data ?? []).sort(sortByRecent)
    totalOnline.value = typeof res?.pagination?.totalOnline === 'number' ? res.pagination.totalOnline : users.value.length
    if (users.value.length > 0) {
      const ids = users.value.map((u) => u.id).filter(Boolean)
      addOnlineIdsFromRest(ids)
      const idleIds = users.value.filter((u) => u.idle && u.id).map((u) => u.id)
      if (idleIds.length) addIdleFromRest(idleIds)
      addInterest(ids)
    }
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load online users.'
    users.value = []
    totalOnline.value = null
  } finally {
    loading.value = false
  }
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
    users.value = online.sort(sortByRecent)
    totalOnline.value =
      typeof res?.pagination?.totalOnline === 'number' ? res.pagination.totalOnline : users.value.length

    if (users.value.length > 0) {
      const ids = users.value.map((u) => u.id).filter(Boolean)
      addOnlineIdsFromRest(ids)
      const idleIds = users.value.filter((u) => u.idle && u.id).map((u) => u.id)
      if (idleIds.length) addIdleFromRest(idleIds)
      addInterest(ids)
    }

    if (viewerCanSeeLastOnline.value) {
      const recent = (res?.data?.recent ?? []) as RecentlyOnlineUser[]
      const next = (res as any)?.pagination?.recentNextCursor ?? null
      recentUsers.value = recent
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

async function fetchRecent(params?: { cursor?: string | null }) {
  if (!viewerCanSeeLastOnline.value) return
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
    const next = res.pagination?.nextCursor ?? null
    if (params?.cursor) recentUsers.value = [...recentUsers.value, ...data]
    else recentUsers.value = data
    recentNextCursor.value = typeof next === 'string' && next.trim() ? next : null
  } catch (e: unknown) {
    recentError.value = getApiErrorMessage(e) || 'Failed to load recently online.'
    if (!params?.cursor) {
      recentUsers.value = []
      recentNextCursor.value = null
    }
  } finally {
    recentLoading.value = false
  }
}

async function loadMoreRecent() {
  if (!viewerCanSeeLastOnline.value) return
  if (!recentNextCursor.value) return
  if (recentLoading.value) return
  await fetchRecent({ cursor: recentNextCursor.value })
}

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

// SSR: prefetch lists so the first HTML paint contains real data (reduces flicker).
if (import.meta.server) {
  if (viewerCanSeeLastOnline.value) {
    await fetchRecent()
  }
}

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
