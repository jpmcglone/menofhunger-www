import type { FeedPost, GetPostsData, CreatePostData, PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import type { ComposerPollPayload } from '~/composables/composer/types'
import { getApiErrorMessage } from '~/utils/api-error'
import {
  collapsedSiblingReplyCountForPost,
  mergeFeedThreadsForDisplay,
} from '~/utils/merge-feed-threads-for-display'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import type { PostsCallback } from '~/composables/usePresence'
// feed-patch utilities are used by the global post-cache plugin; no longer needed here.

type FeedFilter = 'all' | 'public' | PostVisibility
type FeedSort = 'new' | 'trending'

export type LocalFeedInsert =
  | { kind: 'prepend'; post: FeedPost }
  | { kind: 'replaceParent'; post: FeedPost; parentId: string }

export type PostsFeedDisplayItem =
  | { kind: 'post'; post: FeedPost }
  | { kind: 'ad'; key: string }

function upsertLocalFeedInsert(inserts: LocalFeedInsert[], nextInsert: LocalFeedInsert): LocalFeedInsert[] {
  const nextId = (nextInsert.post.id ?? '').trim()
  if (!nextId) return inserts
  const withoutSameId = inserts.filter((it) => (it.post.id ?? '').trim() !== nextId)
  return [...withoutSameId, nextInsert]
}

function removeLocalFeedInsertsForDeletedPost(inserts: LocalFeedInsert[], postId: string): LocalFeedInsert[] {
  const pid = (postId ?? '').trim()
  if (!pid) return inserts
  return inserts.filter((it) => {
    if ((it.post.id ?? '').trim() === pid) return false
    if (it.kind === 'replaceParent' && (it.parentId ?? '').trim() === pid) return false
    return true
  })
}

function patchLocalFeedInsertPost(inserts: LocalFeedInsert[], updated: FeedPost): LocalFeedInsert[] {
  const pid = (updated?.id ?? '').trim()
  if (!pid) return inserts
  return inserts.map((it) => {
    if ((it.post.id ?? '').trim() !== pid) return it
    if (it.kind === 'prepend') return { kind: 'prepend', post: { ...updated } }
    return { kind: 'replaceParent', parentId: it.parentId, post: { ...updated } }
  })
}

function pruneAckedLocalFeedInserts(inserts: LocalFeedInsert[], incoming: FeedPost[]): LocalFeedInsert[] {
  const incomingIds = new Set(incoming.map((p) => (p.id ?? '').trim()).filter(Boolean))
  if (!incomingIds.size) return inserts
  return inserts.filter((it) => !incomingIds.has((it.post.id ?? '').trim()))
}

function applyLocalFeedInserts(incoming: FeedPost[], inserts: LocalFeedInsert[]): FeedPost[] {
  if (!inserts.length) return incoming.length ? [...incoming] : []
  const out = incoming.length ? [...incoming] : []
  const seen = new Set(out.map((p) => (p.id ?? '').trim()).filter(Boolean))

  for (const insert of inserts) {
    const postId = (insert.post.id ?? '').trim()
    if (!postId || seen.has(postId)) continue

    if (insert.kind === 'prepend') {
      out.unshift(insert.post)
      seen.add(postId)
      continue
    }

    const parentId = (insert.parentId ?? '').trim()
    const idx = parentId ? out.findIndex((p) => (p.id ?? '').trim() === parentId) : -1
    if (idx >= 0) {
      out[idx] = insert.post
    } else {
      // If parent isn't in this page yet, keep reply visible near the top.
      out.unshift(insert.post)
    }
    seen.add(postId)
  }

  return out
}

export type UsePostsFeedOptions = {
  visibility?: Ref<FeedFilter>
  followingOnly?: Ref<boolean>
  sort?: Ref<FeedSort>
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
  /** When false, clears the feed and skips refresh (e.g. wait until group shell + membership are known). */
  enabled?: Ref<boolean>
}

function normalizeAuthorIds(ids: string[] | null | undefined): string[] | null {
  if (!ids) return null
  const cleaned = ids.map((id) => (id ?? '').trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned.slice(0, 50) : null
}

function postsFeedListQuery(opts: {
  visibility: FeedFilter
  followingOnly: boolean
  sort: FeedSort
  cursor: string | null
  groupsHub?: boolean
  communityGroupId?: string | null
  authorIds?: string[] | null
}): Record<string, string | number | boolean | undefined> {
  const gid = (opts.communityGroupId ?? '').trim()
  const groupScoped = Boolean(opts.groupsHub || gid)
  const authorIds = normalizeAuthorIds(opts.authorIds)
  return {
    limit: 30,
    collapseByRoot: true,
    collapseMode: 'root',
    prefer: 'reply',
    collapseMaxPerRoot: 2,
    ...(groupScoped
      ? {
          ...(opts.groupsHub ? { groupsHub: true } : {}),
          ...(gid ? { communityGroupId: gid } : {}),
          visibility: 'all',
        }
      : {
          visibility: opts.visibility,
          ...(opts.followingOnly ? { followingOnly: true } : {}),
          ...(authorIds ? { authorIds: authorIds.join(',') } : {}),
        }),
    ...(opts.sort === 'trending' ? { sort: 'trending' } : {}),
    ...(opts.cursor ? { cursor: opts.cursor } : {}),
  }
}

export function usePostsFeed(options: UsePostsFeedOptions = {}) {
  const { apiFetch, apiFetchData } = useApiClient()
  const middleScrollerEl = useMiddleScroller()
  const { clearBumpsForPostIds, bumpCommentCount } = usePostCountBumps()
  const loadingIndicator = useLoadingIndicator()
  const { user: me } = useAuth()
  const { addPostsCallback, removePostsCallback, subscribePosts, unsubscribePosts } = usePresence()


  const feedStateKey = options.feedStateKey ?? 'posts-feed'
  const localInsertsStateKey = options.localInsertsStateKey ?? 'posts-feed-local-inserts'
  const cursorFeedStateMode = options.cursorFeedStateMode ?? 'state'

  const visibility = options.visibility ?? ref<FeedFilter>('all')
  const followingOnly = options.followingOnly ?? ref(false)
  const sort = options.sort ?? ref<FeedSort>('new')
  const showAds = options.showAds ?? computed(() => true)
  const lastHardRefreshMs = useState<number>(`${feedStateKey}-last-hard-refresh-ms`, () => 0)
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
        cursor,
        groupsHub: options.groupsHub?.value,
        communityGroupId: options.communityGroupId?.value ?? null,
        authorIds: options.authorIds?.value ?? null,
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
    onDataLoaded: (data) => clearBumpsForPostIds(data.map((p) => p.id)),
  })

  const posts = feed.items
  const { nextCursor, loading, loadingMore, error, refresh: feedRefresh, loadMore: feedLoadMore } = feed

  function currentRequestKey(): string {
    const gid = (options.communityGroupId?.value ?? '').trim()
    return JSON.stringify({
      visibility: visibility.value,
      followingOnly: Boolean(followingOnly.value),
      sort: sort.value,
      groupsHub: Boolean(options.groupsHub?.value),
      communityGroupId: gid || null,
      authorIds: normalizeAuthorIds(options.authorIds?.value ?? null) ?? null,
    })
  }

  // Tracks which query signature produced the currently loaded dataset.
  // loadMore only runs when the active filter/sort/scope still matches this key.
  let loadedRequestKey = currentRequestKey()

  // Realtime: patch post interaction counts in-place for visible feeds.
  const visiblePostIds = ref<Set<string>>(new Set())
  let postObserver: IntersectionObserver | null = null
  let unsubscribeTimer: ReturnType<typeof setTimeout> | null = null
  const pendingUnsub = new Set<string>()

  function flushUnsub() {
    if (pendingUnsub.size === 0) return
    const ids = [...pendingUnsub]
    pendingUnsub.clear()
    unsubscribePosts(ids)
  }

  function scheduleUnsub(postId: string) {
    const id = (postId ?? '').trim()
    if (!id) return
    pendingUnsub.add(id)
    if (unsubscribeTimer) return
    unsubscribeTimer = setTimeout(() => {
      unsubscribeTimer = null
      flushUnsub()
    }, 1200)
  }

  function rescanAndObserve() {
    if (!import.meta.client) return
    const root = middleScrollerEl.value ?? document
    const els = Array.from((root as any).querySelectorAll?.('[data-post-id]') ?? []) as HTMLElement[]
    for (const el of els) {
      const id = (el.dataset.postId ?? '').trim()
      if (!id) continue
      postObserver?.observe(el)
    }
  }

  const postsCb: PostsCallback = {
    // Content patches (counts, body, flags) are handled globally by plugins/post-cache.client.ts.
    // Per-feed callbacks only handle structural changes: deletions remove rows from the array.
    onLiveUpdated: (payload) => {
      const postId = String(payload?.postId ?? '').trim()
      if (!postId) return
      const patch = payload?.patch ?? {}
      // Remove a top-level deleted post from the array entirely so it disappears from the feed.
      // Non-top-level deleted posts (replies inside threads) are rendered as tombstones via the cache.
      if (patch.deletedAt) {
        const isTopLevel = posts.value.some((p) => p.id === postId && !p.parentId)
        if (isTopLevel) {
          posts.value = posts.value.filter((p) => p.id !== postId)
          forgetLocalInsertsForDeletedPost(postId)
        }
      }
    },
  }
  if (import.meta.client) {
    onMounted(() => addPostsCallback(postsCb))
    onBeforeUnmount(() => removePostsCallback(postsCb))
  }

  // Viewport subscriptions: subscribe while a post row is on-screen (with buffer).
  if (import.meta.client) {
    onMounted(() => {
      postObserver = new IntersectionObserver(
        (entries) => {
          const toSub: string[] = []
          for (const entry of entries) {
            const el = entry.target as HTMLElement
            const id = (el.dataset.postId ?? '').trim()
            if (!id) continue
            if (entry.isIntersecting) {
              if (!visiblePostIds.value.has(id)) {
                visiblePostIds.value = new Set([...visiblePostIds.value, id])
                toSub.push(id)
              }
            } else {
              if (visiblePostIds.value.has(id)) {
                const next = new Set(visiblePostIds.value)
                next.delete(id)
                visiblePostIds.value = next
                scheduleUnsub(id)
              }
            }
          }
          if (toSub.length > 0) subscribePosts(toSub)
        },
        {
          root: middleScrollerEl.value ?? null,
          rootMargin: '200px 0px 200px 0px',
          threshold: 0.01,
        },
      )
      // Initial scan + re-scan on feed changes.
      void nextTick(() => rescanAndObserve())
    })
    watch(
      // Re-scan when feed items change; avoid referencing displayItems here (TDZ during setup).
      () => posts.value.length,
      () => void nextTick(() => rescanAndObserve()),
    )
    onBeforeUnmount(() => {
      postObserver?.disconnect()
      postObserver = null
      if (unsubscribeTimer) clearTimeout(unsubscribeTimer)
      unsubscribeTimer = null
      pendingUnsub.clear()
    })
  }

  const displayPosts = computed<FeedPost[]>(() =>
    mergeFeedThreadsForDisplay(posts.value),
  )

  function collapsedSiblingReplyCountFor(post: FeedPost): number {
    return collapsedSiblingReplyCountForPost(post)
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

  let prevVisibility: FeedFilter = visibility.value
  let prevSort: FeedSort = sort.value
  let prevFollowing: boolean = followingOnly.value

  async function refresh() {
    const paramsChanged =
      visibility.value !== prevVisibility ||
      sort.value !== prevSort ||
      followingOnly.value !== prevFollowing
    prevVisibility = visibility.value
    prevSort = sort.value
    prevFollowing = followingOnly.value
    if (paramsChanged) localInserts.value = []
    loadingIndicator.start()
    try {
      await feedRefresh()
      loadedRequestKey = currentRequestKey()
      lastHardRefreshMs.value = Date.now()
    } finally {
      queueMicrotask(() => loadingIndicator.finish())
    }
  }

  function pickAnchor(scroller: HTMLElement): { postId: string; offsetTop: number } | null {
    const items = Array.from(scroller.querySelectorAll<HTMLElement>('[data-post-id]'))
    if (!items.length) return null
    const scRect = scroller.getBoundingClientRect()
    for (const el of items) {
      const r = el.getBoundingClientRect()
      if (r.bottom <= scRect.top + 1) continue
      if (r.top >= scRect.bottom - 1) continue
      const id = (el.dataset.postId ?? '').trim()
      if (!id) continue
      return { postId: id, offsetTop: r.top - scRect.top }
    }
    const first = items[0]
    if (!first) return null
    const id = (first?.dataset.postId ?? '').trim()
    if (!id) return null
    const r = first.getBoundingClientRect()
    return { postId: id, offsetTop: r.top - scRect.top }
  }

  async function restoreAnchor(scroller: HTMLElement, anchor: { postId: string; offsetTop: number }) {
    await nextTick()
    const el = scroller.querySelector<HTMLElement>(`[data-post-id="${CSS.escape(anchor.postId)}"]`)
    if (!el) return
    const scRect = scroller.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const nextOffsetTop = r.top - scRect.top
    const delta = nextOffsetTop - anchor.offsetTop
    if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) return
    scroller.scrollTop += delta
  }

  let softRefreshPromise: Promise<void> | null = null
  async function softRefreshNewer(opts?: { scroller?: HTMLElement | null }) {
    if (!import.meta.client) return
    if (softRefreshPromise) return await softRefreshPromise
    if (loading.value || loadingMore.value) return
    const scroller = opts?.scroller ?? middleScrollerEl.value
    if (!scroller) return

    softRefreshPromise = (async () => {
      const existing = posts.value
      const headId = existing[0]?.id ?? null
      if (!headId) return

      const anchor = pickAnchor(scroller)

      try {
        const res = await apiFetch<GetPostsData>('/posts', {
          method: 'GET',
          query: postsFeedListQuery({
            visibility: visibility.value,
            followingOnly: followingOnly.value,
            sort: sort.value,
            cursor: null,
            groupsHub: options.groupsHub?.value,
            communityGroupId: options.communityGroupId?.value ?? null,
            authorIds: options.authorIds?.value ?? null,
          }),
        })
        const fresh = (res.data ?? []).filter((p: FeedPost) => !p.deletedAt)
        if (!fresh.length) return

        const idx = fresh.findIndex((p: FeedPost) => p.id === headId)
        const candidates = idx >= 0 ? fresh.slice(0, idx) : fresh
        if (!candidates.length) return

        const seen = new Set(existing.map((p: FeedPost) => p.id))
        const newOnes = candidates.filter((p: FeedPost) => !seen.has(p.id))
        if (!newOnes.length) return

        const existingLive = existing.filter((p: FeedPost) => !p.deletedAt)
        posts.value = [...newOnes, ...existingLive]
        if (anchor) await restoreAnchor(scroller, anchor)
      } catch {
        // Soft refresh should be silent; avoid disrupting the feed.
      }
    })()

    try {
      await softRefreshPromise
    } finally {
      softRefreshPromise = null
    }
  }

  function startAutoSoftRefresh(opts?: { everyMs?: number }): (() => void) | undefined {
    if (!import.meta.client) return
    const everyMs = Math.max(5_000, Math.floor(opts?.everyMs ?? 10_000))
    let timer: number | null = null
    const start = () => {
      if (timer != null) return
      timer = window.setInterval(() => {
        if (document.visibilityState !== 'visible') return
        if (!lastHardRefreshMs.value) return
        if (Date.now() - lastHardRefreshMs.value < everyMs) return
        void softRefreshNewer()
      }, everyMs)
    }
    const stop = () => {
      if (timer == null) return
      window.clearInterval(timer)
      timer = null
    }
    start()
    return stop
  }

  async function loadMore() {
    if (loading.value || loadingMore.value) return
    if (!nextCursor.value) return
    // If feed params changed, this is not a true "load more" request.
    // Refresh first so we replace the dataset under the new filter signature.
    if (currentRequestKey() !== loadedRequestKey) {
      await refresh()
      return
    }
    loadingIndicator.start()
    try {
      await feedLoadMore()
    } finally {
      // Ensure the indicator always finishes (even on errors/throws).
      loadingIndicator.finish()
    }
  }

  async function addPost(
    body: string,
    visibility: PostVisibility,
    media?: Array<{
      source: PostMediaSource
      kind: PostMediaKind
      r2Key?: string
      url?: string
      mp4Url?: string | null
      width?: number | null
      height?: number | null
    }> | null,
    poll?: ComposerPollPayload | null,
    communityGroupId?: string | null,
  ): Promise<FeedPost | null> {
    const trimmed = (body ?? '').trim()
    const hasMedia = Boolean(media?.length)
    const hasPoll = Boolean(poll)
    if (!trimmed && !hasMedia && !hasPoll) return null

    try {
      const result = await apiFetchData<CreatePostData>('/posts', {
        method: 'POST',
        body: {
          body: trimmed || '',
          visibility,
          ...(communityGroupId ? { community_group_id: communityGroupId } : {}),
          ...(media?.length ? { media } : {}),
          ...(poll ? { poll } : {}),
        }
      })

      const post = result.post
      if (post.visibility !== 'onlyMe') {
        posts.value = [post, ...posts.value]
        rememberLocalInsert({ kind: 'prepend', post })
        await nextTick()
      }
      return post
    } catch (e: unknown) {
      feed.error.value = getApiErrorMessage(e) || 'Failed to post.'
      throw e
    }
  }

  function removePost(id: string) {
    const pid = (id ?? '').trim()
    if (!pid) return

    const myId = me.value?.id ?? null
    const isMyPost = (() => {
      if (!myId) return true // Only the viewer can delete; default to full removal.
      const find = (p: FeedPost | undefined): FeedPost | null => {
        let cur: FeedPost | undefined = p
        while (cur) {
          if (cur.id === pid) return cur
          cur = cur.parent
        }
        return null
      }
      for (const p of posts.value) {
        const hit = find(p)
        if (hit) return hit.author?.id === myId
      }
      return true
    })()

    if (isMyPost) {
      const containsId = (p: FeedPost | undefined, targetId: string): boolean => {
        let cur: FeedPost | undefined = p
        while (cur) {
          if (cur.id === targetId) return true
          cur = cur.parent
        }
        return false
      }
      posts.value = posts.value.filter((p) => !containsId(p, pid))
      forgetLocalInsertsForDeletedPost(pid)
      return
    }

    const tombstone = (p: FeedPost): FeedPost => ({
      ...p,
      deletedAt: new Date().toISOString(),
      body: '',
      media: [],
      mentions: [],
    })
    const chainHasId = (p: FeedPost | undefined, targetId: string): boolean => {
      let cur = p?.parent
      while (cur) {
        if (cur.id === targetId) return true
        cur = cur.parent
      }
      return false
    }
    const hasChildInSection = posts.value.some((p) => chainHasId(p, pid))

    posts.value = posts.value
      .map((p) => {
        const updateChain = (node: FeedPost): FeedPost => {
          const updatedParent = node.parent ? updateChain(node.parent) : undefined
          let next = updatedParent !== node.parent ? { ...node, parent: updatedParent } : node
          if (node.id === pid) next = tombstone(next)
          return next
        }
        const next = updateChain(p)
        if (next.id === pid && !hasChildInSection) return null
        return next
      })
      .filter((p): p is FeedPost => Boolean(p))
    forgetLocalInsertsForDeletedPost(pid)
  }

  function replacePost(updated: FeedPost) {
    const pid = (updated?.id ?? '').trim()
    if (!pid) return

    const replaceInChain = (node: FeedPost): FeedPost => {
      const nextParent = node.parent ? replaceInChain(node.parent) : undefined
      const base = nextParent !== node.parent ? { ...node, parent: nextParent } : node
      if (base.id === pid) return { ...updated }
      return base
    }

    posts.value = posts.value.map(replaceInChain)
    patchLocalInsert(updated)
  }

  // ── Optimistic post helpers ──────────────────────────────────────────────
  // The pending-posts manager calls these to add/replace/mark-failed/remove an
  // optimistic post in-place. Optimistic posts use `_localId` for identity (the
  // server-assigned `id` is only set after the create succeeds).

  function findIndexByLocalId(localId: string): number {
    return posts.value.findIndex((p) => (p._localId ?? '') === localId)
  }

  function prependOptimisticPost(post: FeedPost) {
    if (!post?._localId) return
    posts.value = [post, ...posts.value]
  }

  function replaceOptimistic(localId: string, realPost: FeedPost) {
    const idx = findIndexByLocalId(localId)
    if (idx < 0) return
    const existing = posts.value[idx]!
    // For optimistic replies, preserve the parent reference so the row keeps
    // its thread context (parent shown above as a "reply to" preview). Prefer
    // any parent the server supplied; fall back to the optimistic parent.
    // Keep `_localId` on the merged post so the v-for :key stays stable across the
    // optimistic→real swap — the same component instance updates props in place
    // instead of unmounting and remounting (which causes visible jitter).
    const merged: FeedPost = {
      ...realPost,
      parent: realPost.parent ?? existing.parent,
      _localId: existing._localId,
      _pending: undefined,
      _pendingError: undefined,
    }
    const next = posts.value.slice()
    next[idx] = merged
    posts.value = next
    // Drop the stale optimistic local insert (keyed by _localId) — the server
    // will never ack that id, so without this it would linger in localInserts
    // and be re-applied on every refresh.
    if (localId) forgetLocalInsertsForDeletedPost(localId)
    const parentId = (merged.parentId ?? existing.parentId ?? null)
    if (parentId) {
      rememberLocalInsert({ kind: 'replaceParent', post: merged, parentId })
    } else if (merged.visibility !== 'onlyMe') {
      rememberLocalInsert({ kind: 'prepend', post: merged })
    }
  }

  function markOptimisticFailed(localId: string, errorMessage: string) {
    const idx = findIndexByLocalId(localId)
    if (idx < 0) return
    const next = posts.value.slice()
    next[idx] = { ...next[idx]!, _pending: 'failed', _pendingError: errorMessage }
    posts.value = next
  }

  function markOptimisticPosting(localId: string) {
    const idx = findIndexByLocalId(localId)
    if (idx < 0) return
    const next = posts.value.slice()
    next[idx] = { ...next[idx]!, _pending: 'posting', _pendingError: null }
    posts.value = next
  }

  function removeOptimistic(localId: string) {
    const idx = findIndexByLocalId(localId)
    if (idx < 0) return
    const existing = posts.value[idx]!
    // If this was an optimistic reply that took its parent's slot via
    // `addReply`, restore the parent post when the user discards instead of
    // leaving a hole where the parent used to be.
    if (existing.parentId && existing.parent) {
      const next = posts.value.slice()
      next[idx] = existing.parent
      posts.value = next
    } else {
      posts.value = posts.value.filter((_, i) => i !== idx)
    }
    if (localId) forgetLocalInsertsForDeletedPost(localId)
  }

  function addReply(parentId: string, replyPost: FeedPost, parentPostFromFeed: FeedPost) {
    const pid = (parentId ?? '').trim()
    if (!pid) return
    // Bump the shared optimistic counter for the direct parent so any PostRow rendering it
    // reflects the new reply immediately, regardless of whether the parent is in this feed.
    bumpCommentCount(pid)
    const idx = posts.value.findIndex((p) => p.id === pid)
    if (idx < 0) return
    const replyWithParent: FeedPost = { ...replyPost, parent: parentPostFromFeed }
    posts.value = [...posts.value.slice(0, idx), replyWithParent, ...posts.value.slice(idx + 1)]
    rememberLocalInsert({ kind: 'replaceParent', post: replyWithParent, parentId: pid })
  }

  function feedEnabled(): boolean {
    if (options.enabled && !options.enabled.value) return false
    return true
  }

  // Auto-refresh when feed params change, matching the pattern in useArticleFeed / useUserMedia.
  // flush: 'post' ensures the watcher fires after the reactive system (and any async router
  // navigation) has settled, so buildRequest reads the correct values before fetching.
  if (
    options.visibility ||
    options.sort ||
    options.followingOnly ||
    options.groupsHub ||
    options.communityGroupId ||
    options.authorIds ||
    options.enabled
  ) {
    watch(
      () => [
        options.visibility?.value,
        options.sort?.value,
        options.followingOnly?.value,
        options.groupsHub?.value,
        options.communityGroupId?.value,
        normalizeAuthorIds(options.authorIds?.value ?? null)?.join(',') ?? '',
        options.enabled?.value,
      ],
      () => {
        if (!feedEnabled()) {
          posts.value = []
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
    displayItems,
    collapsedSiblingReplyCountFor,
    nextCursor,
    loading,
    loadingMore,
    error,
    refresh,
    softRefreshNewer,
    startAutoSoftRefresh,
    loadMore,
    addPost,
    addReply,
    removePost,
    replacePost,
    prependOptimisticPost,
    replaceOptimistic,
    markOptimisticFailed,
    markOptimisticPosting,
    removeOptimistic,
  }
}

/**
 * Lightweight composable for prepending a post to the home feed from any context
 * (e.g. the global modal composer in app.vue). Uses the same shared useState keys
 * as usePostsFeed so localInserts survive the next hard refresh (keepalive + onActivated).
 */
export function useHomeFeedPrepend() {
  const posts = useState<FeedPost[]>('posts-feed', () => [])
  const localInserts = useState<LocalFeedInsert[]>('posts-feed-local-inserts', () => [])

  function prependToHomeFeed(post: FeedPost) {
    const id = (post?.id ?? '').trim()
    if (!id) return
    if (!posts.value.some((p) => (p.id ?? '').trim() === id)) {
      posts.value = [post, ...posts.value]
    }
    localInserts.value = upsertLocalFeedInsert(localInserts.value, { kind: 'prepend', post })
  }

  // ── Optimistic helpers shared with usePostsFeed ──────────────────────────
  // Mirror the helpers in usePostsFeed so callers from a non-page context
  // (e.g. the global modal composer in app.vue) can manage optimistic rows
  // in the home feed.

  function findIdx(localId: string): number {
    return posts.value.findIndex((p) => (p._localId ?? '') === localId)
  }

  function prependOptimisticToHomeFeed(post: FeedPost) {
    if (!post?._localId) return
    posts.value = [post, ...posts.value]
  }

  function replaceOptimisticInHomeFeed(localId: string, realPost: FeedPost) {
    const idx = findIdx(localId)
    if (idx < 0) {
      // Not present (different feed instance) — fall back to a normal prepend
      // so the user still sees their post once it lands.
      prependToHomeFeed(realPost)
      return
    }
    const next = posts.value.slice()
    next[idx] = { ...realPost }
    posts.value = next
    if (realPost.visibility !== 'onlyMe') {
      localInserts.value = upsertLocalFeedInsert(localInserts.value, { kind: 'prepend', post: realPost })
    }
  }

  function markOptimisticFailedInHomeFeed(localId: string, errorMessage: string) {
    const idx = findIdx(localId)
    if (idx < 0) return
    const next = posts.value.slice()
    next[idx] = { ...next[idx]!, _pending: 'failed', _pendingError: errorMessage }
    posts.value = next
  }

  function markOptimisticPostingInHomeFeed(localId: string) {
    const idx = findIdx(localId)
    if (idx < 0) return
    const next = posts.value.slice()
    next[idx] = { ...next[idx]!, _pending: 'posting', _pendingError: null }
    posts.value = next
  }

  function removeOptimisticFromHomeFeed(localId: string) {
    const idx = findIdx(localId)
    if (idx < 0) return
    posts.value = posts.value.filter((_, i) => i !== idx)
  }

  return {
    prependToHomeFeed,
    prependOptimisticToHomeFeed,
    replaceOptimisticInHomeFeed,
    markOptimisticFailedInHomeFeed,
    markOptimisticPostingInHomeFeed,
    removeOptimisticFromHomeFeed,
  }
}

/**
 * Global hook so the modal composer in `layouts/app.vue` can prepend newly created posts
 * to the profile feed when the viewer is viewing their own profile.
 *
 * The profile page (`pages/u/[username].vue`) registers a callback via `registerProfilePrepend`
 * when `isSelf` is true and cleans up when it deactivates. `layouts/app.vue` calls
 * `prependToProfileFeed(post)` after every successful post creation.
 */
export function useProfileFeedPrepend() {
  type PrependCb = (post: FeedPost) => void
  const callbacks = useState<Set<PrependCb>>('profile-feed-prepend-cbs', () => new Set())

  function prependToProfileFeed(post: FeedPost) {
    const id = (post?.id ?? '').trim()
    if (!id) return
    for (const cb of callbacks.value) {
      try { cb(post) } catch { /* ignore */ }
    }
  }

  function registerProfilePrepend(cb: PrependCb): () => void {
    callbacks.value.add(cb)
    return () => callbacks.value.delete(cb)
  }

  return { prependToProfileFeed, registerProfilePrepend }
}
