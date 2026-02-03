import type { Ref } from 'vue'

export type FeedVisibilityFilter = 'all' | 'public' | 'verifiedOnly' | 'premiumOnly'
export type FeedSort = 'new' | 'trending'

export type UseFeedFiltersOptions = {
  /** Cookie key prefix for filter/sort (e.g. 'moh.profile.posts'). Keys become ${prefix}.filter.v1 and ${prefix}.sort.v1. */
  cookieKeyPrefix?: string
  /** Override filter cookie key (e.g. 'moh.feed.filter.v1'). */
  filterCookieKey?: string
  /** Override sort cookie key (e.g. 'moh.home.sort.v1'). */
  sortCookieKey?: string
}

export function useFeedFilters(options: UseFeedFiltersOptions = {}) {
  const { cookieKeyPrefix = 'moh.feed', filterCookieKey, sortCookieKey } = options
  const filterKey = filterCookieKey ?? `${cookieKeyPrefix}.filter.v1`
  const sortKey = sortCookieKey ?? `${cookieKeyPrefix}.sort.v1`
  const { user } = useAuth()

  const filter = useCookie<FeedVisibilityFilter>(filterKey, {
    default: () => 'all',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  const sort = useCookie<FeedSort>(sortKey, {
    default: () => 'new',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  const viewerIsVerified = computed(() =>
    Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none')
  )
  const viewerIsPremium = computed(() => Boolean(user.value?.premium))

  const ctaKind = computed<null | 'verify' | 'premium'>(() => {
    if (filter.value === 'verifiedOnly' && !viewerIsVerified.value) return 'verify'
    if (filter.value === 'premiumOnly' && !viewerIsPremium.value) return 'premium'
    return null
  })

  const allowedFilters: FeedVisibilityFilter[] = ['all', 'public', 'verifiedOnly', 'premiumOnly']

  watch(
    filter,
    (v) => {
      if (allowedFilters.includes(v)) return
      filter.value = 'all'
    },
    { immediate: true }
  )
  watch(
    sort,
    (v) => {
      if (v === 'new' || v === 'trending') return
      sort.value = 'new'
    },
    { immediate: true }
  )

  return {
    filter,
    sort,
    viewerIsVerified,
    viewerIsPremium,
    ctaKind,
  }
}
