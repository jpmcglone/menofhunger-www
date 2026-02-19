import type { UsersCallback } from '~/composables/usePresence'
import { useUsersStore } from '~/composables/useUsersStore'
import { clearAuthClientState } from '~/composables/auth/authState'
import { clearMohCacheAll } from '~/composables/useApiClient'

export type AuthUser = {
  id: string
  createdAt?: string
  phone: string
  email?: string | null
  emailVerifiedAt?: string | null
  emailVerificationRequestedAt?: string | null
  username?: string | null
  usernameIsSet?: boolean
  name?: string | null
  bio?: string | null
  website?: string | null
  locationInput?: string | null
  locationDisplay?: string | null
  locationZip?: string | null
  locationCity?: string | null
  locationCounty?: string | null
  locationState?: string | null
  locationCountry?: string | null
  birthdate?: string | null
  interests?: string[]
  menOnlyConfirmed?: boolean
  siteAdmin?: boolean
  premium?: boolean
  premiumPlus?: boolean
  isOrganization?: boolean
  stewardBadgeEnabled?: boolean
  followVisibility?: 'all' | 'verified' | 'premium' | 'none'
  birthdayVisibility?: 'none' | 'monthDay' | 'full'
  verifiedStatus?: 'none' | 'identity' | 'manual'
  verifiedAt?: string | null
  unverifiedAt?: string | null
  avatarUrl?: string | null
  bannerUrl?: string | null
  pinnedPostId?: string | null
  coins?: number
  checkinStreakDays?: number
  lastCheckinDayKey?: string | null
  longestStreakDays?: number
}

let clientMePromise: Promise<AuthUser | null> | null = null
let authGeneration = 0

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
              website: (u as any).website ?? (user.value as any)?.website ?? null,
              locationInput: (u as any).locationInput ?? (user.value as any)?.locationInput ?? null,
              locationDisplay: (u as any).locationDisplay ?? (user.value as any)?.locationDisplay ?? null,
              locationZip: (u as any).locationZip ?? (user.value as any)?.locationZip ?? null,
              locationCity: (u as any).locationCity ?? (user.value as any)?.locationCity ?? null,
              locationCounty: (u as any).locationCounty ?? (user.value as any)?.locationCounty ?? null,
              locationState: (u as any).locationState ?? (user.value as any)?.locationState ?? null,
              locationCountry: (u as any).locationCountry ?? (user.value as any)?.locationCountry ?? null,
              premium: u.premium,
              premiumPlus: u.premiumPlus,
              isOrganization: (u as any).isOrganization,
              stewardBadgeEnabled: u.stewardBadgeEnabled,
              verifiedStatus: u.verifiedStatus as any,
              avatarUrl: u.avatarUrl,
              bannerUrl: u.bannerUrl,
              pinnedPostId: u.pinnedPostId,
            }
          }
        },
        onMeUpdated: (payload: import('~/types/api').WsUsersMeUpdatedPayload) => {
          if (payload?.reason === 'account_banned') {
            handleUnauthorized()
            if (import.meta.client) {
              void Promise.resolve(navigateTo('/login?banned=1')).catch(() => undefined)
            }
            return
          }
          const me = payload?.user ?? null
          if (!me?.id) return
          if (me.id !== user.value?.id) return
          // Canonical snapshot: replace local auth user state.
          user.value = me as any
        },
      }
      addUsersCallback(cb)
    })
  }

  async function me(): Promise<AuthUser | null> {
    const gen = authGeneration
    try {
      const result = await apiFetch<{ user: AuthUser | null }>('/auth/me', { method: 'GET' })
      // If auth state was reset while this request was in flight (logout/401), ignore.
      if (gen !== authGeneration) return null
      user.value = result.data.user
      return result.data.user
    } catch {
      // If the API is unreachable, fail gracefully.
      if (gen === authGeneration) user.value = null
      return null
    } finally {
      if (gen === authGeneration) didAttempt.value = true
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

    if (initDone.value) return
    initDone.value = true
    // Client: always try to load user on mount if not yet loaded (fixes profile card on prod when SSR had no cookie).
    onMounted(() => {
      void ensureLoaded()
    })
  }

  function handleUnauthorized() {
    authGeneration += 1
    clientMePromise = null
    clearMohCacheAll()
    clearAuthClientState({ resetViewerCaches: true })
    // Keep local refs in sync with the shared state.
    user.value = null
    didAttempt.value = true
  }

  async function logout() {
    authGeneration += 1
    clientMePromise = null
    const { emitLogout } = usePresence()
    emitLogout()
    const { onLogout } = usePushNotifications()

    // Best-effort server/session cleanup: still clear local auth state even if network fails.
    try {
      await apiFetch<{ success: true }>('/auth/logout', { method: 'POST' })
    } catch {
      // No-op: proceed with local cleanup.
    }
    await onLogout().catch(() => undefined)

    clearMohCacheAll()
    clearAuthClientState({ resetViewerCaches: true })
    user.value = null
    didAttempt.value = true

    // Redirect to landing page after explicit logout.
    if (import.meta.client) {
      await navigateTo('/', { replace: true })
    }
  }

  const isAuthed = computed(() => Boolean(user.value?.id))

  return { user, me, ensureLoaded, initAuth, logout, handleUnauthorized, isAuthed }
}

