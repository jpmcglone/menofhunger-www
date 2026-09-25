import type {
  BoardComment,
  BoardCommentContext,
  BoardCommentsPage,
  BoardPreferences,
  BoardRange,
  BoardTag,
  BoardThread,
  BoardVisibility,
} from '~/types/api'

export type BoardListQuery = {
  sort?: 'top' | 'new'
  range?: BoardRange | null
  visibility?: 'all' | BoardVisibility
  tags?: string[]
  domain?: string | null
  q?: string | null
  author?: string | null
  limit?: number
  cursor?: string | null
}

export type BoardCreateThreadBody = {
  title: string
  url: string | null
  body: string | null
  image: { r2Key: string; width: number | null; height: number | null; alt: string | null } | null
  tags: string[]
  visibility: BoardVisibility
  showInFeed: boolean
}

function clean<T extends Record<string, unknown>>(query: T): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',')
      continue
    }
    out[key] = value as string | number
  }
  return out
}

/** Thin client for the Board API. Boosts, bookmarks, and reports use the regular post endpoints. */
export function useBoardApi() {
  const { apiFetch, apiFetchData } = useApiClient()

  return {
    async listThreads(query: BoardListQuery) {
      const res = await apiFetch<BoardThread[]>('/board/threads', { query: clean(query) })
      return { threads: res.data, nextCursor: res.pagination?.nextCursor ?? null }
    },
    getThread: (id: string) => apiFetchData<BoardThread>(`/board/threads/${encodeURIComponent(id)}`),
    listComments: (id: string, sort: 'top' | 'new' = 'top') =>
      apiFetchData<BoardCommentsPage>(`/board/threads/${encodeURIComponent(id)}/comments`, { query: { sort } }),
    getCommentContext: (id: string) => apiFetchData<BoardCommentContext>(`/board/comments/${encodeURIComponent(id)}`),
    async listLatestComments(query: { author?: string | null; cursor?: string | null; limit?: number }) {
      const res = await apiFetch<BoardComment[]>('/board/comments', { query: clean(query) })
      return { comments: res.data, nextCursor: res.pagination?.nextCursor ?? null }
    },
    createThread: (body: BoardCreateThreadBody) =>
      apiFetchData<BoardThread>('/board/threads', { method: 'POST', body }),
    updateThread: (id: string, body: Partial<Pick<BoardCreateThreadBody, 'title' | 'url' | 'tags'>> & { body?: string }) =>
      apiFetchData<BoardThread>(`/board/threads/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    deleteThread: (id: string) => apiFetchData<{ success: true }>(`/board/threads/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createComment: (threadId: string, body: string, parentId: string | null) =>
      apiFetchData<BoardComment>(`/board/threads/${encodeURIComponent(threadId)}/comments`, {
        method: 'POST',
        body: { body, parentId },
      }),
    deleteComment: (id: string) => apiFetchData<{ success: true }>(`/board/comments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    setHidden: (id: string, hidden: boolean) =>
      apiFetchData<{ hidden: boolean }>(`/board/threads/${encodeURIComponent(id)}/hide`, { method: hidden ? 'POST' : 'DELETE' }),
    listTags: (q: string) => apiFetchData<BoardTag[]>('/board/tags', { query: clean({ q, limit: 10 }) }),
    findDuplicate: (url: string) => apiFetchData<BoardThread | null>('/board/duplicate', { query: { url } }),
    getPreferences: () => apiFetchData<BoardPreferences>('/board/preferences'),
    updatePreferences: (body: Partial<BoardPreferences>) =>
      apiFetchData<BoardPreferences>('/board/preferences', { method: 'PATCH', body }),
  }
}

/** Where a thread's primary link goes: its URL when readable, the thread page otherwise. */
export function boardThreadHref(thread: Pick<BoardThread, 'id'>): string {
  return `/b/${encodeURIComponent(thread.id)}`
}

export function boardCommentHref(threadId: string, commentId: string): string {
  return `/b/${encodeURIComponent(threadId)}/c/${encodeURIComponent(commentId)}`
}

/** Discussion link: article-sourced threads keep their comments on the article. */
export function boardDiscussionHref(thread: Pick<BoardThread, 'id' | 'articleId'>): string {
  return thread.articleId ? `/a/${encodeURIComponent(thread.articleId)}#comments` : boardThreadHref(thread)
}

/** Name and handle both render only when they differ; otherwise the username shows once. */
export function authorHasDistinctName(author: { name?: string | null; username?: string | null } | null | undefined): boolean {
  const name = author?.name?.trim()
  if (!name) return false
  return name.toLowerCase() !== (author?.username ?? '').trim().toLowerCase()
}

export function boardScopeTone(visibility: string | null | undefined): 'verified' | 'premium' | null {
  if (visibility === 'premiumOnly') return 'premium'
  if (visibility === 'verifiedOnly') return 'verified'
  return null
}
