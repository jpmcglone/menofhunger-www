import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import type { Ref } from 'vue'
import type { FeedPost } from '~/types/api'
import type { PostsCallback } from '~/composables/usePresence'
import { postAndParentChainIds } from '~/composables/posts-feed/query'

/**
 * Realtime merge for a posts feed: subscribe to rows while they are on screen (plus their parent
 * chains) and drop rows the server reports deleted. Content patches are applied globally by
 * plugins/post-cache.client.ts, so this only handles structural changes.
 */
export function usePostsFeedRealtime(ctx: {
  posts: Ref<FeedPost[]>
  middleScrollerEl: Readonly<Ref<HTMLElement | null>>
  forgetLocalInsertsForDeletedPost: (postId: string) => void
}) {
  const { posts, middleScrollerEl, forgetLocalInsertsForDeletedPost } = ctx
  const { subscribePosts, unsubscribePosts } = usePresence()

  // Realtime: patch post interaction counts in-place for visible feeds.
  const visiblePostIds = ref<Set<string>>(new Set())
  let postObserver: IntersectionObserver | null = null
  let unsubscribeTimer: ReturnType<typeof setTimeout> | null = null
  const pendingUnsub = new Set<string>()
  const subscribedIdsByVisibleRowId = new Map<string, string[]>()

  function uniqueIds(ids: Array<string | null | undefined>): string[] {
    return [...new Set(ids.map((id) => (id ?? '').trim()).filter(Boolean))]
  }

  function chainSubscriptionIdsForVisibleRow(rowId: string): string[] {
    const row = posts.value.find((p) => (p.id ?? '').trim() === rowId)
    if (!row) return [rowId]

    return uniqueIds(postAndParentChainIds(row))
  }

  function isSubscribedByAnotherVisibleRow(postId: string): boolean {
    for (const ids of subscribedIdsByVisibleRowId.values()) {
      if (ids.includes(postId)) return true
    }
    return false
  }

  function subscribePostIds(ids: string[]) {
    const uniqueSubIds = uniqueIds(ids)
    if (uniqueSubIds.length === 0) return
    for (const id of uniqueSubIds) pendingUnsub.delete(id)
    subscribePosts(uniqueSubIds)
  }

  function refreshVisibleChainSubscriptions() {
    const toSub: string[] = []
    const toUnsub: string[] = []
    for (const rowId of visiblePostIds.value) {
      const nextIds = chainSubscriptionIdsForVisibleRow(rowId)
      const prevIds = subscribedIdsByVisibleRowId.get(rowId) ?? [rowId]
      const nextSet = new Set(nextIds)
      const prevSet = new Set(prevIds)
      for (const id of nextIds) {
        if (!prevSet.has(id)) toSub.push(id)
      }
      for (const id of prevIds) {
        if (!nextSet.has(id)) toUnsub.push(id)
      }
      subscribedIdsByVisibleRowId.set(rowId, nextIds)
    }
    subscribePostIds(toSub)
    const uniqueUnsubIds = uniqueIds(toUnsub).filter((id) => !isSubscribedByAnotherVisibleRow(id))
    if (uniqueUnsubIds.length) scheduleUnsub(uniqueUnsubIds)
  }

  function flushUnsub() {
    if (pendingUnsub.size === 0) return
    const ids = [...pendingUnsub]
    pendingUnsub.clear()
    unsubscribePosts(ids)
  }

  function scheduleUnsub(postIds: string | string[]) {
    const ids = uniqueIds(Array.isArray(postIds) ? postIds : [postIds])
    if (ids.length === 0) return
    for (const id of ids) {
      pendingUnsub.add(id)
    }
    if (unsubscribeTimer) return
    unsubscribeTimer = setTimeout(() => {
      unsubscribeTimer = null
      flushUnsub()
    }, 1200)
  }

  function rescanAndObserve() {
    if (!import.meta.client) return
    const root = middleScrollerEl.value ?? document
    const els = Array.from((root as any).querySelectorAll?.('[data-post-id]') ?? []) as HTMLElement[]
    for (const el of els) {
      const id = (el.dataset.postId ?? '').trim()
      if (!id) continue
      postObserver?.observe(el)
    }
  }

  /**
   * Explicit visibility update — called by feed surfaces that manage their own
   * visibility model (e.g. a virtualizer). Drives the same subscribe/unsubscribe
   * diffing that the internal IntersectionObserver uses, but without a DOM scan.
   * Safe to call alongside the IO: both update `visiblePostIds` idempotently.
   */
  function notifyVisibleRowIds(rowIds: string[]) {
    const newSet = new Set(rowIds.map(id => (id ?? '').trim()).filter(Boolean))
    const toSub: string[] = []
    const toUnsub: string[] = []

    for (const rowId of newSet) {
      if (!visiblePostIds.value.has(rowId)) {
        const ids = chainSubscriptionIdsForVisibleRow(rowId)
        subscribedIdsByVisibleRowId.set(rowId, ids)
        toSub.push(...ids)
      }
    }

    for (const rowId of visiblePostIds.value) {
      if (!newSet.has(rowId)) {
        const ids = subscribedIdsByVisibleRowId.get(rowId) ?? [rowId]
        subscribedIdsByVisibleRowId.delete(rowId)
        const safeToUnsub = ids.filter(id => !isSubscribedByAnotherVisibleRow(id))
        toUnsub.push(...safeToUnsub)
      }
    }

    visiblePostIds.value = newSet
    subscribePostIds(uniqueIds(toSub))
    if (toUnsub.length) scheduleUnsub(uniqueIds(toUnsub))
  }

  const postsCb: PostsCallback = {
    // Content patches (counts, body, flags) are handled globally by plugins/post-cache.client.ts.
    // Per-feed callbacks only handle structural changes: deletions remove rows from the array.
    onLiveUpdated: (payload) => {
      const postId = String(payload?.postId ?? '').trim()
      if (!postId) return
      const patch = payload?.patch ?? {}
      if (patch.deletedAt) {
        // Case 1: deleted post is a top-level item in the array (no parent).
        // Remove it entirely.
        const isTopLevel = posts.value.some((p) => p.id === postId && !p.parentId)
        if (isTopLevel) {
          posts.value = posts.value.filter((p) => p.id !== postId)
          forgetLocalInsertsForDeletedPost(postId)
          return
        }
        // Case 2: deleted post is a reply that took the parent's slot via `addReply`
        // (it has a parentId but is sitting as the top-level array entry). Restore the
        // parent instead of leaving the slot occupied by a deleted reply.
        const replyIdx = posts.value.findIndex((p) => p.id === postId && p.parentId && p.parent)
        if (replyIdx >= 0) {
          const entry = posts.value[replyIdx]!
          const next = posts.value.slice()
          next[replyIdx] = entry.parent!
          posts.value = next
          forgetLocalInsertsForDeletedPost(postId)
        }
        // Case 3: deleted post is a reply nested deeper in a parent chain (e.g. A→B→C
        // where C is deleted). The cache patch in post-cache.client.ts will mark it
        // deletedAt so PostRow can render a tombstone — no structural feed change needed.
      }
    },
  }
  usePresenceCallback('Posts', postsCb)

  // Viewport subscriptions: subscribe while a post row is on-screen (with buffer).
  if (import.meta.client) {
    onMounted(() => {
      postObserver = new IntersectionObserver(
        (entries) => {
          const toSub: string[] = []
          for (const entry of entries) {
            const el = entry.target as HTMLElement
            const id = (el.dataset.postId ?? '').trim()
            if (!id) continue
            if (entry.isIntersecting) {
              if (!visiblePostIds.value.has(id)) {
                visiblePostIds.value = new Set([...visiblePostIds.value, id])
                const ids = chainSubscriptionIdsForVisibleRow(id)
                subscribedIdsByVisibleRowId.set(id, ids)
                toSub.push(...ids)
              }
            } else {
              if (visiblePostIds.value.has(id)) {
                const next = new Set(visiblePostIds.value)
                next.delete(id)
                visiblePostIds.value = next
                const ids = subscribedIdsByVisibleRowId.get(id) ?? [id]
                subscribedIdsByVisibleRowId.delete(id)
                const safeToUnsub = ids.filter((subscriptionId) => !isSubscribedByAnotherVisibleRow(subscriptionId))
                scheduleUnsub(safeToUnsub)
              }
            }
          }
          subscribePostIds(toSub)
        },
        {
          root: middleScrollerEl.value ?? null,
          rootMargin: '200px 0px 200px 0px',
          threshold: 0.01,
        },
      )
      // Initial scan + re-scan on feed changes.
      void nextTick(() => rescanAndObserve())
    })
    watch(
      // Re-scan when feed rows or their parent chains change; avoid referencing displayItems here (TDZ during setup).
      () => posts.value.map((p) => `${p.id}:${p.parentId ?? ''}:${p.parent?.id ?? ''}`).join('|'),
      () => void nextTick(() => {
        rescanAndObserve()
        refreshVisibleChainSubscriptions()
      }),
    )
    onBeforeUnmount(() => {
      postObserver?.disconnect()
      postObserver = null
      if (unsubscribeTimer) clearTimeout(unsubscribeTimer)
      unsubscribeTimer = null
      const ids = uniqueIds([...pendingUnsub, ...subscribedIdsByVisibleRowId.values()].flat())
      if (ids.length) unsubscribePosts(ids)
      pendingUnsub.clear()
      subscribedIdsByVisibleRowId.clear()
    })
  }

  return { subscribePostIds, notifyVisibleRowIds }
}
