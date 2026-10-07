import type { Ref } from 'vue'
import type { CreatePostData, FeedPost, PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import type { ComposerPollPayload } from '~/composables/composer/types'
import { getApiErrorMessage } from '~/utils/api-error'
import { settleCrosspostPending } from '~/utils/feed-patch'
import type { LocalFeedInsert } from '~/composables/posts-feed/local-inserts'

/** Viewer-initiated feed mutations: create, delete, edit, replies and optimistic pending rows. */
export function usePostsFeedOptimistic(ctx: {
  posts: Ref<FeedPost[]>
  error: Ref<string | null>
  rememberLocalInsert: (insert: LocalFeedInsert) => void
  forgetLocalInsertsForDeletedPost: (postId: string) => void
  patchLocalInsert: (updated: FeedPost) => void
  subscribePostIds: (ids: string[]) => void
}) {
  const { posts, rememberLocalInsert, forgetLocalInsertsForDeletedPost, patchLocalInsert, subscribePostIds } = ctx
  const { apiFetchData } = useApiClient()
  const { user: me } = useAuth()

  async function addPost(
    body: string,
    visibility: PostVisibility,
    media?: Array<{
      source: PostMediaSource
      kind: PostMediaKind
      r2Key?: string
      url?: string
      mp4Url?: string | null
      width?: number | null
      height?: number | null
    }> | null,
    poll?: ComposerPollPayload | null,
    communityGroupId?: string | null,
  ): Promise<FeedPost | null> {
    const trimmed = (body ?? '').trim()
    const hasMedia = Boolean(media?.length)
    const hasPoll = Boolean(poll)
    if (!trimmed && !hasMedia && !hasPoll) return null

    try {
      const result = await apiFetchData<CreatePostData>('/posts', {
        method: 'POST',
        body: {
          body: trimmed || '',
          visibility,
          ...(communityGroupId ? { community_group_id: communityGroupId } : {}),
          ...(media?.length ? { media } : {}),
          ...(poll ? { poll } : {}),
        }
      })

      const post = result.post
      if (post.visibility !== 'onlyMe') {
        posts.value = [post, ...posts.value]
        rememberLocalInsert({ kind: 'prepend', post })
        await nextTick()
      }
      return post
    } catch (e: unknown) {
      ctx.error.value = getApiErrorMessage(e) || 'Failed to post.'
      throw e
    }
  }

  function removePost(id: string) {
    const pid = (id ?? '').trim()
    if (!pid) return

    const myId = me.value?.id ?? null
    const isMyPost = (() => {
      if (!myId) return true // Only the viewer can delete; default to full removal.
      const find = (p: FeedPost | undefined): FeedPost | null => {
        let cur: FeedPost | undefined = p
        while (cur) {
          if (cur.id === pid) return cur
          cur = cur.parent
        }
        return null
      }
      for (const p of posts.value) {
        const hit = find(p)
        if (hit) return hit.author?.id === myId
      }
      return true
    })()

    if (isMyPost) {
      const containsId = (p: FeedPost | undefined, targetId: string): boolean => {
        let cur: FeedPost | undefined = p
        while (cur) {
          if (cur.id === targetId) return true
          cur = cur.parent
        }
        return false
      }
      // If the deleted post is a reply that took its parent's slot in the feed via
      // `addReply`, restore the parent so the feed doesn't leave a blank hole.
      // This mirrors the same logic in `removeOptimistic` for the pre-confirm path.
      posts.value = posts.value
        .map((p): FeedPost | null => {
          if (!containsId(p, pid)) return p
          // p IS the deleted reply and it has a parent → restore the parent in its slot.
          if (p.id === pid && p.parentId && p.parent) return p.parent
          // p is the deleted post with no parent chain to fall back to, or the deleted
          // id is somewhere deeper in the chain (shouldn't happen in home feed but guard).
          return null
        })
        .filter((p): p is FeedPost => Boolean(p))
      forgetLocalInsertsForDeletedPost(pid)
      return
    }

    const tombstone = (p: FeedPost): FeedPost => ({
      ...p,
      deletedAt: new Date().toISOString(),
      body: '',
      media: [],
      mentions: [],
    })
    const chainHasId = (p: FeedPost | undefined, targetId: string): boolean => {
      let cur = p?.parent
      while (cur) {
        if (cur.id === targetId) return true
        cur = cur.parent
      }
      return false
    }
    const hasChildInSection = posts.value.some((p) => chainHasId(p, pid))

    posts.value = posts.value
      .map((p) => {
        const updateChain = (node: FeedPost): FeedPost => {
          const updatedParent = node.parent ? updateChain(node.parent) : undefined
          let next = updatedParent !== node.parent ? { ...node, parent: updatedParent } : node
          if (node.id === pid) next = tombstone(next)
          return next
        }
        const next = updateChain(p)
        if (next.id === pid && !hasChildInSection) return null
        return next
      })
      .filter((p): p is FeedPost => Boolean(p))
    forgetLocalInsertsForDeletedPost(pid)
  }

  function replacePost(updated: FeedPost) {
    const pid = (updated?.id ?? '').trim()
    if (!pid) return

    const replaceInChain = (node: FeedPost): FeedPost => {
      const nextParent = node.parent ? replaceInChain(node.parent) : undefined
      const base = nextParent !== node.parent ? { ...node, parent: nextParent } : node
      if (base.id === pid) return { ...updated }
      return base
    }

    posts.value = posts.value.map(replaceInChain)
    patchLocalInsert(updated)
  }

  // ── Optimistic post helpers ──────────────────────────────────────────────
  // The pending-posts manager calls these to add/replace/mark-failed/remove an
  // optimistic post in-place. Optimistic posts use `_localId` for identity (the
  // server-assigned `id` is only set after the create succeeds).

  function findIndexByLocalId(localId: string): number {
    return posts.value.findIndex((p) => (p._localId ?? '') === localId)
  }

  function prependOptimisticPost(post: FeedPost) {
    if (!post?._localId) return
    posts.value = [post, ...posts.value]
  }

  function replaceOptimistic(localId: string, realPost: FeedPost) {
    const idx = findIndexByLocalId(localId)
    if (idx < 0) return
    const existing = posts.value[idx]!
    // For optimistic replies, preserve the parent reference so the row keeps
    // its thread context (parent shown above as a "reply to" preview). Prefer
    // any parent the server supplied; fall back to the optimistic parent.
    // Keep `_localId` on the merged post so the v-for :key stays stable across the
    // optimistic→real swap — the same component instance updates props in place
    // instead of unmounting and remounting (which causes visible jitter).
    const merged: FeedPost = {
      ...realPost,
      parent: realPost.parent ?? existing.parent,
      _localId: existing._localId,
      _pending: undefined,
      _pendingError: undefined,
      _crosspostPending: settleCrosspostPending(
        realPost._crosspostPending ?? existing._crosspostPending,
        realPost,
      ),
    }
    const next = posts.value.slice()
    next[idx] = merged
    posts.value = next
    if (merged.id && merged.id !== localId) subscribePostIds([merged.id])
    // Drop the stale optimistic local insert (keyed by _localId) — the server
    // will never ack that id, so without this it would linger in localInserts
    // and be re-applied on every refresh.
    if (localId) forgetLocalInsertsForDeletedPost(localId)
    const parentId = (merged.parentId ?? existing.parentId ?? null)
    if (parentId) {
      rememberLocalInsert({ kind: 'replaceParent', post: merged, parentId })
    } else if (merged.visibility !== 'onlyMe') {
      rememberLocalInsert({ kind: 'prepend', post: merged })
    }
  }

  function markOptimisticFailed(localId: string, errorMessage: string) {
    const idx = findIndexByLocalId(localId)
    if (idx < 0) return
    const next = posts.value.slice()
    next[idx] = { ...next[idx]!, _pending: 'failed', _pendingError: errorMessage }
    posts.value = next
  }

  function markOptimisticPosting(localId: string) {
    const idx = findIndexByLocalId(localId)
    if (idx < 0) return
    const next = posts.value.slice()
    next[idx] = { ...next[idx]!, _pending: 'posting', _pendingError: null }
    posts.value = next
  }

  function removeOptimistic(localId: string) {
    const idx = findIndexByLocalId(localId)
    if (idx < 0) return
    const existing = posts.value[idx]!
    // If this was an optimistic reply that took its parent's slot via
    // `addReply`, restore the parent post when the user discards instead of
    // leaving a hole where the parent used to be.
    if (existing.parentId && existing.parent) {
      const next = posts.value.slice()
      next[idx] = existing.parent
      posts.value = next
    } else {
      posts.value = posts.value.filter((_, i) => i !== idx)
    }
    if (localId) forgetLocalInsertsForDeletedPost(localId)
  }

  function addReply(parentId: string, replyPost: FeedPost, parentPostFromFeed: FeedPost) {
    const pid = (parentId ?? '').trim()
    if (!pid) return
    const idx = posts.value.findIndex((p) => p.id === pid)
    if (idx < 0) return
    // Insert the reply in the parent's slot immediately. Do not bump
    // `commentCount` — the authoritative value arrives via `posts:liveUpdated`.
    const replyWithParent: FeedPost = { ...replyPost, parent: parentPostFromFeed }
    posts.value = [...posts.value.slice(0, idx), replyWithParent, ...posts.value.slice(idx + 1)]
    rememberLocalInsert({ kind: 'replaceParent', post: replyWithParent, parentId: pid })
  }

  return {
    addPost,
    addReply,
    removePost,
    replacePost,
    prependOptimisticPost,
    replaceOptimistic,
    markOptimisticFailed,
    markOptimisticPosting,
    removeOptimistic,
  }
}
