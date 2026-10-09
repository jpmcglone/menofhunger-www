import { bumpAuthGeneration, bumpIdentityVersion, clearAuthClientState } from '~/composables/auth/authState'
import { personOnlyLandingPath } from '~/composables/auth/personOnlyRoutes'
import { clearMohCacheAll } from '~/composables/useApiClient'
import type { AuthUser } from '~/composables/auth/authUser'
import type { SwitchableAccount } from '~/types/api'
import { isSafeRedirect } from '~/utils/url'
import { getErrorStatus } from '~/utils/api-error'

/**
 * Identity changes on an authenticated session: impersonation start/stop and account switching.
 * All of them funnel through `applyIdentitySwap` once the server has rotated the session cookie.
 */
export function useAuthIdentity(deps: {
  user: Ref<AuthUser | null>
  didAttempt: Ref<boolean>
  apiUnreachable: Ref<boolean>
  me: () => Promise<AuthUser | null>
  handleUnauthorized: () => void
  /** Drops the in-flight `/auth/me` dedupe promise so the next read hits the new session. */
  resetMePromise: () => void
}) {
  const { user, didAttempt, apiUnreachable, me, handleUnauthorized, resetMePromise } = deps
  const { apiFetchData } = useApiClient()
  const { transition: accountSwitchTransition, switchingId } = useAccountSwitchState()

  async function leavePersonOnlyRouteIfNeeded(next: AuthUser | null, then?: string) {
    if (!import.meta.client) return
    const dest = isSafeRedirect(then) ? then : null
    const path = ((dest ?? useRoute().path).split(/[?#]/)[0]) || '/'
    const landing = next?.accountKind === 'page' ? personOnlyLandingPath(path) : null
    const target = landing || dest
    if (!target) return
    const route = useRoute()
    if (target === route.fullPath || target === route.path) return
    await navigateTo(target, { replace: true })
  }

  /**
   * Swap client state over to a different identity after the server has already
   * rotated the `moh_session` cookie. Used by impersonation and account switch.
   *
   * This is a full identity change: caches, content rooms, badge counts, KeepAlive
   * pages, and the socket handshake all rebuild for `nextUser`. `emitLogout()` is
   * deliberately NOT called — that would revoke the brand-new session server-side.
   *
   * Throws `'identity_not_swapped'` if the server confirmed a different user than `nextUser`
   * — this means the session cookie was not updated (browser SameSite / CORS edge-case).
   */
  async function applyIdentitySwap(nextUser: AuthUser | null, opts?: { then?: string }) {
    const expectedId = nextUser?.id ?? null

    bumpAuthGeneration()
    resetMePromise()

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

    await leavePersonOnlyRouteIfNeeded(user.value, opts?.then)
    // Bust KeepAlive so the current page remounts and fetches as the new identity.
    bumpIdentityVersion()

    // Tear down any mid-swap reconnect (user-id watch) and handshake as this user.
    disconnect()
    connect()
    void useBadgeHydration().refresh({ force: true }).catch(() => undefined)
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

  async function switchAccount(userId: string, opts?: {
    then?: string
    label?: string
    name?: string | null
    username?: string | null
    avatarUrl?: string | null
    avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
    isOrganization?: boolean
  }) {
    if (switchingId.value || userId === user.value?.id) return null
    accountSwitchTransition.value = {
      userId,
      label: opts?.label || 'your account',
      name: opts?.name,
      username: opts?.username,
      avatarUrl: opts?.avatarUrl,
      avatarVideo: opts?.avatarVideo,
      isOrganization: opts?.isOrganization,
    }
    // Responses from the old session must not overwrite or sign out the new one.
    bumpAuthGeneration()
    resetMePromise()
    try {
      let next: AuthUser | null = null
      try {
        const result = await apiFetchData<{ user: AuthUser }>('/auth/switch', {
          method: 'POST',
          body: { userId },
          retry: 0,
          mohUnauthorized: 'ignore',
        })
        next = result?.user ?? null
      } catch (error) {
        const status = getErrorStatus(error)
        if (status !== null && status < 500) throw error
        // The cookie may have rotated before the response was interrupted.
        next = await apiFetchData<AuthUser | null>('/auth/me', {
          method: 'GET', mohDedupe: false, mohRetry: false,
          mohUnauthorized: 'ignore', timeout: 5_000,
        }).catch(() => null)
        if (!next) {
          if (import.meta.client) window.location.reload()
          return null
        }
        if (next.id !== userId) throw error
      }
      if (next?.id !== userId) throw new Error('Could not confirm the account switch. Please try again.')
      await applyIdentitySwap(next, { then: opts?.then })
      accountSwitchTransition.value = null
      return user.value
    } catch (error) {
      bumpAuthGeneration()
      accountSwitchTransition.value = null
      throw error
    }
  }

  return { startImpersonation, stopImpersonation, listSwitchableAccounts, switchAccount }
}
