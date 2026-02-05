import type {
  BookmarkCollection,
  CreateBookmarkCollectionResponse,
  DeleteBookmarkCollectionResponse,
  ListBookmarkCollectionsResponse,
  RenameBookmarkCollectionResponse,
} from '~/types/api'

export function useBookmarkCollections() {
  const { apiFetchData } = useApiClient()

  const collections = useState<BookmarkCollection[]>('bookmark-collections', () => [])
  const totalCount = useState<number>('bookmark-total-count', () => 0)
  const unorganizedCount = useState<number>('bookmark-unorganized-count', () => 0)
  const loaded = useState<boolean>('bookmark-collections-loaded', () => false)
  const loading = useState<boolean>('bookmark-collections-loading', () => false)

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
    try {
      const res = await apiFetchData<ListBookmarkCollectionsResponse>('/bookmarks/collections', { method: 'GET' })
      collections.value = res?.collections ?? []
      totalCount.value = Math.max(0, Math.floor(res?.summary?.totalCount ?? totalCount.value ?? 0))
      unorganizedCount.value = Math.max(0, Math.floor(res?.summary?.unorganizedCount ?? unorganizedCount.value ?? 0))
      loaded.value = true
    } finally {
      loading.value = false
    }
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
      return
    }
    if (prevHas && !nextHas) {
      totalCount.value = Math.max(0, totalCount.value - 1)
      if (prevEmpty) unorganizedCount.value = Math.max(0, unorganizedCount.value - 1)
      for (const cid of prevSet) bumpCollection(cid, -1)
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
    }
  }

  return {
    collections,
    totalCount,
    unorganizedCount,
    loaded,
    loading,
    nameById,
    ensureLoaded,
    createCollection,
    renameCollection,
    deleteCollection,
    bumpCounts,
  }
}

