export type ApiHealthResponse = {
  status: 'ok' | 'degraded'
  nowIso: string
  uptimeSeconds: number
  service: string
  config: {
    nodeEnv: 'development' | 'test' | 'production'
    r2Configured: boolean
    giphyConfigured: boolean
    twilioConfigured: boolean
    twilioDisabledInDev: boolean
  }
  db: {
    status: 'ok' | 'down'
    latencyMs: number
    error?: string
  }
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

  const isUp = computed(() => data.value?.data?.status === 'ok' && data.value?.data?.db?.status === 'ok' && !error.value)

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

