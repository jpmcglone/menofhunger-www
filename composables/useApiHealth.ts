export type ApiHealthResponse = {
  status: string
}

import type { ApiEnvelope } from '~/types/api'

export function useApiHealth() {
  const { apiBaseUrl, apiUrl } = useApiClient()
  const url = apiUrl('/health')

  // Store an ISO string to avoid SSR/client timezone hydration mismatches.
  const lastCheckedAtIso = ref<string | null>(null)

  const { data, pending, error, refresh, status } = useFetch<ApiEnvelope<ApiHealthResponse>>(url, {
    // Works on SSR and on client-side navigation.
    key: `api-health:${url}`
  })

  watch(
    status,
    (value) => {
      if (value === 'success' || value === 'error') lastCheckedAtIso.value = new Date().toISOString()
    },
    { immediate: true }
  )

  const isUp = computed(() => data.value?.data?.status === 'ok' && !error.value)

  return {
    apiBaseUrl,
    url,
    data: computed(() => data.value?.data ?? null),
    pending,
    error,
    status,
    isUp,
    lastCheckedAtIso,
    refresh
  }
}

