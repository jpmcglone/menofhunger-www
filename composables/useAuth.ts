import type { UsersCallback } from '~/composables/usePresence'
import { useUsersStore } from '~/composables/useUsersStore'

export type AuthUser = {
  id: string
  createdAt?: string
  phone: string
  email?: string | null
  username?: string | null
  usernameIsSet?: boolean
  name?: string | null
  bio?: string | null
  birthdate?: string | null
  interests?: string[]
  menOnlyConfirmed?: boolean
  siteAdmin?: boolean
  premium?: boolean
  premiumPlus?: boolean
  followVisibility?: 'all' | 'verified' | 'premium' | 'none'
  verifiedStatus?: 'none' | 'identity' | 'manual'
  verifiedAt?: string | null
  unverifiedAt?: string | null
  avatarUrl?: string | null
  bannerUrl?: string | null
  pinnedPostId?: string | null
}

let clientMePromise: Promise<AuthUser | null> | null = null

export function useAuth() {
  const { apiFetch } = useApiClient()
  const usersStore = useUsersStore()

  const user = useState<AuthUser | null>('auth-user', () => null)
  const didAttempt = useState<boolean>('auth-did-attempt', () => false)
  const initDone = useState<boolean>('auth-init-done', () => false)

  // Realtime: keep user tier/profile in sync across tabs/devices.
  const wsHooked = useState<boolean>('auth-ws-users-self-updated-hooked', () => false)
  if (import.meta.client && !wsHooked.value) {
    wsHooked.value = true
    // Defer socket hookups to app mount so middleware doesn't indirectly call useRoute via usePresence().
    // NOTE: useAuth() is used in middleware, so we can't use Vue lifecycle hooks here.
    const nuxtApp = useNuxtApp()
    ;(nuxtApp as { hooks: { hookOnce: (name: string, cb: () => void) => void } }).hooks.hookOnce('app:mounted', () => {
      const { addUsersCallback } = usePresence()
      const { invalidateUserPreviewCache } = useUserPreview()
      const cb: UsersCallback = {
        onSelfUpdated: (payload: { user?: import('~/types/api').PublicProfile }) => {
          const u = payload?.user ?? null
          if (!u?.id) return
          usersStore.upsert(u as any)
          if (u.username) invalidateUserPreviewCache(u.username)

          // If this update is about *me*, patch my auth user object.
          if (u.id === user.value?.id) {
            user.value = {
              ...(user.value ?? ({ id: u.id } as AuthUser)),
              username: u.username,
              name: u.name,
              bio: u.bio,
              premium: u.premium,
              premiumPlus: u.premiumPlus,
              verifiedStatus: u.verifiedStatus as any,
              avatarUrl: u.avatarUrl,
              bannerUrl: u.bannerUrl,
              pinnedPostId: u.pinnedPostId,
            }
          }
        },
      }
      addUsersCallback(cb)
    })
  }

  async function me(): Promise<AuthUser | null> {
    try {
      const result = await apiFetch<{ user: AuthUser | null }>('/auth/me', { method: 'GET' })
      user.value = result.data.user
      return result.data.user
    } catch {
      // If the API is unreachable, fail gracefully.
      user.value = null
      return null
    } finally {
      didAttempt.value = true
    }
  }

  async function ensureLoaded(): Promise<AuthUser | null> {
    if (didAttempt.value) return user.value

    if (import.meta.client) {
      if (!clientMePromise) {
        clientMePromise = me().finally(() => {
          clientMePromise = null
        })
      }
      return await clientMePromise
    }

    return await me()
  }

  async function initAuth(): Promise<void> {
    if (import.meta.server) {
      if (initDone.value) return
      initDone.value = true
      const cookieHeader = useRequestHeaders(['cookie']).cookie
      if (!cookieHeader?.includes('moh_session=')) {
        didAttempt.value = true
        return
      }
      await ensureLoaded()
      return
    }

    // Client: always try to load user on mount if not yet loaded (fixes profile card on prod when SSR had no cookie).
    onMounted(() => {
      if (!user.value) void ensureLoaded()
    })
    if (initDone.value) return
    initDone.value = true
    onMounted(() => {
      void ensureLoaded()
    })
  }

  async function logout() {
    const { emitLogout } = usePresence()
    emitLogout()
    await apiFetch<{ success: true }>('/auth/logout', { method: 'POST' })

    user.value = null
    didAttempt.value = true

    // Reset viewer-specific client caches so we never show stale authed-only data.
    // (Safe even if these stores haven't been initialized yet.)
    useState<import('~/types/api').BookmarkCollection[]>('bookmark-collections', () => []).value = []
    useState<number>('bookmark-total-count', () => 0).value = 0
    useState<number>('bookmark-unorganized-count', () => 0).value = 0
    useState<boolean>('bookmark-collections-loaded', () => false).value = false
    useState<boolean>('bookmark-collections-loading', () => false).value = false
    useState<string | null>('bookmark-collections-error', () => null).value = null

    useState<Record<string, import('~/composables/useBoostState').BoostStateEntry>>('boost-state', () => ({})).value = {}
    useState<Record<string, boolean>>('boost-inflight', () => ({})).value = {}
    useState<Record<string, boolean>>('boost-pending', () => ({})).value = {}
    useState<string | null>('boost-state-error', () => null).value = null
    useState<Record<string, import('~/types/api').FollowRelationship>>('follow-state', () => ({})).value = {}
    useState<Record<string, boolean>>('follow-inflight', () => ({})).value = {}
    useState<string | null>('follow-state-error', () => null).value = null

    useState<import('~/types/api').FeedPost[]>('posts-feed', () => []).value = []
    useState<string | null>('posts-feed-next-cursor', () => null).value = null
    useState<boolean>('posts-feed-loading', () => false).value = false
    useState<string | null>('posts-feed-error', () => null).value = null

    useState<import('~/types/api').FeedPost[]>('posts-only-me', () => []).value = []
    useState<string | null>('posts-only-me-next-cursor', () => null).value = null
    useState<boolean>('posts-only-me-loading', () => false).value = false
    useState<string | null>('posts-only-me-error', () => null).value = null

    useState<import('~/composables/useAppHeader').AppHeaderState>('app-header', () => null).value = null

    // Redirect away from pages that effectively require auth.
    if (import.meta.client) {
      const route = useRoute()
      const path = String(route.path || '')
      const layout = (route.meta as any)?.layout as string | undefined

      const authAllowed = new Set(['/home', '/explore', '/notifications', '/roadmap', '/tiers'])
      const isAdmin = path === '/admin' || path.startsWith('/admin/')

      const requiresAuth =
        isAdmin ||
        (layout === 'app' && !authAllowed.has(path))

      if (requiresAuth && path !== '/home') {
        await navigateTo('/home', { replace: true })
      }
    }
  }

  const isAuthed = computed(() => Boolean(user.value?.id))

  return { user, me, ensureLoaded, initAuth, logout, isAuthed }
}

