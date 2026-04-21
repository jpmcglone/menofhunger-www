/**
 * Tests for utils/feed-patch.ts — helpers used by the profile page's realtime
 * update handlers (onLiveUpdated / onInteraction) and subscription sync logic.
 *
 * Key scenarios:
 *  - containsPostId: finds IDs at any depth of a .parent chain
 *  - patchPostChain: applies a patch to a node anywhere in the chain and preserves
 *    unchanged nodes by reference
 *  - collectChainIds: gathers every post ID in a chain (for socket subscriptions)
 *
 * Profile-specific count-update scenarios are also verified here — these correspond
 * to the bug where a liveUpdated commentCount event for a parent post was not applied
 * when the parent was embedded as `.parent` of a reply row in the feed.
 */
import { describe, expect, it } from 'vitest'
import type { FeedPost } from '~/types/api'
import { containsPostId, patchPostChain, collectChainIds } from '~/utils/feed-patch'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(overrides: Partial<FeedPost> & { id: string }): FeedPost {
  return {
    id: overrides.id,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    body: overrides.body ?? 'body',
    deletedAt: null,
    visibility: (overrides.visibility ?? 'public') as FeedPost['visibility'],
    boostCount: overrides.boostCount ?? 0,
    bookmarkCount: overrides.bookmarkCount ?? 0,
    commentCount: overrides.commentCount ?? 0,
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
  } as FeedPost
}

// ── containsPostId ─────────────────────────────────────────────────────────────

describe('containsPostId', () => {
  it('finds the id at the top level', () => {
    const post = makePost({ id: 'p1' })
    expect(containsPostId(post, 'p1')).toBe(true)
  })

  it('finds the id one level deep in .parent', () => {
    const parent = makePost({ id: 'parent1' })
    const reply = makePost({ id: 'reply1', parent })
    expect(containsPostId(reply, 'parent1')).toBe(true)
  })

  it('finds the id two levels deep', () => {
    const grandparent = makePost({ id: 'gp' })
    const parent = makePost({ id: 'p', parent: grandparent })
    const reply = makePost({ id: 'r', parent })
    expect(containsPostId(reply, 'gp')).toBe(true)
  })

  it('returns false for an id not in the chain', () => {
    const post = makePost({ id: 'p1' })
    expect(containsPostId(post, 'missing')).toBe(false)
  })

  it('returns false for undefined input', () => {
    expect(containsPostId(undefined, 'any')).toBe(false)
  })

  it('returns false for an empty id', () => {
    const post = makePost({ id: 'p1' })
    expect(containsPostId(post, '')).toBe(false)
  })
})

// ── patchPostChain ─────────────────────────────────────────────────────────────

describe('patchPostChain', () => {
  it('patches a top-level post', () => {
    const post = makePost({ id: 'p1', commentCount: 0 })
    const patched = patchPostChain(post, (p) =>
      p.id === 'p1' ? { ...p, commentCount: 5 } : p,
    )
    expect(patched.commentCount).toBe(5)
  })

  it('patches a post embedded as .parent of a reply row', () => {
    const parent = makePost({ id: 'parent1', commentCount: 0 })
    const reply = makePost({ id: 'reply1', parent })

    const patched = patchPostChain(reply, (p) =>
      p.id === 'parent1' ? { ...p, commentCount: 3 } : p,
    )

    expect(patched.id).toBe('reply1')
    expect(patched.commentCount).toBe(0)
    expect(patched.parent?.commentCount).toBe(3)
  })

  it('patches only the matching node, leaving siblings untouched', () => {
    const parent = makePost({ id: 'parent1', boostCount: 10 })
    const reply = makePost({ id: 'reply1', boostCount: 2, parent })

    const patched = patchPostChain(reply, (p) =>
      p.id === 'parent1' ? { ...p, boostCount: 11 } : p,
    )

    expect(patched.boostCount).toBe(2)
    expect(patched.parent?.boostCount).toBe(11)
  })

  it('returns new objects at each patched level (immutable)', () => {
    const parent = makePost({ id: 'parent1', commentCount: 0 })
    const reply = makePost({ id: 'reply1', parent })

    const patched = patchPostChain(reply, (p) =>
      p.id === 'parent1' ? { ...p, commentCount: 1 } : p,
    )

    expect(patched).not.toBe(reply)
    expect(patched.parent).not.toBe(parent)
  })

  it('returns the same object reference when nothing matches', () => {
    const parent = makePost({ id: 'parent1' })
    const reply = makePost({ id: 'reply1', parent })

    const patched = patchPostChain(reply, (p) => p)
    expect(patched).toBe(reply)
  })

  it('patches a deeply nested grandparent', () => {
    const gp = makePost({ id: 'gp', commentCount: 0 })
    const p = makePost({ id: 'p', parent: gp })
    const r = makePost({ id: 'r', parent: p })

    const patched = patchPostChain(r, (post) =>
      post.id === 'gp' ? { ...post, commentCount: 7 } : post,
    )

    expect(patched.parent?.parent?.commentCount).toBe(7)
  })
})

// ── collectChainIds ────────────────────────────────────────────────────────────

describe('collectChainIds', () => {
  it('returns just the root id for a standalone post', () => {
    const post = makePost({ id: 'a' })
    expect(collectChainIds(post)).toEqual(['a'])
  })

  it('returns ids at every depth', () => {
    const gp = makePost({ id: 'gp' })
    const p = makePost({ id: 'p', parent: gp })
    const r = makePost({ id: 'r', parent: p })
    expect(collectChainIds(r)).toEqual(['r', 'p', 'gp'])
  })

  it('skips nodes with an empty id', () => {
    const parent = makePost({ id: 'real' })
    const anon = { ...makePost({ id: '' }), parent }
    expect(collectChainIds(anon)).toEqual(['real'])
  })
})

// ── Profile feed count update scenarios ───────────────────────────────────────
//
// These tests simulate the exact data shape the profile page deals with after
// a user replies to their own post:
//
//   profilePosts = [replyRow]   where replyRow = { id:'reply', parent: { id:'parent', commentCount:0 } }
//   postsOnlyPosts = [parentRow] where parentRow = { id:'parent', commentCount:0 }
//
// The server emits liveUpdated for the parent with commentCount:1.  Both feeds
// must reflect the new count.
//
describe('profile feed count updates via liveUpdated', () => {
  function simulateLiveUpdate(
    feeds: FeedPost[][],
    postId: string,
    commentCount: number,
  ): FeedPost[][] {
    const patchPost = (p: FeedPost): FeedPost => {
      if (p.id !== postId) return p
      return { ...p, commentCount }
    }
    return feeds.map((feed) =>
      feed.some((p) => containsPostId(p, postId))
        ? feed.map((p) => patchPostChain(p, patchPost))
        : feed,
    )
  }

  it('updates commentCount on the parent row in postsOnlyPosts', () => {
    const parent = makePost({ id: 'parent', commentCount: 0 })
    const [updated] = simulateLiveUpdate([[parent]], 'parent', 1)
    expect(updated![0]!.commentCount).toBe(1)
  })

  it('updates commentCount on the embedded parent inside a reply row in profilePosts', () => {
    const parent = makePost({ id: 'parent', commentCount: 0 })
    const reply = makePost({ id: 'reply', parentId: 'parent', parent })
    const [, updated] = simulateLiveUpdate([[], [reply]], 'parent', 1)
    expect(updated![0]!.parent?.commentCount).toBe(1)
  })

  it('updates both feeds when parent appears at top-level and inside a reply chain', () => {
    const parent = makePost({ id: 'parent', commentCount: 0 })
    const reply = makePost({ id: 'reply', parentId: 'parent', parent })
    const [postsOnly, profileFeed] = simulateLiveUpdate([[parent], [reply]], 'parent', 2)
    expect(postsOnly![0]!.commentCount).toBe(2)
    expect(profileFeed![0]!.parent?.commentCount).toBe(2)
  })

  it('does not affect unrelated posts in the same feed', () => {
    const target = makePost({ id: 'target', commentCount: 0 })
    const other = makePost({ id: 'other', commentCount: 99 })
    const [updated] = simulateLiveUpdate([[other, target]], 'target', 5)
    expect(updated![0]!.commentCount).toBe(99)
    expect(updated![1]!.commentCount).toBe(5)
  })
})

describe('profile feed count updates via interaction (boost/bookmark)', () => {
  function simulateInteraction(
    feeds: FeedPost[][],
    postId: string,
    kind: 'boost' | 'bookmark',
    count: number,
    isMe: boolean,
    active: boolean,
  ): FeedPost[][] {
    const patchPost = (p: FeedPost): FeedPost => {
      if (p.id !== postId) return p
      const next = { ...p }
      if (kind === 'boost') {
        next.boostCount = count
        if (isMe) next.viewerHasBoosted = active
      }
      if (kind === 'bookmark') {
        next.bookmarkCount = count
        if (isMe) next.viewerHasBookmarked = active
      }
      return next
    }
    return feeds.map((feed) =>
      feed.some((p) => containsPostId(p, postId))
        ? feed.map((p) => patchPostChain(p, patchPost))
        : feed,
    )
  }

  it('updates boostCount on the parent row in postsOnlyPosts', () => {
    const parent = makePost({ id: 'parent', boostCount: 0 })
    const [updated] = simulateInteraction([[parent]], 'parent', 'boost', 3, false, true)
    expect(updated![0]!.boostCount).toBe(3)
  })

  it('updates boostCount on a parent embedded in a reply row in profilePosts', () => {
    const parent = makePost({ id: 'parent', boostCount: 0 })
    const reply = makePost({ id: 'reply', parentId: 'parent', parent })
    const [, updated] = simulateInteraction([[], [reply]], 'parent', 'boost', 4, false, true)
    expect(updated![0]!.parent?.boostCount).toBe(4)
  })

  it('sets viewerHasBoosted when actorId matches viewer', () => {
    const parent = makePost({ id: 'parent', boostCount: 0, viewerHasBoosted: false })
    const [updated] = simulateInteraction([[parent]], 'parent', 'boost', 1, true, true)
    expect(updated![0]!.viewerHasBoosted).toBe(true)
  })

  it('clears viewerHasBoosted on unboost', () => {
    const parent = makePost({ id: 'parent', boostCount: 1, viewerHasBoosted: true })
    const [updated] = simulateInteraction([[parent]], 'parent', 'boost', 0, true, false)
    expect(updated![0]!.viewerHasBoosted).toBe(false)
    expect(updated![0]!.boostCount).toBe(0)
  })

  it('updates bookmarkCount on the reply row itself', () => {
    const reply = makePost({ id: 'reply', bookmarkCount: 0 })
    const [updated] = simulateInteraction([[reply]], 'reply', 'bookmark', 1, true, true)
    expect(updated![0]!.bookmarkCount).toBe(1)
    expect(updated![0]!.viewerHasBookmarked).toBe(true)
  })
})

// ── Subscription ID collection ─────────────────────────────────────────────────
//
// Simulates the syncProfilePostSubscriptions logic: collect IDs from both feeds,
// including every .parent chain, so that socket events for buried parents arrive.
//
describe('subscription chain ID collection', () => {
  function collectFeedIds(...feeds: FeedPost[][]): Set<string> {
    const ids = new Set<string>()
    for (const feed of feeds) {
      for (const p of feed) {
        for (const id of collectChainIds(p)) ids.add(id)
      }
    }
    return ids
  }

  it('collects top-level ids from a flat feed', () => {
    const a = makePost({ id: 'a' })
    const b = makePost({ id: 'b' })
    expect(collectFeedIds([a, b])).toEqual(new Set(['a', 'b']))
  })

  it('includes parent chain ids from a reply row', () => {
    const parent = makePost({ id: 'parent' })
    const reply = makePost({ id: 'reply', parent })
    const ids = collectFeedIds([reply])
    expect(ids.has('reply')).toBe(true)
    expect(ids.has('parent')).toBe(true)
  })

  it('deduplicates ids that appear in both feeds', () => {
    const parent = makePost({ id: 'shared' })
    const reply = makePost({ id: 'reply', parent })
    const ids = collectFeedIds([parent], [reply])
    expect([...ids].filter((id) => id === 'shared')).toHaveLength(1)
  })

  it('includes grandparent ids', () => {
    const gp = makePost({ id: 'gp' })
    const p = makePost({ id: 'p', parent: gp })
    const r = makePost({ id: 'r', parent: p })
    const ids = collectFeedIds([r])
    expect(ids).toEqual(new Set(['r', 'p', 'gp']))
  })
})
