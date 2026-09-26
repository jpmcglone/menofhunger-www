import type { MembersMapState, MembersMapSummary, MembersMapUser } from '~/types/api'
import type { OnlineFeedCallback } from '~/composables/presence/types'
import { getApiErrorMessage } from '~/utils/api-error'

/** `none` is the bucket for members without a location. */
export type MembersMapBucket = string | 'none'

const MEMBERS_PAGE = 60
const REFETCH_DEBOUNCE_MS = 1500

/**
 * Summary + per-state members for the members map. HTTP catches the page up on
 * mount/activation; the online feed keeps online counts live. An online member
 * whose state we don't know yet triggers one debounced summary refetch.
 *
 * Signed-out and unverified viewers get counts only (`membersVisible: false`): no
 * faces, no ids. Their feed sends count changes, and each one refetches the
 * (server-cached) counts summary.
 */
export function useMembersMap(opts: { initial?: MembersMapSummary | null } = {}) {
  const { apiFetch, apiFetchData } = useApiClient()
  const {
    subscribeOnlineFeed,
    unsubscribeOnlineFeed,
    addOnlineFeedCallback,
    removeOnlineFeedCallback,
    addOnlineIdsFromRest,
    whenSocketConnected,
  } = usePresence()

  const summary = ref<MembersMapSummary | null>(null)
  const membersVisible = computed(() => summary.value?.membersVisible === true)
  let lastFetchedAt = 0
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** userId → state (null = no location) for everyone currently online. */
  const onlineStates = ref(new Map<string, string | null>())
  /** Every userId whose state we have seen, from previews, member pages, and online entries. */
  const knownStates = new Map<string, string | null>()
  /** Online ids the last summary did not include (bots, unfinished accounts); skip until the next fetch. */
  let ignored = new Set<string>()

  const states = computed<MembersMapState[]>(() => {
    if (!membersVisible.value) return summary.value?.states ?? []
    const online = new Map<string, number>()
    for (const st of onlineStates.value.values()) if (st) online.set(st, (online.get(st) ?? 0) + 1)
    return (summary.value?.states ?? []).map((s) => ({ ...s, onlineCount: online.get(s.state) ?? 0 }))
  })

  const totals = computed(() => {
    const t = summary.value?.totals
    if (!membersVisible.value) {
      return {
        members: t?.members ?? 0,
        states: t?.states ?? 0,
        unlocated: t?.unlocated ?? 0,
        online: t?.online ?? 0,
        unlocatedOnline: t?.unlocatedOnline ?? 0,
      }
    }
    let unlocatedOnline = 0
    for (const st of onlineStates.value.values()) if (!st) unlocatedOnline++
    return {
      members: t?.members ?? 0,
      states: t?.states ?? 0,
      unlocated: t?.unlocated ?? 0,
      online: onlineStates.value.size,
      unlocatedOnline,
    }
  })

  function remember(users: MembersMapUser[], state: string | null) {
    for (const u of users) knownStates.set(u.id, state)
  }

  async function fetchSummary() {
    loading.value = true
    error.value = null
    try {
      applySummary(await apiFetchData<MembersMapSummary>('/users/map', { method: 'GET' }))
    } catch (e) {
      error.value = getApiErrorMessage(e) || 'Failed to load the map.'
    } finally {
      loading.value = false
    }
  }

  function applySummary(data: MembersMapSummary) {
    summary.value = data
    lastFetchedAt = Date.now()
    for (const s of data.states) remember(s.preview, s.state)
    remember(data.unlocatedPreview, null)
    const next = new Map<string, string | null>()
    for (const o of data.online) {
      knownStates.set(o.userId, o.state)
      next.set(o.userId, o.state)
    }
    onlineStates.value = next
    ignored = new Set()
    if (mounted) seedPresence()
  }

  // Presence-driven rings aren't in the server HTML, so only seed after mount (hydration-safe).
  let mounted = false
  function seedPresence() {
    const ids = summary.value?.online.map((o) => o.userId) ?? []
    if (ids.length) addOnlineIdsFromRest(ids)
  }

  if (opts.initial) applySummary(opts.initial)

  let refetchTimer: ReturnType<typeof setTimeout> | null = null
  function scheduleRefetch() {
    if (refetchTimer) return
    refetchTimer = setTimeout(() => {
      refetchTimer = null
      void fetchSummary()
    }, REFETCH_DEBOUNCE_MS)
  }

  function markOnline(userId: string, isBot?: boolean) {
    if (!membersVisible.value || isBot || ignored.has(userId)) return
    if (knownStates.has(userId)) {
      const next = new Map(onlineStates.value)
      next.set(userId, knownStates.get(userId) ?? null)
      onlineStates.value = next
    } else {
      ignored.add(userId)
      scheduleRefetch()
    }
  }

  const feedCallback: OnlineFeedCallback = {
    onOnline(payload) {
      if (payload?.userId) markOnline(payload.userId, payload.user?.isBot)
    },
    onOffline(payload) {
      if (!payload?.userId || !onlineStates.value.has(payload.userId)) return
      const next = new Map(onlineStates.value)
      next.delete(payload.userId)
      onlineStates.value = next
    },
    onSnapshot(payload) {
      if (payload?.membersVisible === false || !membersVisible.value) {
        // The summary we just loaded is already current; only refetch if it has gone stale.
        if (Date.now() - lastFetchedAt > REFETCH_DEBOUNCE_MS * 2) scheduleRefetch()
        return
      }
      const next = new Map<string, string | null>()
      let unknown = false
      for (const u of payload?.users ?? []) {
        if (u.isBot || ignored.has(u.id)) continue
        if (knownStates.has(u.id)) next.set(u.id, knownStates.get(u.id) ?? null)
        else unknown = true
      }
      onlineStates.value = next
      if (unknown) scheduleRefetch()
    },
    onOnlineCount() {
      scheduleRefetch()
    },
  }

  // ─── Members of one state (or the no-location bucket) ────────────────────
  const bucket = ref<MembersMapBucket | null>(null)
  const bucketMembers = ref<MembersMapUser[]>([])
  const bucketCursor = ref<string | null>(null)
  const bucketLoading = ref(false)
  const bucketError = ref<string | null>(null)
  let bucketRequest = 0

  async function loadBucket(next: MembersMapBucket | null, opts: { more?: boolean } = {}) {
    if (!next) {
      bucket.value = null
      bucketMembers.value = []
      bucketCursor.value = null
      bucketError.value = null
      return
    }
    const more = Boolean(opts.more && next === bucket.value && bucketCursor.value)
    if (!more) {
      bucket.value = next
      bucketMembers.value = []
      bucketCursor.value = null
    }
    // Counts-only viewers see the bucket's numbers from the summary; the member list is verified-only.
    if (!membersVisible.value) return
    const request = ++bucketRequest
    bucketLoading.value = true
    bucketError.value = null
    try {
      const res = await apiFetch<MembersMapUser[]>('/users/map/members', {
        method: 'GET',
        query: { state: next, limit: MEMBERS_PAGE, ...(more && bucketCursor.value ? { cursor: bucketCursor.value } : {}) },
      })
      if (request !== bucketRequest) return
      const page = res.data ?? []
      remember(page, next === 'none' ? null : next)
      const seen = new Set(bucketMembers.value.map((u) => u.id))
      bucketMembers.value = [...bucketMembers.value, ...page.filter((u) => !seen.has(u.id))]
      const cursor = res.pagination?.nextCursor
      bucketCursor.value = typeof cursor === 'string' && cursor ? cursor : null
    } catch (e) {
      if (request !== bucketRequest) return
      bucketError.value = getApiErrorMessage(e) || 'Failed to load members.'
    } finally {
      if (request === bucketRequest) bucketLoading.value = false
    }
  }

  /** Online members first, otherwise in server order (most recently active first). */
  const sortedBucketMembers = computed(() => {
    const online = onlineStates.value
    const on: MembersMapUser[] = []
    const off: MembersMapUser[] = []
    for (const u of bucketMembers.value) (online.has(u.id) ? on : off).push(u)
    return [...on, ...off]
  })

  let subscribed = false
  async function start() {
    mounted = true
    seedPresence()
    addOnlineFeedCallback(feedCallback)
    if (!summary.value) await fetchSummary()
    await whenSocketConnected(12000)
    if (!subscribed) {
      subscribeOnlineFeed()
      subscribed = true
    }
  }

  function stop() {
    if (refetchTimer) clearTimeout(refetchTimer)
    refetchTimer = null
    removeOnlineFeedCallback(feedCallback)
    if (subscribed) unsubscribeOnlineFeed()
    subscribed = false
  }

  onMounted(() => {
    void start()
  })
  onActivated(() => {
    if (summary.value) void fetchSummary()
  })
  onBeforeUnmount(stop)

  return {
    summary,
    membersVisible,
    states,
    totals,
    loading,
    error,
    onlineStates,
    fetchSummary,
    bucket,
    bucketMembers: sortedBucketMembers,
    bucketCursor,
    bucketLoading,
    bucketError,
    loadBucket,
  }
}
