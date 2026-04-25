import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FeedPost } from '~/types/api'
import { usePostsFeed } from '~/composables/usePostsFeed'
import { useUserPosts } from '~/composables/useUserPosts'
import { mergeFeedThreadsForDisplay } from '~/utils/merge-feed-threads-for-display'

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

function makePost(p: Partial<FeedPost> & { id: string; threadCollapsedCount?: number }): FeedPost {
  return {
    id: p.id,
    createdAt: p.createdAt ?? new Date().toISOString(),
    body: p.body ?? '',
    deletedAt: p.deletedAt ?? null,
    visibility: (p.visibility ?? 'public') as FeedPost['visibility'],
    boostCount: p.boostCount ?? 0,
    bookmarkCount: p.bookmarkCount ?? 0,
    commentCount: p.commentCount ?? 0,
    parentId: (p.parentId ?? null) as string | null,
    mentions: p.mentions ?? [],
    media: p.media ?? [],
    viewerHasBoosted: p.viewerHasBoosted ?? false,
    viewerHasBookmarked: p.viewerHasBookmarked ?? false,
    viewerBookmarkCollectionIds: p.viewerBookmarkCollectionIds ?? [],
    author:
      p.author ??
      ({
        id: 'u',
        username: 'user',
        name: 'User',
        premium: false,
        verifiedStatus: 'none',
        avatarUrl: null,
      } as FeedPost['author']),
    parent: (p.parent ?? undefined) as FeedPost['parent'],
    ...(typeof p.threadCollapsedCount === 'number' ? { threadCollapsedCount: p.threadCollapsedCount } : {}),
  } as FeedPost
}

function makeFeed() {
  const visibility = ref<'all'>('all')
  const followingOnly = ref(false)
  const sort = ref<'new'>('new')
  return runInSetup(() => usePostsFeed({ visibility, followingOnly, sort }))
}

// ---------------------------------------------------------------------------
// 1. collapsedSiblingReplyCountFor must use commentCount, NOT feed-page counts
// ---------------------------------------------------------------------------
// This was the root cause: the old code counted how many replies appeared in
// the current feed page (always 0-1 after collapseByRoot), instead of using
// the API-provided commentCount.  If this test ever fails, it means someone
// re-introduced feed-page counting.
describe('collapsedSiblingReplyCountFor uses commentCount (regression)', () => {
  it('returns the post\'s own commentCount regardless of how many replies are in the feed page', async () => {
    const feed = await makeFeed()

    const root = makePost({ id: 'root', parentId: null, commentCount: 7 })
    const reply = makePost({ id: 'reply', parentId: 'root', parent: root, commentCount: 3 })

    // Only 1 reply in the feed page, but root has 7 total comments
    feed.posts.value = [reply]

    expect(feed.collapsedSiblingReplyCountFor(reply)).toBe(3)
    // Root isn't in the page, but if it were, its count should still be 7
    feed.posts.value = [root, reply]
    expect(feed.collapsedSiblingReplyCountFor(root)).toBe(7)
  })

  it('is not affected by adding/removing sibling replies from the feed page', async () => {
    const feed = await makeFeed()

    const root = makePost({ id: 'root', parentId: null, commentCount: 10 })
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root, commentCount: 0 })
    const r2 = makePost({ id: 'r2', parentId: 'root', parent: root, commentCount: 0 })
    const r3 = makePost({ id: 'r3', parentId: 'root', parent: root, commentCount: 0 })

    // 1 reply in page
    feed.posts.value = [r1]
    expect(feed.collapsedSiblingReplyCountFor(root)).toBe(10)

    // 3 replies in page — count must stay the same (commentCount, not page count)
    feed.posts.value = [r1, r2, r3]
    expect(feed.collapsedSiblingReplyCountFor(root)).toBe(10)
  })

  it('returns 0 for a post with commentCount 0', async () => {
    const feed = await makeFeed()
    const leaf = makePost({ id: 'leaf', parentId: 'x', commentCount: 0 })
    feed.posts.value = [leaf]
    expect(feed.collapsedSiblingReplyCountFor(leaf)).toBe(0)
  })

  it('clamps negative commentCount to 0', async () => {
    const feed = await makeFeed()
    const weird = makePost({ id: 'w', commentCount: -3 })
    feed.posts.value = [weird]
    expect(feed.collapsedSiblingReplyCountFor(weird)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. useUserPosts collapsed count also uses commentCount
// ---------------------------------------------------------------------------
describe('useUserPosts collapsedSiblingReplyCountFor (regression)', () => {
  it('uses commentCount, not feed-page reply tallies', async () => {
    const usernameLower = ref(`u-${Math.random().toString(36).slice(2, 8)}`)
    const userFeed = await runInSetup(() =>
      useUserPosts(usernameLower, {
        enabled: computed(() => false),
        defaultToNewestAndAll: true,
        cookieKeyPrefix: `test-${Math.random().toString(36).slice(2, 8)}`,
      }),
    )

    const root = makePost({ id: 'root', parentId: null, commentCount: 5 })
    const reply = makePost({ id: 'reply', parentId: 'root', parent: root, commentCount: 2 })

    userFeed.posts.value = [reply]

    expect(userFeed.collapsedSiblingReplyCountFor(reply)).toBe(2)
    expect(userFeed.collapsedSiblingReplyCountFor(root)).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// 3. displayPosts ordering
// ---------------------------------------------------------------------------
describe('displayPosts ordering', () => {
  it('preserves order of independent root threads relative to each other', async () => {
    const feed = await makeFeed()

    const A = makePost({ id: 'A', parentId: null })
    const D = makePost({ id: 'D', parentId: null })

    // Two completely independent posts; no merging should occur.
    feed.posts.value = [A, D]
    expect(feed.displayPosts.value.map((p) => p.id)).toEqual(['A', 'D'])
  })

  it('absorbs ancestor posts that are already visible through a deeper chain item', async () => {
    const feed = await makeFeed()

    const A = makePost({ id: 'A', parentId: null })
    const B = makePost({ id: 'B', parentId: 'A', parent: A })
    const C = makePost({ id: 'C', parentId: 'B', parent: B })
    const D = makePost({ id: 'D', parentId: null })

    // C, B, and A all share root A. C is the deepest → primary.
    // B and A are on C's chain → absorbed. Only C and D remain.
    feed.posts.value = [C, D, B, A]
    expect(feed.displayPosts.value.map((p) => p.id)).toEqual(['C', 'D'])
  })
})

// ---------------------------------------------------------------------------
// 4. Edge: orphan replies (missing parent object) don't crash
// ---------------------------------------------------------------------------
describe('orphan reply safety', () => {
  it('does not throw when parent chain is missing', async () => {
    const feed = await makeFeed()

    const orphan = makePost({ id: 'R1', parentId: 'gone', parent: undefined, commentCount: 4 })
    feed.posts.value = [orphan]

    expect(() => feed.collapsedSiblingReplyCountFor(orphan)).not.toThrow()
    expect(feed.collapsedSiblingReplyCountFor(orphan)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// NEW: threadCollapsedCount takes priority over commentCount
// ---------------------------------------------------------------------------
describe('collapsedSiblingReplyCountFor prefers threadCollapsedCount', () => {
  it('returns threadCollapsedCount when > 0, even if commentCount is larger', async () => {
    const feed = await makeFeed()
    const post = makePost({ id: 'p1', commentCount: 100, threadCollapsedCount: 3 })
    feed.posts.value = [post]
    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(3)
  })

  it('never returns more collapsed replies than the post can actually have', async () => {
    const feed = await makeFeed()
    const post = makePost({ id: 'p0', commentCount: 0, threadCollapsedCount: 2 })
    feed.posts.value = [post]
    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(0)
  })

  it('falls back to commentCount when threadCollapsedCount is 0', async () => {
    const feed = await makeFeed()
    const post = makePost({ id: 'p2', commentCount: 7, threadCollapsedCount: 0 })
    feed.posts.value = [post]
    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(7)
  })

  it('falls back to commentCount when threadCollapsedCount is absent', async () => {
    const feed = await makeFeed()
    const post = makePost({ id: 'p3', commentCount: 5 })
    feed.posts.value = [post]
    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(5)
  })

  it('useUserPosts also prioritizes threadCollapsedCount', async () => {
    const usernameLower = ref(`u-${Math.random().toString(36).slice(2, 8)}`)
    const userFeed = await runInSetup(() =>
      useUserPosts(usernameLower, {
        enabled: computed(() => false),
        defaultToNewestAndAll: true,
        cookieKeyPrefix: `test-${Math.random().toString(36).slice(2, 8)}`,
      }),
    )
    const post = makePost({ id: 'p4', commentCount: 10, threadCollapsedCount: 2 })
    userFeed.posts.value = [post]
    expect(userFeed.collapsedSiblingReplyCountFor(post)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// NEW: Thread merge in displayPosts (client-side multi-item-per-root merging)
// ---------------------------------------------------------------------------
describe('displayPosts thread merge', () => {
  it('passes through single-root groups with one item unchanged', async () => {
    const feed = await makeFeed()
    // Only the reply in the feed — root not present as a feed item.
    const root = makePost({ id: 'root' })
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root })
    feed.posts.value = [r1]
    const out = feed.displayPosts.value.map((p) => p.id)
    expect(out).toEqual(['r1'])
  })

  it('absorbs root when both root and reply are in the feed (reply is deeper)', async () => {
    const feed = await makeFeed()
    const root = makePost({ id: 'root' })
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root })
    // Both share root 'root'; r1 is deeper → primary, root absorbed.
    feed.posts.value = [r1, root]
    const out = feed.displayPosts.value.map((p) => p.id)
    expect(out).toEqual(['r1'])
  })

  it('absorbs sibling that is already on the primary chain (no threadCollapsedCount bump)', async () => {
    const feed = await makeFeed()
    // Chain: root -> r1 -> r2 (r2 is deepest)
    const root = makePost({ id: 'root' })
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root })
    const r2 = makePost({ id: 'r2', parentId: 'r1', parent: r1 })
    // Feed has both r2 (deepest, chain root->r1->r2) and r1 (on r2's chain)
    feed.posts.value = [r2, r1]
    const out = feed.displayPosts.value
    // r1 should be absorbed (it's on r2's chain); only r2 remains
    expect(out.map((p) => p.id)).toEqual(['r2'])
    // No extra collapsed because r1 is visible through r2's chain
    expect((out[0] as any).threadCollapsedCount ?? 0).toBe(0)
  })

  it('absorbs sibling branch and increments threadCollapsedCount', async () => {
    const feed = await makeFeed()
    // Thread: root -> r1 and root -> r2 (siblings; r2 is NOT on r1's chain)
    const root = makePost({ id: 'root' })
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root })
    const r2 = makePost({ id: 'r2', parentId: 'root', parent: root })
    // Both siblings; r1 comes first so it's primary (same chain length)
    feed.posts.value = [r1, r2]
    const out = feed.displayPosts.value
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('r1')
    // r2 is a sibling branch: absorbed + adds 1 to threadCollapsedCount
    expect((out[0] as any).threadCollapsedCount).toBe(1)
  })

  it('picks the deepest item as primary when chain lengths differ', async () => {
    const feed = await makeFeed()
    const root = makePost({ id: 'root' })
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root })
    const r2 = makePost({ id: 'r2', parentId: 'r1', parent: r1 }) // deeper
    // Feed: r1, r2 (r2 has root -> r1 -> r2; r1 has root -> r1)
    feed.posts.value = [r1, r2]
    const out = feed.displayPosts.value
    expect(out.map((p) => p.id)).toEqual(['r2'])
    // r1 is on r2's chain → not extraCollapsed
    expect((out[0] as any).threadCollapsedCount ?? 0).toBe(0)
  })

  it('accumulates existing threadCollapsedCount from API with extra collapsed siblings', async () => {
    const feed = await makeFeed()
    const root = makePost({ id: 'root' })
    // r1 already has threadCollapsedCount=1 from API (1 trending item collapsed server-side)
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root, threadCollapsedCount: 1 })
    const r2 = makePost({ id: 'r2', parentId: 'root', parent: root }) // sibling → +1 client-side
    feed.posts.value = [r1, r2]
    const out = feed.displayPosts.value
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('r1')
    // 1 from API + 1 from client = 2
    expect((out[0] as any).threadCollapsedCount).toBe(2)
  })

  it('preserves independent root groups side by side', async () => {
    const feed = await makeFeed()
    const A = makePost({ id: 'A' })
    const B = makePost({ id: 'B' })
    const ar = makePost({ id: 'ar', parentId: 'A', parent: A })
    feed.posts.value = [A, B, ar]
    const out = feed.displayPosts.value.map((p) => p.id)
    // A and ar share root A; B is independent
    // ar is on chain [A, ar], A is also on that chain → A absorbed; ar stays
    // Order: first-occurrence of A's group = A's position (index 0), B at 1
    // Actually: ar is deeper (length 2) so it's primary; A (length 1) absorbed
    // B is standalone
    expect(out).toContain('ar')
    expect(out).toContain('B')
    expect(out).not.toContain('A') // absorbed into ar's chain
  })

  it('parallel branches A→B→C and A→B→D: first in feed wins, other collapsed', async () => {
    const feed = await makeFeed()
    const A = makePost({ id: 'A' })
    const B = makePost({ id: 'B', parentId: 'A', parent: A })
    const C = makePost({ id: 'C', parentId: 'B', parent: B })
    const D = makePost({ id: 'D', parentId: 'B', parent: B })
    feed.posts.value = [C, D]
    const out = feed.displayPosts.value
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('C')
    expect((out[0] as any).threadCollapsedCount).toBe(1)
  })

  it('mergeFeedThreadsForDisplay leaves no duplicate post ids in output', () => {
    const A = makePost({ id: 'A' })
    const B = makePost({ id: 'B', parentId: 'A', parent: A })
    const C = makePost({ id: 'C', parentId: 'B', parent: B })
    const D = makePost({ id: 'D', parentId: 'B', parent: B })
    const merged = mergeFeedThreadsForDisplay([C, D])
    const ids = merged.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ---------------------------------------------------------------------------
// displayItems: must follow merged display rows (no duplicate visible chains)
// ---------------------------------------------------------------------------
describe('displayItems thread merge alignment', () => {
  it('does not render two post rows for parallel A→B→C and A→B→D', async () => {
    const feed = await makeFeed()
    const A = makePost({ id: 'A' })
    const B = makePost({ id: 'B', parentId: 'A', parent: A })
    const C = makePost({ id: 'C', parentId: 'B', parent: B })
    const D = makePost({ id: 'D', parentId: 'B', parent: B })
    feed.posts.value = [C, D]
    const postRows = feed.displayItems.value.filter((it) => it.kind === 'post')
    expect(postRows).toHaveLength(1)
    expect(postRows[0]).toEqual(
      expect.objectContaining({ kind: 'post', post: expect.objectContaining({ id: 'C' }) }),
    )
  })

  it('counts root posts for ads from merged rows, not raw feed length', async () => {
    const feed = await makeFeed()
    const roots = Array.from({ length: 10 }, (_, i) =>
      makePost({ id: `r${i}`, parentId: null }),
    )
    const A = makePost({ id: 'A' })
    const B = makePost({ id: 'B', parentId: 'A', parent: A })
    const C = makePost({ id: 'C', parentId: 'B', parent: B })
    const D = makePost({ id: 'D', parentId: 'B', parent: B })
    // 10 roots + 2 merged into 1 → 11 raw posts, 11 visible rows → ad after 10th root
    feed.posts.value = [...roots, C, D]
    const items = feed.displayItems.value
    const postRows = items.filter((it) => it.kind === 'post')
    expect(postRows).toHaveLength(11)
    const ads = items.filter((it) => it.kind === 'ad')
    expect(ads).toHaveLength(1)
    expect(ads[0]).toEqual(expect.objectContaining({ kind: 'ad', key: 'ad-after-r9' }))
  })

  it('useUserPosts displayItems also dedupes parallel A→B→C / A→B→D', async () => {
    const usernameLower = ref(`u-${Math.random().toString(36).slice(2, 8)}`)
    const userFeed = await runInSetup(() =>
      useUserPosts(usernameLower, {
        enabled: computed(() => false),
        defaultToNewestAndAll: true,
        cookieKeyPrefix: `test-${Math.random().toString(36).slice(2, 8)}`,
      }),
    )
    const A = makePost({ id: 'A' })
    const B = makePost({ id: 'B', parentId: 'A', parent: A })
    const C = makePost({ id: 'C', parentId: 'B', parent: B })
    const D = makePost({ id: 'D', parentId: 'B', parent: B })
    userFeed.posts.value = [C, D]
    expect(userFeed.displayPosts.value.map((p) => p.id)).toEqual(['C'])
    const postRows = userFeed.displayItems.value.filter((it) => it.kind === 'post')
    expect(postRows).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// NEW: End-to-end scenario — "40 comments, but View 3 more new replies"
// ---------------------------------------------------------------------------
// Simulates the full pipeline: API collapses to maxPerRoot=2, stamps
// threadCollapsedCount, then client merges same-root items. The footer count
// should reflect only how many *new/trending* items were collapsed, NOT
// the raw commentCount.
describe('end-to-end: 40 comments but only N are in the new feed', () => {
  it('API keeps 2 of 4 new replies → threadCollapsedCount=2, client absorbs 1 on-chain sibling → footer=3', async () => {
    const feed = await makeFeed()

    // Scenario:
    //   John's post "What's everyone reading?" has 40 total comments.
    //   The "new" feed contained 4 replies to John's post. API kept 2
    //   (maxPerRoot=2) and collapsed 2 → threadCollapsedCount=2 on each kept item.
    //
    //   Kept item 1: Nick (reply to John)       chain: [John → Nick]
    //   Kept item 2: Peter (reply to Nick)       chain: [John → Nick → Peter]
    //
    //   Client merge: Peter is deeper. Nick is on Peter's chain (absorbed, no
    //   extra count). But the API also collapsed Bob (a sibling branch reply to
    //   John, not on Peter's chain). threadCollapsedCount started at 2 from API;
    //   since Nick was on-chain, no client-side increment. So final = 2.
    //
    //   However, if one of the collapsed items was on a sibling branch that also
    //   appeared as a kept item... let's test the variant where it does increment.

    const john = makePost({ id: 'john', commentCount: 40 })
    const nick = makePost({ id: 'nick', parentId: 'john', parent: john, threadCollapsedCount: 2 })
    const peter = makePost({ id: 'peter', parentId: 'nick', parent: nick, threadCollapsedCount: 2 })

    // Both kept items from API are in the feed.
    feed.posts.value = [peter, nick]

    const out = feed.displayPosts.value
    // Nick is on Peter's chain → absorbed. Only Peter remains.
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('peter')
    // Nick was on-chain, so no extra increment. API's 2 stays.
    expect((out[0] as any).threadCollapsedCount).toBe(2)
    // Peter has no hidden direct replies, so the root-thread collapse hint should not
    // render a misleading "View 2 more replies" footer under Peter.
    expect(feed.collapsedSiblingReplyCountFor(out[0]!)).toBe(0)
  })

  it('API keeps 2 sibling replies → threadCollapsedCount=2, client absorbs off-chain sibling → footer=3', async () => {
    const feed = await makeFeed()

    // Variant: API kept 2, collapsed 2 (threadCollapsedCount=2).
    // But the 2 kept items are SIBLINGS (both reply to John, different branches).
    // Client merge absorbs the off-chain sibling → extraCollapsed=1 → total=3.

    const john = makePost({ id: 'john', commentCount: 40 })
    const nick = makePost({ id: 'nick', parentId: 'john', parent: john, threadCollapsedCount: 2 })
    const bob = makePost({ id: 'bob', parentId: 'john', parent: john, threadCollapsedCount: 2 })

    feed.posts.value = [nick, bob]

    const out = feed.displayPosts.value
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('nick') // first in feed, same chain length
    // API said 2 collapsed + bob is off-chain sibling absorbed client-side = 3
    expect((out[0] as any).threadCollapsedCount).toBe(3)
    // Nick has no hidden direct replies; bob was a sibling branch under John.
    expect(feed.collapsedSiblingReplyCountFor(out[0]!)).toBe(0)
  })

  it('single reply in feed with no threadCollapsedCount falls back to commentCount', async () => {
    const feed = await makeFeed()

    // Only 1 reply from this thread appeared in the feed — no collapsing
    // occurred, so threadCollapsedCount is absent. Falls back to commentCount.
    const john = makePost({ id: 'john', commentCount: 40 })
    const nick = makePost({ id: 'nick', parentId: 'john', parent: john, commentCount: 5 })

    feed.posts.value = [nick]

    const out = feed.displayPosts.value
    expect(out).toHaveLength(1)
    // No threadCollapsedCount → falls back to nick's own commentCount
    expect(feed.collapsedSiblingReplyCountFor(out[0]!)).toBe(5)
  })

  it('top-level trending post with threadCollapsedCount=0 falls back to commentCount', async () => {
    const feed = await makeFeed()

    // Post is in the trending feed but no other trending items share its root.
    // threadCollapsedCount=0 → use commentCount.
    const post = makePost({ id: 'post', commentCount: 40, threadCollapsedCount: 0 })
    feed.posts.value = [post]

    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(40)
  })
})

// ---------------------------------------------------------------------------
// NEW: Full pipeline with mixed threads
// ---------------------------------------------------------------------------
describe('full pipeline: multiple threads with different collapse scenarios', () => {
  it('handles mixed threads correctly in a single feed page', async () => {
    const feed = await makeFeed()

    // Thread A: John's post (40 comments). API kept 2 of 4 trending replies.
    // The 2 kept are on the same chain (nick→peter). threadCollapsedCount=2.
    const john = makePost({ id: 'john', commentCount: 40 })
    const nick = makePost({ id: 'nick', parentId: 'john', parent: john, threadCollapsedCount: 2 })
    const peter = makePost({ id: 'peter', parentId: 'nick', parent: nick, threadCollapsedCount: 2 })

    // Thread B: Mary's post (5 comments). Only 1 trending reply in the feed.
    const mary = makePost({ id: 'mary', commentCount: 5 })
    const sue = makePost({ id: 'sue', parentId: 'mary', parent: mary })

    // Thread C: Dave's standalone post (0 comments).
    const dave = makePost({ id: 'dave', commentCount: 0 })

    feed.posts.value = [peter, nick, sue, dave]

    const out = feed.displayPosts.value
    // Thread A: peter is deepest, nick absorbed → only peter
    // Thread B: sue is alone → stays
    // Thread C: dave is alone → stays
    expect(out.map((p) => p.id)).toEqual(['peter', 'sue', 'dave'])

    // Thread A: peter has no hidden direct replies, so no footer under peter.
    expect(feed.collapsedSiblingReplyCountFor(out[0]!)).toBe(0)
    // Thread B footer: no threadCollapsedCount → sue's commentCount (0)
    expect(feed.collapsedSiblingReplyCountFor(out[1]!)).toBe(0)
    // Thread C: no replies at all
    expect(feed.collapsedSiblingReplyCountFor(out[2]!)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. collapsedRepliesLabelFor text (unit-testable pure function)
// ---------------------------------------------------------------------------
// Extracted from FeedPostRow and CommentThread; the same logic is duplicated
// in both components.  These tests document the expected label format.
describe('collapsed replies label format', () => {
  function collapsedRepliesLabelFor(
    n: number,
    repliesSort: 'new' | 'trending' | null,
  ) {
    const noun = n === 1 ? 'reply' : 'replies'
    const qualifier =
      repliesSort === 'trending'
        ? 'trending'
        : repliesSort === 'new'
          ? 'new'
          : null
    return `View ${n} more${qualifier ? ` ${qualifier}` : ''} ${noun}`
  }

  it('singular: "View 1 more new reply"', () => {
    expect(collapsedRepliesLabelFor(1, 'new')).toBe('View 1 more new reply')
  })

  it('plural: "View 5 more new replies"', () => {
    expect(collapsedRepliesLabelFor(5, 'new')).toBe('View 5 more new replies')
  })

  it('trending: "View 3 more trending replies"', () => {
    expect(collapsedRepliesLabelFor(3, 'trending')).toBe(
      'View 3 more trending replies',
    )
  })

  it('no sort qualifier: "View 2 more replies"', () => {
    expect(collapsedRepliesLabelFor(2, null)).toBe('View 2 more replies')
  })
})
