import type { FeedVisibilityFilter, FeedSort } from '~/composables/useFeedFilters'

export type FeedScope = 'all' | 'following' | 'forYou'
type UrlFeedFiltersOptions = {
  // Uses history.replaceState + location.search as source of truth.
  // Useful on pages that intentionally bypass Vue Router with pushState.
  historyBacked?: boolean
  /** Scope used when `?scope=` is absent. Defaults to `all`. */
  defaultScope?: FeedScope
}

/**
 * URL-backed feed filters — reads `sort`, `filter`, and `scope` from query params
 * and writes them back via `router.replace` (no history entry).
 *
 * Defaults (omitted from URL when active):
 *   sort    → 'new'
 *   filter  → 'all'
 *   scope   → 'all'
 *
 * Example URLs:
 *   /home?sort=trending
 *   /home?scope=following&sort=trending
 *   /u/john/replies?sort=trending
 *   /u/john/media?filter=verifiedOnly
 *   /articles?scope=following&sort=trending&filter=verifiedOnly
 */
export function useUrlFeedFilters(options: UrlFeedFiltersOptions = {}) {
  const route = useRoute()
  const router = useRouter()
  const { isVerified, isPremium, isAuthed } = useAuth()
  const historyBacked = options.historyBacked === true
  const defaultScope = options.defaultScope ?? 'all'
  const historyQueryVersion = ref(0)

  // When the profile page switches tabs via history.pushState (bypassing Vue Router
  // to avoid NavigationDuplicated on alias routes), route.path can lag behind the
  // real URL. Use location.pathname so filter changes always target the current tab.
  function currentPath() {
    return import.meta.client ? location.pathname : route.path
  }

  function readQueryValue(key: string): string | undefined {
    if (historyBacked && import.meta.client) {
      // Establish reactive dependency so computed getters update after popstate/replaceState.
      historyQueryVersion.value
      const v = new URLSearchParams(location.search).get(key)
      return v ?? undefined
    }
    const v = route.query[key]
    if (Array.isArray(v)) return v.length ? String(v[v.length - 1]) : undefined
    return v == null ? undefined : String(v)
  }

  function currentQueryRecord(): Record<string, string | undefined> {
    if (historyBacked && import.meta.client) {
      historyQueryVersion.value
      const out: Record<string, string | undefined> = {}
      new URLSearchParams(location.search).forEach((value, key) => {
        out[key] = value
      })
      return out
    }
    const out: Record<string, string | undefined> = {}
    Object.entries(route.query).forEach(([key, value]) => {
      if (Array.isArray(value)) out[key] = value.length ? String(value[value.length - 1]) : undefined
      else if (value != null) out[key] = String(value)
    })
    return out
  }

  function applyQueryPatch(patch: Record<string, string | undefined>) {
    const next = { ...currentQueryRecord(), ...patch }
    if (historyBacked && import.meta.client) {
      const search = new URLSearchParams()
      Object.entries(next).forEach(([key, value]) => {
        if (value != null && value !== '') search.set(key, value)
      })
      const query = search.toString()
      const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash || ''}`
      history.replaceState({ ...history.state }, '', url)
      historyQueryVersion.value += 1
      return
    }
    void router.replace({ path: currentPath(), query: next })
  }

  if (historyBacked && import.meta.client) {
    const onPopState = () => { historyQueryVersion.value += 1 }
    onMounted(() => window.addEventListener('popstate', onPopState))
    onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))
    // Also react to router-driven URL updates (not just popstate/replaceState).
    watch(() => route.fullPath, () => { historyQueryVersion.value += 1 })
  }

  // ── sort ────────────────────────────────────────────────────────────────────
  const sort = computed<FeedSort>({
    get: () => readQueryValue('sort') === 'trending' ? 'trending' : 'new',
    set: (val) => {
      applyQueryPatch({ sort: val === 'new' ? undefined : val })
    },
  })

  // ── visibility filter ───────────────────────────────────────────────────────
  const filter = computed<FeedVisibilityFilter>({
    get: () => {
      const q = readQueryValue('filter')
      if (q === 'public' || q === 'verifiedOnly' || q === 'premiumOnly') return q
      return 'all'
    },
    set: (val) => {
      applyQueryPatch({ filter: val === 'all' ? undefined : val })
    },
  })

  // ── scope (all / following / forYou) — only meaningful when authed ──────────
  const scope = computed<FeedScope>({
    get: () => {
      if (!isAuthed.value) return 'all'
      const v = readQueryValue('scope')
      if (v === 'following') return 'following'
      if (v === 'forYou') return 'forYou'
      if (v === 'all') return 'all'
      return defaultScope
    },
    set: (val) => {
      applyQueryPatch({ scope: val === defaultScope ? undefined : val })
    },
  })

  // Reset authed-only scopes if the user signs out.
  watch(isAuthed, (authed) => {
    if (!authed && (scope.value === 'following' || scope.value === 'forYou')) {
      applyQueryPatch({ scope: undefined })
    }
  })

  // ── derived ─────────────────────────────────────────────────────────────────
  const ctaKind = computed<null | 'verify' | 'premium'>(() => {
    if (filter.value === 'verifiedOnly' && !isVerified.value) return 'verify'
    if (filter.value === 'premiumOnly' && !isPremium.value) return 'premium'
    return null
  })

  const isFiltered = computed(() => sort.value !== 'new' || filter.value !== 'all' || scope.value !== defaultScope)

  function resetFilters() {
    applyQueryPatch({ sort: undefined, filter: undefined })
  }

  return {
    sort,
    filter,
    scope,
    viewerIsVerified: isVerified,
    viewerIsPremium: isPremium,
    ctaKind,
    isFiltered,
    resetFilters,
  }
}
