import type { FeedPost } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'

export function useDraftPosts() {
  const feed = useCursorFeed<FeedPost>({
    stateKey: 'drafts',
    buildRequest: (cursor) => ({
      path: '/drafts',
      query: { limit: 30, ...(cursor ? { cursor } : {}) },
    }),
    defaultErrorMessage: 'Failed to load drafts.',
    loadMoreErrorMessage: 'Failed to load more drafts.',
  })

  const drafts = feed.items
  const { nextCursor, loading, error, refresh, loadMore } = feed

  function removeDraft(id: string) {
    const pid = (id ?? '').trim()
    if (!pid) return
    drafts.value = drafts.value.filter((p) => p.id !== pid)
  }

  function prependDraft(post: FeedPost) {
    if (!post?.id) return
    drafts.value = [post, ...drafts.value]
  }

  function upsertDraft(next: FeedPost) {
    const id = (next?.id ?? '').trim()
    if (!id) return
    const idx = drafts.value.findIndex((p) => p.id === id)
    if (idx < 0) {
      prependDraft(next)
      return
    }
    drafts.value = drafts.value.map((p, i) => (i === idx ? next : p))
  }

  return { drafts, nextCursor, loading, error, refresh, loadMore, removeDraft, prependDraft, upsertDraft }
}

