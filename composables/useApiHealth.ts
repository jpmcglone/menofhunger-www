export type ApiHealthResponse = {
  ok: boolean
}

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  return `${base}/${p}`
}

export function useApiHealth() {
  const config = useRuntimeConfig()
  const apiBaseUrl = (config.public.apiBaseUrl as string) || ''

  const url = joinUrl(apiBaseUrl, '/health')

  // Store an ISO string to avoid SSR/client timezone hydration mismatches.
  const lastCheckedAtIso = ref<string | null>(null)

  const { data, pending, error, refresh, status } = useFetch<{ data: ApiHealthResponse }>(url, {
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

  const isUp = computed(() => Boolean(data.value?.data?.ok) && !error.value)

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

