export function useEmbeddedVideoManager() {
  // Global (per-app) active embedded video. Only one at a time.
  const activePostId = useState<string | null>('moh.active-embedded-video-post-id', () => null)

  // NOTE: We intentionally keep DOM elements out of `useState()` (SSR-safe).
  // This registry is client-only.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const registry = (() => {
    if (import.meta.server) return null
    // Module-level singleton (preserved across composable calls).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any
    if (!g.__mohEmbeddedVideoRegistry) g.__mohEmbeddedVideoRegistry = new Map<string, HTMLElement>()
    return g.__mohEmbeddedVideoRegistry as Map<string, HTMLElement>
  })()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const runtime = (() => {
    if (import.meta.server) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any
    if (!g.__mohEmbeddedVideoRuntime) {
      g.__mohEmbeddedVideoRuntime = {
        listening: false,
        rafPending: false,
        lastSwitchMs: 0,
        pendingId: null as string | null,
        pendingSinceMs: 0,
      }
    }
    return g.__mohEmbeddedVideoRuntime as {
      listening: boolean
      rafPending: boolean
      lastSwitchMs: number
      pendingId: string | null
      pendingSinceMs: number
    }
  })()

  function computeActiveFromViewport() {
    if (import.meta.server) return
    if (!registry) return

    const vh = window.innerHeight || 0
    const centerY = vh / 2
    const minVisiblePx = 60

    const measure = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      if (!r || r.height <= 0) return null
      const visiblePx = Math.min(r.bottom, vh) - Math.max(r.top, 0)
      if (visiblePx < minVisiblePx) return null
      const cy = r.top + r.height / 2
      const dist = Math.abs(cy - centerY)
      return { dist, visiblePx }
    }

    let bestId: string | null = null
    let bestDist = Number.POSITIVE_INFINITY

    for (const [id, el] of registry.entries()) {
      if (!el || !el.isConnected) {
        registry.delete(id)
        continue
      }

      const m = measure(el)
      if (!m) continue
      const dist = m.dist
      if (dist < bestDist) {
        bestDist = dist
        bestId = id
      }
    }

    const currentId = activePostId.value
    const nowMs = Date.now()

    // If no candidate is visible, clear quickly.
    if (!bestId) {
      activePostId.value = null
      if (runtime) {
        runtime.pendingId = null
        runtime.pendingSinceMs = 0
      }
      return
    }

    // If nothing is active yet, pick the best.
    if (!currentId) {
      // Small delay helps avoid flicker on first enter while scrolling fast.
      const delayMs = 140
      if (runtime) {
        if (runtime.pendingId !== bestId) {
          runtime.pendingId = bestId
          runtime.pendingSinceMs = nowMs
          return
        }
        if (nowMs - runtime.pendingSinceMs < delayMs) return
        runtime.pendingId = null
        runtime.pendingSinceMs = 0
        runtime.lastSwitchMs = nowMs
      }
      activePostId.value = bestId
      return
    }

    // If active is still "good enough", keep it to prevent flicker while scrolling.
    // This creates a deadband: the new candidate must be meaningfully closer to center.
    const currentEl = registry.get(currentId) ?? null
    const currentM = currentEl ? measure(currentEl) : null
    if (!currentM) {
      // Active is no longer sufficiently visible: switch immediately.
      activePostId.value = bestId
      if (runtime) {
        runtime.lastSwitchMs = nowMs
        runtime.pendingId = null
        runtime.pendingSinceMs = 0
      }
      return
    }

    if (bestId === currentId) {
      if (runtime) {
        runtime.pendingId = null
        runtime.pendingSinceMs = 0
      }
      return
    }

    // Rate-limit rapid switching unless the current becomes invalid (handled above).
    const minSwitchIntervalMs = 250
    if (runtime && nowMs - runtime.lastSwitchMs < minSwitchIntervalMs) return

    const deadbandPx = 120
    if (currentM.dist <= bestDist + deadbandPx) return

    // Debounce the actual switch slightly so we don't flicker while scrolling.
    const delayMs = 140
    if (runtime) {
      if (runtime.pendingId !== bestId) {
        runtime.pendingId = bestId
        runtime.pendingSinceMs = nowMs
        return
      }
      if (nowMs - runtime.pendingSinceMs < delayMs) return
      runtime.pendingId = null
      runtime.pendingSinceMs = 0
      runtime.lastSwitchMs = nowMs
    }
    activePostId.value = bestId
  }

  function scheduleCompute() {
    if (import.meta.server) return
    if (!runtime) return
    if (runtime.rafPending) return
    runtime.rafPending = true
    window.requestAnimationFrame(() => {
      runtime.rafPending = false
      computeActiveFromViewport()
    })
  }

  function ensureListeners() {
    if (import.meta.server) return
    if (!runtime) return
    if (runtime.listening) return
    runtime.listening = true

    // Capture-phase `scroll` catches non-bubbling scroll events from nested scrollers.
    window.addEventListener('scroll', scheduleCompute, true)
    window.addEventListener('resize', scheduleCompute, true)
  }

  function register(postId: string, el: HTMLElement) {
    const id = (postId ?? '').trim()
    if (!id) return
    if (import.meta.server) return
    if (!registry) return
    if (!el) return
    ensureListeners()
    registry.set(id, el)
    scheduleCompute()
  }

  function unregister(postId: string) {
    const id = (postId ?? '').trim()
    if (!id) return
    if (import.meta.server) return
    if (!registry) return
    registry.delete(id)
    scheduleCompute()
  }

  function stopAll() {
    activePostId.value = null
  }

  return { activePostId, register, unregister, stopAll }
}

