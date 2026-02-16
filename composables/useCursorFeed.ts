import type { ApiEnvelope } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import type { MohApiQuery } from '~/composables/useApiClient'

export type CursorFeedBuildRequest = (cursor: string | null) => { path: string; query?: MohApiQuery }

export type UseCursorFeedOptions<T> = {
  /** Unique key for useState (and related keys for nextCursor, loading, error). */
  stateKey: string
  /** Returns path and query for the API request. For initial load cursor is null; for loadMore pass the current nextCursor. */
  buildRequest: CursorFeedBuildRequest
  defaultErrorMessage?: string
  loadMoreErrorMessage?: string
  /** Optional stable ID getter used to dedupe appended pages (prevents cursor-boundary overlap duplicates). */
  getItemId?: (item: T) => string | number | null | undefined
  /** Called after a successful fetch (refresh or loadMore) with the new chunk of data. */
  onDataLoaded?: (data: T[]) => void
  /** Called after a successful fetch with the full envelope (e.g. to read pagination.counts). */
  onResponse?: (res: ApiEnvelope<T[]>) => void
  /**
   * Optional merge hook used by `refresh` to reconcile incoming server items with existing local state
   * (for example, preserving optimistic rows until the backend catches up).
   */
  mergeOnRefresh?: (incoming: T[], existing: T[]) => T[]
}

/**
 * Shared composable for cursor-paginated API lists. Exposes items, nextCursor, loading, error, refresh, and loadMore.
 * Use for posts feeds, bookmarks, and any endpoint that returns { data: T[], pagination?: { nextCursor } }.
 */
export function useCursorFeed<T>(options: UseCursorFeedOptions<T>) {
  const { apiFetch } = useApiClient()
  const stateKey = options.stateKey
  const items = useState<T[]>(stateKey, () => [])
  const nextCursor = useState<string | null>(`${stateKey}-next`, () => null)
  const loading = useState<boolean>(`${stateKey}-loading`, () => false)
  const error = useState<string | null>(`${stateKey}-error`, () => null)

  const defaultError = options.defaultErrorMessage ?? 'Failed to load.'
  const loadMoreError = options.loadMoreErrorMessage ?? 'Failed to load more.'

  function mergeUnique(existing: T[], incoming: T[]): T[] {
    const getId = options.getItemId
    if (!getId) return [...existing, ...incoming]
    const seen = new Set<string | number>()
    for (const it of existing) {
      const id = getId(it)
      if (typeof id === 'string' || typeof id === 'number') seen.add(id)
    }
    const out = [...existing]
    for (const it of incoming) {
      const id = getId(it)
      if (typeof id === 'string' || typeof id === 'number') {
        if (seen.has(id)) continue
        seen.add(id)
      }
      out.push(it)
    }
    return out
  }

  async function refresh() {
    if (loading.value) return
    loading.value = true
    error.value = null
    const existing = items.value
    try {
      const { path, query } = options.buildRequest(null)
      const res = await apiFetch<T[]>(path, { method: 'GET', query })
      const data = res.data ?? []
      items.value = options.mergeOnRefresh
        ? options.mergeOnRefresh(data, existing)
        : (data.length ? [...data] : [])
      nextCursor.value = res.pagination?.nextCursor ?? null
      options.onDataLoaded?.(data)
      options.onResponse?.(res)
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || defaultError
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (loading.value) return
    if (!nextCursor.value) return
    loading.value = true
    error.value = null
    try {
      const { path, query } = options.buildRequest(nextCursor.value)
      const res = await apiFetch<T[]>(path, { method: 'GET', query })
      const data = res.data ?? []
      items.value = mergeUnique(items.value, data)
      nextCursor.value = res.pagination?.nextCursor ?? null
      options.onDataLoaded?.(data)
      options.onResponse?.(res)
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || loadMoreError
    } finally {
      loading.value = false
    }
  }

  return { items, nextCursor, loading, error, refresh, loadMore }
}
