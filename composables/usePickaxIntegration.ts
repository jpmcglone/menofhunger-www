export type PickaxIntegrationStatus = {
  oauthAvailable?: boolean
  available: boolean
  connected: boolean
  username: string | null
  needsAttention: boolean
  needsUsername: boolean
  verificationCode: string | null
  lastError?: string | null
}

const EMPTY: PickaxIntegrationStatus = {
  available: false,
  connected: false,
  username: null,
  needsAttention: false,
  needsUsername: false,
  verificationCode: null,
}

/**
 * The signed-in account's Pickax connection. Fetched on demand (composer open, settings mount)
 * and patched locally after connect and disconnect.
 */
export function usePickaxIntegration() {
  const { apiFetch } = useApiClient()
  const status = useState<PickaxIntegrationStatus | null>('pickax-integration', () => null)
  const loading = ref(false)

  async function refresh(): Promise<PickaxIntegrationStatus> {
    if (loading.value) return status.value ?? EMPTY
    loading.value = true
    try {
      const res = await apiFetch<PickaxIntegrationStatus>('/me/integrations/pickax', { method: 'GET' })
      status.value = res?.data ?? EMPTY
    } catch {
      status.value = status.value ?? EMPTY
    } finally {
      loading.value = false
    }
    return status.value ?? EMPTY
  }

  async function connect(input: { clientId: string; clientSecret: string; username?: string }): Promise<PickaxIntegrationStatus> {
    const res = await apiFetch<PickaxIntegrationStatus>('/me/integrations/pickax', { method: 'POST', body: input })
    const result = res?.data ?? EMPTY
    // Intermediate ownership-proof steps must not hide the existing connection.
    if (!result.needsUsername) status.value = result
    return result
  }

  async function disconnect(): Promise<void> {
    const res = await apiFetch<PickaxIntegrationStatus>('/me/integrations/pickax', { method: 'DELETE' })
    status.value = res?.data ?? EMPTY
  }

  const connected = computed(() => Boolean(status.value?.connected && !status.value.needsAttention))

  return { status, loading, connected, refresh, connect, disconnect }
}
