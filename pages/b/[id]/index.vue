<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=890-4575 -->
<template>
  <AppPageContent bottom="standard">
    <div class="flex items-center gap-3 moh-gutter-x pt-3 pb-2">
      <NuxtLink to="/b" class="moh-tap moh-focus inline-flex size-11 items-center justify-center rounded-full moh-surface-hover" aria-label="Back to the Board">
        <AppIconGlyph name="back" :size="20" />
      </NuxtLink>
      <span class="text-lg font-bold moh-text">Board</span>
    </div>

    <div v-if="pending && !thread" class="py-16 text-center moh-meta">Loading…</div>
    <div v-else-if="error || !thread" class="moh-gutter-x py-16 text-center">
      <p class="moh-body">This thread isn’t available.</p>
      <NuxtLink to="/b" class="mt-2 inline-block text-sm hover:underline" style="color: var(--moh-verified)">Back to the Board</NuxtLink>
    </div>

    <template v-else>
      <AppBoardThreadHead :thread="thread" @updated="onThreadUpdated" @deleted="onThreadDeleted" />

      <template v-if="thread.viewerCanAccess">
        <div v-if="thread.articleId" class="moh-gutter-x border-t moh-border py-4 text-sm moh-text-muted">
          Discussion for this article lives with the article.
          <NuxtLink :to="`/a/${thread.articleId}#comments`" class="font-semibold hover:underline" style="color: var(--moh-verified)">Read and comment →</NuxtLink>
        </div>
        <template v-else>
          <div class="moh-gutter-x border-y moh-border py-2.5">
            <AppBoardCommentComposer :thread-id="thread.id" :autofocus="wantsReply" @created="onCreated" />
          </div>
          <div class="flex items-center gap-1.5 moh-gutter-x pt-3 pb-1 text-xs moh-text-soft">
            <h2 class="text-sm font-semibold moh-text">{{ commentCountLabel }}</h2>
            <template v-for="option in commentSortOptions" :key="option.key">
              <span aria-hidden="true">·</span>
              <button
                type="button"
                class="moh-tap moh-focus min-h-9 hover:text-[var(--moh-text)]"
                :class="commentSort === option.key ? 'font-semibold moh-text' : ''"
                :aria-pressed="commentSort === option.key"
                @click="setCommentSort(option.key)"
              >{{ option.label }}</button>
            </template>
          </div>
          <div class="pb-6">
            <AppBoardCommentRow v-for="c in comments" :key="c.id" :comment="c" :depth="0" />
            <p v-if="!comments.length && !commentsPending" class="moh-gutter-x py-10 text-center moh-meta">No comments yet. Start the conversation.</p>
          </div>
        </template>
      </template>
    </template>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { BoardComment, BoardThread, FeedPost } from '~/types/api'

definePageMeta({ layout: 'app', title: 'Board', hideTopBar: true })

const route = useRoute()
const api = useBoardApi()
const threadId = computed(() => String(route.params.id ?? ''))
const commentSort = ref<'top' | 'new'>(route.query.sort === 'new' ? 'new' : 'top')
const commentSortOptions = [
  { key: 'top', label: 'Top' },
  { key: 'new', label: 'New' },
] as const
const wantsReply = computed(() => route.query.reply === '1')

const { data: thread, pending, error, refresh: refreshThread } = await useAsyncData(
  () => `board-thread-${threadId.value}`,
  () => api.getThread(threadId.value),
  { watch: [threadId] },
)
const { data: commentsPage, pending: commentsPending, refresh: refreshComments } = await useAsyncData(
  () => `board-thread-comments-${threadId.value}-${commentSort.value}`,
  () => api.listComments(threadId.value, commentSort.value),
  { watch: [threadId, commentSort] },
)

const comments = ref<BoardComment[]>(commentsPage.value?.comments ?? [])
watch(commentsPage, (page) => { comments.value = page?.comments ?? [] })

const tree = useBoardCommentTree(comments)
provide(BOARD_COMMENT_TREE_KEY, {
  threadId,
  canReply: computed(() => Boolean(thread.value?.viewerCanAccess && !thread.value?.articleId)),
  maxDepth: 8,
  highlightId: ref(null),
  add: (c) => {
    tree.add(c)
    if (thread.value) thread.value = { ...thread.value, commentCount: thread.value.commentCount + 1 }
  },
  remove: (id) => {
    tree.remove(id)
    if (thread.value) thread.value = { ...thread.value, commentCount: Math.max(0, thread.value.commentCount - 1) }
  },
})

const commentCountLabel = computed(() => {
  const n = thread.value?.commentCount ?? 0
  return `${n} ${n === 1 ? 'comment' : 'comments'}`
})

function setCommentSort(next: 'top' | 'new') {
  commentSort.value = next
  const { sort: _s, ...rest } = route.query
  void navigateTo({ path: route.path, query: next === 'new' ? { ...rest, sort: 'new' } : rest }, { replace: true })
}

function onCreated(created: BoardComment) {
  tree.add(created)
  if (thread.value) thread.value = { ...thread.value, commentCount: thread.value.commentCount + 1 }
}

function onThreadUpdated(next: BoardThread) {
  thread.value = next
}

function onThreadDeleted() {
  void navigateTo('/b')
}

useBoardThreadSeo(thread)

// Realtime: the API mirrors every nested comment to the thread root room.
const { addPostsCallback, removePostsCallback, subscribePosts, unsubscribePosts } = usePresence()
function toBoardComment(post: FeedPost): BoardComment {
  return {
    id: post.id,
    threadId: threadId.value,
    parentId: post.parentId && post.parentId !== threadId.value ? post.parentId : null,
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
const postsCb = {
  onCommentAdded: (payload: { parentPostId: string; comment: FeedPost }) => {
    if (!thread.value?.viewerCanAccess) return
    if (payload.comment.boardRootId && payload.comment.boardRootId !== threadId.value) return
    tree.add(toBoardComment(payload.comment))
  },
  onCommentDeleted: (payload: { commentId: string }) => tree.remove(payload.commentId),
  onLiveUpdated: (payload: { postId: string; reason?: string; patch: { commentCount?: number; deletedAt?: string | null } }) => {
    if (payload.postId !== threadId.value || !thread.value) return
    if (payload.patch.deletedAt) return onThreadDeleted()
    if (typeof payload.patch.commentCount === 'number') thread.value = { ...thread.value, commentCount: payload.patch.commentCount }
    if (payload.reason === 'post_edited') void refreshThread()
  },
}

onMounted(() => {
  addPostsCallback(postsCb as never)
  if (threadId.value) subscribePosts([threadId.value])
})
watch(threadId, (next, prev) => {
  if (prev) unsubscribePosts([prev])
  if (next) subscribePosts([next])
})
let activatedOnce = false
onActivated(() => {
  if (!activatedOnce) {
    activatedOnce = true
    return
  }
  void refreshThread()
  void refreshComments()
})
onBeforeUnmount(() => {
  removePostsCallback(postsCb as never)
  if (threadId.value) unsubscribePosts([threadId.value])
})
</script>
