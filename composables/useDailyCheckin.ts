import type { CheckinAllowedVisibility, CreateCheckinResponse, GetCheckinsTodayResponse } from '~/types/api'

export function useDailyCheckin() {
  const { apiFetchData } = useApiClient()

  const state = ref<GetCheckinsTodayResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      state.value = await apiFetchData<GetCheckinsTodayResponse>('/checkins/today', { method: 'GET' })
    } catch (e: any) {
      error.value = e?.data?.meta?.errors?.[0]?.message ?? e?.message ?? 'Failed to load check-in.'
      state.value = null
    } finally {
      loading.value = false
    }
  }

  async function create(params: { body: string; visibility: CheckinAllowedVisibility }) {
    const res = await apiFetchData<CreateCheckinResponse>('/checkins', {
      method: 'POST',
      body: { body: params.body, visibility: params.visibility },
    })
    // Optimistic: hide card for today.
    if (state.value) state.value.hasCheckedInToday = true
    return res
  }

  return {
    state,
    loading,
    error,
    refresh,
    create,
  }
}

