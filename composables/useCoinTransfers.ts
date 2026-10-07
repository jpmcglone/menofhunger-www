import type { ApiEnvelope, CoinTransferItem } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { useApiClient } from '~/composables/useApiClient'

const HISTORY_ERROR = 'Could not load transfer history.'

/** Viewer's paged coin transfer history. */
export function useCoinTransfers() {
  const feed = useCursorFeed<CoinTransferItem>({
    stateKey: 'coin-transfers',
    stateMode: 'local',
    buildRequest: (cursor) => ({ path: '/coins/transfers', query: cursor ? { cursor, limit: 20 } : { limit: 20 } }),
    defaultErrorMessage: HISTORY_ERROR,
    loadMoreErrorMessage: HISTORY_ERROR,
  })
  const loading = computed(() => feed.loading.value || feed.loadingMore.value)
  // The history card shows one fixed message rather than raw API errors.
  const error = computed(() => (feed.error.value ? HISTORY_ERROR : null))
  return {
    transfers: feed.items,
    nextCursor: feed.nextCursor,
    loading,
    loaded: feed.hasLoaded,
    error,
    refresh: () => feed.refresh(),
    loadMore: feed.loadMore,
  }
}

/** Scans history pages for one transfer; used when the dedicated receipt lookup fails. */
export async function findCoinTransferInHistory(id: string, maxPages = 12): Promise<CoinTransferItem | null> {
  const { apiFetch } = useApiClient()
  let cursor: string | null = null
  for (let page = 0; page < maxPages; page++) {
    const res: ApiEnvelope<CoinTransferItem[]> = await apiFetch<CoinTransferItem[]>('/coins/transfers', {
      method: 'GET',
      query: cursor ? { cursor, limit: 50 } : { limit: 50 },
    })
    const items = Array.isArray(res.data) ? res.data : []
    const found = items.find((t) => t.id === id)
    if (found) return found
    cursor = res.pagination?.nextCursor ?? null
    if (!cursor) return null
  }
  return null
}
