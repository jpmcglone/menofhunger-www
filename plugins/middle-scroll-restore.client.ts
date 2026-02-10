/**
 * Restores the middle scroller position on back/forward (e.g. scroll home feed, navigate away, hit back → same place).
 * Saves scrollTop per route in sessionStorage. We detect back/forward via popstate because Vue Router's savedPosition
 * is only set when scrollBehavior returns a position (we use a custom scroll container, so we don't).
 */

const KEY_PREFIX = 'moh.middleScroll.v1:'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function getMiddleScroller(): HTMLElement | null {
  return document.getElementById('moh-middle-scroller')
}

function readStoredTop(path: string): number | null {
  try {
    const raw = sessionStorage.getItem(`${KEY_PREFIX}${path}`)
    if (!raw) return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    return Math.max(0, Math.floor(n))
  } catch {
    return null
  }
}

function writeStoredTop(path: string, top: number) {
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${path}`, String(Math.max(0, Math.floor(top))))
  } catch {
    // ignore
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const router = useRouter()
  const route = useRoute()

  // Detect back/forward: Vue Router's savedPosition is only set when we return a position from scrollBehavior.
  // We use a custom scroll container, so we never return one — detect popstate instead.
  let isPopStateNavigation = false
  window.addEventListener('popstate', () => {
    isPopStateNavigation = true
  })

  // Track scrollTop for the current route so back/forward can restore it.
  nuxtApp.hook('app:mounted', () => {
    let currentEl: HTMLElement | null = null
    let rafId: number | null = null
    const onScroll = () => {
      const el = currentEl
      if (!el) return
      if (rafId != null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        writeStoredTop(route.fullPath, el.scrollTop)
      })
    }

    const ensureScrollListener = () => {
      const next = getMiddleScroller()
      if (next === currentEl) return
      if (currentEl) currentEl.removeEventListener('scroll', onScroll as any)
      currentEl = next
      if (currentEl) currentEl.addEventListener('scroll', onScroll as any, { passive: true })
    }

    // Initial attach, plus reattach on layout swaps / scroller replacement.
    ensureScrollListener()
    nuxtApp.hook('page:finish', () => ensureScrollListener())

    // Best-effort cleanup for HMR / teardown.
    if ((import.meta as any).hot) {
      ;(import.meta as any).hot.dispose(() => {
        if (currentEl) currentEl.removeEventListener('scroll', onScroll as any)
        currentEl = null
      })
    }
  })

  // Snapshot the outgoing route's scroll position before navigating away.
  router.beforeEach((_to, from) => {
    const el = getMiddleScroller()
    if (!el) return true
    writeStoredTop(from.fullPath, el.scrollTop)
    return true
  })

  // Restore middle scroller on back/forward; scroll to top on normal navigation.
  router.options.scrollBehavior = (to, from) => {
    if (!import.meta.client) return false as const

    const isBookmarksNav =
      to.path.startsWith('/bookmarks') && from.path.startsWith('/bookmarks') && from.path !== to.path

    const shouldRestoreFromStorage = isPopStateNavigation
    if (isPopStateNavigation) isPopStateNavigation = false

    return new Promise<false>((resolve) => {
      ;(nuxtApp as { hooks: { hookOnce: (name: string, cb: () => void) => void } }).hooks.hookOnce('page:finish', () => {
        // Defer so layout and async content (e.g. feed) have a chance to render; otherwise scrollHeight can be 0.
        const run = () => {
          const el = getMiddleScroller()
          if (!el) return resolve(false)

          if (shouldRestoreFromStorage) {
            const stored = readStoredTop(to.fullPath)
            if (stored != null) {
              const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
              el.scrollTop = clamp(stored, 0, maxTop)
              // Feed content is often loaded async; re-apply once it has rendered so we don't stay at a clamped value.
              setTimeout(() => {
                const el2 = getMiddleScroller()
                if (el2) {
                  const maxTop2 = Math.max(0, el2.scrollHeight - el2.clientHeight)
                  el2.scrollTop = clamp(stored, 0, maxTop2)
                }
              }, 200)
            }
            return resolve(false)
          }

          if (isBookmarksNav) {
            const stored = readStoredTop(from.fullPath)
            if (stored != null) {
              const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
              el.scrollTop = clamp(stored, 0, maxTop)
            }
            return resolve(false)
          }

          el.scrollTop = 0
          return resolve(false)
        }

        requestAnimationFrame(() => requestAnimationFrame(run))
      })
    })
  }
})
