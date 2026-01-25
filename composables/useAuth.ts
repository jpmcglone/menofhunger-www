export type AuthUser = {
  id: string
  phone: string
  username?: string | null
  usernameIsSet?: boolean
  name?: string | null
  bio?: string | null
  siteAdmin?: boolean
  verifiedStatus?: 'none' | 'identity' | 'manual'
  verifiedAt?: string | null
  unverifiedAt?: string | null
}

let clientMePromise: Promise<AuthUser | null> | null = null

export function useAuth() {
  const { apiFetch } = useApiClient()

  const user = useState<AuthUser | null>('auth-user', () => null)
  const didAttempt = useState<boolean>('auth-did-attempt', () => false)
  const initDone = useState<boolean>('auth-init-done', () => false)

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
    if (initDone.value) return
    initDone.value = true

    if (import.meta.server) {
      const cookieHeader = useRequestHeaders(['cookie']).cookie
      if (!cookieHeader?.includes('moh_session=')) {
        didAttempt.value = true
        return
      }
      await ensureLoaded()
      return
    }

    onMounted(() => {
      void ensureLoaded()
    })
  }

  async function logout() {
    await apiFetch<{ success: true }>('/auth/logout', { method: 'POST' })

    user.value = null
    didAttempt.value = true
  }

  return { user, me, ensureLoaded, initAuth, logout }
}

