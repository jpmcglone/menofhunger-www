import type { Ref } from 'vue'
import type { Socket } from 'socket.io-client'

const PRESENCE_POST_SUB_REFS_KEY = 'presence-post-sub-refs'
const PRESENCE_ARTICLE_SUB_REFS_KEY = 'presence-article-sub-refs'
const PRESENCE_GROUP_FEED_SUB_REFS_KEY = 'presence-group-feed-sub-refs'

function cleanIds(ids: string[]): string[] {
  return (ids ?? []).map((s) => String(s ?? '').trim()).filter(Boolean)
}

/**
 * Content-room subscriptions (posts, articles, group feeds) with refcounting,
 * so two components subscribing to the same id don't cancel each other when
 * one unmounts. All refs are re-emitted on reconnect via syncContentSubscriptions.
 */
export function usePresenceSubscriptions(socketRef: Ref<Socket | null>) {
  const postSubRefs = useState<Map<string, number>>(PRESENCE_POST_SUB_REFS_KEY, () => new Map())
  const articleSubRefs = useState<Map<string, number>>(PRESENCE_ARTICLE_SUB_REFS_KEY, () => new Map())
  const groupFeedSubRefs = useState<Map<string, number>>(PRESENCE_GROUP_FEED_SUB_REFS_KEY, () => new Map())

  function emitPostsSubscribe(postIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && postIds.length > 0) {
      socket.emit('posts:subscribe', { postIds })
    }
  }

  function emitPostsUnsubscribe(postIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && postIds.length > 0) {
      socket.emit('posts:unsubscribe', { postIds })
    }
  }

  function emitArticlesSubscribe(articleIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && articleIds.length > 0) {
      socket.emit('articles:subscribe', { articleIds })
    }
  }

  function emitArticlesUnsubscribe(articleIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && articleIds.length > 0) {
      socket.emit('articles:unsubscribe', { articleIds })
    }
  }

  function emitGroupsSubscribe(groupIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && groupIds.length > 0) {
      socket.emit('groups:subscribe', { groupIds })
    }
  }

  function emitGroupsUnsubscribe(groupIds: string[]) {
    const socket = socketRef.value
    if (socket?.connected && groupIds.length > 0) {
      socket.emit('groups:unsubscribe', { groupIds })
    }
  }

  function acquire(refs: Map<string, number>, ids: string[]): string[] {
    for (const id of ids) refs.set(id, (refs.get(id) ?? 0) + 1)
    // Re-emitting an already-subscribed id is harmless (server rooms are idempotent).
    return ids
  }

  function release(refs: Map<string, number>, ids: string[]): string[] {
    const dropped: string[] = []
    for (const id of ids) {
      const count = refs.get(id) ?? 0
      if (count <= 1) {
        refs.delete(id)
        dropped.push(id)
      } else {
        refs.set(id, count - 1)
      }
    }
    return dropped
  }

  function subscribePosts(postIds: string[]) {
    if (!import.meta.client) return
    const cleaned = cleanIds(postIds)
    if (cleaned.length === 0) return
    emitPostsSubscribe(acquire(postSubRefs.value, cleaned))
  }

  function unsubscribePosts(postIds: string[]) {
    if (!import.meta.client) return
    const cleaned = cleanIds(postIds)
    if (cleaned.length === 0) return
    emitPostsUnsubscribe(release(postSubRefs.value, cleaned))
  }

  function subscribeArticles(articleIds: string[]) {
    if (!import.meta.client) return
    const cleaned = cleanIds(articleIds)
    if (cleaned.length === 0) return
    emitArticlesSubscribe(acquire(articleSubRefs.value, cleaned))
  }

  function unsubscribeArticles(articleIds: string[]) {
    if (!import.meta.client) return
    const cleaned = cleanIds(articleIds)
    if (cleaned.length === 0) return
    emitArticlesUnsubscribe(release(articleSubRefs.value, cleaned))
  }

  function subscribeGroups(groupIds: string[]) {
    if (!import.meta.client) return
    const cleaned = cleanIds(groupIds)
    if (cleaned.length === 0) return
    emitGroupsSubscribe(acquire(groupFeedSubRefs.value, cleaned))
  }

  function unsubscribeGroups(groupIds: string[]) {
    if (!import.meta.client) return
    const cleaned = cleanIds(groupIds)
    if (cleaned.length === 0) return
    emitGroupsUnsubscribe(release(groupFeedSubRefs.value, cleaned))
  }

  /** Re-emit all live content subscriptions after (re)connect. */
  function syncContentSubscriptions() {
    if (articleSubRefs.value.size > 0) emitArticlesSubscribe([...articleSubRefs.value.keys()])
    if (postSubRefs.value.size > 0) emitPostsSubscribe([...postSubRefs.value.keys()])
    if (groupFeedSubRefs.value.size > 0) emitGroupsSubscribe([...groupFeedSubRefs.value.keys()])
  }

  return {
    subscribePosts,
    unsubscribePosts,
    subscribeArticles,
    unsubscribeArticles,
    subscribeGroups,
    unsubscribeGroups,
    syncContentSubscriptions,
  }
}
