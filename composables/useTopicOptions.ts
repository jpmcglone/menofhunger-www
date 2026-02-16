import type { GetTopicOptionsData, TopicOption } from '~/types/api'

// IMPORTANT (SSR/hydration):
// Do not use module-scope caches as a rendering input — SSR requests and the client boot
// can observe different cache warmth and produce different first-render markup.
// We keep request/client state in `useState()` and only use a module-scope inflight promise on the client
// to dedupe concurrent loads.
let CLIENT_TOPIC_OPTIONS_INFLIGHT: Promise<TopicOption[]> | null = null

export function useTopicOptions() {
  const { apiFetch } = useApiClient()

  const options = useState<TopicOption[] | null>('moh.topicOptions.v1', () => null)
  const loading = useState<boolean>('moh.topicOptions.loading.v1', () => false)
  const error = useState<string | null>('moh.topicOptions.error.v1', () => null)

  async function load() {
    if (Array.isArray(options.value) && options.value.length > 0) return options.value
    if (import.meta.client && CLIENT_TOPIC_OPTIONS_INFLIGHT) {
      options.value = await CLIENT_TOPIC_OPTIONS_INFLIGHT
      return options.value
    }

    loading.value = true
    error.value = null
    const inflight = (async () => {
      const res = await apiFetch<GetTopicOptionsData>('/topics/options', { method: 'GET' })
      const data = (res.data ?? []) as TopicOption[]
      return data
    })()
    if (import.meta.client) CLIENT_TOPIC_OPTIONS_INFLIGHT = inflight

    try {
      options.value = await inflight
      return options.value
    } catch (e: unknown) {
      error.value = (e as Error)?.message ?? 'Failed to load topic options.'
      options.value = null
      throw e
    } finally {
      loading.value = false
      if (import.meta.client && CLIENT_TOPIC_OPTIONS_INFLIGHT === inflight) CLIENT_TOPIC_OPTIONS_INFLIGHT = null
    }
  }

  const labelByValue = computed(() => {
    const m = new Map<string, string>()
    for (const opt of options.value ?? []) m.set(opt.value, opt.label)
    return m
  })

  return { options, labelByValue, loading, error, load }
}

