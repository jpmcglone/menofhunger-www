import type { UsersCallback } from '~/composables/usePresence'
import { useUsersStore } from '~/composables/useUsersStore'
import { bumpAuthGeneration, bumpIdentityVersion, clearAuthClientState, getAuthGeneration } from '~/composables/auth/authState'
import { clearMohCacheAll } from '~/composables/useApiClient'
import type { AccountKind, AccountSwitch, Impersonation, SwitchableAccount } from '~/types/api'

export type AuthUser = {
  id: string
  createdAt?: string
  phone: string | null
  accountKind?: AccountKind
  email?: string | null
  emailVerifiedAt?: string | null
  emailVerificationRequestedAt?: string | null
  username?: string | null
  usernameIsSet?: boolean
  name?: string | null
  bio?: string | null
  website?: string | null
  xUsername?: string | null
  pickaxUsername?: string | null
  locationInput?: string | null
  locationDisplay?: string | null
  locationZip?: string | null
  locationCity?: string | null
  locationCounty?: string | null
  locationState?: string | null
  locationCountry?: string | null
  locationPromptSkipped?: boolean
  birthdate?: string | null
  interests?: string[]
  menOnlyConfirmed?: boolean
  heardAboutUs?: import('~/types/api').HeardAboutUs | null
  heardAboutUsOther?: string | null
  hasRecruiter?: boolean
  siteAdmin?: boolean
  featureToggles?: string[]
  premium?: boolean
  premiumPlus?: boolean
  isOrganization?: boolean
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
  openToCrew?: boolean
  notificationUndeliveredCount?: number
  messageUnreadCounts?: { primary: number; requests: number }
  notificationUnreadCommentCount?: number
  groupsUnread?: { total: number; byGroupId: Record<string, number> }
  crewInviteInboxCount?: number
  postCount?: number | null
  articleCount?: number | null
  /** Non-null only while a site admin is impersonating this user. */
  impersonation?: Impersonation | null
  accountSwitch?: AccountSwitch | null
}

let clientMePromise: Promise<AuthUser | null> | null = null

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
  const { apiFetch, apiFetchData } = useApiClient()
  const usersStore = useUsersStore()

  const user = useState<AuthUser | null>('auth-user', () => null)
  const didAttempt = useState<boolean>('auth-did-attempt', () => false)
  const initDone = useState<boolean>('auth-init-done', () => false)
  // True when the last /auth/me failed due to a network/server error (not a 401).
  // Keeps the user in their current page in degraded mode instead of redirecting to login.
  const apiUnreachable = useState<boolean>('auth-api-unreachable', () => false)
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
              verifiedStatus: u.verifiedStatus,
              avatarUrl: u.avatarUrl,
              bannerUrl: u.bannerUrl,
              pinnedPostId: u.pinnedPostId,
              ...(typeof u.postCount === 'number' ? { postCount: u.postCount } : {}),
              ...(typeof u.articleCount === 'number' ? { articleCount: u.articleCount } : {}),
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
          // Patch, never replace: this payload is a bare UserDto fanned out to every
          // socket for this user, so it carries no session-scoped `impersonation` and
          // none of the me-only badge counts.
          patchUser(me)
        },
      }
      addUsersCallback(cb)
    })
  }

  /**
   * Merge a partial user payload into the auth user.
   *
   * Only `/auth/me` returns the full `AuthMeDto`. Every other endpoint and socket event
   * returns a bare `UserDto`, which omits session-scoped and me-only fields —
   * `impersonation`, the badge counts, `postCount`, `phone`, `locationZip`, and friends.
   * Assigning one of those wholesale silently drops them until the next full page load,
   * which is how the impersonation banner used to disappear after saving a profile.
   */
  function patchUser(partial: Partial<AuthUser> | null | undefined): void {
    if (!partial) return
    const current = user.value
    user.value = current ? { ...current, ...partial } : (partial as AuthUser)
  }

  async function me(): Promise<AuthUser | null> {
    const gen = getAuthGeneration()
    try {
      const result = await apiFetch<AuthUser | null>('/auth/me', { method: 'GET' })
      // If auth state was reset while this request was in flight (logout/401), ignore.
      if (gen !== getAuthGeneration()) return null
      apiUnreachable.value = false
      user.value = result.data
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
      if (gen === getAuthGeneration()) {
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
      if (gen === getAuthGeneration()) didAttempt.value = true
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
    bumpAuthGeneration()
    clientMePromise = null
    clearMohCacheAll()
    clearAuthClientState({ resetViewerCaches: true })
    // Keep local refs in sync with the shared state.
    user.value = null
    didAttempt.value = true
    apiUnreachable.value = false
  }

  async function logout() {
    bumpAuthGeneration()
    clientMePromise = null
    const { emitLogout, disconnect } = usePresence()
    const { onLogout } = usePushNotifications()

    // Drop the push subscription while the session cookie is still valid.
    // Doing this after /auth/logout 401s and used to look like a real auth wipe.
    await onLogout().catch(() => undefined)

    // REST first: revoke the session row on the server before emitting the socket event.
    // If the socket handler runs first it would try to revoke an already-dead token.
    try {
      await apiFetch<{ success: true }>('/auth/logout', { method: 'POST' })
    } catch {
      // Best-effort — proceed with local cleanup even if the network call fails.
    }

    // Emit the logout event so the server can broadcast to other sockets, then tear
    // down this client's socket so it doesn't linger as an anonymous connection.
    emitLogout()
    disconnect()

    clearMohCacheAll()
    clearAuthClientState({ resetViewerCaches: true })
    user.value = null
    didAttempt.value = true

    // Redirect to home feed after explicit logout (home is accessible logged-out).
    if (import.meta.client) {
      await navigateTo('/home', { replace: true })
    }
  }

  async function logoutEverywhere() {
    bumpAuthGeneration()
    clientMePromise = null
    const { emitLogout, disconnect } = usePresence()
    const { onLogout } = usePushNotifications()

    await onLogout().catch(() => undefined)

    // Revoke all sessions server-side (not just the current token).
    // The API also disconnects all sockets for this user on other instances.
    try {
      await apiFetch<{ success: true }>('/auth/sessions/revoke-all', { method: 'POST' })
    } catch {
      // Best-effort — proceed with local cleanup.
    }

    emitLogout()
    disconnect()

    clearMohCacheAll()
    clearAuthClientState({ resetViewerCaches: true })
    user.value = null
    didAttempt.value = true

    if (import.meta.client) {
      await navigateTo('/home', { replace: true })
    }
  }

  function personOnlyLandingPath(pathname: string): string | null {
    if (pathname === '/settings/billing' || pathname.startsWith('/settings/billing/')) return '/settings/account'
    if (pathname === '/settings/fitness' || pathname.startsWith('/settings/fitness/')) return '/settings/account'
    if (pathname === '/settings/verification' || pathname.startsWith('/settings/verification/')) {
      return '/settings/account'
    }
    const personOnlyPrefixes = [
      '/check-ins',
      '/fitness',
      '/invite',
      '/referrals',
      '/coins',
      '/crew',
      '/verification',
      '/admin',
      '/daily',
    ]
    if (personOnlyPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return '/home'
    }
    return null
  }

  async function leavePersonOnlyRouteIfNeeded(next: AuthUser | null) {
    if (!import.meta.client) return
    if (next?.accountKind !== 'page') return
    const nextPath = personOnlyLandingPath(useRoute().path)
    if (nextPath) await navigateTo(nextPath, { replace: true })
  }

  /** Cookie is already rotated — load as the new identity instead of swapping chrome first. */
  function reloadAsSwitchedIdentity(next: AuthUser | null, then?: string) {
    if (!import.meta.client) return
    const dest = typeof then === 'string' && then.startsWith('/') ? then : null
    const destPath = (dest ? dest.split(/[?#]/)[0] : window.location.pathname) || '/'
    const landing =
      next?.accountKind === 'page' ? personOnlyLandingPath(destPath) : null
    if (landing) window.location.replace(landing)
    else if (dest) window.location.replace(dest)
    else window.location.reload()
  }

  /**
   * Swap client state over to a different identity after the server has already
   * rotated the `moh_session` cookie. Used by impersonation. Account switch
   * reloads instead so the new chrome and page appear together.
   *
   * This is a full identity change: caches, content rooms, badge counts, KeepAlive
   * pages, and the socket handshake all rebuild for `nextUser`. `emitLogout()` is
   * deliberately NOT called — that would revoke the brand-new session server-side.
   *
   * Throws `'identity_not_swapped'` if the server confirmed a different user than `nextUser`
   * — this means the session cookie was not updated (browser SameSite / CORS edge-case).
   */
  async function applyIdentitySwap(nextUser: AuthUser | null) {
    const expectedId = nextUser?.id ?? null

    bumpAuthGeneration()
    clientMePromise = null

    const { disconnect, connect } = usePresence()
    disconnect()

    clearMohCacheAll()
    clearAuthClientState({ resetViewerCaches: true })

    user.value = nextUser
    didAttempt.value = true
    apiUnreachable.value = false

    // Re-read from the server so badge counts and impersonation metadata are authoritative.
    // Must call me() directly — ensureLoaded() early-returns when didAttempt is true.
    await me().catch(() => undefined)

    // Guard: if me() returned a DIFFERENT user than expected, the browser's session cookie
    // was not updated (e.g. SameSite/CORS issue silently prevented the Set-Cookie from
    // being applied). Restore the pre-swap state and throw so callers can surface an error.
    if (expectedId && user.value?.id !== expectedId) {
      throw new Error('identity_not_swapped')
    }

    await leavePersonOnlyRouteIfNeeded(user.value)
    // Bust KeepAlive so the current page remounts and fetches as the new identity.
    bumpIdentityVersion()

    // Tear down any mid-swap reconnect (user-id watch) and handshake as this user.
    disconnect()
    connect()
    await useBadgeHydration().refresh({ force: true }).catch(() => undefined)
    if (import.meta.client) {
      void usePushNotifications().ensureSubscribedWhenGranted()
    }
  }

  /**
   * Site admin only: begin acting as `username`. The API validates admin rights and
   * rotates this client's session cookie to a session owned by the target user.
   */
  async function startImpersonation(username: string) {
    const cleaned = String(username ?? '').trim().replace(/^@/, '')
    if (!cleaned) throw new Error('Enter a username.')

    const result = await apiFetchData<{ user: AuthUser }>('/admin/impersonate', {
      method: 'POST',
      body: { username: cleaned },
    })

    try {
      await applyIdentitySwap(result?.user ?? null)
    } catch (e) {
      if ((e as Error)?.message === 'identity_not_swapped') {
        throw new Error(
          'Impersonation started on the server but your browser did not receive the new session. ' +
          'Please reload the page and try again.',
        )
      }
      throw e
    }
    return result?.user ?? null
  }

  /** Exit impersonation and return to the admin's own account. */
  async function stopImpersonation() {
    const result = await apiFetchData<{ user: AuthUser | null; signedOut: boolean }>(
      '/auth/impersonate/stop',
      { method: 'POST' },
    )

    if (result?.signedOut || !result?.user) {
      // The admin account is gone or banned — the server cleared the cookie.
      handleUnauthorized()
      const { disconnect } = usePresence()
      disconnect()
      if (import.meta.client) await navigateTo('/login', { replace: true })
      return null
    }

    await applyIdentitySwap(result.user)
    return result.user
  }

  async function listSwitchableAccounts(): Promise<SwitchableAccount[]> {
    return await apiFetchData<SwitchableAccount[]>('/auth/accounts', { method: 'GET' })
  }

  async function switchAccount(userId: string, opts?: { then?: string }) {
    const result = await apiFetchData<{ user: AuthUser }>('/auth/switch', {
      method: 'POST',
      body: { userId },
    })
    reloadAsSwitchedIdentity(result?.user ?? null, opts?.then)
    return result?.user ?? null
  }

  const isAuthed = computed(() => Boolean(user.value?.id))
  /** The admin driving this session, or null when this is an ordinary session. */
  const impersonation = computed<Impersonation | null>(() => user.value?.impersonation ?? null)
  const isImpersonating = computed(() => Boolean(impersonation.value))
  const isVerified = computed(() => (user.value?.verifiedStatus ?? 'none') !== 'none')
  const isPremium = computed(() => Boolean(user.value?.premium || user.value?.premiumPlus))
  const isPremiumPlus = computed(() => Boolean(user.value?.premiumPlus))
  // Canonical "verified member" predicate — mirrors the API VerifiedGuard
  // (verifiedStatus !== 'none' || premium || premiumPlus). Use this to gate
  // verified-only engagement features (e.g. setting your own status).
  const isVerifiedMember = computed(() => isVerified.value || isPremium.value)
  const isPageAccount = computed(() => user.value?.accountKind === 'page')
  /** Daily check-in / streak loop. Pages cannot participate, so callers should hide the chrome. */
  const canAccessCheckins = computed(() => !isPageAccount.value && isVerifiedMember.value)

  return { user, didAttempt, patchUser, me, ensureLoaded, initAuth, logout, logoutEverywhere, handleUnauthorized, isAuthed, isVerified, isPremium, isPremiumPlus, isVerifiedMember, isPageAccount, canAccessCheckins, apiUnreachable, impersonation, isImpersonating, startImpersonation, stopImpersonation, listSwitchableAccounts, switchAccount }
}

