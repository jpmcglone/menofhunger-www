import type { IntegrationAllowanceDto, IntegrationCapabilityDto } from '~/types/api-contracts.gen'
export type XIntegrationStatus = {
  available: boolean
  connected: boolean
  username: string | null
  canPost: boolean
  needsAttention: boolean
  lastError?: string | null
  capabilities?: IntegrationCapabilityDto[]
  linksEnabled?: boolean
  integrationAllowance?: IntegrationAllowanceDto
  allowance: { linkPostsLeft: number; nativePostsLeft: number; totalRemaining?: number; linkRemaining?: number; totalLimit?: number; linkLimit?: number; resetsAt?: string }
}

const EMPTY: XIntegrationStatus = {
  available: false,
  connected: false,
  username: null,
  canPost: false,
  needsAttention: false,
  allowance: { linkPostsLeft: 0, nativePostsLeft: 0 },
}

/** The signed-in account's X connection. Fetched on demand and patched after connect and disconnect. */
export function useXIntegration() {
  const { apiFetch, apiFetchData } = useApiClient()
  const status = useState<XIntegrationStatus | null>('x-integration', () => null)
  const loading = ref(false)

  async function refresh(): Promise<XIntegrationStatus> {
    if (loading.value) return status.value ?? EMPTY
    loading.value = true
    try {
      const res = await apiFetch<XIntegrationStatus>('/me/integrations/x', { method: 'GET' })
      status.value = res?.data ?? EMPTY
    } catch {
      status.value = status.value ?? EMPTY
    } finally {
      loading.value = false
    }
    return status.value ?? EMPTY
  }

  async function authorize(): Promise<string> {
    const data = await apiFetchData<{ url: string }>('/me/integrations/x/authorize', { method: 'POST' })
    return data.url
  }

  async function connect(input: { code: string; state: string }): Promise<XIntegrationStatus> {
    const res = await apiFetch<XIntegrationStatus>('/me/integrations/x/connect', { method: 'POST', body: input })
    status.value = res?.data ?? EMPTY
    return status.value
  }

  async function disconnect(): Promise<void> {
    const res = await apiFetch<XIntegrationStatus>('/me/integrations/x', { method: 'DELETE' })
    status.value = res?.data ?? EMPTY
  }

  const connected = computed(() => Boolean(status.value?.connected && !status.value.needsAttention))

  return { status, loading, connected, refresh, authorize, connect, disconnect }
}
