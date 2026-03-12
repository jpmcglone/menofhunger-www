import type { ArticleComment } from '~/types/api'

export function useArticleComments(articleId: Ref<string>) {
  const { apiFetch, apiFetchData } = useApiClient()

  const comments = ref<ArticleComment[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const submitting = ref(false)
  const loadingRepliesByParent = ref<Record<string, boolean>>({})

  async function load() {
    loading.value = true
    try {
      const res = await apiFetch<ArticleComment[]>(`/articles/${articleId.value}/comments?limit=20`)
      comments.value = res.data ?? []
      nextCursor.value = res.pagination?.nextCursor ?? null
    } catch {
      // silent
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (!nextCursor.value) return
    try {
      const res = await apiFetch<ArticleComment[]>(`/articles/${articleId.value}/comments?limit=20&cursor=${nextCursor.value}`)
      comments.value.push(...(res.data ?? []))
      nextCursor.value = res.pagination?.nextCursor ?? null
    } catch {
      // silent
    }
  }

  async function loadMoreReplies(parentId: string) {
    const parent = comments.value.find((c) => c.id === parentId)
    if (!parent) return
    const loaded = parent.replies?.length ?? 0
    const total = parent.replyCount ?? 0
    if (loaded >= total) return
    if (loadingRepliesByParent.value[parentId]) return

    loadingRepliesByParent.value = { ...loadingRepliesByParent.value, [parentId]: true }
    const cursor = parent.replies?.[loaded - 1]?.id
    const params = new URLSearchParams({ limit: '20' })
    if (cursor) params.set('cursor', cursor)
    try {
      const res = await apiFetch<ArticleComment[]>(
        `/articles/${articleId.value}/comments/${parentId}/replies?${params.toString()}`,
      )
      const incoming = res.data ?? []
      if (incoming.length > 0) {
        const existing = new Map((parent.replies ?? []).map((r) => [r.id, r]))
        for (const reply of incoming) existing.set(reply.id, reply)
        parent.replies = Array.from(existing.values())
      }
    } catch {
      // silent: inline pager is best-effort
    } finally {
      loadingRepliesByParent.value = { ...loadingRepliesByParent.value, [parentId]: false }
    }
  }

  function isLoadingReplies(parentId: string): boolean {
    return Boolean(loadingRepliesByParent.value[parentId])
  }

  async function createComment(body: string, parentId?: string | null) {
    submitting.value = true
    try {
      const comment = await apiFetchData<ArticleComment>(`/articles/${articleId.value}/comments`, {
        method: 'POST',
        body: { body, ...(parentId ? { parentId } : {}) },
      })
      if (parentId) {
        const parent = comments.value.find((c) => c.id === parentId)
        if (parent) {
          const existingIdx = (parent.replies ?? []).findIndex((r) => r.id === comment.id)
          if (existingIdx >= 0) {
            // WS event arrived first — overwrite with authoritative response
            parent.replies!.splice(existingIdx, 1, comment)
          } else {
            parent.replies = [...(parent.replies ?? []), comment]
            parent.replyCount = (parent.replyCount ?? 0) + 1
          }
        }
      } else {
        const existingIdx = comments.value.findIndex((c) => c.id === comment.id)
        if (existingIdx >= 0) {
          // WS event arrived first — overwrite with authoritative response
          comments.value.splice(existingIdx, 1, comment)
        } else {
          comments.value.unshift(comment)
        }
      }
      return comment
    } finally {
      submitting.value = false
    }
  }

  async function deleteComment(commentId: string, parentId?: string | null) {
    await apiFetchData(`/articles/comments/${commentId}`, { method: 'DELETE' })
    if (parentId) {
      const parent = comments.value.find((c) => c.id === parentId)
      if (parent) {
        parent.replies = (parent.replies ?? []).filter((r) => r.id !== commentId)
        parent.replyCount = Math.max(0, (parent.replyCount ?? 1) - 1)
      }
    } else {
      comments.value = comments.value.filter((c) => c.id !== commentId)
    }
  }

  return {
    comments,
    nextCursor,
    loading,
    submitting,
    load,
    loadMore,
    loadMoreReplies,
    isLoadingReplies,
    createComment,
    deleteComment,
  }
}
