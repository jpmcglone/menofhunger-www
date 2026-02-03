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

const HEALTH_DATA_KEY = 'api-health-data'
const HEALTH_PENDING_KEY = 'api-health-pending'
const HEALTH_ERROR_KEY = 'api-health-error'
const HEALTH_STATUS_KEY = 'api-health-status'

export function useApiHealth() {
  const { apiBaseUrl, apiUrl, apiFetch } = useApiClient()
  const url = apiUrl('/health')

  const data = useState<ApiEnvelope<ApiHealthResponse> | null>(HEALTH_DATA_KEY, () => null)
  const pending = useState<boolean>(HEALTH_PENDING_KEY, () => false)
  const error = useState<Error | null>(HEALTH_ERROR_KEY, () => null)
  const status = useState<number | null>(HEALTH_STATUS_KEY, () => null)

  async function fetchHealth() {
    pending.value = true
    error.value = null
    try {
      const res = await apiFetch<ApiHealthResponse>('/health', { method: 'GET' })
      data.value = res
      status.value = 200
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      data.value = null
      status.value = null
    } finally {
      pending.value = false
    }
  }

  function refresh() {
    return fetchHealth()
  }

  // Trigger initial fetch when composable is first used (shared state so only one in-flight).
  if (data.value === null && !pending.value) {
    void fetchHealth()
  }

  const lastCheckedAtIso = computed(() => data.value?.data?.nowIso ?? null)

  const isUp = computed(
    () => data.value?.data?.status === 'ok' && data.value?.data?.db?.status === 'ok' && !error.value
  )

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
