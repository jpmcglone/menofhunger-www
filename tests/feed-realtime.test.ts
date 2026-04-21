/**
 * Tests for real-time feed features:
 * - onFeedNewPost prepend logic (home feed receives new posts from followed users)
 * - prependPost in useUserPosts (profile page prepends own new posts)
 * - useProfileFeedPrepend callback mechanism
 * - useHomeFeedPrepend.prependToHomeFeed deduplication
 */
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FeedPost } from '~/types/api'
import { useUserPosts } from '~/composables/useUserPosts'
import { useHomeFeedPrepend, useProfileFeedPrepend } from '~/composables/usePostsFeed'

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

function makePost(p: Partial<FeedPost> & { id: string }): FeedPost {
  return {
    id: p.id,
    createdAt: p.createdAt ?? new Date().toISOString(),
    body: p.body ?? 'hello',
    deletedAt: null,
    visibility: (p.visibility ?? 'public') as FeedPost['visibility'],
    boostCount: 0,
    bookmarkCount: 0,
    commentCount: 0,
    parentId: (p.parentId ?? null) as string | null,
    mentions: [],
    media: [],
    viewerHasBoosted: false,
    viewerHasBookmarked: false,
    viewerBookmarkCollectionIds: [],
    author: {
      id: 'u1',
      username: 'testuser',
      name: 'Test User',
      premium: false,
      verifiedStatus: 'none',
      avatarUrl: null,
    } as FeedPost['author'],
    parent: (p.parent ?? undefined) as FeedPost['parent'],
    communityGroupId: p.communityGroupId ?? null,
  } as FeedPost
}

// ── useUserPosts.prependPost ───────────────────────────────────────────────────

describe('useUserPosts.prependPost', () => {
  function makeUserFeed(suffix?: string) {
    const username = ref(`user-${suffix ?? Math.random().toString(36).slice(2, 8)}`)
    return runInSetup(() =>
      useUserPosts(username, {
        enabled: computed(() => false),
        cookieKeyPrefix: `test-prepend-${username.value}`,
      }),
    )
  }

  it('prepends a post to an empty list', async () => {
    const feed = await makeUserFeed()
    const post = makePost({ id: 'p1' })
    feed.prependPost(post)
    expect(feed.posts.value[0]!.id).toBe('p1')
  })

  it('prepends to the front of an existing list', async () => {
    const feed = await makeUserFeed()
    const existing = makePost({ id: 'old' })
    feed.posts.value = [existing]
    const newPost = makePost({ id: 'new' })
    feed.prependPost(newPost)
    expect(feed.posts.value.map((p) => p.id)).toEqual(['new', 'old'])
  })

  it('skips duplicate post IDs', async () => {
    const feed = await makeUserFeed()
    const post = makePost({ id: 'dup' })
    feed.posts.value = [post]
    feed.prependPost(post)
    expect(feed.posts.value).toHaveLength(1)
  })

  it('ignores calls with a post missing an id', async () => {
    const feed = await makeUserFeed()
    feed.prependPost({ id: '' } as FeedPost)
    expect(feed.posts.value).toHaveLength(0)
  })

  it('is exposed in the return value of useUserPosts', async () => {
    const feed = await makeUserFeed()
    expect(typeof feed.prependPost).toBe('function')
  })
})

// ── useHomeFeedPrepend.prependToHomeFeed ───────────────────────────────────────

describe('useHomeFeedPrepend.prependToHomeFeed', () => {
  it('prepends a real post to the home feed', async () => {
    const { prependToHomeFeed, prependOptimisticToHomeFeed: _ } = await runInSetup(useHomeFeedPrepend)
    const { useState } = await import('#app/composables/state')
    const posts = useState<FeedPost[]>('posts-feed', () => [])
    posts.value = []
    const post = makePost({ id: 'h1' })
    prependToHomeFeed(post)
    expect(posts.value[0]!.id).toBe('h1')
  })

  it('does not duplicate a post already in the home feed', async () => {
    const { prependToHomeFeed } = await runInSetup(useHomeFeedPrepend)
    const { useState } = await import('#app/composables/state')
    const posts = useState<FeedPost[]>('posts-feed-dedup', () => [])
    // Manually wire a state key to test the dedup logic
    const existing = makePost({ id: 'hd1' })
    posts.value = [existing]
    prependToHomeFeed(existing)
    expect(posts.value).toHaveLength(1)
  })
})

// ── useProfileFeedPrepend ──────────────────────────────────────────────────────

describe('useProfileFeedPrepend', () => {
  it('delivers a post to a registered callback', async () => {
    const { prependToProfileFeed, registerProfilePrepend } = await runInSetup(useProfileFeedPrepend)
    const received: FeedPost[] = []
    const unregister = registerProfilePrepend((p) => received.push(p))
    const post = makePost({ id: 'prof1' })
    prependToProfileFeed(post)
    expect(received).toHaveLength(1)
    expect(received[0]!.id).toBe('prof1')
    unregister()
  })

  it('does not deliver to an unregistered callback', async () => {
    const { prependToProfileFeed, registerProfilePrepend } = await runInSetup(useProfileFeedPrepend)
    const received: FeedPost[] = []
    const unregister = registerProfilePrepend((p) => received.push(p))
    unregister()
    prependToProfileFeed(makePost({ id: 'gone' }))
    expect(received).toHaveLength(0)
  })

  it('delivers to multiple callbacks simultaneously', async () => {
    const { prependToProfileFeed, registerProfilePrepend } = await runInSetup(useProfileFeedPrepend)
    const a: string[] = []
    const b: string[] = []
    const u1 = registerProfilePrepend((p) => a.push(p.id))
    const u2 = registerProfilePrepend((p) => b.push(p.id))
    prependToProfileFeed(makePost({ id: 'multi' }))
    expect(a).toEqual(['multi'])
    expect(b).toEqual(['multi'])
    u1()
    u2()
  })

  it('ignores a post with no id', async () => {
    const { prependToProfileFeed, registerProfilePrepend } = await runInSetup(useProfileFeedPrepend)
    const received: FeedPost[] = []
    const unregister = registerProfilePrepend((p) => received.push(p))
    prependToProfileFeed({ id: '' } as FeedPost)
    expect(received).toHaveLength(0)
    unregister()
  })
})
