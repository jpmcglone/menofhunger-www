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

function makePost(p: Partial<FeedPost> & { id: string }): FeedPost {
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
// 3. displayPosts preserves API ordering (no client-side reordering)
// ---------------------------------------------------------------------------
describe('displayPosts ordering', () => {
  it('preserves the exact order returned by the API', async () => {
    const feed = await makeFeed()

    const A = makePost({ id: 'A', parentId: null })
    const B = makePost({ id: 'B', parentId: 'A', parent: A })
    const C = makePost({ id: 'C', parentId: 'B', parent: B })
    const D = makePost({ id: 'D', parentId: null })

    feed.posts.value = [C, D, B, A]
    expect(feed.displayPosts.value.map((p) => p.id)).toEqual(['C', 'D', 'B', 'A'])
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
