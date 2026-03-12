import type { Article } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'

export function useArticleFeed(opts?: {
  authorUsername?: string | Ref<string>
  sort?: Ref<'new' | 'trending'>
  visibility?: Ref<ProfilePostsFilter>
  mine?: Ref<boolean>
  followingOnly?: Ref<boolean>
  enabled?: Ref<boolean>
  /** When true, include articles of all visibility tiers (restricted ones are returned with viewerCanAccess=false). */
  includeRestricted?: boolean | Ref<boolean>
}) {
  const { apiFetch } = useApiClient()
  const enabled = opts?.enabled ?? computed(() => true)

  const articles = ref<Article[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const hasLoadedOnce = ref(false)

  function getAuthorUsername(): string | undefined {
    const u = opts?.authorUsername
    return isRef(u) ? u.value : u
  }

  function buildParams(cursor?: string | null) {
    const params = new URLSearchParams({ limit: '20' })
    const author = getAuthorUsername()
    if (author) params.set('authorUsername', author)
    if (opts?.sort?.value && opts.sort.value !== 'new') params.set('sort', opts.sort.value)
    if (opts?.visibility?.value && opts.visibility.value !== 'all') params.set('visibility', opts.visibility.value)
    if (opts?.mine?.value) params.set('mine', 'true')
    if (opts?.followingOnly?.value) params.set('followingOnly', 'true')
    const restricted = isRef(opts?.includeRestricted) ? opts!.includeRestricted.value : opts?.includeRestricted
    if (restricted) params.set('includeRestricted', 'true')
    if (cursor) params.set('cursor', cursor)
    return params
  }

  async function load() {
    if (!enabled.value) {
      articles.value = []
      nextCursor.value = null
      error.value = null
      return
    }
    const hadExistingItems = articles.value.length > 0
    loading.value = true
    error.value = null
    if (!hadExistingItems) {
      articles.value = []
    }
    nextCursor.value = null
    try {
      const res = await apiFetch<Article[]>(`/articles?${buildParams()}`)
      articles.value = res.data ?? []
      nextCursor.value = res.pagination?.nextCursor ?? null
      hasLoadedOnce.value = true
    } catch (e: any) {
      error.value = e?.data?.meta?.errors?.[0]?.message ?? 'Failed to load articles.'
      hasLoadedOnce.value = true
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const res = await apiFetch<Article[]>(`/articles?${buildParams(nextCursor.value)}`)
      articles.value.push(...(res.data ?? []))
      nextCursor.value = res.pagination?.nextCursor ?? null
    } catch {
      // silently fail on pagination
    } finally {
      loadingMore.value = false
    }
  }

  // Reload when reactive params change
  if (opts?.sort) watch(opts.sort, () => { if (enabled.value) load() })
  if (opts?.visibility) watch(opts.visibility, () => { if (enabled.value) load() })
  if (opts?.followingOnly) watch(opts.followingOnly, () => { if (enabled.value) load() })
  if (isRef(opts?.authorUsername)) watch(opts!.authorUsername as Ref<string>, () => { if (enabled.value) load() })
  if (opts?.enabled) {
    watch(opts.enabled, (on) => {
      if (on && articles.value.length === 0 && !loading.value) load()
    }, { immediate: true, flush: 'post' })
  }

  return { articles, nextCursor, loading, loadingMore, error, hasLoadedOnce, load, loadMore }
}
