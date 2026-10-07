import type { Ref } from 'vue'
import type {
  Article,
  CommunityGroupShell,
  FeedPost,
  SearchMixedPagination,
  SearchMixedResult,
  SearchUserResult,
  TaxonomyMatch,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useApiClient } from '~/composables/useApiClient'

export type ExploreSearchSource = 'explore' | 'external'

function dedupeById<T extends { id?: string | null }>(list: T[]): T[] {
  const out: T[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const id = String(item?.id ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }
  return out
}

/**
 * Mixed `/search` results for Explore. One request returns people, articles, posts and groups,
 * each with its own cursor, so paging advances only the streams that still have a cursor.
 */
export function useExploreSearch(opts: { query: Readonly<Ref<string>>; tab: Readonly<Ref<string>> }) {
  const { apiFetch } = useApiClient()

  const users = ref<SearchUserResult[]>([])
  const articles = ref<Article[]>([])
  const posts = ref<FeedPost[]>([])
  const groups = ref<CommunityGroupShell[]>([])
  const nextUserCursor = ref<string | null>(null)
  const nextArticleCursor = ref<string | null>(null)
  const nextPostCursor = ref<string | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const searchedOnce = ref(false)
  const source = ref<ExploreSearchSource>('external')
  const tagSuggestions = ref<TaxonomyMatch[]>([])
  const gatedResultCount = ref(0)
  let seq = 0

  const hasMore = computed(
    () => opts.tab.value === 'groups' ? false
      : opts.tab.value === 'people' ? nextUserCursor.value !== null
      : opts.tab.value === 'posts' ? nextPostCursor.value !== null
      : opts.tab.value === 'articles' ? nextArticleCursor.value !== null
      : nextUserCursor.value !== null || nextArticleCursor.value !== null || nextPostCursor.value !== null,
  )

  function clear() {
    seq++
    loading.value = false
    loadingMore.value = false
    groups.value = []
    users.value = []
    articles.value = []
    posts.value = []
    tagSuggestions.value = []
    gatedResultCount.value = 0
    nextUserCursor.value = null
    nextArticleCursor.value = null
    nextPostCursor.value = null
    error.value = null
    searchedOnce.value = false
  }

  /** Invalidates in-flight responses without touching visible results (unmount). */
  function cancel() {
    seq++
  }

  async function fetchPage(params: { append: boolean }) {
    const mySeq = ++seq
    const q = opts.query.value
    if (q.length < 2) return

    const isAppend = params.append
    const cursors = { users: nextUserCursor.value, articles: nextArticleCursor.value, posts: nextPostCursor.value }
    if (isAppend) {
      loadingMore.value = true
    } else {
      users.value = []; articles.value = []; posts.value = []; groups.value = []
      loading.value = true
    }
    error.value = null
    if (!isAppend) searchedOnce.value = true

    try {
      const query: Record<string, string> = { type: 'all', source: source.value, q, limit: '30' }
      if (isAppend && cursors.users) query.userCursor = cursors.users
      if (isAppend && cursors.articles) query.articleCursor = cursors.articles
      if (isAppend && cursors.posts) query.postCursor = cursors.posts

      const res = await apiFetch<SearchMixedResult>('/search', { method: 'GET', query })
      if (mySeq !== seq || q !== opts.query.value) return

      const data = res.data as SearchMixedResult
      const pagination = res.pagination as SearchMixedPagination | undefined
      const newUsers = data.users ?? []
      const newArticles = data.articles ?? []
      const newPosts = data.posts ?? []
      const newGroups = data.groups ?? []

      if (isAppend) {
        if (cursors.users) users.value = dedupeById([...users.value, ...newUsers])
        if (cursors.articles) articles.value = dedupeById([...articles.value, ...newArticles])
        if (cursors.posts) posts.value = dedupeById([...posts.value, ...newPosts])
        groups.value = dedupeById([...groups.value, ...newGroups])
      } else {
        users.value = dedupeById(newUsers)
        articles.value = dedupeById(newArticles)
        posts.value = dedupeById(newPosts)
        groups.value = dedupeById(newGroups)
        tagSuggestions.value = (data.taxonomyMatches ?? []).slice(0, 5)
        gatedResultCount.value = data.gatedResultCount ?? 0
      }

      if (!isAppend || cursors.users) nextUserCursor.value = pagination?.nextUserCursor ?? null
      if (!isAppend || cursors.articles) nextArticleCursor.value = pagination?.nextArticleCursor ?? null
      if (!isAppend || cursors.posts) nextPostCursor.value = pagination?.nextPostCursor ?? null
    } catch (e: unknown) {
      if (mySeq !== seq || q !== opts.query.value) return
      error.value = getApiErrorMessage(e) || 'Search failed.'
      if (!isAppend) {
        users.value = []
        articles.value = []
        posts.value = []
        groups.value = []
        tagSuggestions.value = []
        nextUserCursor.value = null
        nextArticleCursor.value = null
        nextPostCursor.value = null
      }
    } finally {
      if (mySeq === seq) {
        loading.value = false
        loadingMore.value = false
      }
    }
  }

  async function loadMore() {
    if (loadingMore.value || (!nextUserCursor.value && !nextArticleCursor.value && !nextPostCursor.value)) return
    await fetchPage({ append: true })
  }

  function removePost(id: string) {
    const pid = String(id ?? '').trim()
    if (!pid) return
    posts.value = posts.value.filter((p) => p.id !== pid)
  }

  function replacePost(id: string, post: FeedPost) {
    const pid = String(id ?? '').trim()
    if (!pid) return
    posts.value = posts.value.map((p) => (p.id === pid ? post : p))
  }

  return {
    users,
    articles,
    posts,
    groups,
    loading,
    loadingMore,
    error,
    searchedOnce,
    source,
    tagSuggestions,
    gatedResultCount,
    hasMore,
    fetchPage,
    search: () => fetchPage({ append: false }),
    loadMore,
    clear,
    cancel,
    removePost,
    replacePost,
  }
}
