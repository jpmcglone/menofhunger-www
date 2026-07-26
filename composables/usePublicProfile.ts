import type { Ref } from 'vue'
import { getApiErrorMessage } from '~/utils/api-error'

export type { PublicProfile } from '~/types/api'
import type { PublicProfile } from '~/types/api'

export async function usePublicProfile(normalizedUsername: Ref<string>) {
  const { apiFetchData } = useApiClient()
  const usersStore = useUsersStore()

  const { data, error } = await useAsyncData(
    () => `public-profile:${normalizedUsername.value}`,
    async () => {
      return await apiFetchData<PublicProfile | { banned: true }>(
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

  const profileBanned = computed(
    () => Boolean(data.value && typeof data.value === 'object' && 'banned' in data.value && (data.value as { banned?: boolean }).banned === true)
  )

  /**
   * Store-overlaid profile so realtime updates (avatar, banner, name, tier) propagate
   * immediately without waiting for a refetch. The store is the single source of truth
   * for mutable display fields; useAsyncData provides the initial load and static fields.
   */
  const profile = computed((): PublicProfile | null => {
    if (profileBanned.value) return null
    const d = data.value
    if (!d || typeof d === 'object' && 'banned' in d) return null
    const p = d as PublicProfile
    if (!p?.id) return p ?? null
    return usersStore.overlay(p) as PublicProfile
  })

  const notFound = computed(() => {
    if (profileBanned.value) return false
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

  return { profile, data, error, notFound, profileBanned, apiError }
}
