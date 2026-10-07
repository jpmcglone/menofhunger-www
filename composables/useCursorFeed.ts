import type { ComputedRef, Ref } from 'vue'
import type { ApiEnvelope } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useApiClient, type MohApiQuery } from '~/composables/useApiClient'

export type CursorFeedRequest = { path: string; query?: MohApiQuery; mohDedupe?: boolean }

/** Return `null` when there is nothing to fetch (e.g. an empty search); the feed resolves empty. */
export type CursorFeedBuildRequest = (cursor: string | null) => CursorFeedRequest | null

export type UseCursorFeedOptions<T> = {
  /** Unique key for useState (and related keys for nextCursor, loading, error). */
  stateKey: string
  /** Use Nuxt shared state (`useState`) or local refs. */
  stateMode?: 'state' | 'local'
  /** Local mode only: deep-reactive items for callers that mutate rows in place (default shallow). */
  deep?: boolean
  /** Returns path and query for the API request. For initial load cursor is null; for loadMore pass the current nextCursor. */
  buildRequest: CursorFeedBuildRequest
  defaultErrorMessage?: string
  loadMoreErrorMessage?: string
  /** Override how a thrown error becomes the visible message (default: API message, then the defaults above). */
  formatError?: (e: unknown) => string
  /** Clear items and cursor when a refresh fails (default keeps the last good rows). */
  clearOnError?: boolean
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
  /**
   * Optional hook called on `loadMore` before new items are appended to existing ones.
   * Use for cross-page deduplication logic that requires knowledge of the item shape
   * (e.g. dropping a post whose content is already visible via an embedded repost shell).
   * The result is then fed into `mergeUnique` for final ID-based dedup.
   */
  mergeOnLoadMore?: (incoming: T[], existing: T[]) => T[]
}

export type CursorFeedRefreshOptions = {
  /** Clear current rows before fetching (filters that must not show stale rows while loading). */
  reset?: boolean
}

export type CursorFeed<T> = {
  items: Ref<T[]>
  nextCursor: Ref<string | null>
  loading: Ref<boolean>
  loadingMore: Ref<boolean>
  hasLoaded: Ref<boolean>
  initialLoading: ComputedRef<boolean>
  hasMore: ComputedRef<boolean>
  error: Ref<string | null>
  refresh: (opts?: CursorFeedRefreshOptions) => Promise<void>
  loadMore: () => Promise<void>
  reset: () => void
  /** Drop in-flight responses (e.g. a realtime event made them stale) without clearing rows. */
  invalidate: () => void
}

/**
 * Shared composable for cursor-paginated API lists. Exposes items, nextCursor, loading, error, refresh, and loadMore.
 * Use for posts feeds, bookmarks, and any endpoint that returns { data: T[], pagination?: { nextCursor } }.
 */
export function useCursorFeed<T>(options: UseCursorFeedOptions<T>): CursorFeed<T> {
  const { apiFetch } = useApiClient()
  const stateKey = options.stateKey
  const stateMode = options.stateMode ?? 'state'
  const items: Ref<T[]> = stateMode === 'state' ? useState<T[]>(stateKey, () => []) : (options.deep ? ref([]) as Ref<T[]> : shallowRef<T[]>([]))
  const nextCursor: Ref<string | null> = stateMode === 'state' ? useState<string | null>(`${stateKey}-next`, () => null) : ref<string | null>(null)
  const loading: Ref<boolean> = stateMode === 'state' ? useState<boolean>(`${stateKey}-loading`, () => false) : ref(false)
  const loadingMore: Ref<boolean> = stateMode === 'state' ? useState<boolean>(`${stateKey}-loading-more`, () => false) : ref(false)
  const error: Ref<string | null> = stateMode === 'state' ? useState<string | null>(`${stateKey}-error`, () => null) : ref<string | null>(null)
  const hasLoaded = stateMode === 'state' ? useState<boolean>(`${stateKey}-loaded`, () => false) : ref(false)
  const initialLoading = computed(() => !hasLoaded.value && !error.value && items.value.length === 0)
  const hasMore = computed(() => nextCursor.value !== null)
  let refreshPromise: Promise<void> | null = null
  let refreshQueued = false
  let queuedReset = false
  // Bumped by refresh/reset so an in-flight loadMore from an older query cannot append.
  let generation = 0

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

  function fetchPage(request: CursorFeedRequest) {
    return apiFetch<T[]>(request.path, {
      method: 'GET',
      query: request.query,
      ...(request.mohDedupe === undefined ? {} : { mohDedupe: request.mohDedupe }),
    })
  }

  function invalidate() {
    generation++
  }

  function reset() {
    generation++
    items.value = []
    nextCursor.value = null
    error.value = null
    hasLoaded.value = false
    loadingMore.value = false
  }

  async function refresh(opts: CursorFeedRefreshOptions = {}) {
    // Deterministic behavior under rapid filter/sort/scope changes:
    // if a refresh is in-flight, queue one more pass so latest state wins.
    if (loading.value || refreshPromise) {
      refreshQueued = true
      if (opts.reset) queuedReset = true
      if (refreshPromise) {
        await refreshPromise
      }
      return
    }

    refreshPromise = (async () => {
      loading.value = true
      let clear = Boolean(opts.reset)
      try {
        do {
          refreshQueued = false
          clear = clear || queuedReset
          queuedReset = false
          const pass = ++generation
          loadingMore.value = false
          error.value = null
          if (clear) {
            items.value = []
            nextCursor.value = null
            clear = false
          }
          const existing = items.value
          try {
            const request = options.buildRequest(null)
            if (!request) {
              items.value = []
              nextCursor.value = null
              continue
            }
            const res = await fetchPage(request)
            if (refreshQueued || pass !== generation) continue
            const data = res.data ?? []
            items.value = options.mergeOnRefresh
              ? options.mergeOnRefresh(data, existing)
              : (data.length ? [...data] : [])
            nextCursor.value = res.pagination?.nextCursor ?? null
            options.onDataLoaded?.(data)
            options.onResponse?.(res)
          } catch (e: unknown) {
            if (refreshQueued || pass !== generation) continue
            error.value = options.formatError?.(e) ?? (getApiErrorMessage(e) || defaultError)
            if (options.clearOnError) {
              items.value = []
              nextCursor.value = null
            }
          }
        } while (refreshQueued)
      } finally {
        hasLoaded.value = true
        loading.value = false
        refreshPromise = null
      }
    })()

    await refreshPromise
  }

  async function loadMore() {
    if (loading.value || loadingMore.value) return
    if (!nextCursor.value) return
    const request = options.buildRequest(nextCursor.value)
    if (!request) return
    const startedAt = generation
    loadingMore.value = true
    error.value = null
    try {
      const res = await fetchPage(request)
      if (startedAt !== generation) return
      const data = res.data ?? []
      const filtered = options.mergeOnLoadMore ? options.mergeOnLoadMore(data, items.value) : data
      items.value = mergeUnique(items.value, filtered)
      nextCursor.value = res.pagination?.nextCursor ?? null
      options.onDataLoaded?.(data)
      options.onResponse?.(res)
    } catch (e: unknown) {
      if (startedAt !== generation) return
      error.value = options.formatError?.(e) ?? (getApiErrorMessage(e) || loadMoreError)
    } finally {
      if (startedAt === generation) loadingMore.value = false
    }
  }

  return { items, nextCursor, loading, loadingMore, hasLoaded, initialLoading, hasMore, error, refresh, loadMore, reset, invalidate }
}

export type CursorFeedStreamOptions<T> = Omit<UseCursorFeedOptions<T>, 'stateKey' | 'stateMode'>

/**
 * Several independently paged lists owned by one surface (e.g. spotlight + search, followers + following).
 * Each stream gets its own cursor, loading and error state under `${stateKey}-${name}`.
 */
export function useCursorFeeds<M extends Record<string, unknown>>(options: {
  stateKey: string
  stateMode?: 'state' | 'local'
  streams: { [K in keyof M]: CursorFeedStreamOptions<M[K]> }
}): { [K in keyof M]: CursorFeed<M[K]> } {
  const out = {} as { [K in keyof M]: CursorFeed<M[K]> }
  for (const name of Object.keys(options.streams) as Array<keyof M & string>) {
    out[name] = useCursorFeed<M[typeof name]>({
      ...options.streams[name],
      stateKey: `${options.stateKey}-${name}`,
      stateMode: options.stateMode,
    })
  }
  return out
}
