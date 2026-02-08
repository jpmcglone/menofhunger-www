<template>
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
  </div>
</template>

<script setup lang="ts">
import type { OnlineUser } from '~/types/api'
import type { ApiEnvelope, GetPresenceOnlineData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Online',
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

const users = ref<OnlineUser[]>([])
const totalOnline = ref<number | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const feedCallback: {
  onOnline?: (p: { userId: string; user?: OnlineUser; lastConnectAt?: number }) => void
  onOffline?: (p: { userId: string }) => void
  onSnapshot?: (p: { users: OnlineUser[]; totalOnline?: number }) => void
} = {
  onOnline(payload) {
    const { userId, user: userData, lastConnectAt = Date.now() } = payload
    if (!userId) return
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
    const next = [...users.value]
    for (const u of snap) {
      if (u.id && !next.some((x) => x.id === u.id)) {
        next.push(u as OnlineUser)
      }
    }
    if (next.length !== users.value.length) {
      users.value = next.sort(sortByRecent)
      const ids = next.map((x) => x.id).filter(Boolean)
      addOnlineIdsFromRest(ids)
      const idleIds = (snap as OnlineUser[]).filter((x) => x.idle && x.id).map((x) => x.id)
      if (idleIds.length) addIdleFromRest(idleIds)
      addInterest(ids)
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
      const res = await apiFetch<GetPresenceOnlineData>('/presence/online', { method: 'GET' })
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
    const res = await apiFetch<GetPresenceOnlineData>('/presence/online', { method: 'GET' })
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

onMounted(async () => {
  console.log('[presence] online page MOUNTED')
  addOnlineFeedCallback(feedCallback)
  // Wait for socket so we're registered before REST returns our listing; subscribe before fetch for real-time.
  await whenSocketConnected(12000)
  console.log('[presence] online page: socket ready, subscribing to feed')
  subscribeOnlineFeed()
  await fetchOnline()
  console.log('[presence] online page: fetch complete, users=', users.value.length)
})

onBeforeUnmount(() => {
  console.log('[presence] online page UNMOUNTING')
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
