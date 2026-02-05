import type { Ref } from 'vue'
import { getApiErrorMessage } from '~/utils/api-error'

export type PublicProfile = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  premium: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl?: string | null
  bannerUrl?: string | null
  pinnedPostId?: string | null
}

export async function usePublicProfile(normalizedUsername: Ref<string>) {
  const { apiFetchData } = useApiClient()

  const { data, error } = await useAsyncData(
    () => `public-profile:${normalizedUsername.value}`,
    async () => {
      return await apiFetchData<PublicProfile>(
        `/users/${encodeURIComponent(normalizedUsername.value)}`,
        { method: 'GET' }
      )
    },
    {
      watch: [normalizedUsername],
      // Reuse SSR payload during hydration to avoid a duplicate client fetch.
      getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
    }
  )

  const profile = computed(() => data.value ?? null)
  const notFound = computed(() => {
    const e = error.value as { statusCode?: number; message?: string } | null
    if (!e) return false
    if (e?.statusCode === 404) return true
    const msg = (getApiErrorMessage(e) || e?.message || '').toString()
    return /not found/i.test(msg)
  })
  const apiError = computed(() => {
    if (!error.value) return false
    if (notFound.value) return false
    return true
  })

  if (import.meta.server && error.value && !notFound.value) {
    const e = error.value as { statusCode?: number; status?: number; response?: { status?: number } }
    const status = Number(e?.statusCode ?? e?.status ?? e?.response?.status ?? 0)
    if (status >= 500 || status === 0) {
      const event = useRequestEvent()
      if (event) setResponseStatus(event, 503)
    }
  }

  return { profile, data, error, notFound, apiError }
}
