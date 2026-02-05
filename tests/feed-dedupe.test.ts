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

describe('feed thread de-dupe + collapsed counts', () => {
  it('dedupes by thread root (reply items sharing same root)', () => {
    const visibility = ref<'all'>('all')
    const followingOnly = ref(false)
    const sort = ref<'new'>('new')
    const feedPromise = runInSetup(() => usePostsFeed({ visibility, followingOnly, sort }))
    return feedPromise.then((feed) => {

      // Thread A -> B -> (C, C2), plus a sibling reply B2 to A.
      const A = makePost({ id: 'A', parentId: null })
      const B = makePost({ id: 'B', parentId: 'A', parent: A })
      const C = makePost({ id: 'C', parentId: 'B', parent: B })
      const C2 = makePost({ id: 'C2', parentId: 'B', parent: B })
      const B2 = makePost({ id: 'B2', parentId: 'A', parent: A })

      // Feed returns leaf replies; each contains its parent chain.
      feed.posts.value = [C2, B2, C]

      expect(feed.displayPosts.value.map((p) => p.id)).toEqual(['C2'])
    })
  })

  it('computes hidden reply count per root as (totalRepliesUnderRoot - 1) when a reply is visible', () => {
    const visibility = ref<'all'>('all')
    const followingOnly = ref(false)
    const sort = ref<'new'>('new')
    const feedPromise = runInSetup(() => usePostsFeed({ visibility, followingOnly, sort }))
    return feedPromise.then((feed) => {

      const A = makePost({ id: 'A', parentId: null })
      const B = makePost({ id: 'B', parentId: 'A', parent: A })
      const C = makePost({ id: 'C', parentId: 'B', parent: B })
      const C2 = makePost({ id: 'C2', parentId: 'B', parent: B })
      const B2 = makePost({ id: 'B2', parentId: 'A', parent: A })

      feed.posts.value = [C2, B2, C]

      // totalRepliesUnderRoot(A) = 3 (C2, B2, C). One reply row is visible (C2).
      expect(feed.collapsedSiblingReplyCountFor(C2)).toBe(2)
    })
  })

  it('counts hidden replies correctly when the root post itself is displayed', () => {
    const visibility = ref<'all'>('all')
    const followingOnly = ref(false)
    const sort = ref<'new'>('new')
    const feedPromise = runInSetup(() => usePostsFeed({ visibility, followingOnly, sort }))
    return feedPromise.then((feed) => {

      const A = makePost({ id: 'A', parentId: null })
      const B = makePost({ id: 'B', parentId: 'A', parent: A })
      const C2 = makePost({ id: 'C2', parentId: 'B', parent: B })
      const B2 = makePost({ id: 'B2', parentId: 'A', parent: A })

      // Root item appears first; it should win the root group.
      feed.posts.value = [A, C2, B2]

      expect(feed.displayPosts.value.map((p) => p.id)).toEqual(['A'])
      // totalRepliesUnderRoot(A) = 2 (C2, B2). Root row is visible => subtract 0.
      expect(feed.collapsedSiblingReplyCountFor(A)).toBe(2)
    })
  })

  it('replyCountForParentId counts direct parent reply items in the current page', () => {
    const visibility = ref<'all'>('all')
    const followingOnly = ref(false)
    const sort = ref<'new'>('new')
    const feedPromise = runInSetup(() => usePostsFeed({ visibility, followingOnly, sort }))
    return feedPromise.then((feed) => {

      const A = makePost({ id: 'A', parentId: null })
      const B = makePost({ id: 'B', parentId: 'A', parent: A })
      const B2 = makePost({ id: 'B2', parentId: 'A', parent: A })
      const C = makePost({ id: 'C', parentId: 'B', parent: B })

      feed.posts.value = [C, B2]

      expect(feed.replyCountForParentId('A')).toBe(1) // B2
      expect(feed.replyCountForParentId('B')).toBe(1) // C
      expect(feed.replyCountForParentId('missing')).toBe(0)
    })
  })

  it('useUserPosts uses the same root de-dupe + collapsed count behavior', async () => {
    const usernameLower = ref(`user-${Math.random().toString(36).slice(2, 8)}`)
    const userFeed = await runInSetup(() =>
      useUserPosts(usernameLower, {
        // Prevent auto-fetch in onMounted; we set posts manually.
        enabled: computed(() => false),
        defaultToNewestAndAll: true,
        cookieKeyPrefix: `test-${Math.random().toString(36).slice(2, 8)}`,
      }),
    )

    const A = makePost({ id: 'A', parentId: null })
    const B = makePost({ id: 'B', parentId: 'A', parent: A })
    const C = makePost({ id: 'C', parentId: 'B', parent: B })
    const B2 = makePost({ id: 'B2', parentId: 'A', parent: A })

    userFeed.posts.value = [C, B2]

    expect(userFeed.displayPosts.value.map((p) => p.id)).toEqual(['C'])
    expect(userFeed.collapsedSiblingReplyCountFor(C)).toBe(1)
    expect(userFeed.replyCountForParentId('A')).toBe(1)
  })

  it('does not throw when a reply is missing its parent object', () => {
    const visibility = ref<'all'>('all')
    const followingOnly = ref(false)
    const sort = ref<'new'>('new')
    const feedPromise = runInSetup(() => usePostsFeed({ visibility, followingOnly, sort }))
    return feedPromise.then((feed) => {

      const orphan = makePost({ id: 'R1', parentId: 'A', parent: undefined })
      const orphan2 = makePost({ id: 'R2', parentId: 'A', parent: undefined })

      feed.posts.value = [orphan, orphan2]

      // Root-walk falls back to own id in absence of parent chain, so both remain (safe behavior).
      expect(feed.displayPosts.value.map((p) => p.id)).toEqual(['R1', 'R2'])
      expect(() => feed.collapsedSiblingReplyCountFor(orphan)).not.toThrow()
    })
  })
})

