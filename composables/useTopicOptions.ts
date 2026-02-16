import type { GetTopicOptionsData, TopicOption } from '~/types/api'

let TOPIC_OPTIONS_CACHE: TopicOption[] | null = null
let TOPIC_OPTIONS_INFLIGHT: Promise<TopicOption[]> | null = null

export function useTopicOptions() {
  const { apiFetch } = useApiClient()

  const options = ref<TopicOption[] | null>(TOPIC_OPTIONS_CACHE)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    if (TOPIC_OPTIONS_CACHE) {
      options.value = TOPIC_OPTIONS_CACHE
      return TOPIC_OPTIONS_CACHE
    }
    if (TOPIC_OPTIONS_INFLIGHT) {
      options.value = await TOPIC_OPTIONS_INFLIGHT
      return options.value
    }

    loading.value = true
    error.value = null
    TOPIC_OPTIONS_INFLIGHT = (async () => {
      const res = await apiFetch<GetTopicOptionsData>('/topics/options', { method: 'GET' })
      const data = (res.data ?? []) as TopicOption[]
      TOPIC_OPTIONS_CACHE = data
      return data
    })()

    try {
      options.value = await TOPIC_OPTIONS_INFLIGHT
      return options.value
    } catch (e: unknown) {
      error.value = (e as Error)?.message ?? 'Failed to load topic options.'
      options.value = null
      TOPIC_OPTIONS_CACHE = null
      throw e
    } finally {
      loading.value = false
      TOPIC_OPTIONS_INFLIGHT = null
    }
  }

  const labelByValue = computed(() => {
    const m = new Map<string, string>()
    for (const opt of options.value ?? []) m.set(opt.value, opt.label)
    return m
  })

  return { options, labelByValue, loading, error, load }
}

