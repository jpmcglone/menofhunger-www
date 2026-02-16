const NOW_MS_KEY = 'moh:now-ticker:now-ms:v1'

let started = false
let timer: ReturnType<typeof setInterval> | null = null
let listenersAttached = false

function startTicker(nowMs: Ref<number>, everyMs: number) {
  function tick() {
    nowMs.value = Date.now()
  }

  // Steady tick (coarse; good enough for "now", "5m", edit expiry, etc.).
  timer && clearInterval(timer)
  timer = setInterval(() => tick(), Math.max(5_000, Math.floor(everyMs)))

  // Also tick on focus/visibility to handle background throttling.
  if (!listenersAttached) {
    listenersAttached = true
    const onVisibilityOrFocus = () => tick()
    window.addEventListener('focus', onVisibilityOrFocus)
    document.addEventListener('visibilitychange', onVisibilityOrFocus)
  }
}

/**
 * Shared “now” ticker for relative timestamps and time-based UI.
 * Client-only ticking; SSR-safe (returns a static initial value on server).
 */
export function useNowTicker(opts?: { everyMs?: number }) {
  const nowMs = useState<number>(NOW_MS_KEY, () => Date.now())
  const now = computed(() => new Date(nowMs.value))

  if (import.meta.client && !started) {
    started = true
    startTicker(nowMs, opts?.everyMs ?? 15_000)
  }

  return { nowMs, now }
}

