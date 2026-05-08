import type {
  MarvinMeDto,
  MarvinModeDto,
  MarvinUpdatePreferencesBodyDto,
  MarvCreditsUpdatedPayloadDto,
} from '~/types/api'
import type { MarvCallback } from '~/composables/usePresence'

/**
 * Singleton-ish composable for the viewer's Marv state.
 *
 * Owns:
 * - the cached `GET /marvin/me` payload (so the chat page, settings page, and
 *   composer pill can all share one source of truth without re-fetching)
 * - the realtime `marv:credits-updated` subscription (per the realtime-first rule:
 *   HTTP fetch on first read, websocket keeps state fresh while alive)
 * - a `setPreferredMode` helper that does an optimistic local patch then writes
 *   `PATCH /marvin/me/preferences`.
 *
 * Keyed by `useState`, so SSR + client + sibling components share the same ref.
 * The realtime subscription is set up once per browser session — every consumer
 * calls `ensureLoaded()` and gets the cached value back.
 */
export function useMarv() {
  const { apiFetchData, apiFetch } = useApiClient()
  const { user: me } = useAuth()
  const { addMarvCallback, removeMarvCallback } = usePresence()

  const stateKey = 'marv'
  const me$ = useState<MarvinMeDto | null>(`${stateKey}:me`, () => null)
  const loading = useState<boolean>(`${stateKey}:loading`, () => false)
  const error = useState<string | null>(`${stateKey}:error`, () => null)
  const hasFetched = useState<boolean>(`${stateKey}:hasFetched`, () => false)
  const subscribedRef = useState<boolean>(`${stateKey}:subscribed`, () => false)

  const enabled = computed(() => Boolean(me$.value?.enabled))
  const isPremium = computed(() => Boolean(me$.value?.isPremium))
  const preferredMode = computed<MarvinModeDto>(() => me$.value?.preferredMode ?? 'auto')
  const credits = computed(() => me$.value?.credits ?? null)
  const marvUserId = computed<string | null>(() => me$.value?.marv?.userId ?? null)
  const marvUsername = computed<string | null>(() => me$.value?.marv?.username ?? null)
  const marvDisplayName = computed<string | null>(() => me$.value?.marv?.displayName ?? null)
  const marvAvatarUrl = computed<string | null>(() => me$.value?.marv?.avatarUrl ?? null)

  /**
   * Available to premium members only — gated server-side too, but checking up
   * front lets the chat page render the right pinned-row variant (CTA vs row).
   */
  const isAvailable = computed(() => enabled.value && isPremium.value && Boolean(marvUserId.value))

  async function fetchMe(opts: { forceRefresh?: boolean } = {}): Promise<MarvinMeDto | null> {
    if (!me.value?.id) {
      me$.value = null
      return null
    }
    if (!opts.forceRefresh && hasFetched.value && me$.value) return me$.value
    loading.value = true
    error.value = null
    try {
      const data = await apiFetchData<MarvinMeDto>('/marvin/me')
      me$.value = data
      hasFetched.value = true
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load Marv'
      return null
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded(): Promise<MarvinMeDto | null> {
    return fetchMe({ forceRefresh: false })
  }

  /**
   * Optimistic preferred-mode update. Patches local state first, then writes;
   * on failure restores the previous value and surfaces the error.
   */
  async function setPreferredMode(mode: MarvinModeDto): Promise<void> {
    const current = me$.value
    if (!current) {
      await ensureLoaded()
    }
    const prev = me$.value?.preferredMode ?? 'auto'
    if (me$.value && prev === mode) return
    if (me$.value) me$.value = { ...me$.value, preferredMode: mode }
    try {
      const body: MarvinUpdatePreferencesBodyDto = { preferredMode: mode }
      const res = await apiFetch<MarvinMeDto>('/marvin/me/preferences', {
        method: 'PATCH',
        body,
      })
      if (res?.data) me$.value = res.data
    } catch (err) {
      if (me$.value) me$.value = { ...me$.value, preferredMode: prev }
      error.value = err instanceof Error ? err.message : 'Failed to update Marv preferences'
      throw err
    }
  }

  /**
   * Patch credits in place from the realtime payload. Wins over fetchMe results
   * that are older than the patched value (the websocket payload is always the
   * latest).
   */
  function applyCreditsUpdate(payload: MarvCreditsUpdatedPayloadDto) {
    if (!me$.value) return
    me$.value = {
      ...me$.value,
      credits: {
        credits: payload.credits,
        maxCredits: payload.maxCredits,
        creditsPerDay: payload.creditsPerDay,
        lastRefilledAt: payload.lastRefilledAt,
      },
    }
  }

  let registeredCb: MarvCallback | null = null

  function startRealtime() {
    if (!import.meta.client) return
    if (subscribedRef.value) return
    const cb: MarvCallback = {
      onCreditsUpdated: (payload) => applyCreditsUpdate(payload),
    }
    addMarvCallback(cb)
    registeredCb = cb
    subscribedRef.value = true
  }

  function stopRealtime() {
    if (!import.meta.client) return
    if (!subscribedRef.value || !registeredCb) {
      subscribedRef.value = false
      registeredCb = null
      return
    }
    removeMarvCallback(registeredCb)
    registeredCb = null
    subscribedRef.value = false
  }

  return {
    // state
    me: me$,
    loading,
    error,
    hasFetched,
    enabled,
    isPremium,
    preferredMode,
    credits,
    marvUserId,
    marvUsername,
    marvDisplayName,
    marvAvatarUrl,
    isAvailable,
    // actions
    ensureLoaded,
    fetchMe,
    setPreferredMode,
    startRealtime,
    stopRealtime,
    applyCreditsUpdate,
  }
}
