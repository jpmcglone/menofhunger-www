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
    // ignore (storage may be disabled)
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const router = useRouter()
  const route = useRoute()

  // Track scrollTop for the current route so Back/Forward can restore it.
  nuxtApp.hook('app:mounted', () => {
    const el = getMiddleScroller()
    if (!el) return

    let rafId: number | null = null
    const onScroll = () => {
      if (rafId != null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        writeStoredTop(route.fullPath, el.scrollTop)
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
  })

  // Snapshot the outgoing route's scroll position before navigating away.
  router.beforeEach((_to, from) => {
    const el = getMiddleScroller()
    if (!el) return true
    writeStoredTop(from.fullPath, el.scrollTop)
    return true
  })

  // Override router scroll behavior for the custom middle scroller.
  router.options.scrollBehavior = (to, from, savedPosition) => {
    if (!import.meta.client) return false as const

    const isBookmarksNav =
      to.path.startsWith('/bookmarks') && from.path.startsWith('/bookmarks') && from.path !== to.path

    // Wait until the page has finished rendering so the scroll container exists.
    return new Promise<false>((resolve) => {
      ;(nuxtApp as { hooks: { hookOnce: (name: string, cb: () => void) => void } }).hooks.hookOnce('page:finish', () => {
        const el = getMiddleScroller()
        if (!el) return resolve(false)

        // Back/forward navigation: restore the last known scrollTop for this route.
        if (savedPosition) {
          const stored = readStoredTop(to.fullPath)
          const top = stored ?? 0
          const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
          el.scrollTop = clamp(top, 0, maxTop)
          return resolve(false)
        }

        // Switching bookmark folders: preserve scroll (content updates, scroll stays).
        if (isBookmarksNav) {
          const stored = readStoredTop(from.fullPath)
          if (stored != null) {
            const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
            el.scrollTop = clamp(stored, 0, maxTop)
          }
          return resolve(false)
        }

        // Normal navigation: reset the middle scroller to top.
        el.scrollTop = 0
        return resolve(false)
      })
    })
  }
})

