import type { BookmarkCollection, CreateBookmarkCollectionResponse, ListBookmarkCollectionsResponse } from '~/types/api'

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

  function bumpCounts(params: {
    prevHas: boolean
    prevCollectionId: string | null
    nextHas: boolean
    nextCollectionId: string | null
  }) {
    const prevHas = Boolean(params.prevHas)
    const nextHas = Boolean(params.nextHas)
    const prevCid = params.prevCollectionId ?? null
    const nextCid = params.nextCollectionId ?? null

    const bumpCollection = (cid: string, delta: number) => {
      const idx = collections.value.findIndex((c) => c.id === cid)
      if (idx < 0) return
      const cur = collections.value[idx]
      if (!cur) return
      const next = Math.max(0, Math.floor((cur.bookmarkCount ?? 0) + delta))
      collections.value[idx] = { ...cur, bookmarkCount: next }
    }

    // Create / delete
    if (!prevHas && nextHas) {
      totalCount.value = Math.max(0, totalCount.value + 1)
      if (!nextCid) unorganizedCount.value = Math.max(0, unorganizedCount.value + 1)
      else bumpCollection(nextCid, +1)
      return
    }
    if (prevHas && !nextHas) {
      totalCount.value = Math.max(0, totalCount.value - 1)
      if (!prevCid) unorganizedCount.value = Math.max(0, unorganizedCount.value - 1)
      else bumpCollection(prevCid, -1)
      return
    }

    // Move between folders/unorganized (no total change)
    if (prevHas && nextHas && prevCid !== nextCid) {
      if (!prevCid) unorganizedCount.value = Math.max(0, unorganizedCount.value - 1)
      else bumpCollection(prevCid, -1)
      if (!nextCid) unorganizedCount.value = Math.max(0, unorganizedCount.value + 1)
      else bumpCollection(nextCid, +1)
    }
  }

  return { collections, totalCount, unorganizedCount, loaded, loading, nameById, ensureLoaded, createCollection, bumpCounts }
}

