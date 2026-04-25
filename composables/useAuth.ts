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
  featureToggles?: string[]
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
  notificationUndeliveredCount?: number
  messageUnreadCounts?: { primary: number; requests: number }
}

let clientMePromise: Promise<AuthUser | null> | null = null
let authGeneration = 0

function getErrorStatus(e: unknown): number | null {
  const anyErr = e as any
  const status =
    (typeof anyErr?.status === 'number' ? anyErr.status : null) ??
    (typeof anyErr?.statusCode === 'number' ? anyErr.statusCode : null) ??
    (typeof anyErr?.response?.status === 'number' ? anyErr.response.status : null) ??
    (typeof anyErr?.data?.meta?.status === 'number' ? anyErr.data.meta.status : null)
  return typeof status === 'number' ? status : null
}

function isNuxtComposableContextError(e: unknown): boolean {
  const message = String((e as { message?: unknown } | null | undefined)?.message ?? '')
  return (
    message.includes('A composable that requires access to the Nuxt instance was called outside') ||
    message.includes('called outside of a plugin, Nuxt hook, Nuxt middleware, or Vue setup function')
  )
}

export function useAuth() {
  const { apiFetch } = useApiClient()
  const usersStore = useUsersStore()

  const user = useState<AuthUser | null>('auth-user', () => null)
  const didAttempt = useState<boolean>('auth-did-attempt', () => false)
  const initDone = useState<boolean>('auth-init-done', () => false)
  // True when the last /auth/me failed due to a network/server error (not a 401).
  // Keeps the user in their current page in degraded mode instead of redirecting to login.
  const apiUnreachable = useState<boolean>('auth-api-unreachable', () => false)
  // Hoist these to the setup scope so they survive `await` inside me() —
  // calling useState after an await loses the Nuxt instance context on SSR.
  // Guardrail: never add new useState() calls inside `me()` after its first await.
  const notifCount = useState<number>('notifications-undelivered-count', () => 0)
  const messageUnreadCounts = useState<{ primary: number; requests: number }>('messages-unread-counts', () => ({ primary: 0, requests: 0 }))
  const criticalBadgeCountsLoaded = useState<boolean>('critical-badge-counts-loaded', () => false)

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
            // Spread existing user first to preserve fields that PublicProfile doesn't carry
            // (locationInput, locationZip, phone, etc.), then overlay the fields it does.
            user.value = {
              ...(user.value ?? ({ id: u.id, phone: '' } as AuthUser)),
              username: u.username,
              name: u.name,
              bio: u.bio,
              website: u.website,
              locationDisplay: u.locationDisplay,
              locationCity: u.locationCity,
              locationCounty: u.locationCounty,
              locationState: u.locationState,
              locationCountry: u.locationCountry,
              premium: u.premium,
              premiumPlus: u.premiumPlus,
              isOrganization: u.isOrganization,
              stewardBadgeEnabled: u.stewardBadgeEnabled,
              verifiedStatus: u.verifiedStatus,
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
          user.value = me
        },
      }
      addUsersCallback(cb)
    })
  }

  async function me(): Promise<AuthUser | null> {
    const gen = authGeneration
    try {
      const result = await apiFetch<AuthUser | null>('/auth/me', { method: 'GET' })
      // If auth state was reset while this request was in flight (logout/401), ignore.
      if (gen !== authGeneration) return null
      apiUnreachable.value = false
      user.value = result.data
      if (result.data?.id) {
        const bootNotif = Number(result.data.notificationUndeliveredCount)
        const bootPrimary = Number(result.data.messageUnreadCounts?.primary)
        const bootRequests = Number(result.data.messageUnreadCounts?.requests)
        const hasBootCounts = Number.isFinite(bootNotif) && Number.isFinite(bootPrimary) && Number.isFinite(bootRequests)
        notifCount.value = Math.max(0, Math.floor(bootNotif || 0))
        messageUnreadCounts.value = {
          primary: Math.max(0, Math.floor(bootPrimary || 0)),
          requests: Math.max(0, Math.floor(bootRequests || 0)),
        }
        criticalBadgeCountsLoaded.value = hasBootCounts
      }
      return result.data
    } catch (e: unknown) {
      if (import.meta.dev) {
        if (isNuxtComposableContextError(e)) {
          console.error('[auth] Nuxt composable context error in /auth/me flow. Keep useState/useRoute/useRequest* at setup scope only.', e)
        }
        console.warn('[auth] /auth/me failed', e)
      }
      // Keep an existing authenticated user on transient/non-auth failures (mobile
      // background/wake network flaps are common). A 401 is handled by api client
      // unauthorized flow, which clears auth state explicitly.
      if (gen === authGeneration) {
        const status = getErrorStatus(e)
        if (status === 401) {
          user.value = null
          apiUnreachable.value = false
        } else {
          // Network/server error — flag as unreachable so middleware doesn't redirect to login.
          apiUnreachable.value = true
        }
      }
      return user.value
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
    apiUnreachable.value = false
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

    // Redirect to home feed after explicit logout (home is accessible logged-out).
    if (import.meta.client) {
      await navigateTo('/home', { replace: true })
    }
  }

  const isAuthed = computed(() => Boolean(user.value?.id))
  const isVerified = computed(() => (user.value?.verifiedStatus ?? 'none') !== 'none')
  const isPremium = computed(() => Boolean(user.value?.premium))
  const isPremiumPlus = computed(() => Boolean(user.value?.premiumPlus))

  return { user, me, ensureLoaded, initAuth, logout, handleUnauthorized, isAuthed, isVerified, isPremium, isPremiumPlus, apiUnreachable }
}

