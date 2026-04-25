import type { CheckinAllowedVisibility, CreateCheckinResponse, GetCheckinsTodayResponse } from '~/types/api'

const TODAY_CHECKIN_CACHE_TTL_MS = 30_000

export function useDailyCheckin() {
  const { apiFetchData } = useApiClient()
  const { user } = useAuth()
  const { dayKey } = useEasternMidnightRollover()

  const state = ref<GetCheckinsTodayResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const cache = useState<Record<string, { expiresAt: number; data: GetCheckinsTodayResponse }>>('daily-checkin-today-cache', () => ({}))

  function cacheKey(): string | null {
    const uid = (user.value?.id ?? '').trim()
    if (!uid) return null
    return `${uid}:${dayKey.value}`
  }

  async function refresh() {
    const key = cacheKey()
    const hit = key ? cache.value[key] : null
    if (hit && hit.expiresAt > Date.now()) {
      state.value = hit.data
      error.value = null
      return
    }
    if (key && hit) {
      const nextCache = { ...cache.value }
      delete nextCache[key]
      cache.value = nextCache
    }

    loading.value = true
    error.value = null
    try {
      const next = await apiFetchData<GetCheckinsTodayResponse>('/checkins/today', { method: 'GET' })
      state.value = next
      if (key) cache.value = { ...cache.value, [key]: { expiresAt: Date.now() + TODAY_CHECKIN_CACHE_TTL_MS, data: next } }
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
    // Update state immediately so the compact card (streak pill + mission section +
    // "X of N answered" crew copy) renders correctly without needing a full refresh.
    if (state.value) {
      state.value.hasCheckedInToday = true
      // The API returns the new streak after today's check-in — use it so the
      // mission section shows the correct day count for non-crew users too.
      if (typeof res.checkinStreakDays === 'number') {
        state.value.checkinStreakDays = res.checkinStreakDays
      }
      // Flip the viewer's `answeredToday` flag in the crew block so the
      // "X of N answered" copy on the compact card reflects the answer instantly.
      // Realtime crew streak events only carry streak counts, not per-member status.
      const crew = state.value.crew
      if (crew && Array.isArray(crew.memberStatus)) {
        crew.memberStatus = crew.memberStatus.map((m) =>
          m.isViewer && !m.answeredToday ? { ...m, answeredToday: true } : m,
        )
      }
    } else {
      // State never loaded (initial GET failed). Bootstrap from the create response
      // so the compact card renders after answering rather than staying invisible.
      state.value = {
        hasCheckedInToday: true,
        checkinStreakDays: typeof res.checkinStreakDays === 'number' ? res.checkinStreakDays : 0,
        dayKey: res.checkin?.dayKey ?? '',
        prompt: res.checkin?.prompt ?? '',
        coins: res.coinsAwarded ?? 0,
        allowedVisibilities: [],
        crew: null,
      }
    }
    const key = cacheKey()
    if (key && state.value) {
      cache.value = { ...cache.value, [key]: { expiresAt: Date.now() + TODAY_CHECKIN_CACHE_TTL_MS, data: state.value } }
    }
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

