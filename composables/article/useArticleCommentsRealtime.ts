import type { Ref } from 'vue'
import type { ArticleComment } from '~/types/api'
import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'

/** Live comment add / delete / edit / reaction patches for one article's comment thread. */
export function useArticleCommentsRealtime(props: { articleId: string }, comments: Ref<ArticleComment[]>) {
  // ─── Realtime ───────────────────────────────────────────────────────────────

  function findComment(commentId: string): ArticleComment | undefined {
    for (const c of comments.value) {
      if (c.id === commentId) return c
      const reply = c.replies?.find((r) => r.id === commentId)
      if (reply) return reply
    }
  }

  const articlesCallback = {
    onCommentAdded(payload: { articleId: string; comment: ArticleComment }) {
      if (payload.articleId !== props.articleId) return
      const incoming = payload.comment
      if (incoming.parentId) {
        const parent = comments.value.find((c) => c.id === incoming.parentId)
        if (parent) {
          const existingIdx = (parent.replies ?? []).findIndex((r) => r.id === incoming.id)
          if (existingIdx >= 0) {
            parent.replies!.splice(existingIdx, 1, incoming)
          } else {
            parent.replies = [...(parent.replies ?? []), incoming]
            parent.replyCount = (parent.replyCount ?? 0) + 1
          }
        }
      } else {
        const existingIdx = comments.value.findIndex((c) => c.id === incoming.id)
        if (existingIdx >= 0) {
          comments.value.splice(existingIdx, 1, incoming)
        } else {
          comments.value = [incoming, ...comments.value]
        }
      }
    },

    onCommentDeleted(payload: { articleId: string; commentId: string; parentId: string | null }) {
      if (payload.articleId !== props.articleId) return
      if (payload.parentId) {
        const parent = comments.value.find((c) => c.id === payload.parentId)
        if (parent) {
          const had = parent.replies?.some((r) => r.id === payload.commentId)
          if (had) {
            parent.replies = (parent.replies ?? []).filter((r) => r.id !== payload.commentId)
            parent.replyCount = Math.max(0, (parent.replyCount ?? 1) - 1)
          }
        }
      } else {
        const had = comments.value.some((c) => c.id === payload.commentId)
        if (had) {
          comments.value = comments.value.filter((c) => c.id !== payload.commentId)
        }
      }
    },

    onCommentUpdated(payload: { articleId: string; comment: ArticleComment }) {
      if (payload.articleId !== props.articleId) return
      const target = findComment(payload.comment.id)
      if (target) {
        target.body = payload.comment.body
        target.editedAt = payload.comment.editedAt
      }
    },

    onCommentReactionChanged(payload: { articleId: string; commentId: string; reactions: ArticleComment['reactions'] }) {
      if (payload.articleId !== props.articleId) return
      const target = findComment(payload.commentId)
      if (target) {
        target.reactions = payload.reactions
      }
    },
  }

  usePresenceCallback('Articles', articlesCallback)

  return {
  }
}
