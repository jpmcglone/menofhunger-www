import type { Article } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { useCursorFeed } from '~/composables/useCursorFeed'

export function useArticleFeed(opts?: {
  authorUsername?: string | Ref<string>
  sort?: Ref<'new' | 'trending'>
  visibility?: Ref<ProfilePostsFilter>
  mine?: Ref<boolean>
  followingOnly?: Ref<boolean>
  enabled?: Ref<boolean>
  /** Filter by a single tag slug (e.g. "stoicism"). Reactive. */
  tag?: Ref<string | null> | string | null
  /** When true, include articles of all visibility tiers (restricted ones are returned with viewerCanAccess=false). */
  includeRestricted?: boolean | Ref<boolean>
}) {
  const enabled = opts?.enabled ?? computed(() => true)

  const articlesFeed = useCursorFeed<Article>({
    stateKey: 'articles-feed-local',
    stateMode: 'local',
    buildRequest: (cursor) => {
      const params = new URLSearchParams({ limit: '20' })
      const author = getAuthorUsername()
      if (author) params.set('authorUsername', author)
      if (opts?.sort?.value && opts.sort.value !== 'new') params.set('sort', opts.sort.value)
      if (opts?.visibility?.value && opts.visibility.value !== 'all') params.set('visibility', opts.visibility.value)
      if (opts?.mine?.value) params.set('mine', 'true')
      if (opts?.followingOnly?.value) params.set('followingOnly', 'true')
      const restricted = isRef(opts?.includeRestricted) ? opts!.includeRestricted.value : opts?.includeRestricted
      if (restricted) params.set('includeRestricted', 'true')
      const tag = isRef(opts?.tag) ? (opts!.tag as Ref<string | null>).value : opts?.tag
      if (tag) params.set('tag', tag)
      if (cursor) params.set('cursor', cursor)
      return { path: '/articles', query: Object.fromEntries(params.entries()) }
    },
    defaultErrorMessage: 'Failed to load articles.',
  })
  const articles = articlesFeed.items
  const nextCursor = articlesFeed.nextCursor
  const loading = articlesFeed.loading
  const loadingMore = articlesFeed.loadingMore
  const error = articlesFeed.error
  const hasLoadedOnce = ref(false)
  const lastLoadedKey = ref<string>('')

  function getAuthorUsername(): string | undefined {
    const u = opts?.authorUsername
    return isRef(u) ? u.value : u
  }

  function paramsKey() {
    const author = getAuthorUsername() ?? ''
    const mine = opts?.mine?.value ? '1' : '0'
    const followingOnly = opts?.followingOnly?.value ? '1' : '0'
    const sort = opts?.sort?.value ?? 'new'
    const visibility = opts?.visibility?.value ?? 'all'
    const restricted = isRef(opts?.includeRestricted) ? opts!.includeRestricted.value : Boolean(opts?.includeRestricted)
    const tag = isRef(opts?.tag) ? (opts!.tag as Ref<string | null>).value : (opts?.tag ?? '')
    return [author, mine, followingOnly, sort, visibility, restricted ? '1' : '0', tag ?? ''].join('|')
  }

  async function load(loadOpts?: { force?: boolean }) {
    const force = Boolean(loadOpts?.force)
    if (!enabled.value) {
      articles.value = []
      nextCursor.value = null
      error.value = null
      hasLoadedOnce.value = false
      lastLoadedKey.value = ''
      return
    }
    const key = paramsKey()
    if (!force && hasLoadedOnce.value && key === lastLoadedKey.value) {
      return
    }
    await articlesFeed.refresh()
    hasLoadedOnce.value = true
    if (!error.value) lastLoadedKey.value = key
  }

  async function loadMore() {
    if (!enabled.value) return
    if (loading.value || loadingMore.value) return
    const key = paramsKey()
    // Only paginate when params still match the currently loaded dataset.
    if (!hasLoadedOnce.value || key !== lastLoadedKey.value) {
      await load({ force: true })
      return
    }
    await articlesFeed.loadMore()
  }

  // Reload when reactive params change
  if (opts?.sort) watch(opts.sort, () => { if (enabled.value) void load() })
  if (opts?.visibility) watch(opts.visibility, () => { if (enabled.value) void load() })
  if (opts?.mine) watch(opts.mine, () => { if (enabled.value) void load() })
  if (opts?.followingOnly) watch(opts.followingOnly, () => { if (enabled.value) void load() })
  if (isRef(opts?.authorUsername)) watch(opts!.authorUsername as Ref<string>, () => { if (enabled.value) void load() })
  if (isRef(opts?.tag)) watch(opts!.tag as Ref<string | null>, () => { if (enabled.value) void load() })
  if (opts?.enabled) {
    watch(opts.enabled, (on) => {
      if (!on) {
        articles.value = []
        nextCursor.value = null
        error.value = null
        hasLoadedOnce.value = false
        lastLoadedKey.value = ''
        return
      }
      if (articles.value.length === 0 && !loading.value) void load()
    }, { immediate: true, flush: 'post' })
  }

  return { articles, nextCursor, loading, loadingMore, error, hasLoadedOnce, load, loadMore }
}
