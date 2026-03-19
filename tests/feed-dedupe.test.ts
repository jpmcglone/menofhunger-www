import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FeedPost } from '~/types/api'
import { usePostsFeed } from '~/composables/usePostsFeed'
import { useUserPosts } from '~/composables/useUserPosts'

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
