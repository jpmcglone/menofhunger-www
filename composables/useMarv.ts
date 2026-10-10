import type {
  MarvinMeDto,
  MarvinModeDto,
  MarvinUpdatePreferencesBodyDto,
  MarvCreditsUpdatedPayloadDto,
} from '~/types/api'
import { usePresence, type MarvCallback } from '~/composables/usePresence'
import { useAuth } from '~/composables/useAuth'
import { useApiClient } from '~/composables/useApiClient'
import { getAuthGeneration } from '~/composables/auth/authState'

type MarvRuntime = {
  owners: Set<symbol>
  callback: MarvCallback | null
  remove: (() => void) | null
  request: Promise<MarvinMeDto | null> | null
  epoch: number
  preferencesRevision: number
  creditsRevision: number
}
// Runtime callbacks/promises stay outside serializable state, scoped to the Nuxt app.
const runtimes = new WeakMap<object, MarvRuntime>()

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
  const viewerId = useState<string | null>(`${stateKey}:viewer-id`, () => null)
  const app = useNuxtApp()
  let runtime = runtimes.get(app)
  if (!runtime) {
    runtime = { owners: new Set(), callback: null, remove: null, request: null, epoch: 0, preferencesRevision: 0, creditsRevision: 0 }
    runtimes.set(app, runtime)
  }
  const shared = runtime
  const owner = Symbol('marv-consumer')
  function syncIdentity() {
    const identity = me.value?.id ?? null
    if (viewerId.value === identity) return
    viewerId.value = identity
    shared.epoch += 1
    shared.request = null
    shared.preferencesRevision += 1
    shared.creditsRevision += 1
    me$.value = null
    hasFetched.value = false
    loading.value = false
    error.value = null
  }
  syncIdentity()
  watch(() => me.value?.id, syncIdentity, { flush: 'sync' })

  const enabled = computed(() => Boolean(me$.value?.enabled))
  const isPremium = computed(() => Boolean(me$.value?.isPremium))
  const preferredMode = computed<MarvinModeDto>(() => me$.value?.preferredMode ?? 'auto')
  const credits = computed(() => me$.value?.credits ?? null)
  const marvUserId = computed<string | null>(() => me$.value?.marv?.userId ?? null)
  const marvUsername = computed<string | null>(() => me$.value?.marv?.username ?? null)
  const marvDisplayName = computed<string | null>(() => me$.value?.marv?.displayName ?? null)
  const marvAvatarVideo = computed(() => me$.value?.marv?.avatarVideo ?? null)
  const marvAvatarUrl = computed<string | null>(() => me$.value?.marv?.avatarUrl ?? null)

  /**
   * Available to premium members only — gated server-side too, but checking up
   * front lets the chat page render the right pinned-row variant (CTA vs row).
   */
  const isAvailable = computed(() => enabled.value && isPremium.value && Boolean(marvUserId.value))

  async function fetchMe(opts: { forceRefresh?: boolean } = {}): Promise<MarvinMeDto | null> {
    syncIdentity()
    const identity = me.value?.id
    if (!identity) return null
    if (shared.request) return shared.request
    if (!opts.forceRefresh && hasFetched.value && me$.value) return me$.value
    const epoch = shared.epoch
    const authGeneration = getAuthGeneration()
    const creditRevision = shared.creditsRevision
    const preferencesRevision = shared.preferencesRevision
    const current = () => me.value?.id === identity && shared.epoch === epoch && getAuthGeneration() === authGeneration
    loading.value = true
    error.value = null
    const request = (async () => {
      try {
        const data = await apiFetchData<MarvinMeDto>('/marvin/me')
        if (!current()) return null
        // A socket credit update or mode selection made during the fetch wins.
        me$.value = {
          ...data,
          ...(shared.creditsRevision !== creditRevision && me$.value ? { credits: me$.value.credits } : {}),
          ...(shared.preferencesRevision !== preferencesRevision && me$.value ? { preferredMode: me$.value.preferredMode } : {}),
        }
        hasFetched.value = true
        return me$.value
      } catch (err) {
        if (current()) error.value = err instanceof Error ? err.message : 'Failed to load Marv'
        return null
      } finally {
        if (current()) { loading.value = false; shared.request = null }
      }
    })()
    shared.request = request
    return request
  }

  async function ensureLoaded(): Promise<MarvinMeDto | null> {
    return fetchMe({ forceRefresh: false })
  }

  /**
   * Optimistic preferred-mode update. Patches local state first, then writes;
   * on failure restores the previous value and surfaces the error.
   */
  async function setPreferredMode(mode: MarvinModeDto): Promise<void> {
    const identity = me.value?.id
    const epoch = shared.epoch
    const authGeneration = getAuthGeneration()
    const validIdentity = () => Boolean(identity) && me.value?.id === identity && shared.epoch === epoch && getAuthGeneration() === authGeneration
    if (!me$.value) await ensureLoaded()
    if (!validIdentity() || !me$.value) return
    const prev = me$.value.preferredMode
    if (prev === mode) return
    const revision = ++shared.preferencesRevision
    const creditRevision = shared.creditsRevision
    if (me$.value) me$.value = { ...me$.value, preferredMode: mode }
    try {
      const body: MarvinUpdatePreferencesBodyDto = { preferredMode: mode }
      const res = await apiFetch<MarvinMeDto>('/marvin/me/preferences', {
        method: 'PATCH',
        body,
      })
      if (res?.data && validIdentity() && shared.preferencesRevision === revision) {
        me$.value = { ...res.data, ...(creditRevision !== shared.creditsRevision && me$.value ? { credits: me$.value.credits } : {}) }
      }
    } catch (err) {
      if (!validIdentity() || shared.preferencesRevision !== revision) return
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
    if (!me$.value || !me.value?.id || viewerId.value !== me.value.id) return
    shared.creditsRevision += 1
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

  // When the viewer's premium status changes (upgrade/downgrade/verification), the
  // cached `/marvin/me` payload becomes stale because it carries its own `isPremium`
  // field. Force a refresh so `isAvailable` and credit display update immediately.
  if (import.meta.client) {
    watch(
      () => me.value?.premium,
      (isNowPremium, wasPremium) => {
        if (isNowPremium !== wasPremium && hasFetched.value) {
          void fetchMe({ forceRefresh: true })
        }
      },
    )
  }

  function startRealtime() {
    if (!import.meta.client) return
    if (shared.owners.has(owner)) return
    shared.owners.add(owner)
    if (shared.callback) return
    const cb: MarvCallback = { onCreditsUpdated: applyCreditsUpdate }
    addMarvCallback(cb)
    shared.callback = cb
    shared.remove = () => removeMarvCallback(cb)
  }

  function stopRealtime() {
    if (!shared.owners.delete(owner) || shared.owners.size) return
    shared.remove?.()
    shared.remove = null
    shared.callback = null
  }
  onScopeDispose(stopRealtime)

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
    marvAvatarVideo,
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
