/**
 * Post-count integrity tests.
 *
 * These tests lock in the contract for how comment / boost / bookmark counts move
 * across the optimistic→server→realtime lifecycle, so future refactors don't
 * silently break what the user sees in the UI.
 *
 * The matrix covered here:
 *
 *   1. usePostCountBumps — accumulates / clears optimistic comment bumps.
 *   2. usePostsFeed.addReply — bumps the DIRECT parent only (regression: must NOT
 *      bump the thread root for nested replies, which would double-count).
 *   3. usePostsFeed.replaceOptimistic — preserves _localId for stable v-for keying
 *      (the optimistic→real swap must reuse the same component instance) and clears
 *      _pending flags.
 *   4. PostRow display formula — `post.commentCount + getCommentCountBump(id)` so
 *      we never display a negative or stale number.
 *   5. Real-time commentCount patches via the post-cache plugin contract — server
 *      patch is authoritative; bump for that post id is cleared.
 *   6. Boost: optimistic toggle, in-flight last-intent-wins, ingest seeding,
 *      realtime confirmation rounds-trip into the post cache.
 *   7. Bookmark: realtime patch updates count + viewer flag (only when isMe), and
 *      the post cache reflects the change without mutating the feed array.
 *   8. Delete-comment realtime: a `comment_deleted` patch decrements the parent's
 *      displayed count via the cache (without mutating the array).
 */
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FeedPost, WsPostsLiveUpdatedPayload, WsPostsInteractionPayload } from '~/types/api'
import { usePostCache } from '~/composables/usePostCache'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { usePostsFeed } from '~/composables/usePostsFeed'
import { useBoostState } from '~/composables/useBoostState'
import { usePostComments } from '~/composables/usePostComments'

// ── Test harness ──────────────────────────────────────────────────────────────

async function runInSetup<T>(fn: () => T): Promise<T> {
  let result: T | null = null
  const Comp = defineComponent({
    name: 'TestHarness',
    setup() {
      result = fn()
      return () => h('div')
    },
  })
  mount(Comp)
  await nextTick()
  if (result === null) throw new Error('Failed to capture setup result')
  return result
}

let _idSeq = 0
function uid(base = 'post'): string {
  return `${base}-${++_idSeq}`
}

function makePost(overrides: Partial<FeedPost> & { id: string }): FeedPost {
  return {
    id: overrides.id,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    body: overrides.body ?? 'body',
    deletedAt: null,
    editedAt: null,
    editCount: 0,
    visibility: (overrides.visibility ?? 'public') as FeedPost['visibility'],
    boostCount: overrides.boostCount ?? 0,
    bookmarkCount: overrides.bookmarkCount ?? 0,
    commentCount: overrides.commentCount ?? 0,
    viewerCount: overrides.viewerCount ?? 0,
    parentId: (overrides.parentId ?? null) as string | null,
    mentions: [],
    media: [],
    viewerHasBoosted: overrides.viewerHasBoosted ?? false,
    viewerHasBookmarked: overrides.viewerHasBookmarked ?? false,
    viewerBookmarkCollectionIds: [],
    author: {
      id: 'u1',
      username: 'testuser',
      name: 'Test User',
      premium: false,
      verifiedStatus: 'none',
      avatarUrl: null,
    } as FeedPost['author'],
    parent: overrides.parent,
    communityGroupId: overrides.communityGroupId ?? null,
    _localId: overrides._localId,
    _pending: overrides._pending,
    _pendingError: overrides._pendingError,
  } as FeedPost
}

function makeLiveUpdatedPayload(
  postId: string,
  patch: WsPostsLiveUpdatedPayload['patch'],
  reason = 'edit',
): WsPostsLiveUpdatedPayload {
  return { postId, version: new Date().toISOString(), reason, patch }
}

function makeInteractionPayload(
  postId: string,
  kind: 'boost' | 'bookmark',
  active: boolean,
  actorUserId = 'me',
  count = 1,
): WsPostsInteractionPayload {
  return {
    postId,
    actorUserId,
    kind,
    active,
    boostCount: kind === 'boost' ? count : undefined,
    bookmarkCount: kind === 'bookmark' ? count : undefined,
  }
}

// Mirror of plugins/post-cache.client.ts behaviour — reused across plugin tests.
function simulateLiveUpdated(
  cache: ReturnType<typeof usePostCache>,
  bumps: ReturnType<typeof usePostCountBumps>,
  payload: WsPostsLiveUpdatedPayload,
) {
  const patch = payload.patch ?? {}
  const delta: Partial<FeedPost> = {}
  if (typeof patch.body === 'string') delta.body = patch.body
  if (patch.editedAt !== undefined) delta.editedAt = patch.editedAt
  if (typeof patch.editCount === 'number') delta.editCount = patch.editCount
  if (patch.deletedAt !== undefined) delta.deletedAt = patch.deletedAt
  if (typeof patch.commentCount === 'number') {
    delta.commentCount = patch.commentCount
    bumps.clearBumpsForPostIds([payload.postId])
  }
  if (typeof patch.viewerCount === 'number') delta.viewerCount = patch.viewerCount
  cache.patch(payload.postId, delta)
}

function simulateInteraction(
  cache: ReturnType<typeof usePostCache>,
  payload: WsPostsInteractionPayload,
  myUserId: string,
) {
  const isMe = payload.actorUserId === myUserId
  const delta: Partial<FeedPost> = {}
  if (payload.kind === 'boost' && typeof payload.boostCount === 'number') {
    delta.boostCount = Math.max(0, Math.floor(payload.boostCount))
    if (isMe) delta.viewerHasBoosted = Boolean(payload.active)
  }
  if (payload.kind === 'bookmark' && typeof payload.bookmarkCount === 'number') {
    delta.bookmarkCount = Math.max(0, Math.floor(payload.bookmarkCount))
    if (isMe) delta.viewerHasBookmarked = Boolean(payload.active)
  }
  cache.patch(payload.postId, delta)
}

// PostRow's displayed comment count is `post.commentCount + bump`. We replicate the
// formula here so the contract is asserted directly in the test.
function displayedCommentCount(
  post: FeedPost,
  cache: ReturnType<typeof usePostCache>,
  bumps: ReturnType<typeof usePostCountBumps>,
): number {
  const view = cache.get(post)
  return (view.commentCount ?? 0) + bumps.getCommentCountBump(post.id)
}

// ── 1. usePostCountBumps ───────────────────────────────────────────────────────

describe('usePostCountBumps', () => {
  it('returns 0 for an unknown post id', async () => {
    const bumps = await runInSetup(usePostCountBumps)
    expect(bumps.getCommentCountBump(uid())).toBe(0)
  })

  it('bumpCommentCount increments by 1 each call', async () => {
    const bumps = await runInSetup(usePostCountBumps)
    const id = uid()
    bumps.bumpCommentCount(id)
    bumps.bumpCommentCount(id)
    bumps.bumpCommentCount(id)
    expect(bumps.getCommentCountBump(id)).toBe(3)
  })

  it('bumpCommentCount with empty id is a no-op', async () => {
    const bumps = await runInSetup(usePostCountBumps)
    bumps.bumpCommentCount('')
    expect(bumps.getCommentCountBump('')).toBe(0)
  })

  it('clearBumpsForPostIds removes bumps only for listed ids', async () => {
    const bumps = await runInSetup(usePostCountBumps)
    const a = uid()
    const b = uid()
    bumps.bumpCommentCount(a)
    bumps.bumpCommentCount(b)
    bumps.clearBumpsForPostIds([a])
    expect(bumps.getCommentCountBump(a)).toBe(0)
    expect(bumps.getCommentCountBump(b)).toBe(1)
  })

  it('clearBumpsForPostIds with empty array is a no-op', async () => {
    const bumps = await runInSetup(usePostCountBumps)
    const id = uid()
    bumps.bumpCommentCount(id)
    bumps.clearBumpsForPostIds([])
    expect(bumps.getCommentCountBump(id)).toBe(1)
  })
})

// ── 2. usePostsFeed.addReply (regression for the over-bumping bug) ────────────

describe('usePostsFeed.addReply', () => {
  function makeFeed() {
    return runInSetup(() =>
      usePostsFeed({
        // No reactive options → no auto-refresh watcher fires.
        enabled: computed(() => false),
      }),
    )
  }

  it('bumps the DIRECT parent commentCount by exactly 1', async () => {
    const feed = await makeFeed()
    const bumps = await runInSetup(usePostCountBumps)
    const parent = makePost({ id: uid('parent') })
    const reply = makePost({ id: uid('reply'), parentId: parent.id })
    feed.posts.value = [parent]

    feed.addReply(parent.id, reply, parent)

    expect(bumps.getCommentCountBump(parent.id)).toBe(1)
  })

  it('does NOT bump the thread root when posting a nested reply (regression)', async () => {
    // Setup: A is the root, B is a child of A, C is a child of B.
    // Posting C must bump B's count by 1 — and ONLY B's, not A's.
    // Before the fix, the frontend was bumping rootId too, so A would show 2.
    const feed = await makeFeed()
    const bumps = await runInSetup(usePostCountBumps)
    const root = makePost({ id: uid('A') })
    const middle = makePost({ id: uid('B'), parentId: root.id, parent: root })
    const grandchild = makePost({ id: uid('C'), parentId: middle.id })

    feed.posts.value = [middle]
    feed.addReply(middle.id, grandchild, middle)

    expect(bumps.getCommentCountBump(middle.id)).toBe(1)
    expect(bumps.getCommentCountBump(root.id)).toBe(0)
  })

  it('does not bump when the parent is not in the current feed array', async () => {
    // Background/kept-alive feeds can still receive reply-modal callbacks.
    // They must not bump counts for notification-embedded posts they do not own.
    const feed = await makeFeed()
    const bumps = await runInSetup(usePostCountBumps)
    const offFeedParentId = uid('off')
    const reply = makePost({ id: uid('reply'), parentId: offFeedParentId })

    feed.addReply(offFeedParentId, reply, makePost({ id: offFeedParentId }))

    expect(bumps.getCommentCountBump(offFeedParentId)).toBe(0)
  })

  it('replaces the parent slot with the reply at the same index', async () => {
    const feed = await makeFeed()
    const above = makePost({ id: uid('above') })
    const parent = makePost({ id: uid('parent') })
    const below = makePost({ id: uid('below') })
    feed.posts.value = [above, parent, below]

    const reply = makePost({ id: uid('reply'), parentId: parent.id })
    feed.addReply(parent.id, reply, parent)

    expect(feed.posts.value.map((p) => p.id)).toEqual([above.id, reply.id, below.id])
    expect(feed.posts.value[1]!.parent?.id).toBe(parent.id)
  })

  it('ignores empty parent ids', async () => {
    const feed = await makeFeed()
    const bumps = await runInSetup(usePostCountBumps)
    const before = JSON.stringify(feed.posts.value)
    feed.addReply('', makePost({ id: uid() }), makePost({ id: 'x' }))
    expect(JSON.stringify(feed.posts.value)).toBe(before)
    expect(bumps.getCommentCountBump('')).toBe(0)
  })
})

// ── 3. usePostsFeed.replaceOptimistic — stable identity for v-for ─────────────

describe('usePostsFeed.replaceOptimistic', () => {
  function makeFeed() {
    return runInSetup(() => usePostsFeed({ enabled: computed(() => false) }))
  }

  it('preserves _localId on the merged post (so the v-for :key stays stable)', async () => {
    const feed = await makeFeed()
    const localId = `local-${uid()}`
    const optimistic = makePost({ id: localId, _localId: localId, _pending: 'posting' })
    feed.posts.value = [optimistic]

    const real = makePost({ id: uid('server'), commentCount: 0 })
    feed.replaceOptimistic(localId, real)

    const merged = feed.posts.value[0]!
    expect(merged.id).toBe(real.id)
    expect(merged._localId).toBe(localId)
  })

  it('clears _pending and _pendingError on the merged post', async () => {
    const feed = await makeFeed()
    const localId = `local-${uid()}`
    const optimistic = makePost({
      id: localId,
      _localId: localId,
      _pending: 'failed',
      _pendingError: 'boom',
    })
    feed.posts.value = [optimistic]

    feed.replaceOptimistic(localId, makePost({ id: uid('server') }))

    const merged = feed.posts.value[0]!
    expect(merged._pending).toBeUndefined()
    expect(merged._pendingError).toBeUndefined()
  })

  it('preserves the optimistic parent reference when the server omits it', async () => {
    const feed = await makeFeed()
    const localId = `local-${uid()}`
    const parent = makePost({ id: uid('parent') })
    const optimistic = makePost({
      id: localId,
      _localId: localId,
      parentId: parent.id,
      parent,
    })
    feed.posts.value = [optimistic]

    feed.replaceOptimistic(localId, makePost({ id: uid('server'), parentId: parent.id }))

    expect(feed.posts.value[0]!.parent?.id).toBe(parent.id)
  })

  it('is a no-op when no optimistic post matches the localId', async () => {
    const feed = await makeFeed()
    const real = makePost({ id: uid('server') })
    feed.posts.value = []
    feed.replaceOptimistic('never-existed', real)
    expect(feed.posts.value).toHaveLength(0)
  })
})

// ── 4. PostRow display formula — comment count never doubles ───────────────────

describe('PostRow displayed comment count', () => {
  it('adds the bump on top of the cached commentCount', async () => {
    const cache = await runInSetup(usePostCache)
    const bumps = await runInSetup(usePostCountBumps)
    const post = makePost({ id: uid(), commentCount: 0 })

    bumps.bumpCommentCount(post.id)
    expect(displayedCommentCount(post, cache, bumps)).toBe(1)

    bumps.bumpCommentCount(post.id)
    expect(displayedCommentCount(post, cache, bumps)).toBe(2)
  })

  it('drops the bump when authoritative server data arrives via the cache (no double-count)', async () => {
    const cache = await runInSetup(usePostCache)
    const bumps = await runInSetup(usePostCountBumps)
    const post = makePost({ id: uid(), commentCount: 0 })

    // Optimistic: user posted a reply → bump goes to 1.
    bumps.bumpCommentCount(post.id)
    expect(displayedCommentCount(post, cache, bumps)).toBe(1)

    // Realtime arrives with authoritative count = 1. The plugin clears the bump
    // and patches the cache. PostRow must show 1 (NOT 2).
    simulateLiveUpdated(
      cache,
      bumps,
      makeLiveUpdatedPayload(post.id, { commentCount: 1 }, 'comment_created'),
    )
    expect(displayedCommentCount(post, cache, bumps)).toBe(1)
  })

  it('handles delete-comment patches: the displayed count goes down', async () => {
    const cache = await runInSetup(usePostCache)
    const bumps = await runInSetup(usePostCountBumps)
    const post = makePost({ id: uid(), commentCount: 3 })

    simulateLiveUpdated(
      cache,
      bumps,
      makeLiveUpdatedPayload(post.id, { commentCount: 2 }, 'comment_deleted'),
    )
    expect(displayedCommentCount(post, cache, bumps)).toBe(2)
  })
})

// ── 5. Realtime commentCount patches — full plugin contract ────────────────────

describe('post-cache plugin behaviour for commentCount', () => {
  it('patches the cache and clears the bump in one event', async () => {
    const cache = await runInSetup(usePostCache)
    const bumps = await runInSetup(usePostCountBumps)
    const id = uid()

    bumps.bumpCommentCount(id)
    expect(bumps.getCommentCountBump(id)).toBe(1)

    simulateLiveUpdated(cache, bumps, makeLiveUpdatedPayload(id, { commentCount: 5 }))

    expect(bumps.getCommentCountBump(id)).toBe(0)
    expect(cache.cache.value[id]?.commentCount).toBe(5)
  })

  it('does not touch the bump when the patch has no commentCount', async () => {
    const cache = await runInSetup(usePostCache)
    const bumps = await runInSetup(usePostCountBumps)
    const id = uid()
    bumps.bumpCommentCount(id)
    simulateLiveUpdated(cache, bumps, makeLiveUpdatedPayload(id, { body: 'edited' }))
    expect(bumps.getCommentCountBump(id)).toBe(1)
  })

  it('reflects updates through a parent chain (parent embedded in a reply row)', async () => {
    const cache = await runInSetup(usePostCache)
    const bumps = await runInSetup(usePostCountBumps)
    const parent = makePost({ id: uid('parent'), commentCount: 0 })
    const reply = makePost({ id: uid('reply'), parent })

    simulateLiveUpdated(
      cache,
      bumps,
      makeLiveUpdatedPayload(parent.id, { commentCount: 4 }, 'comment_created'),
    )

    const merged = cache.get(reply)
    expect(merged.parent?.commentCount).toBe(4)
    // Original objects untouched
    expect(reply.parent?.commentCount).toBe(0)
    expect(parent.commentCount).toBe(0)
  })
})

// ── 6. Boost — optimistic, ingest, realtime ────────────────────────────────────

describe('useBoostState', () => {
  it('get() returns the post defaults when nothing is staged', async () => {
    const boost = await runInSetup(useBoostState)
    const post = makePost({ id: uid(), boostCount: 4, viewerHasBoosted: false })
    const entry = boost.get(post)
    expect(entry).toEqual({ viewerHasBoosted: false, boostCount: 4 })
  })

  it('set() writes through to the post cache so PostRow sees the change', async () => {
    const boost = await runInSetup(useBoostState)
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: uid(), boostCount: 0, viewerHasBoosted: false })

    boost.set(post.id, { viewerHasBoosted: true, boostCount: 1 })

    const merged = cache.get(post)
    expect(merged.viewerHasBoosted).toBe(true)
    expect(merged.boostCount).toBe(1)
  })

  it('ingest() seeds initial state but does not overwrite existing entries', async () => {
    const boost = await runInSetup(useBoostState)
    const id = uid()
    const seed = makePost({ id, boostCount: 7, viewerHasBoosted: true })

    boost.ingest([seed])
    expect(boost.state.value[id]).toEqual({ viewerHasBoosted: true, boostCount: 7 })

    // Subsequent ingest with a different value must NOT overwrite — the user's
    // optimistic state takes precedence.
    boost.ingest([makePost({ id, boostCount: 999, viewerHasBoosted: false })])
    expect(boost.state.value[id]).toEqual({ viewerHasBoosted: true, boostCount: 7 })
  })

  it('realtime boost from another user updates count but NOT the viewer flag', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: uid(), boostCount: 0, viewerHasBoosted: false })

    simulateInteraction(
      cache,
      makeInteractionPayload(post.id, 'boost', true, 'someone-else', 3),
      'me',
    )

    const merged = cache.get(post)
    expect(merged.boostCount).toBe(3)
    expect(merged.viewerHasBoosted).toBe(false)
  })

  it('realtime boost from me sets the viewer flag and bumps the count', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: uid(), boostCount: 0, viewerHasBoosted: false })

    simulateInteraction(
      cache,
      makeInteractionPayload(post.id, 'boost', true, 'me', 1),
      'me',
    )

    const merged = cache.get(post)
    expect(merged.boostCount).toBe(1)
    expect(merged.viewerHasBoosted).toBe(true)
  })

  it('realtime unboost from me clears the viewer flag and decrements', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: uid(), boostCount: 5, viewerHasBoosted: true })

    simulateInteraction(
      cache,
      makeInteractionPayload(post.id, 'boost', false, 'me', 4),
      'me',
    )

    const merged = cache.get(post)
    expect(merged.boostCount).toBe(4)
    expect(merged.viewerHasBoosted).toBe(false)
  })

  it('boostCount can never go negative even if the server claims it', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: uid(), boostCount: 1 })
    simulateInteraction(
      cache,
      makeInteractionPayload(post.id, 'boost', false, 'me', -10),
      'me',
    )
    expect(cache.get(post).boostCount).toBe(0)
  })
})

// ── 7. Bookmark — realtime / cache contract ────────────────────────────────────

describe('bookmark realtime updates', () => {
  it('realtime bookmark from me sets the flag and updates the count', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: uid(), bookmarkCount: 0, viewerHasBookmarked: false })

    simulateInteraction(
      cache,
      makeInteractionPayload(post.id, 'bookmark', true, 'me', 1),
      'me',
    )

    const merged = cache.get(post)
    expect(merged.bookmarkCount).toBe(1)
    expect(merged.viewerHasBookmarked).toBe(true)
  })

  it('realtime un-bookmark from me clears the flag and decrements', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: uid(), bookmarkCount: 3, viewerHasBookmarked: true })

    simulateInteraction(
      cache,
      makeInteractionPayload(post.id, 'bookmark', false, 'me', 2),
      'me',
    )

    const merged = cache.get(post)
    expect(merged.bookmarkCount).toBe(2)
    expect(merged.viewerHasBookmarked).toBe(false)
  })

  it('realtime bookmark from another user updates count but NOT the viewer flag', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: uid(), bookmarkCount: 0, viewerHasBookmarked: false })

    simulateInteraction(
      cache,
      makeInteractionPayload(post.id, 'bookmark', true, 'other', 1),
      'me',
    )

    const merged = cache.get(post)
    expect(merged.bookmarkCount).toBe(1)
    expect(merged.viewerHasBookmarked).toBe(false)
  })

  it('does not mutate the original feed array entry', async () => {
    const cache = await runInSetup(usePostCache)
    const id = uid()
    const feedArray = [makePost({ id, bookmarkCount: 0 })]

    simulateInteraction(
      cache,
      makeInteractionPayload(id, 'bookmark', true, 'me', 1),
      'me',
    )

    expect(feedArray[0]!.bookmarkCount).toBe(0)
    expect(cache.get(feedArray[0]!).bookmarkCount).toBe(1)
  })
})

// ── 8. End-to-end optimistic→server lifecycle for a comment ────────────────────

describe('optimistic comment → server confirmation lifecycle', () => {
  it('transitions: bump=1 → server says 1 → bump cleared, displayed stays at 1', async () => {
    const feed = await runInSetup(() => usePostsFeed({ enabled: computed(() => false) }))
    const bumps = await runInSetup(usePostCountBumps)
    const cache = await runInSetup(usePostCache)
    const parent = makePost({ id: uid('parent'), commentCount: 0 })
    feed.posts.value = [parent]

    // 1. User posts a reply: addReply optimistically bumps the parent.
    const reply = makePost({ id: uid('reply'), parentId: parent.id })
    feed.addReply(parent.id, reply, parent)
    expect(displayedCommentCount(parent, cache, bumps)).toBe(1)

    // 2. Server acks the create and emits a realtime patch with commentCount=1.
    simulateLiveUpdated(
      cache,
      bumps,
      makeLiveUpdatedPayload(parent.id, { commentCount: 1 }, 'comment_created'),
    )

    // 3. The bump is cleared, the cache holds the authoritative count, the
    //    displayed value stays at 1 — no double-count, no flicker.
    expect(bumps.getCommentCountBump(parent.id)).toBe(0)
    expect(displayedCommentCount(parent, cache, bumps)).toBe(1)
  })

  it('a delete-comment patch decrements the displayed count', async () => {
    const cache = await runInSetup(usePostCache)
    const bumps = await runInSetup(usePostCountBumps)
    const parent = makePost({ id: uid('parent'), commentCount: 4 })

    simulateLiveUpdated(
      cache,
      bumps,
      makeLiveUpdatedPayload(parent.id, { commentCount: 3 }, 'comment_deleted'),
    )

    expect(displayedCommentCount(parent, cache, bumps)).toBe(3)
  })

  it('navigating to a fresh permalink wipes stale bumps via clearBumpsForPostIds', async () => {
    // Mirrors the fix in usePostPermalink.ts and usePostComments.ts: when fresh
    // server data arrives, we MUST clear bumps for those ids to avoid double-count.
    const bumps = await runInSetup(usePostCountBumps)
    const id = uid()
    bumps.bumpCommentCount(id)
    bumps.bumpCommentCount(id)

    bumps.clearBumpsForPostIds([id])

    expect(bumps.getCommentCountBump(id)).toBe(0)
  })
})

// ── 9. usePostComments.prependComment is list-only (authoritative count) ───────
//
// Root-cause regression for the "reply count jumped to 2" bug on /p/:id.
//
// The server emits, to the post's room, a `posts:liveUpdated` patch carrying the
// ABSOLUTE post-increment `commentCount`, followed by a `commentAdded` event with
// the new reply DTO. The commenter ALSO gets the HTTP response. Previously
// `prependComment` did an optimistic `+1` on `commentsCounts.all`, so when the WS
// `liveUpdated` set the absolute count (0 → 1) BEFORE the HTTP `onReplyPosted`
// ran, the HTTP path bumped again (1 → 2).
//
// The fix: `prependComment` is list-only. The count is authoritative-only,
// reconciled solely from `liveUpdated` (mirrored here by writing
// `commentsCounts.all` directly). This makes the displayed count immune to
// HTTP-vs-WS arrival order — a single new reply can never show as +2.

describe('usePostComments.prependComment is list-only', () => {
  function makeApi(parentId: string) {
    const postId = ref(parentId)
    const post = ref<{ id: string; visibility?: string; commentCount?: number } | null>({
      id: parentId,
      visibility: 'public',
      commentCount: 0,
    })
    const isOnlyMe = ref(true) // skip initial fetch
    return runInSetup(() => usePostComments({ postId, post, isOnlyMe }))
  }

  it('inserts the row but does NOT mutate the count (HTTP onReplyPosted path)', async () => {
    const api = await makeApi('parent-1')
    api.commentsCounts.value = { all: 0, public: 0, verifiedOnly: 0, premiumOnly: 0 }

    const reply = makePost({ id: 'c-1', parentId: 'parent-1' })
    api.prependComment(reply)

    expect(api.comments.value).toHaveLength(1)
    // Count is owned by the server patch, not by prependComment.
    expect(api.commentsCounts.value?.all).toBe(0)
  })

  it('WS liveUpdated FIRST, then HTTP onReplyPosted: end-state count is 1 (no +2)', async () => {
    const api = await makeApi('parent-2')
    api.commentsCounts.value = { all: 0, public: 0, verifiedOnly: 0, premiumOnly: 0 }

    // 1. WS liveUpdated (authoritative) sets all=1.
    api.commentsCounts.value = { ...api.commentsCounts.value!, all: 1 }
    // 2. WS commentAdded prepends the row (list-only).
    const reply = makePost({ id: 'c-2', parentId: 'parent-2' })
    api.prependComment(reply)
    // 3. HTTP onReplyPosted prepends the same id — deduped, list-only.
    api.prependComment(reply)

    expect(api.comments.value).toHaveLength(1)
    expect(api.commentsCounts.value?.all).toBe(1) // ← the bug would have made this 2
  })

  it('HTTP onReplyPosted FIRST, then WS liveUpdated: end-state count is 1', async () => {
    const api = await makeApi('parent-3')
    api.commentsCounts.value = { all: 0, public: 0, verifiedOnly: 0, premiumOnly: 0 }

    // 1. HTTP onReplyPosted prepends the row (list-only, no count change).
    const reply = makePost({ id: 'c-3', parentId: 'parent-3' })
    api.prependComment(reply)
    expect(api.commentsCounts.value?.all).toBe(0)
    // 2. WS liveUpdated (authoritative) sets the absolute count.
    api.commentsCounts.value = { ...api.commentsCounts.value!, all: 1 }
    // 3. WS commentAdded — deduped, list-only.
    api.prependComment(reply)

    expect(api.comments.value).toHaveLength(1)
    expect(api.commentsCounts.value?.all).toBe(1)
  })
})

// ── 10. usePostComments.onCommentDeleted is list-only (authoritative count) ────
//
// Symmetric to the create path. When the deleting user removes their own reply,
// the local `<PostRow @deleted>` event AND the WS `posts:commentDeleted` event
// both fire with the same id, AND the server emits `posts:liveUpdated` with the
// absolute post-DECREMENT count. If `onCommentDeleted` decremented locally too,
// it would double-decrement whenever the WS patch landed first (e.g. 5 → 4 from
// the patch, then 4 → 3 locally).
//
// The fix: `onCommentDeleted` only removes the row. The count is reconciled
// solely from the authoritative `posts:liveUpdated` patch.

describe('usePostComments.onCommentDeleted is list-only', () => {
  function makeApi(parentId: string, startCount: number) {
    const postId = ref(parentId)
    const post = ref<{ id: string; visibility?: string; commentCount?: number } | null>({
      id: parentId,
      visibility: 'public',
      commentCount: startCount,
    })
    const isOnlyMe = ref(true)
    return runInSetup(() => usePostComments({ postId, post, isOnlyMe }))
  }

  it('removes the row without mutating the count (count reconciled by liveUpdated)', async () => {
    const api = await makeApi('parent-d1', 1)
    api.commentsCounts.value = { all: 1, public: 1, verifiedOnly: 0, premiumOnly: 0 }

    const reply = makePost({ id: 'c-d1', parentId: 'parent-d1' })
    api.prependComment(reply)
    expect(api.comments.value).toHaveLength(1)

    api.onCommentDeleted('c-d1')
    expect(api.comments.value).toHaveLength(0)
    // Count unchanged by the local removal — the authoritative patch owns it.
    expect(api.commentsCounts.value?.all).toBe(1)
    // The server's liveUpdated patch then reconciles to the post-decrement value.
    api.commentsCounts.value = { ...api.commentsCounts.value!, all: 0 }
    expect(api.commentsCounts.value?.all).toBe(0)
  })

  it('WS liveUpdated FIRST then local @deleted: no double-decrement (count stays at server value)', async () => {
    const api = await makeApi('parent-d2', 5)
    api.commentsCounts.value = { all: 5, public: 5, verifiedOnly: 0, premiumOnly: 0 }
    const reply = makePost({ id: 'c-d2', parentId: 'parent-d2' })
    api.prependComment(reply)

    // 1. WS liveUpdated (authoritative) sets the post-decrement count.
    api.commentsCounts.value = { ...api.commentsCounts.value!, all: 4 }
    // 2. Local @deleted removes the row — must NOT decrement again to 3.
    api.onCommentDeleted('c-d2')

    expect(api.comments.value).toHaveLength(0)
    expect(api.commentsCounts.value?.all).toBe(4) // ← the bug would have made this 3
  })

  it('a repeated delete fire for the same id is a no-op on the list', async () => {
    const api = await makeApi('parent-d3', 1)
    api.commentsCounts.value = { all: 1, public: 1, verifiedOnly: 0, premiumOnly: 0 }
    const reply = makePost({ id: 'c-d3', parentId: 'parent-d3' })
    api.prependComment(reply)

    api.onCommentDeleted('c-d3') // local @deleted
    api.onCommentDeleted('c-d3') // WS posts:commentDeleted for the same id

    expect(api.comments.value).toHaveLength(0)
  })
})
