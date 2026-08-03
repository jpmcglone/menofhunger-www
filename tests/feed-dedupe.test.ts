import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FeedPost } from '~/types/api'
import { usePostsFeed } from '~/composables/usePostsFeed'
import { useUserPosts } from '~/composables/useUserPosts'
import { mergeFeedThreadsForDisplay } from '~/utils/merge-feed-threads-for-display'
import { buildThreadDisplayChain, hiddenThreadGapLabel, postAfterGapInDisplayChain } from '~/utils/feed-thread-display-chain'

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
// 1. collapsedSiblingReplyCountFor uses threadCollapsedCount only (dedupe)
// ---------------------------------------------------------------------------
describe('collapsedSiblingReplyCountFor uses threadCollapsedCount only', () => {
  it('returns 0 when threadCollapsedCount is absent even if commentCount is large', async () => {
    const feed = await makeFeed()

    const root = makePost({ id: 'root', parentId: null, commentCount: 7 })
    const reply = makePost({ id: 'reply', parentId: 'root', parent: root, commentCount: 3 })

    feed.posts.value = [reply]
    expect(feed.collapsedSiblingReplyCountFor(reply)).toBe(0)
    feed.posts.value = [root, reply]
    expect(feed.collapsedSiblingReplyCountFor(root)).toBe(0)
  })

  it('is not affected by how many sibling replies appear in the feed page', async () => {
    const feed = await makeFeed()

    const root = makePost({ id: 'root', parentId: null, commentCount: 10 })
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root, commentCount: 0 })
    const r2 = makePost({ id: 'r2', parentId: 'root', parent: root, commentCount: 0 })
    const r3 = makePost({ id: 'r3', parentId: 'root', parent: root, commentCount: 0 })

    feed.posts.value = [r1]
    expect(feed.collapsedSiblingReplyCountFor(r1)).toBe(0)

    feed.posts.value = [r1, r2, r3]
    expect(feed.collapsedSiblingReplyCountFor(r1)).toBe(0)
  })

  it('returns threadCollapsedCount when the feed deduped siblings', async () => {
    const feed = await makeFeed()
    const post = makePost({ id: 'p1', commentCount: 100, threadCollapsedCount: 3 })
    feed.posts.value = [post]
    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// 2. useUserPosts collapsed count also uses threadCollapsedCount only
// ---------------------------------------------------------------------------
describe('useUserPosts collapsedSiblingReplyCountFor (dedupe only)', () => {
  it('returns 0 without threadCollapsedCount, even when commentCount > 0', async () => {
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

    expect(userFeed.collapsedSiblingReplyCountFor(reply)).toBe(0)
    expect(userFeed.collapsedSiblingReplyCountFor(root)).toBe(0)
  })

  it('returns threadCollapsedCount when present', async () => {
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
    expect(feed.collapsedSiblingReplyCountFor(orphan)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// threadCollapsedCount-only footer count (no commentCount fallback)
// ---------------------------------------------------------------------------
describe('collapsedSiblingReplyCountFor threadCollapsedCount only', () => {
  it('returns threadCollapsedCount when > 0, even if commentCount is larger', async () => {
    const feed = await makeFeed()
    const post = makePost({ id: 'p1', commentCount: 100, threadCollapsedCount: 3 })
    feed.posts.value = [post]
    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(3)
  })

  it('returns threadCollapsedCount even when commentCount is 0', async () => {
    const feed = await makeFeed()
    const post = makePost({ id: 'p0', commentCount: 0, threadCollapsedCount: 2 })
    feed.posts.value = [post]
    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(2)
  })

  it('returns 0 when threadCollapsedCount is 0', async () => {
    const feed = await makeFeed()
    const post = makePost({ id: 'p2', commentCount: 7, threadCollapsedCount: 0 })
    feed.posts.value = [post]
    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(0)
  })

  it('returns 0 when threadCollapsedCount is absent', async () => {
    const feed = await makeFeed()
    const post = makePost({ id: 'p3', commentCount: 5 })
    feed.posts.value = [post]
    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(0)
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
// NEW: pinnedAncestorIds — ancestors independently surfaced elsewhere in the
// feed must stay visible even when FeedPostRow collapses the primary's chain.
// ---------------------------------------------------------------------------
describe('mergeFeedThreadsForDisplay pinnedAncestorIds', () => {
  it('records an absorbed sibling that sits on the primary chain as pinned (no threadCollapsedCount bump)', () => {
    const root = makePost({ id: 'root' })
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root })
    const r2 = makePost({ id: 'r2', parentId: 'r1', parent: r1 })
    const merged = mergeFeedThreadsForDisplay([r2, r1])
    expect(merged.map((p) => p.id)).toEqual(['r2'])
    expect(merged[0]?.pinnedAncestorIds).toEqual(['r1'])
    expect(merged[0]?.threadCollapsedCount ?? 0).toBe(0)
  })

  it('does not set pinnedAncestorIds for an off-chain sibling branch', () => {
    const root = makePost({ id: 'root' })
    const r1 = makePost({ id: 'r1', parentId: 'root', parent: root })
    const r2 = makePost({ id: 'r2', parentId: 'root', parent: root })
    const merged = mergeFeedThreadsForDisplay([r1, r2])
    expect(merged[0]?.pinnedAncestorIds).toBeUndefined()
    expect(merged[0]?.threadCollapsedCount).toBe(1)
  })

  it('pins a deep ancestor (A..G) when independently returned as its own feed row', () => {
    const A = makePost({ id: 'A' })
    const B = makePost({ id: 'B', parentId: 'A', parent: A })
    const C = makePost({ id: 'C', parentId: 'B', parent: B })
    const D = makePost({ id: 'D', parentId: 'C', parent: C })
    const E = makePost({ id: 'E', parentId: 'D', parent: D })
    const F = makePost({ id: 'F', parentId: 'E', parent: E })
    const G = makePost({ id: 'G', parentId: 'F', parent: F })
    // Feed independently returned G (deepest, chain A..G) and C (chain A..C).
    const merged = mergeFeedThreadsForDisplay([G, C])
    expect(merged.map((p) => p.id)).toEqual(['G'])
    expect(merged[0]?.pinnedAncestorIds).toEqual(['C'])
  })
})

// ---------------------------------------------------------------------------
// NEW: buildThreadDisplayChain — the pure collapsing algorithm FeedPostRow uses
// to compact a long ancestor chain to root + parent + leaf (+ pins).
// ---------------------------------------------------------------------------
describe('buildThreadDisplayChain', () => {
  function chainItems(ids: string[]): { id: string }[] {
    return ids.map((id) => ({ id }))
  }

  function kinds(out: ReturnType<typeof buildThreadDisplayChain<{ id: string }>>): string[] {
    return out.map((e) => (e.kind === 'post' ? e.item.id : 'gap'))
  }

  it('returns the full chain unchanged when collapse is false', () => {
    const out = buildThreadDisplayChain(chainItems(['A', 'B', 'C', 'D']), undefined, false)
    expect(kinds(out)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('returns the full chain unchanged when length is 3 or fewer', () => {
    const out = buildThreadDisplayChain(chainItems(['A', 'B', 'C']), undefined, true)
    expect(kinds(out)).toEqual(['A', 'B', 'C'])
  })

  it('collapses a long chain to root + parent + leaf with one gap', () => {
    const out = buildThreadDisplayChain(chainItems(['A', 'B', 'C', 'D', 'E', 'F', 'G']), undefined, true)
    expect(kinds(out)).toEqual(['A', 'gap', 'F', 'G'])
    const gap = out.find((e) => e.kind === 'gap')
    expect(gap?.kind === 'gap' && gap.hiddenCount).toBe(4)
  })

  it('keeps a pinned ancestor visible and splits the gap around it', () => {
    const out = buildThreadDisplayChain(chainItems(['A', 'B', 'C', 'D', 'E', 'F', 'G']), ['C'], true)
    expect(kinds(out)).toEqual(['A', 'gap', 'C', 'gap', 'F', 'G'])
    const gaps = out.filter((e) => e.kind === 'gap')
    expect(gaps.map((e) => (e.kind === 'gap' ? e.hiddenCount : 0))).toEqual([1, 2])
  })

  it('gap keys are stable and unique across separate gaps', () => {
    const out = buildThreadDisplayChain(chainItems(['A', 'B', 'C', 'D', 'E', 'F', 'G']), ['C'], true)
    const gapKeys = out.filter((e) => e.kind === 'gap').map((e) => (e.kind === 'gap' ? e.key : ''))
    expect(new Set(gapKeys).size).toBe(gapKeys.length)
  })
})

describe('hiddenThreadGapLabel', () => {
  it('pluralizes collapsed ancestor copy', () => {
    expect(hiddenThreadGapLabel(1)).toBe('1 reply')
    expect(hiddenThreadGapLabel(4)).toBe('4 replies')
  })
})

describe('postAfterGapInDisplayChain', () => {
  it('returns the next visible post below a gap', () => {
    const chain = buildThreadDisplayChain(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'E' }, { id: 'F' }, { id: 'G' }],
      ['C'],
      true,
    )
    expect(postAfterGapInDisplayChain(chain, 1)?.id).toBe('C')
    expect(postAfterGapInDisplayChain(chain, 3)?.id).toBe('F')
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
  it('does not count a collapsed reply that renders as an ancestor of the merged row', async () => {
    const feed = await makeFeed()

    // Scenario:
    //   John's post has 40 total comments. The "new" feed contained 2 replies to
    //   it: Nick (reply to John) and Peter (reply to Nick). Both are on the same
    //   chain, so the API returns both and reports nothing hidden — Peter's row
    //   already renders John and Nick above it.
    const john = makePost({ id: 'john', commentCount: 40 })
    const nick = makePost({ id: 'nick', parentId: 'john', parent: john })
    const peter = makePost({ id: 'peter', parentId: 'nick', parent: nick })

    feed.posts.value = [peter, nick]

    const out = feed.displayPosts.value
    // Nick is on Peter's chain → absorbed as a pin. Only Peter remains.
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('peter')
    expect(feed.collapsedSiblingReplyCountFor(out[0]!)).toBe(0)
  })

  it('shows no footer when the whole root → reply → reply thread is on screen', async () => {
    const feed = await makeFeed()

    // The regression: root + both replies all made the "new" feed. Every one of
    // them renders in the merged row, so there is nothing left to "view more" of.
    const root = makePost({ id: 'root', commentCount: 1 })
    const reply = makePost({ id: 'reply', parentId: 'root', parent: root })
    const replyToReply = makePost({ id: 'deep', parentId: 'reply', parent: reply })

    feed.posts.value = [replyToReply, reply, root]

    const out = feed.displayPosts.value
    expect(out.map((p) => p.id)).toEqual(['deep'])
    expect(feed.collapsedSiblingReplyCountFor(out[0]!)).toBe(0)
  })

  it('counts an absorbed off-chain branch plus the replies hidden behind it', async () => {
    const feed = await makeFeed()

    // John's post is not in the feed page, so the API grouped Nick's branch and
    // Bob's branch separately: Nick's group hid 2 more replies, Bob's hid 1.
    // Merging leaves only Nick's row, so the footer owes 2 + 1 (Bob) + 1 = 4.
    const john = makePost({ id: 'john', commentCount: 40 })
    const nick = makePost({ id: 'nick', parentId: 'john', parent: john, threadCollapsedCount: 2 })
    const bob = makePost({ id: 'bob', parentId: 'john', parent: john, threadCollapsedCount: 1 })

    feed.posts.value = [nick, bob]

    const out = feed.displayPosts.value
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('nick') // first in feed, same chain length
    expect(feed.collapsedSiblingReplyCountFor(out[0]!)).toBe(4)
  })

  it('single reply in feed with no threadCollapsedCount does not show a dedupe footer count', async () => {
    const feed = await makeFeed()

    // Only 1 reply from this thread appeared in the feed — no collapsing
    // occurred, so threadCollapsedCount is absent. Falls back to commentCount.
    const john = makePost({ id: 'john', commentCount: 40 })
    const nick = makePost({ id: 'nick', parentId: 'john', parent: john, commentCount: 5 })

    feed.posts.value = [nick]

    const out = feed.displayPosts.value
    expect(out).toHaveLength(1)
    expect(feed.collapsedSiblingReplyCountFor(out[0]!)).toBe(0)
  })

  it('top-level trending post with threadCollapsedCount=0 does not show a dedupe footer count', async () => {
    const feed = await makeFeed()

    // Post is in the trending feed but no other trending items share its root.
    // threadCollapsedCount=0 → use commentCount.
    const post = makePost({ id: 'post', commentCount: 40, threadCollapsedCount: 0 })
    feed.posts.value = [post]

    expect(feed.collapsedSiblingReplyCountFor(post)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// NEW: Full pipeline with mixed threads
// ---------------------------------------------------------------------------
describe('full pipeline: multiple threads with different collapse scenarios', () => {
  it('handles mixed threads correctly in a single feed page', async () => {
    const feed = await makeFeed()

    // Thread A: John's post (40 comments). The API returned the nick→peter chain
    // and reported 2 replies on other branches that this row never shows.
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

    // Thread A: peter kept the API collapsed count after nick was absorbed.
    expect(feed.collapsedSiblingReplyCountFor(out[0]!)).toBe(2)
    // Thread B: no dedupe count on sue.
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
