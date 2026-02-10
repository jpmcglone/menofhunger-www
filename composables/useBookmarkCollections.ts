import type {
  BookmarkCollection,
  CreateBookmarkCollectionResponse,
  DeleteBookmarkCollectionResponse,
  ListBookmarkCollectionsResponse,
  RenameBookmarkCollectionResponse,
} from '~/types/api'

const MOH_BOOKMARKS_SUMMARY_STORAGE_KEY = 'moh.bookmarks.summary.v1'

type PersistedBookmarksSummaryV1 = {
  totalCount: number
  unorganizedCount: number
  updatedAtMs: number
}

function clampCount(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

function readPersistedSummary(): PersistedBookmarksSummaryV1 | null {
  if (!import.meta.client) return null
  try {
    const raw = window.localStorage.getItem(MOH_BOOKMARKS_SUMMARY_STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<PersistedBookmarksSummaryV1> | null
    if (!v || typeof v !== 'object') return null
    const totalCount = clampCount(v.totalCount)
    const unorganizedCount = clampCount(v.unorganizedCount)
    const updatedAtMs = clampCount(v.updatedAtMs)
    return { totalCount, unorganizedCount, updatedAtMs }
  } catch {
    return null
  }
}

function writePersistedSummary(next: { totalCount: number; unorganizedCount: number }) {
  if (!import.meta.client) return
  try {
    const payload: PersistedBookmarksSummaryV1 = {
      totalCount: clampCount(next.totalCount),
      unorganizedCount: clampCount(next.unorganizedCount),
      updatedAtMs: Date.now(),
    }
    window.localStorage.setItem(MOH_BOOKMARKS_SUMMARY_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Best-effort only.
  }
}

function clearPersistedSummary() {
  if (!import.meta.client) return
  try {
    window.localStorage.removeItem(MOH_BOOKMARKS_SUMMARY_STORAGE_KEY)
  } catch {
    // Best-effort only.
  }
}

export function useBookmarkCollections() {
  const { apiFetchData } = useApiClient()

  const collections = useState<BookmarkCollection[]>('bookmark-collections', () => [])
  const persisted = readPersistedSummary()
  // Seed counts from last-known client value so nav indicators don't "settle wrong" on refresh
  // if the initial load races auth/cookies or transiently errors.
  const totalCount = useState<number>('bookmark-total-count', () => clampCount(persisted?.totalCount))
  const unorganizedCount = useState<number>('bookmark-unorganized-count', () => clampCount(persisted?.unorganizedCount))
  const loaded = useState<boolean>('bookmark-collections-loaded', () => false)
  const loading = useState<boolean>('bookmark-collections-loading', () => false)
  const errorMessage = useState<string | null>('bookmark-collections-error', () => null)

  const nameById = computed(() => {
    const m = new Map<string, string>()
    for (const c of collections.value) {
      if (c?.id) m.set(c.id, c.name)
    }
    return m
  })

  async function ensureLoaded(opts?: { force?: boolean }) {
    const force = Boolean(opts?.force)
    if (loaded.value && !force) return
    if (loading.value) return
    loading.value = true
    errorMessage.value = null
    try {
      const res = await apiFetchData<ListBookmarkCollectionsResponse>('/bookmarks/collections', { method: 'GET' })
      collections.value = res?.collections ?? []
      const derivedFromCollections = Array.isArray(collections.value)
        ? collections.value.reduce((acc, c) => acc + clampCount(c?.bookmarkCount), 0)
        : 0

      const nextUnorganized = typeof res?.summary?.unorganizedCount === 'number'
        ? clampCount(res.summary.unorganizedCount)
        : clampCount(unorganizedCount.value)

      const nextTotal = typeof res?.summary?.totalCount === 'number'
        ? clampCount(res.summary.totalCount)
        : Math.max(derivedFromCollections + nextUnorganized, clampCount(totalCount.value))

      totalCount.value = nextTotal
      unorganizedCount.value = nextUnorganized
      loaded.value = true
      writePersistedSummary({ totalCount: totalCount.value, unorganizedCount: unorganizedCount.value })
    } catch (e: unknown) {
      // Keep `loaded=false` so callers can retry (e.g. after auth finishes).
      errorMessage.value = e instanceof Error ? e.message : 'Failed to load bookmarks.'
    } finally {
      loading.value = false
    }
  }

  function reset() {
    collections.value = []
    totalCount.value = 0
    unorganizedCount.value = 0
    loaded.value = false
    loading.value = false
    errorMessage.value = null
    clearPersistedSummary()
  }

  async function createCollection(name: string) {
    const res = await apiFetchData<CreateBookmarkCollectionResponse>('/bookmarks/collections', {
      method: 'POST',
      body: { name },
    })
    const created = res?.collection
    if (created?.id) {
      collections.value = [created, ...collections.value.filter((c) => c.id !== created.id)]
      loaded.value = true
    }
    return created ?? null
  }

  async function renameCollection(id: string, name: string) {
    const cid = (id ?? '').trim()
    if (!cid) return null
    const res = await apiFetchData<RenameBookmarkCollectionResponse>(`/bookmarks/collections/${encodeURIComponent(cid)}`, {
      method: 'PATCH',
      body: { name },
    })
    const updated = res?.collection ?? null
    if (updated?.id) {
      collections.value = collections.value.map((c) => (c.id === updated.id ? updated : c))
      loaded.value = true
    }
    return updated
  }

  async function deleteCollection(id: string) {
    const cid = (id ?? '').trim()
    if (!cid) return false
    const res = await apiFetchData<DeleteBookmarkCollectionResponse>(`/bookmarks/collections/${encodeURIComponent(cid)}`, {
      method: 'DELETE',
    })
    if (res?.success) {
      collections.value = collections.value.filter((c) => c.id !== cid)
      loaded.value = true
      return true
    }
    return false
  }

  function bumpCounts(params: {
    prevHas: boolean
    prevCollectionIds: string[]
    nextHas: boolean
    nextCollectionIds: string[]
  }) {
    const prevHas = Boolean(params.prevHas)
    const nextHas = Boolean(params.nextHas)
    const prevCids = Array.isArray(params.prevCollectionIds) ? params.prevCollectionIds : []
    const nextCids = Array.isArray(params.nextCollectionIds) ? params.nextCollectionIds : []

    const bumpCollection = (cid: string, delta: number) => {
      const idx = collections.value.findIndex((c) => c.id === cid)
      if (idx < 0) return
      const cur = collections.value[idx]
      if (!cur) return
      const next = Math.max(0, Math.floor((cur.bookmarkCount ?? 0) + delta))
      collections.value[idx] = { ...cur, bookmarkCount: next }
    }

    const prevSet = new Set(prevCids.filter(Boolean))
    const nextSet = new Set(nextCids.filter(Boolean))
    const prevEmpty = prevSet.size === 0
    const nextEmpty = nextSet.size === 0

    // Create / delete
    if (!prevHas && nextHas) {
      totalCount.value = Math.max(0, totalCount.value + 1)
      if (nextEmpty) unorganizedCount.value = Math.max(0, unorganizedCount.value + 1)
      for (const cid of nextSet) bumpCollection(cid, +1)
      writePersistedSummary({ totalCount: totalCount.value, unorganizedCount: unorganizedCount.value })
      return
    }
    if (prevHas && !nextHas) {
      totalCount.value = Math.max(0, totalCount.value - 1)
      if (prevEmpty) unorganizedCount.value = Math.max(0, unorganizedCount.value - 1)
      for (const cid of prevSet) bumpCollection(cid, -1)
      writePersistedSummary({ totalCount: totalCount.value, unorganizedCount: unorganizedCount.value })
      return
    }

    // Update folder membership (no total change)
    if (prevHas && nextHas) {
      if (prevEmpty && !nextEmpty) unorganizedCount.value = Math.max(0, unorganizedCount.value - 1)
      if (!prevEmpty && nextEmpty) unorganizedCount.value = Math.max(0, unorganizedCount.value + 1)

      for (const cid of prevSet) {
        if (!nextSet.has(cid)) bumpCollection(cid, -1)
      }
      for (const cid of nextSet) {
        if (!prevSet.has(cid)) bumpCollection(cid, +1)
      }
      writePersistedSummary({ totalCount: totalCount.value, unorganizedCount: unorganizedCount.value })
    }
  }

  return {
    collections,
    totalCount,
    unorganizedCount,
    loaded,
    loading,
    errorMessage,
    nameById,
    ensureLoaded,
    reset,
    createCollection,
    renameCollection,
    deleteCollection,
    bumpCounts,
  }
}

