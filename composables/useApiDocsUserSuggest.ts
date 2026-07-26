import type { SearchUserResult } from '~/types/api'

const MIN_QUERY_LENGTH = 1
const DEBOUNCE_MS = 200
const LIMIT = 6

/**
 * Username suggestions for the API docs "Try it" widget.
 *
 * Backed by `GET /search?type=users`, which answers anonymous callers and already
 * excludes banned accounts server-side, so every suggestion resolves to a real
 * public profile. Results without a username are dropped — they can't be addressed
 * through `/public/users/:usernameOrId`.
 */
export function useApiDocsUserSuggest() {
  const { apiFetchData } = useApiClient()

  const results = ref<SearchUserResult[]>([])
  const open = ref(false)
  const highlighted = ref(-1)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let inFlight: AbortController | null = null
  let latestRequest = 0

  function cancelPending() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    inFlight?.abort()
    inFlight = null
  }

  function close() {
    cancelPending()
    open.value = false
    highlighted.value = -1
  }

  function clear() {
    close()
    results.value = []
  }

  async function fetchUsers(query: string, requestId: number) {
    const controller = new AbortController()
    inFlight = controller
    try {
      const users = await apiFetchData<SearchUserResult[]>('/search', {
        query: { type: 'users', q: query, limit: LIMIT },
        signal: controller.signal,
      })
      // A slower earlier request must never overwrite a newer one.
      if (requestId !== latestRequest) return
      results.value = users.filter((user) => Boolean(user.username))
      open.value = results.value.length > 0
      highlighted.value = -1
    } catch {
      if (requestId !== latestRequest) return
      results.value = []
      open.value = false
    } finally {
      if (inFlight === controller) inFlight = null
    }
  }

  function search(rawQuery: string) {
    cancelPending()
    const query = rawQuery.trim()
    if (query.length < MIN_QUERY_LENGTH) {
      clear()
      return
    }
    const requestId = ++latestRequest
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void fetchUsers(query, requestId)
    }, DEBOUNCE_MS)
  }

  function move(delta: number) {
    const count = results.value.length
    if (!open.value || count === 0) return
    if (highlighted.value < 0) {
      highlighted.value = delta > 0 ? 0 : count - 1
      return
    }
    highlighted.value = (highlighted.value + delta + count) % count
  }

  onBeforeUnmount(cancelPending)

  return { results, open, highlighted, search, move, close, clear }
}
