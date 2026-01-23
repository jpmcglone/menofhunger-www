export type AuthUser = {
  id: string
  phone: string
  username?: string | null
  usernameIsSet?: boolean
  name?: string | null
  bio?: string | null
}

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  return `${base}/${p}`
}

export function useAuth() {
  const config = useRuntimeConfig()
  const apiBaseUrl = (config.public.apiBaseUrl as string) || ''

  const user = useState<AuthUser | null>('auth-user', () => null)

  async function me() {
    const url = joinUrl(apiBaseUrl, '/auth/me')

    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

    const result = await $fetch<{ user: AuthUser | null }>(url, {
      method: 'GET',
      credentials: 'include',
      headers
    })

    user.value = result.user
    return result.user
  }

  async function logout() {
    const url = joinUrl(apiBaseUrl, '/auth/logout')
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

    await $fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers
    })

    user.value = null
  }

  return { user, me, logout }
}

