import type { Ref } from 'vue'
import type { BoardComment, FeedPost, WsPostsCommentAddedPayload, WsPostsLiveUpdatedPayload } from '~/types/api'
import type { ReplyAuthorPreview } from '~/utils/thread-reply-authors'

const MAX_PENDING = 100
const FRESH_HIGHLIGHT_MS = 4000

type Tree = {
  add: (comment: BoardComment) => void
  remove: (commentId: string) => void
  find: (id: string) => BoardComment | null
}

/** Socket reply DTO → Board comment row. The API mirrors every nested comment to the root room. */
export function boardCommentFromFeedPost(post: FeedPost, threadId: string): BoardComment {
  return {
    id: post.id,
    threadId,
    parentId: post.parentId && post.parentId !== threadId ? post.parentId : null,
    depth: 0,
    body: post.body,
    author: post.author as BoardComment['author'],
    mentions: (post.mentions ?? []) as BoardComment['mentions'],
    createdAt: post.createdAt,
    deleted: false,
    points: post.boostCount ?? 0,
    replyCount: 0,
    viewerHasBoosted: false,
    replies: [],
  }
}

/**
 * Realtime for a Board thread (or a comment permalink inside one), all over the thread root room:
 * - other people's new comments wait in `pending` behind a "N new comments" pill so nothing
 *   moves under the reader; `reveal()` inserts them and briefly highlights them;
 * - your own comments from another tab or device land immediately;
 * - deletes apply in place; thread edits, deletes, and counts go to `onThreadPatch`;
 * - "X is replying" presence, per comment (`typingFor(id)`) or top-level (`typingFor(null)`).
 */
export function useBoardThreadLive(options: {
  threadId: Ref<string>
  tree: Tree
  /** Set on a comment permalink (the focused comment's parent); omit for the whole thread. */
  rootParentId?: Ref<string | null>
  canAccess: Ref<boolean>
  onThreadPatch?: (payload: WsPostsLiveUpdatedPayload) => void
}) {
  const { user } = useAuth()
  const { addPostsCallback, removePostsCallback } = usePresence()
  const typing = usePostTyping(options.threadId)

  const pending = ref<BoardComment[]>([])
  const freshIds = ref<Set<string>>(new Set())
  let freshTimer: ReturnType<typeof setTimeout> | null = null

  const pendingAuthors = computed<ReplyAuthorPreview[]>(() => {
    const seen = new Set<string>()
    const out: ReplyAuthorPreview[] = []
    for (const c of pending.value) {
      if (seen.has(c.author.id)) continue
      seen.add(c.author.id)
      out.push(c.author as ReplyAuthorPreview)
      if (out.length >= 3) break
    }
    return out
  })

  /** Would this comment render in this view once revealed (its parent is here or pending)? */
  function belongsHere(comment: BoardComment): boolean {
    // A comment permalink shows one subtree: only replies to something already on screen count.
    if (!comment.parentId) return options.rootParentId === undefined
    return Boolean(options.tree.find(comment.parentId) || pending.value.some((p) => p.id === comment.parentId))
  }

  function receive(comment: BoardComment) {
    if (options.tree.find(comment.id) || pending.value.some((p) => p.id === comment.id)) return
    if (!belongsHere(comment)) return
    if (comment.author.id === user.value?.id) {
      options.tree.add(comment)
      return
    }
    if (pending.value.length < MAX_PENDING) pending.value = [...pending.value, comment]
  }

  function reveal(): string | null {
    const batch = [...pending.value].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    pending.value = []
    for (const c of batch) options.tree.add(c)
    freshIds.value = new Set(batch.map((c) => c.id))
    if (freshTimer) clearTimeout(freshTimer)
    freshTimer = setTimeout(() => { freshIds.value = new Set() }, FRESH_HIGHLIGHT_MS)
    // The newest top-level comment sits first; otherwise the earliest nested arrival.
    const first = [...batch].reverse().find((c) => !c.parentId) ?? batch[0]
    return first?.id ?? null
  }

  function clearPending() {
    pending.value = []
  }

  const postsCb = {
    onCommentAdded: (payload: WsPostsCommentAddedPayload) => {
      if (!options.canAccess.value || !payload?.comment) return
      const tid = options.threadId.value
      const rootId = payload.comment.boardRootId ?? payload.parentPostId
      if (rootId !== tid) return
      receive(boardCommentFromFeedPost(payload.comment, tid))
    },
    onCommentDeleted: (payload: { commentId: string }) => {
      if (!payload?.commentId) return
      pending.value = pending.value.filter((p) => p.id !== payload.commentId)
      options.tree.remove(payload.commentId)
    },
    onLiveUpdated: (payload: WsPostsLiveUpdatedPayload) => {
      if (payload?.postId !== options.threadId.value) return
      options.onThreadPatch?.(payload)
    },
  }

  onMounted(() => addPostsCallback(postsCb as never))
  watch(options.threadId, clearPending)
  onBeforeUnmount(() => {
    removePostsCallback(postsCb as never)
    if (freshTimer) clearTimeout(freshTimer)
  })

  return {
    pending,
    pendingAuthors,
    freshIds,
    reveal,
    clearPending,
    typingUsers: typing.typingUsers,
    typingFor: typing.typingUsersFor,
    notifyTyping: (text: string, replyToId: string | null) => typing.notifyTyping(text, { replyToId }),
    stopTyping: typing.stopTyping,
  }
}
