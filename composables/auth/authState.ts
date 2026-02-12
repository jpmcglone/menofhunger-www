/**
 * Centralized auth state reset utilities.
 *
 * IMPORTANT:
 * - Must not depend on `useApiClient()` (to avoid circular deps).
 * - Safe to call on server (it will just touch per-request Nuxt state).
 */
export function clearAuthClientState(params?: { resetViewerCaches?: boolean }) {
  const resetViewerCaches = params?.resetViewerCaches ?? true
  const prevUser = useState<any>('auth-user', () => null).value
  const prevUserId = typeof prevUser?.id === 'string' ? prevUser.id : ''
  const prevUsername = typeof prevUser?.username === 'string' ? prevUser.username.trim().toLowerCase() : ''

  // Auth user/session state
  useState<any>('auth-user', () => null).value = null
  // Mark that we attempted auth so middleware/components don't spam /auth/me.
  useState<boolean>('auth-did-attempt', () => false).value = true
  // Prevent duplicate init work on client.
  useState<boolean>('auth-init-done', () => false).value = true

  if (!resetViewerCaches) return

  // Viewer-specific client caches so we never show stale authed-only data.
  // (Safe even if these stores haven't been initialized yet.)
  useState<any[]>('bookmark-collections', () => []).value = []
  useState<number>('bookmark-total-count', () => 0).value = 0
  useState<number>('bookmark-unorganized-count', () => 0).value = 0
  useState<boolean>('bookmark-collections-loaded', () => false).value = false
  useState<boolean>('bookmark-collections-loading', () => false).value = false
  useState<string | null>('bookmark-collections-error', () => null).value = null

  useState<Record<string, any>>('boost-state', () => ({})).value = {}
  useState<Record<string, boolean>>('boost-inflight', () => ({})).value = {}
  useState<Record<string, boolean>>('boost-pending', () => ({})).value = {}
  useState<string | null>('boost-state-error', () => null).value = null
  useState<Record<string, any>>('follow-state', () => ({})).value = {}
  useState<Record<string, boolean>>('follow-inflight', () => ({})).value = {}
  useState<string | null>('follow-state-error', () => null).value = null

  useState<any[]>('posts-feed', () => []).value = []
  useState<string | null>('posts-feed-next', () => null).value = null
  useState<boolean>('posts-feed-loading', () => false).value = false
  useState<string | null>('posts-feed-error', () => null).value = null

  useState<any[]>('posts-only-me', () => []).value = []
  useState<string | null>('posts-only-me-next', () => null).value = null
  useState<boolean>('posts-only-me-loading', () => false).value = false
  useState<string | null>('posts-only-me-error', () => null).value = null

  useState<any[]>('drafts', () => []).value = []
  useState<string | null>('drafts-next', () => null).value = null
  useState<boolean>('drafts-loading', () => false).value = false
  useState<string | null>('drafts-error', () => null).value = null

  // Normalized users cache + notifications list state.
  useState<Record<string, any>>('users-by-id', () => ({})).value = {}
  if (prevUserId) {
    useState<any[]>(`notifications:${prevUserId}:items`, () => []).value = []
    useState<string | null>(`notifications:${prevUserId}:nextCursor`, () => null).value = null
    useState<boolean>(`notifications:${prevUserId}:loading`, () => false).value = false
    useState<boolean>(`notifications:${prevUserId}:pendingRefresh`, () => false).value = false
  }
  useState<any[]>('notifications:anon:items', () => []).value = []
  useState<string | null>('notifications:anon:nextCursor', () => null).value = null
  useState<boolean>('notifications:anon:loading', () => false).value = false
  useState<boolean>('notifications:anon:pendingRefresh', () => false).value = false

  if (import.meta.client && prevUsername) {
    clearNuxtData(`public-profile:${prevUsername}`)
    clearNuxtData(`follow-summary:${prevUsername}`)
  }

  useState<any>('app-header', () => null).value = null
}

