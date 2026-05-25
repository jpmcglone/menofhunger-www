export type ApiHealthResponse = {
  status: 'ok' | 'degraded'
  nowIso: string
  serverTime?: number
  uptimeSeconds: number
  service: string
  config: {
    nodeEnv: 'development' | 'test' | 'production'
    r2Configured: boolean
    giphyConfigured: boolean
    twilioConfigured: boolean
    twilioDisabledInDev: boolean
    locationSearchConfigured?: boolean
    stripeConfigured?: boolean
    emailConfigured?: boolean
    browserPushConfigured?: boolean
  }
  db: {
    status: 'ok' | 'down'
    latencyMs: number
    error?: string
  }
  redis?: {
    status: 'ok' | 'down'
    latencyMs: number
    error?: string
  }
}

import type { ApiEnvelope } from '~/types/api'
import { joinUrl } from '~/utils/url'

/**
 * Return the bare origin (protocol + host) for an API base URL, stripping any
 * REST version prefix (/v1, /v2, ...) and path segment.
 *
 * Only the following operational endpoints are unversioned and live at the
 * document root on the server (see menofhunger-api/src/main.ts setGlobalPrefix exclude list):
 *   - health, health/config
 *   - billing/webhook
 *   - .well-known/apple-app-site-association
 *   - (root identity)
 *
 * This helper ensures the health probe (and any future similar infra calls) always
 * target the correct unversioned URL even when the configured base includes /vN.
 */
function getUnversionedApiOrigin(base: string): string {
  if (!base) return ''
  try {
    const u = new URL(base)
    return u.origin
  } catch {
    // Best-effort fallback for malformed bases (dev, tests)
    return base.replace(/\/v\d+.*$/, '').replace(/\/+$/, '')
  }
}

const HEALTH_DATA_KEY = 'api-health-data'
const HEALTH_PENDING_KEY = 'api-health-pending'
const HEALTH_ERROR_KEY = 'api-health-error'
const HEALTH_STATUS_KEY = 'api-health-status'

export function useApiHealth() {
  const { apiBaseUrl } = useApiClient()
  // Health (and the other unversioned infra endpoints) live at the raw host root.
  // Use the helper to guarantee we never accidentally append /vN.
  const healthOrigin = getUnversionedApiOrigin(apiBaseUrl || '')
  const url = healthOrigin ? joinUrl(healthOrigin, '/health') : ''

  const data = useState<ApiEnvelope<ApiHealthResponse> | null>(HEALTH_DATA_KEY, () => null)
  const pending = useState<boolean>(HEALTH_PENDING_KEY, () => false)
  const error = useState<Error | null>(HEALTH_ERROR_KEY, () => null)
  const status = useState<number | null>(HEALTH_STATUS_KEY, () => null)

  async function fetchHealth() {
    if (!url) {
      error.value = new Error('API base URL is not configured')
      status.value = null
      return
    }
    pending.value = true
    error.value = null
    try {
      // Use a direct $fetch against the explicitly unversioned health URL.
      // (apiFetch would incorrectly append /v1 because the client base now includes the version.)
      // SSR forwards cookies + request id exactly like the main client for consistency.
      let ssrHeaders: HeadersInit | undefined
      if (import.meta.server) {
        ssrHeaders = useRequestHeaders(['cookie'])
        const event = useRequestEvent()
        const requestId = (event?.context as { requestId?: string } | undefined)?.requestId
        if (requestId) ssrHeaders = { ...(ssrHeaders || {}), 'x-request-id': requestId }
      }
      const res = await $fetch<ApiEnvelope<ApiHealthResponse>>(url, {
        method: 'GET',
        credentials: 'include',
        headers: ssrHeaders,
        timeout: 15_000,
      })
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
