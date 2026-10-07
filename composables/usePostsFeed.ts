import type { FeedPost } from '~/types/api'
import {
  mergeFeedThreadsForDisplay,
  type FeedThreadDisplayPost,
} from '~/utils/merge-feed-threads-for-display'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import {
  applyLocalFeedInserts,
  dedupeIncomingPageWithExisting,
  patchLocalFeedInsertPost,
  pruneAckedLocalFeedInserts,
  removeLocalFeedInsertsForDeletedPost,
  upsertLocalFeedInsert,
  type LocalFeedInsert,
} from '~/composables/posts-feed/local-inserts'
import { postAndParentChainIds, postsFeedListQuery, type FeedFilter, type FeedSort } from '~/composables/posts-feed/query'
import { usePostsFeedFetch } from '~/composables/posts-feed/usePostsFeedFetch'
import { usePostsFeedRealtime } from '~/composables/posts-feed/usePostsFeedRealtime'
import { usePostsFeedOptimistic } from '~/composables/posts-feed/usePostsFeedOptimistic'

export type { LocalFeedInsert } from '~/composables/posts-feed/local-inserts'
export { postsFeedListQuery } from '~/composables/posts-feed/query'
export { useHomeFeedPrepend, useProfileFeedPrepend } from '~/composables/posts-feed/prepend'

export type PostsFeedDisplayItem =
  | { kind: 'post'; post: FeedThreadDisplayPost }
  | { kind: 'ad'; key: string }

export type UsePostsFeedOptions = {
  visibility?: Ref<FeedFilter>
  followingOnly?: Ref<boolean>
  sort?: Ref<FeedSort>
  /**
   * When true, sends `sort=forYou` to the API regardless of `sort.value`.
   * For You is a personalized re-rank of trending; the regular sort pill is ignored.
   */
  forYou?: Ref<boolean>
  showAds?: Ref<boolean>
  /** Default `posts-feed` — use a unique key for non-home feeds so state does not clash. */
  feedStateKey?: string
  /** Default `state`. Use `local` for per-page-instance feeds (e.g. group wall). */
  cursorFeedStateMode?: 'state' | 'local'
  /** Default `posts-feed-local-inserts` — pair with `feedStateKey` for isolated optimistic rows. */
  localInsertsStateKey?: string
  /** GET /posts?groupsHub=true — all groups the viewer is in (members-only on server). */
  groupsHub?: Ref<boolean>
  /** GET /posts?communityGroupId=… — single group wall (members-only on server). */
  communityGroupId?: Ref<string | null | undefined>
  /**
   * GET /posts?authorIds=u1,u2,… — restrict the feed to posts authored by a specific
   * set of users (capped at 50 server-side). Useful for crew pages, where we want the
   * home-feed shape filtered to just the crew members. Empty arrays clear the feed
   * (since there are no possible authors to match).
   */
  authorIds?: Ref<string[] | null | undefined>
  /** When true, request only posts that have at least one non-deleted media item. */
  mediaOnly?: Ref<boolean>
  /** When false, clears the feed and skips refresh (e.g. wait until group shell + membership are known). */
  enabled?: Ref<boolean>
  /** When true, only top-level (non-reply) posts are returned. */
  topLevelOnly?: Ref<boolean>
  /** Filter posts by author's US state code (e.g. "VA"). Phase 0 API contract. */
  authorLocationState?: Ref<string | null | undefined>
}

/**
 * Public facade for cursor-paged post feeds. Fetching lives in usePostsFeedFetch, realtime
 * merging in usePostsFeedRealtime, and viewer mutations in usePostsFeedOptimistic.
 */
export function usePostsFeed(options: UsePostsFeedOptions = {}) {
  const middleScrollerEl = useMiddleScroller()
  const { clearBumpsForPostIds } = usePostCountBumps()
  const postCache = usePostCache()

  const feedStateKey = options.feedStateKey ?? 'posts-feed'
  const localInsertsStateKey = options.localInsertsStateKey ?? 'posts-feed-local-inserts'
  const cursorFeedStateMode = options.cursorFeedStateMode ?? 'state'

  const visibility = options.visibility ?? ref<FeedFilter>('all')
  const followingOnly = options.followingOnly ?? ref(false)
  const sort = options.sort ?? ref<FeedSort>('new')
  const forYou = options.forYou ?? ref(false)
  const mediaOnly = options.mediaOnly ?? ref(false)
  const pageLimit = computed(() => (mediaOnly.value ? 24 : 30))
  const showAds = options.showAds ?? computed(() => true)
  const lastHardRefreshMs = useState<number>(`${feedStateKey}-last-hard-refresh-ms`, () => 0)
  const lastHardRefreshRequestKey = useState<string>(`${feedStateKey}-last-hard-refresh-request-key`, () => '')
  // Shared via useState so that the global layout (modal composer) can also track optimistic inserts.
  const localInserts = useState<LocalFeedInsert[]>(localInsertsStateKey, () => [])

  function rememberLocalInsert(insert: LocalFeedInsert) {
    localInserts.value = upsertLocalFeedInsert(localInserts.value, insert)
  }

  function forgetLocalInsertsForDeletedPost(postId: string) {
    localInserts.value = removeLocalFeedInsertsForDeletedPost(localInserts.value, postId)
  }

  function patchLocalInsert(updated: FeedPost) {
    localInserts.value = patchLocalFeedInsertPost(localInserts.value, updated)
  }

  const feed = useCursorFeed<FeedPost>({
    stateKey: feedStateKey,
    stateMode: cursorFeedStateMode,
    buildRequest: (cursor) => ({
      path: '/posts',
      query: postsFeedListQuery({
        visibility: visibility.value,
        followingOnly: followingOnly.value,
        sort: sort.value,
        forYou: forYou.value,
        cursor,
        groupsHub: options.groupsHub?.value,
        communityGroupId: options.communityGroupId?.value ?? null,
        authorIds: options.authorIds?.value ?? null,
        mediaOnly: mediaOnly.value,
        limit: pageLimit.value,
        topLevelOnly: options.topLevelOnly?.value,
        authorLocationState: options.authorLocationState?.value ?? null,
        refresh: fetcher.isForYouRefreshPending() && !cursor,
      }),
    }),
    defaultErrorMessage: 'Failed to load posts.',
    loadMoreErrorMessage: 'Failed to load more posts.',
    getItemId: (post) => post.id,
    mergeOnRefresh: (incoming) => {
      const live = incoming.filter((p) => !p.deletedAt)
      const pending = pruneAckedLocalFeedInserts(localInserts.value, live)
      if (pending.length !== localInserts.value.length) localInserts.value = pending
      return applyLocalFeedInserts(live, pending)
    },
    mergeOnLoadMore: (incoming, existing) =>
      dedupeIncomingPageWithExisting(incoming, existing),
    onDataLoaded: (data) => clearBumpsForPostIds(data.flatMap(postAndParentChainIds)),
  })

  const posts = feed.items
  const { nextCursor, loading, loadingMore, error } = feed

  const fetcher = usePostsFeedFetch({
    options,
    feed,
    visibility,
    followingOnly,
    sort,
    forYou,
    mediaOnly,
    pageLimit,
    localInserts,
    lastHardRefreshMs,
    lastHardRefreshRequestKey,
    middleScrollerEl,
  })
  const { currentRequestKey, refresh } = fetcher

  const { subscribePostIds, notifyVisibleRowIds } = usePostsFeedRealtime({
    posts,
    middleScrollerEl,
    forgetLocalInsertsForDeletedPost,
  })

  const actions = usePostsFeedOptimistic({
    posts,
    error,
    rememberLocalInsert,
    forgetLocalInsertsForDeletedPost,
    patchLocalInsert,
    subscribePostIds,
  })

  const displayPosts = computed<FeedThreadDisplayPost[]>(() =>
    mergeFeedThreadsForDisplay(posts.value),
  )

  function collapsedSiblingReplyCountFor(post: FeedPost): number {
    const cached = postCache.get(post)
    return Math.max(0, Math.floor(cached.threadCollapsedCount ?? 0))
  }

  const displayItems = computed<PostsFeedDisplayItem[]>(() => {
    const out: PostsFeedDisplayItem[] = []
    let rootPostCount = 0
    for (const p of displayPosts.value) {
      out.push({ kind: 'post', post: p })

      if (!showAds.value) continue

      // Only count root posts (no parent). Never count replies/comments.
      const isRootPost = !String(p.parentId ?? '').trim()
      if (!isRootPost) continue

      rootPostCount += 1
      if (rootPostCount % 10 !== 0) continue

      // Insert only *between* feed rows (never inside a thread).
      out.push({ kind: 'ad', key: `ad-after-${p.id}` })
    }
    return out
  })

  function feedEnabled(): boolean {
    if (options.enabled && !options.enabled.value) return false
    return true
  }

  // Auto-refresh when the canonical request key changes. Keeping the watcher tied to
  // `currentRequestKey()` prevents drift when new query-shaping refs are added.
  if (
    options.visibility ||
    options.sort ||
    options.followingOnly ||
    options.forYou ||
    options.mediaOnly ||
    options.topLevelOnly ||
    options.groupsHub ||
    options.communityGroupId ||
    options.authorIds ||
    options.enabled
  ) {
    watch(
      () => [feedEnabled(), currentRequestKey()] as const,
      () => {
        if (!feedEnabled()) {
          posts.value = []
          feed.hasLoaded.value = false
          nextCursor.value = null
          return
        }
        void refresh()
      },
      { flush: 'post' },
    )
  }

  return {
    posts,
    displayPosts,
    initialLoading: feed.initialLoading,
    hasLoaded: feed.hasLoaded,
    displayItems,
    collapsedSiblingReplyCountFor,
    nextCursor,
    loading,
    loadingMore,
    error,
    refresh,
    softRefreshNewer: fetcher.softRefreshNewer,
    notifyVisibleRowIds,
    startAutoSoftRefresh: fetcher.startAutoSoftRefresh,
    loadMore: fetcher.loadMore,
    ...actions,
  }
}
