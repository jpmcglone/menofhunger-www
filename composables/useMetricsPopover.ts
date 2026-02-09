import type { GetActiveUsersMetricsData } from '~/types/api'

type MetricsState = {
  open: boolean
  x: number
  y: number
  anchorX: number
  anchorY: number
  hoveringTrigger: boolean
  hoveringCard: boolean
  loading: boolean
  error: string | null
  metrics: GetActiveUsersMetricsData | null
  lastFetchedAtMs: number
}

const SHOW_DELAY_MS = 200
const HIDE_DELAY_MS = 400
const METRICS_TTL_MS = 60_000

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let routerHookInstalled = false

function clearTimer(t: ReturnType<typeof setTimeout> | null) {
  if (t) clearTimeout(t)
}

export function useMetricsPopover() {
  const state = useState<MetricsState>('moh.metricsPopover.v1', () => ({
    open: false,
    x: 0,
    y: 0,
    anchorX: 0,
    anchorY: 0,
    hoveringTrigger: false,
    hoveringCard: false,
    loading: false,
    error: null,
    metrics: null,
    lastFetchedAtMs: 0,
  }))

  const { apiFetchData } = useApiClient()

  function setMousePos(e: MouseEvent) {
    state.value.x = Math.floor(e.clientX)
    state.value.y = Math.floor(e.clientY)
  }

  function close() {
    state.value.open = false
    state.value.hoveringTrigger = false
    state.value.hoveringCard = false
    clearTimer(showTimer)
    clearTimer(hideTimer)
    showTimer = null
    hideTimer = null
  }

  function cancelPending() {
    clearTimer(showTimer)
    showTimer = null
  }

  function scheduleHide() {
    if (!import.meta.client) return
    clearTimer(hideTimer)
    hideTimer = setTimeout(() => {
      if (state.value.hoveringTrigger) return
      if (state.value.hoveringCard) return
      state.value.open = false
    }, HIDE_DELAY_MS)
  }

  async function fetchIfStale() {
    if (!import.meta.client) return
    if (state.value.loading) return
    const now = Date.now()
    if (state.value.metrics && now - state.value.lastFetchedAtMs < METRICS_TTL_MS) return

    state.value.loading = true
    state.value.error = null
    try {
      const metrics = await apiFetchData<GetActiveUsersMetricsData>('/metrics/active-users', {
        method: 'GET',
        timeout: 8000,
        mohCache: { ttlMs: METRICS_TTL_MS, staleWhileRevalidateMs: 30_000 },
      })
      state.value.metrics = metrics ?? null
      state.value.lastFetchedAtMs = now
    } catch {
      // Silent failure: keep prior metrics if any.
      state.value.error = null
    } finally {
      state.value.loading = false
    }
  }

  function onTriggerEnter(e: MouseEvent) {
    if (!import.meta.client) return
    setMousePos(e)
    state.value.hoveringTrigger = true
    clearTimer(hideTimer)
    hideTimer = null

    // Fetch in background; popover can open once data arrives.
    void fetchIfStale()

    if (state.value.open) {
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      return
    }

    clearTimer(showTimer)
    showTimer = setTimeout(() => {
      if (!state.value.hoveringTrigger) return
      if (!state.value.metrics) return
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      state.value.open = true
    }, SHOW_DELAY_MS)
  }

  function onTriggerMove(e: MouseEvent) {
    if (!import.meta.client) return
    if (!state.value.hoveringTrigger) return
    if (state.value.open) return
    setMousePos(e)
  }

  function onTriggerLeave() {
    if (!import.meta.client) return
    state.value.hoveringTrigger = false
    scheduleHide()
  }

  function onCardEnter() {
    if (!import.meta.client) return
    state.value.hoveringCard = true
    clearTimer(hideTimer)
    hideTimer = null
  }

  function onCardLeave() {
    if (!import.meta.client) return
    state.value.hoveringCard = false
    scheduleHide()
  }

  // If data arrives after hover, open immediately (without waiting for another hover event).
  watch(
    () => [state.value.metrics, state.value.hoveringTrigger, state.value.open] as const,
    ([metrics, hovering, open]) => {
      if (!import.meta.client) return
      if (open) return
      if (!hovering) return
      if (!metrics) return
      state.value.anchorX = state.value.x
      state.value.anchorY = state.value.y
      state.value.open = true
    },
    { flush: 'post' },
  )

  // Ensure a click+navigate can never “leak” a delayed popover into the next page.
  if (import.meta.client && !routerHookInstalled) {
    routerHookInstalled = true
    const router = useRouter()
    router.beforeEach(() => {
      close()
      return true
    })
  }

  return {
    state,
    close,
    cancelPending,
    onTriggerEnter,
    onTriggerMove,
    onTriggerLeave,
    onCardEnter,
    onCardLeave,
  }
}

