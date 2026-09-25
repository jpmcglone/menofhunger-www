import type { InjectionKey, Ref } from 'vue'
import type { BoardComment } from '~/types/api'

export type BoardCommentTreeContext = {
  threadId: Ref<string>
  canReply: Ref<boolean>
  maxDepth: number
  highlightId: Ref<string | null>
  add: (comment: BoardComment) => void
  remove: (commentId: string) => void
}

export const BOARD_COMMENT_TREE_KEY: InjectionKey<BoardCommentTreeContext> = Symbol('board-comment-tree')

function findIn(list: BoardComment[], id: string): BoardComment | null {
  for (const c of list) {
    if (c.id === id) return c
    const hit = findIn(c.replies, id)
    if (hit) return hit
  }
  return null
}

export function countBoardReplies(comment: BoardComment): number {
  return comment.replies.reduce((n, r) => n + 1 + countBoardReplies(r), 0)
}

/**
 * Local comment tree with idempotent insert/remove, shared by the thread and permalink pages.
 * `rootParentId` is the comment the tree hangs from (null for the whole thread).
 */
export function useBoardCommentTree(comments: Ref<BoardComment[]>, rootParentId: Ref<string | null> = ref(null)) {
  function add(comment: BoardComment) {
    if (findIn(comments.value, comment.id)) return
    const parentKey = comment.parentId
    if (parentKey === rootParentId.value || (!parentKey && !rootParentId.value)) {
      comments.value = [{ ...comment, replies: comment.replies ?? [] }, ...comments.value]
      return
    }
    const parent = parentKey ? findIn(comments.value, parentKey) : null
    if (!parent) return
    parent.replies = [...parent.replies, { ...comment, depth: parent.depth + 1, replies: comment.replies ?? [] }]
    parent.replyCount = (parent.replyCount ?? 0) + 1
  }

  function remove(commentId: string) {
    const hit = findIn(comments.value, commentId)
    if (!hit) return
    if (hit.replies.length) {
      hit.deleted = true
      hit.body = ''
      return
    }
    const strip = (list: BoardComment[]): BoardComment[] =>
      list.filter((c) => c.id !== commentId).map((c) => ({ ...c, replies: strip(c.replies) }))
    comments.value = strip(comments.value)
  }

  return { add, remove, find: (id: string) => findIn(comments.value, id) }
}
