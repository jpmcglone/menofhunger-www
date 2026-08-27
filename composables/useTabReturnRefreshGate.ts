export const TAB_RETURN_REFRESH_MIN_MS = 30_000

const LAST_BACKGROUND_STATE_KEY = 'tab-return-last-background'

export function shouldRefreshTabReturn(input: {
  lastSuccessMs: number
  lastBackgroundedMs: number
  nowMs: number
  minIntervalMs?: number
}): boolean {
  const minIntervalMs = input.minIntervalMs ?? TAB_RETURN_REFRESH_MIN_MS
  if (input.lastSuccessMs > 0 && input.lastBackgroundedMs > input.lastSuccessMs) return true
  if (input.lastSuccessMs > 0 && input.nowMs - input.lastSuccessMs < minIntervalMs) return false
  return true
}

let visibilityHookInstalled = false

/**
 * Skip keepalive/tab-return HTTP when the document stayed visible and this
 * surface loaded within 30s. Always refresh after the tab was backgrounded.
 */
export function useTabReturnRefreshGate(key: string) {
  const lastSuccessMs = useState(`tab-return-success:${key}`, () => 0)
  const lastBackgroundedMs = useState(LAST_BACKGROUND_STATE_KEY, () => 0)

  if (import.meta.client && !visibilityHookInstalled) {
    visibilityHookInstalled = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        lastBackgroundedMs.value = Date.now()
      }
    })
  }

  function shouldRefresh(): boolean {
    return shouldRefreshTabReturn({
      lastSuccessMs: lastSuccessMs.value,
      lastBackgroundedMs: lastBackgroundedMs.value,
      nowMs: Date.now(),
    })
  }

  function markSuccess() {
    lastSuccessMs.value = Date.now()
  }

  return { shouldRefresh, markSuccess }
}
