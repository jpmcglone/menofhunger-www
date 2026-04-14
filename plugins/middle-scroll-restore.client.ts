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

function getRightRailScroller(): HTMLElement | null {
  return document.getElementById('moh-right-rail-scroller')
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
  // For forward navigation (not back/forward), immediately reset scroll to 0 so the incoming
  // page never inherits the outgoing page's scroll offset during the transition.
  router.beforeEach((_to, from) => {
    const middle = getMiddleScroller()
    if (!middle) return true
    writeStoredTop(from.fullPath, middle.scrollTop)

    // Bookmark folder switches deliberately preserve scroll position (handled in scrollBehavior),
    // and back/forward navigation restores from storage — skip the reset for both.
    const isBookmarksNav =
      _to.path.startsWith('/bookmarks') && from.path.startsWith('/bookmarks') && from.path !== _to.path
    // In-page changes (same path — hash or query differs) are in-place updates
    // (e.g. filter/sort, comment deep-links). Don't reset scroll; let page-level
    // code handle scrolling to the right place.
    const isInPageChange = _to.path === from.path
    if (!isPopStateNavigation && !isBookmarksNav && !isInPageChange) {
      middle.scrollTop = 0
      const right = getRightRailScroller()
      if (right) right.scrollTop = 0
    }

    return true
  })

  // Restore middle scroller on back/forward; scroll to top on normal navigation.
  router.options.scrollBehavior = (to, from) => {
    if (!import.meta.client) return false as const

    const isBookmarksNav =
      to.path.startsWith('/bookmarks') && from.path.startsWith('/bookmarks') && from.path !== to.path
    // In-page changes (hash or query change on same path) preserve scroll position.
    const isInPageChange = to.path === from.path

    const shouldRestoreFromStorage = isPopStateNavigation
    if (isPopStateNavigation) isPopStateNavigation = false

    // In-page changes (hash/query on the same path) don't trigger page:finish,
    // so resolve immediately. For back/forward, restore from storage first.
    if (isInPageChange) {
      if (shouldRestoreFromStorage) {
        const el = getMiddleScroller()
        if (el) {
          const stored = readStoredTop(to.fullPath)
          if (stored != null) {
            const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
            el.scrollTop = clamp(stored, 0, maxTop)
          }
        }
      }
      return false as const
    }

    // Shared restore logic, called after the page DOM is ready.
    const applyRestore = (resolve: (v: false) => void) => {
      const el = getMiddleScroller()
      if (!el) return resolve(false)

      if (shouldRestoreFromStorage) {
        const stored = readStoredTop(to.fullPath)
        if (stored != null) {
          const apply = () => {
            const el2 = getMiddleScroller()
            if (!el2) return
            const maxTop = Math.max(0, el2.scrollHeight - el2.clientHeight)
            el2.scrollTop = clamp(stored, 0, maxTop)
          }
          apply()
          setTimeout(apply, 200)
        }
        return resolve(false)
      }

      if (isBookmarksNav) {
        return resolve(false)
      }

      el.scrollTop = 0
      const right = getRightRailScroller()
      if (right) right.scrollTop = 0
      return resolve(false)
    }

    return new Promise<false>((resolve) => {
      if (shouldRestoreFromStorage && to.meta?.keepalive) {
        requestAnimationFrame(() => requestAnimationFrame(() => applyRestore(resolve)))
        return
      }

      ;(nuxtApp as { hooks: { hookOnce: (name: string, cb: () => void) => void } }).hooks.hookOnce('page:finish', () => {
        requestAnimationFrame(() => requestAnimationFrame(() => applyRestore(resolve)))
      })
    })
  }
})
