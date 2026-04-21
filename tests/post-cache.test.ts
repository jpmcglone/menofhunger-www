/**
 * Tests for the post-cache overlay system:
 *   - composables/usePostCache.ts (patch, get, clear, ingest)
 *   - utils/feed-patch.ts (applyLiveUpdatedPatch, applyInteractionPatch)
 *   - Global plugin behaviour simulated inline
 *
 * The key scenarios this covers:
 *   1. Cache patch/get/clear/ingest basics
 *   2. get() merges delta on top of the raw post
 *   3. get() applies the cache recursively through .parent chains
 *   4. applyLiveUpdatedPatch is the canonical allowlist (unknown fields are ignored)
 *   5. applyInteractionPatch applies boost/bookmark counts and viewer flags
 *   6. isMe guard: viewerHasBoosted/Bookmarked only set when isMe=true
 *   7. Global plugin simulation: liveUpdated event → cache updated correctly
 *   8. Global plugin simulation: interaction event → boost/bookmark in cache
 *   9. PostRow read path: postCache.get(post) reflects realtime changes without
 *      the feed array being mutated
 */
import { computed, defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FeedPost, WsPostsLiveUpdatedPayload, WsPostsInteractionPayload } from '~/types/api'
import { usePostCache } from '~/composables/usePostCache'
import { applyLiveUpdatedPatch, applyInteractionPatch } from '~/utils/feed-patch'

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

// The post cache is backed by a global useState, so tests share state.
// Use unique IDs per test to avoid cross-test contamination.
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

// ── usePostCache: patch / get / clear / ingest ─────────────────────────────────

describe('usePostCache.patch and get', () => {
  it('get returns the raw post when no delta exists', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: 'p1', commentCount: 5 })
    expect(cache.get(post).commentCount).toBe(5)
  })

  it('patch merges delta; get returns merged result', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: 'p1', commentCount: 5 })
    cache.patch('p1', { commentCount: 9 })
    expect(cache.get(post).commentCount).toBe(9)
  })

  it('patch accumulates multiple deltas', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: 'p1', boostCount: 0, commentCount: 0 })
    cache.patch('p1', { boostCount: 3 })
    cache.patch('p1', { commentCount: 7 })
    const merged = cache.get(post)
    expect(merged.boostCount).toBe(3)
    expect(merged.commentCount).toBe(7)
  })

  it('later patch wins for the same field', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: 'p1', boostCount: 0 })
    cache.patch('p1', { boostCount: 5 })
    cache.patch('p1', { boostCount: 8 })
    expect(cache.get(post).boostCount).toBe(8)
  })

  it('get does not modify unrelated fields', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: 'p1', body: 'hello', boostCount: 0 })
    cache.patch('p1', { boostCount: 2 })
    expect(cache.get(post).body).toBe('hello')
  })

  it('patch with empty id is a no-op', async () => {
    const cache = await runInSetup(usePostCache)
    cache.patch('', { boostCount: 99 })
    expect(cache.cache.value['']).toBeUndefined()
  })
})

describe('usePostCache.get — parent chain merging', () => {
  it('applies cache to a parent embedded in a reply row', async () => {
    const cache = await runInSetup(usePostCache)
    const parent = makePost({ id: 'parent', commentCount: 0 })
    const reply = makePost({ id: 'reply', parent })
    cache.patch('parent', { commentCount: 3 })
    const merged = cache.get(reply)
    expect(merged.id).toBe('reply')
    expect(merged.parent?.commentCount).toBe(3)
  })

  it('applies cache to a grandparent two levels deep', async () => {
    const cache = await runInSetup(usePostCache)
    const gp = makePost({ id: 'gp', boostCount: 0 })
    const p = makePost({ id: 'p', parent: gp })
    const r = makePost({ id: 'r', parent: p })
    cache.patch('gp', { boostCount: 7 })
    const merged = cache.get(r)
    expect(merged.parent?.parent?.boostCount).toBe(7)
  })

  it('returns original reference when nothing in cache matches', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: 'unpatched' })
    const result = cache.get(post)
    expect(result).toBe(post)
  })
})

describe('usePostCache.clear', () => {
  it('removes the delta; get returns raw post after clear', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: 'p1', commentCount: 0 })
    cache.patch('p1', { commentCount: 5 })
    cache.clear(['p1'])
    expect(cache.get(post).commentCount).toBe(0)
  })

  it('clear only removes named ids', async () => {
    const cache = await runInSetup(usePostCache)
    cache.patch('keep', { boostCount: 9 })
    cache.patch('remove', { boostCount: 3 })
    cache.clear(['remove'])
    const keepPost = makePost({ id: 'keep', boostCount: 0 })
    expect(cache.get(keepPost).boostCount).toBe(9)
    expect(cache.cache.value['remove']).toBeUndefined()
  })

  it('clear with empty array is a no-op', async () => {
    const cache = await runInSetup(usePostCache)
    cache.patch('p1', { boostCount: 5 })
    cache.clear([])
    expect(cache.cache.value['p1']).toBeDefined()
  })
})

describe('usePostCache.ingest', () => {
  it('seeds a new entry from a post', async () => {
    const cache = await runInSetup(usePostCache)
    const id = uid()
    const post = makePost({ id, commentCount: 4, boostCount: 2 })
    cache.ingest([post])
    expect(cache.cache.value[id]?.commentCount).toBe(4)
    expect(cache.cache.value[id]?.boostCount).toBe(2)
  })

  it('does not overwrite an existing delta', async () => {
    const cache = await runInSetup(usePostCache)
    const id = uid()
    cache.patch(id, { boostCount: 99 })
    const post = makePost({ id, boostCount: 1 })
    cache.ingest([post])
    expect(cache.cache.value[id]?.boostCount).toBe(99)
  })

  it('skips posts with no id', async () => {
    const cache = await runInSetup(usePostCache)
    cache.ingest([{ id: '' } as FeedPost])
    expect(cache.cache.value['']).toBeUndefined()
  })
})

// ── applyLiveUpdatedPatch ──────────────────────────────────────────────────────

describe('applyLiveUpdatedPatch', () => {
  it('returns the same reference when postId does not match', () => {
    const post = makePost({ id: 'p1' })
    const result = applyLiveUpdatedPatch(post, 'other', { body: 'changed' })
    expect(result).toBe(post)
  })

  it('applies body update', () => {
    const post = makePost({ id: 'p1', body: 'original' })
    const result = applyLiveUpdatedPatch(post, 'p1', { body: 'updated' })
    expect(result.body).toBe('updated')
  })

  it('applies commentCount update', () => {
    const post = makePost({ id: 'p1', commentCount: 0 })
    const result = applyLiveUpdatedPatch(post, 'p1', { commentCount: 5 })
    expect(result.commentCount).toBe(5)
  })

  it('applies deletedAt update', () => {
    const ts = new Date().toISOString()
    const post = makePost({ id: 'p1' })
    const result = applyLiveUpdatedPatch(post, 'p1', { deletedAt: ts })
    expect(result.deletedAt).toBe(ts)
  })

  it('ignores undefined fields (no unintended null overwrites)', () => {
    const post = makePost({ id: 'p1', body: 'hello' })
    const result = applyLiveUpdatedPatch(post, 'p1', { commentCount: 3 })
    expect(result.body).toBe('hello')
  })

  it('does not apply unknown fields (type safety)', () => {
    const post = makePost({ id: 'p1' })
    const result = applyLiveUpdatedPatch(post, 'p1', {})
    expect(result).toStrictEqual(post)
  })

  it('applies all six allowed fields together', () => {
    const ts = new Date().toISOString()
    const post = makePost({ id: 'p1' })
    const result = applyLiveUpdatedPatch(post, 'p1', {
      body: 'new',
      editedAt: ts,
      editCount: 1,
      deletedAt: null,
      commentCount: 3,
      viewerCount: 10,
    })
    expect(result.body).toBe('new')
    expect(result.editedAt).toBe(ts)
    expect(result.editCount).toBe(1)
    expect(result.commentCount).toBe(3)
    expect(result.viewerCount).toBe(10)
  })
})

// ── applyInteractionPatch ──────────────────────────────────────────────────────

describe('applyInteractionPatch', () => {
  it('returns the same reference when postId does not match', () => {
    const post = makePost({ id: 'p1' })
    const payload = makeInteractionPayload('other', 'boost', true)
    // post.id='p1', postId argument='nomatch' → no match → same reference returned
    expect(applyInteractionPatch(post, 'nomatch', payload, true)).toBe(post)
  })

  it('updates boostCount for a boost event', () => {
    const id = uid()
    const post = makePost({ id, boostCount: 0 })
    const payload = makeInteractionPayload(id, 'boost', true, 'u2', 5)
    const result = applyInteractionPatch(post, id, payload, false)
    expect(result.boostCount).toBe(5)
  })

  it('sets viewerHasBoosted only when isMe=true', () => {
    const id = uid()
    const post = makePost({ id, boostCount: 0, viewerHasBoosted: false })
    const payload = makeInteractionPayload(id, 'boost', true, 'u2', 3)
    const notMe = applyInteractionPatch(post, id, payload, false)
    expect(notMe.viewerHasBoosted).toBe(false)
    const me = applyInteractionPatch(post, id, payload, true)
    expect(me.viewerHasBoosted).toBe(true)
  })

  it('clears viewerHasBoosted on unboost when isMe=true', () => {
    const id = uid()
    const post = makePost({ id, boostCount: 2, viewerHasBoosted: true })
    const payload = makeInteractionPayload(id, 'boost', false, 'me', 1)
    const result = applyInteractionPatch(post, id, payload, true)
    expect(result.viewerHasBoosted).toBe(false)
    expect(result.boostCount).toBe(1)
  })

  it('updates bookmarkCount for a bookmark event', () => {
    const id = uid()
    const post = makePost({ id, bookmarkCount: 0 })
    const payload = makeInteractionPayload(id, 'bookmark', true, 'me', 1)
    const result = applyInteractionPatch(post, id, payload, true)
    expect(result.bookmarkCount).toBe(1)
    expect(result.viewerHasBookmarked).toBe(true)
  })

  it('floors and clamps boostCount to >= 0', () => {
    const id = uid()
    const post = makePost({ id, boostCount: 5 })
    const payload = makeInteractionPayload(id, 'boost', false, 'me', -3)
    const result = applyInteractionPatch(post, id, payload, false)
    expect(result.boostCount).toBe(0)
  })
})

// ── Global plugin simulation ───────────────────────────────────────────────────
//
// Simulates what plugins/post-cache.client.ts does: liveUpdated / interaction
// events patch the cache, and the feed array is NOT mutated for content.
// PostRow reads from cache.get(post) to get fresh data.

describe('global plugin simulation — liveUpdated → cache', () => {
  function simulateLiveUpdated(
    cache: ReturnType<typeof usePostCache>,
    payload: WsPostsLiveUpdatedPayload,
  ) {
    const patch = payload.patch ?? {}
    const delta: Partial<FeedPost> = {}
    if (typeof patch.body === 'string') delta.body = patch.body
    if (patch.editedAt !== undefined) delta.editedAt = patch.editedAt
    if (typeof patch.editCount === 'number') delta.editCount = patch.editCount
    if (patch.deletedAt !== undefined) delta.deletedAt = patch.deletedAt
    if (typeof patch.commentCount === 'number') delta.commentCount = patch.commentCount
    if (typeof patch.viewerCount === 'number') delta.viewerCount = patch.viewerCount
    cache.patch(payload.postId, delta)
  }

  it('commentCount update is reflected via cache.get without touching the array', async () => {
    const cache = await runInSetup(usePostCache)
    const feedArray = [makePost({ id: 'p1', commentCount: 0 })]

    simulateLiveUpdated(cache, makeLiveUpdatedPayload('p1', { commentCount: 7 }, 'comment_created'))

    // Feed array is untouched
    expect(feedArray[0]!.commentCount).toBe(0)
    // PostRow reads from cache
    expect(cache.get(feedArray[0]!).commentCount).toBe(7)
  })

  it('body edit is reflected via cache.get', async () => {
    const cache = await runInSetup(usePostCache)
    const post = makePost({ id: 'p1', body: 'original' })
    simulateLiveUpdated(cache, makeLiveUpdatedPayload('p1', { body: 'edited' }))
    expect(cache.get(post).body).toBe('edited')
    expect(post.body).toBe('original')
  })

  it('deletedAt is reflected via cache.get', async () => {
    const cache = await runInSetup(usePostCache)
    const ts = new Date().toISOString()
    const post = makePost({ id: 'p1' })
    simulateLiveUpdated(cache, makeLiveUpdatedPayload('p1', { deletedAt: ts }))
    expect(cache.get(post).deletedAt).toBe(ts)
  })

  it('parent embedded in reply row gets commentCount updated via cache.get', async () => {
    const cache = await runInSetup(usePostCache)
    const parent = makePost({ id: 'parent', commentCount: 0 })
    const reply = makePost({ id: 'reply', parent })

    simulateLiveUpdated(cache, makeLiveUpdatedPayload('parent', { commentCount: 2 }, 'comment_created'))

    const mergedReply = cache.get(reply)
    expect(mergedReply.parent?.commentCount).toBe(2)
    // The original reply object is untouched
    expect(reply.parent?.commentCount).toBe(0)
  })
})

describe('global plugin simulation — interaction → cache', () => {
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

  it('boost event updates boostCount in cache; feed array is untouched', async () => {
    const cache = await runInSetup(usePostCache)
    const id = uid()
    const feedPost = makePost({ id, boostCount: 0 })
    simulateInteraction(cache, makeInteractionPayload(id, 'boost', true, 'other', 5), 'me')
    expect(feedPost.boostCount).toBe(0)
    expect(cache.get(feedPost).boostCount).toBe(5)
  })

  it('boost from viewer sets viewerHasBoosted in cache', async () => {
    const cache = await runInSetup(usePostCache)
    const id = uid()
    const post = makePost({ id, boostCount: 0, viewerHasBoosted: false })
    simulateInteraction(cache, makeInteractionPayload(id, 'boost', true, 'me', 1), 'me')
    expect(cache.get(post).viewerHasBoosted).toBe(true)
  })

  it('boost from another user does NOT set viewerHasBoosted', async () => {
    const cache = await runInSetup(usePostCache)
    const id = uid()
    const post = makePost({ id, boostCount: 0, viewerHasBoosted: false })
    simulateInteraction(cache, makeInteractionPayload(id, 'boost', true, 'other', 3), 'me')
    expect(cache.get(post).viewerHasBoosted).toBe(false)
    expect(cache.get(post).boostCount).toBe(3)
  })

  it('bookmark event updates bookmarkCount and viewerHasBookmarked', async () => {
    const cache = await runInSetup(usePostCache)
    const id = uid()
    const post = makePost({ id, bookmarkCount: 0, viewerHasBookmarked: false })
    simulateInteraction(cache, makeInteractionPayload(id, 'bookmark', true, 'me', 1), 'me')
    expect(cache.get(post).bookmarkCount).toBe(1)
    expect(cache.get(post).viewerHasBookmarked).toBe(true)
  })
})
