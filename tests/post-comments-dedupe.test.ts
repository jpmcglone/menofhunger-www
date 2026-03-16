import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FeedPost } from '~/types/api'
import { usePostComments } from '~/composables/usePostComments'

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
    body: p.body ?? 'hello',
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
        id: 'u1',
        username: 'user1',
        name: 'User 1',
        premium: false,
        verifiedStatus: 'none',
        avatarUrl: null,
      } as FeedPost['author']),
    parent: (p.parent ?? undefined) as FeedPost['parent'],
  } as FeedPost
}

describe('usePostComments prependComment dedupe', () => {
  it('upserts duplicate comment IDs without incrementing count twice', async () => {
    const postId = ref('post-1')
    const post = ref<{ id: string; visibility?: string; commentCount?: number } | null>({
      id: 'post-1',
      visibility: 'public',
      commentCount: 0,
    })
    const isOnlyMe = ref(true) // avoid initial network fetch in watch

    const commentsApi = await runInSetup(() => usePostComments({ postId, post, isOnlyMe }))

    commentsApi.commentsCounts.value = {
      all: 0,
      public: 0,
      verifiedOnly: 0,
      premiumOnly: 0,
    }

    const first = makePost({ id: 'c1', body: 'first' })
    const updatedSameId = makePost({ id: 'c1', body: 'updated body' })

    commentsApi.prependComment(first)
    commentsApi.prependComment(updatedSameId)

    expect(commentsApi.comments.value).toHaveLength(1)
    expect(commentsApi.comments.value[0]?.id).toBe('c1')
    expect(commentsApi.comments.value[0]?.body).toBe('updated body')
    expect(commentsApi.commentsCounts.value?.all).toBe(1)
  })
})
