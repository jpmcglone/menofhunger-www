import { easternDateKey, msUntilNextEasternMidnight } from '~/utils/eastern-time'

const NOW_MS_KEY = 'moh:eastern-midnight-rollover:now-ms:v1'

let timer: ReturnType<typeof setTimeout> | null = null
let started = false
let listenersAttached = false

function startRollover(nowMs: Ref<number>) {
  function tick() {
    nowMs.value = Date.now()
  }

  function schedule() {
    timer && clearTimeout(timer)
    const ms = msUntilNextEasternMidnight(new Date())
    // Nudge a bit after midnight so we reliably cross the boundary.
    timer = setTimeout(() => {
      tick()
      schedule()
    }, Math.max(1000, ms + 2000))
  }

  schedule()

  if (!listenersAttached) {
    listenersAttached = true
    const onVisibilityOrFocus = () => tick()
    window.addEventListener('focus', onVisibilityOrFocus)
    document.addEventListener('visibilitychange', onVisibilityOrFocus)
  }
}

/**
 * Shared “midnight ET” rollover tick for client-side daily content.
 *
 * - Updates immediately on focus/visibility to handle sleep/background throttling.
 * - Uses `msUntilNextEasternMidnight()` so it tracks ET midnight across DST.
 */
export function useEasternMidnightRollover() {
  const nowMs = useState<number>(NOW_MS_KEY, () => Date.now())
  const now = computed(() => new Date(nowMs.value))
  const dayKey = computed(() => easternDateKey(now.value))

  if (import.meta.client && !started) {
    started = true
    startRollover(nowMs)
  }

  return { nowMs, now, dayKey }
}

