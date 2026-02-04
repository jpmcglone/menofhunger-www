import type { ApiEnvelope } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export type CursorFeedBuildRequest = (cursor: string | null) => { path: string; query?: Record<string, unknown> }

export type UseCursorFeedOptions<T> = {
  /** Unique key for useState (and related keys for nextCursor, loading, error). */
  stateKey: string
  /** Returns path and query for the API request. For initial load cursor is null; for loadMore pass the current nextCursor. */
  buildRequest: CursorFeedBuildRequest
  defaultErrorMessage?: string
  loadMoreErrorMessage?: string
  /** Called after a successful fetch (refresh or loadMore) with the new chunk of data. */
  onDataLoaded?: (data: T[]) => void
  /** Called after a successful fetch with the full envelope (e.g. to read pagination.counts). */
  onResponse?: (res: ApiEnvelope<T[]>) => void
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

  async function refresh() {
    if (loading.value) return
    loading.value = true
    error.value = null
    items.value = []
    nextCursor.value = null
    try {
      const { path, query } = options.buildRequest(null)
      const res = await apiFetch<T[]>(path, { method: 'GET', query })
      const data = res.data ?? []
      items.value = data.length ? [...data] : []
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
      items.value = [...items.value, ...data]
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
