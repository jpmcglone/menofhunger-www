import type { Ref } from 'vue'
import type { ApiPagination, FeedPost, GetPostCommentsData } from '~/types/api'

export function usePostComments(options: {
  postId: Ref<string>
  post: Ref<{ id: string; visibility?: string; commentCount?: number } | null>
  isOnlyMe: Ref<boolean>
}) {
  const { postId, post, isOnlyMe } = options
  const { apiFetch } = useApiClient()
  const { clearBumpsForPostIds } = usePostCountBumps()

  const comments = ref<FeedPost[]>([])
  const commentsNextCursor = ref<string | null>(null)
  const commentsLoading = ref(false)
  const commentsCounts = ref<ApiPagination['counts']>(null)

  const commentsSort = useCookie<'new' | 'trending'>('moh.post.comments.sort.v1', {
    default: () => 'new',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  const commentCountDisplay = computed(() => {
    const c = commentsCounts.value
    return c ? c.all : (post.value?.commentCount ?? 0)
  })

  async function fetchComments(cursor: string | null = null) {
    if (!post.value?.id || isOnlyMe.value) return
    if (cursor === null) commentsLoading.value = true
    try {
      const params = new URLSearchParams({
        limit: '30',
        visibility: 'all',
        sort: commentsSort.value,
      })
      if (cursor) params.set('cursor', cursor)
      const res = await apiFetch<GetPostCommentsData>(
        `/posts/${encodeURIComponent(post.value.id)}/comments?${params.toString()}`,
        { method: 'GET' }
      )
      const list = res.data ?? []
      if (cursor === null) {
        comments.value = list
      } else {
        comments.value = [...comments.value, ...list]
      }
      commentsNextCursor.value = res.pagination?.nextCursor ?? null
      commentsCounts.value = res.pagination?.counts ?? null
      // Server data is now authoritative for these reply rows — drop any optimistic
      // commentCount bumps so PostRow doesn't display a doubled count.
      const ids = list.map((c) => c.id).filter(Boolean)
      if (ids.length) clearBumpsForPostIds(ids)
    } catch {
      if (cursor === null) comments.value = []
      commentsNextCursor.value = null
    } finally {
      commentsLoading.value = false
    }
  }

  function loadMoreComments() {
    if (!commentsNextCursor.value || commentsLoading.value) return
    void fetchComments(commentsNextCursor.value)
  }

  async function onCommentsSortChange(next: 'new' | 'trending') {
    commentsSort.value = next
    commentsNextCursor.value = null
    await fetchComments(null)
  }

  async function onCommentsFilterReset() {
    commentsSort.value = 'new'
    commentsNextCursor.value = null
    await fetchComments(null)
  }

  // List-only: remove the reply row for instant feedback. The displayed count is
  // authoritative-only — the server emits `posts:liveUpdated` (reason
  // `comment_deleted`) carrying the post-decrement count to this post's room, and
  // the permalink page reconciles `commentsCounts.all` from it. Decrementing here
  // too would double-decrement when the WS patch and the local `@deleted` event
  // race (e.g. 5 → 4 from WS, then 4 → 3 locally).
  function onCommentDeleted(commentId: string) {
    comments.value = comments.value.filter((c) => c.id !== commentId)
  }

  // List-only: insert (or upsert, deduping by id) a reply row. This is called by
  // BOTH the commenter's HTTP response (onReplyPosted) and the WS `commentAdded`
  // echo; deduping by id makes whichever arrives second a no-op.
  //
  // The reply COUNT is intentionally NOT mutated here. It is authoritative-only:
  // the server emits `posts:liveUpdated` with the absolute post-increment count to
  // this post's room (which the permalink page subscribes to), and that is the
  // single source of truth for `commentsCounts.all`. Bumping here as well used to
  // double-count (0 → 2) whenever the WS patch landed before the HTTP handler.
  function prependComment(newPost: FeedPost) {
    const existingIdx = comments.value.findIndex((c) => c.id === newPost.id)
    if (existingIdx >= 0) {
      // Realtime/fetch may have inserted this comment already; upsert in place.
      comments.value.splice(existingIdx, 1, newPost)
      return
    }
    comments.value = [newPost, ...comments.value]
  }

  watch(
    () => [post.value?.id, isOnlyMe.value] as const,
    ([id, onlyMe]) => {
      if (id && !onlyMe) {
        void fetchComments(null)
      } else {
        comments.value = []
        commentsNextCursor.value = null
        commentsCounts.value = null
      }
    },
    { immediate: true }
  )

  return {
    comments,
    commentsNextCursor,
    commentsLoading,
    commentsCounts,
    commentsSort,
    commentCountDisplay,
    fetchComments,
    loadMoreComments,
    onCommentsSortChange,
    onCommentsFilterReset,
    onCommentDeleted,
    prependComment,
  }
}
