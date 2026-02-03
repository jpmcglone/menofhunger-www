import type { Ref } from 'vue'
import type { ApiPagination, FeedPost, GetPostCommentsData } from '~/types/api'

export function usePostComments(options: {
  postId: Ref<string>
  post: Ref<{ id: string; visibility?: string; commentCount?: number } | null>
  isOnlyMe: Ref<boolean>
}) {
  const { postId, post, isOnlyMe } = options
  const { apiFetch } = useApiClient()

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

  function onCommentDeleted(commentId: string) {
    comments.value = comments.value.filter((c) => c.id !== commentId)
    if (commentsCounts.value) {
      commentsCounts.value = { ...commentsCounts.value, all: Math.max(0, commentsCounts.value.all - 1) }
    }
  }

  function prependComment(newPost: FeedPost) {
    comments.value = [newPost, ...comments.value]
    if (commentsCounts.value) {
      commentsCounts.value = { ...commentsCounts.value, all: commentsCounts.value.all + 1 }
    }
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
