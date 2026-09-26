<template>
  <AppPageContent bottom="standard">
    <div class="flex items-center gap-3 moh-gutter-x pt-3 pb-2">
      <NuxtLink :to="threadHref" class="moh-tap moh-focus inline-flex size-11 items-center justify-center rounded-full moh-surface-hover" aria-label="Back to post">
        <AppIconGlyph name="back" :size="20" />
      </NuxtLink>
      <span class="text-lg font-bold moh-text">Comment</span>
      <AppBoardCatchUpButton v-if="ctxData?.comment && ctxData.thread.viewerCanAccess" class="ml-auto" :post-id="ctxData.comment.id" />
    </div>

    <div v-if="pending && !ctxData" class="flex min-h-[240px] items-center justify-center"><AppLogoLoader /></div>
    <div v-else-if="error || !ctxData" class="moh-gutter-x py-16 text-center">
      <p class="moh-body">This comment isn’t available.</p>
      <NuxtLink to="/b" class="mt-2 inline-block text-sm hover:underline" style="color: var(--moh-verified)">Back to the Board</NuxtLink>
    </div>

    <div v-else class="relative">
      <AppRefreshIndicator :loading="pending" />
      <div class="moh-gutter-x flex flex-wrap items-center gap-x-1.5 pb-2 text-xs moh-text-soft">
        <span>on:</span>
        <NuxtLink :to="threadHref" class="font-medium hover:underline" style="color: var(--moh-verified)">{{ ctxData.thread.title }}</NuxtLink>
        <template v-if="parentComment">
          <span aria-hidden="true">·</span>
          <NuxtLink :to="boardCommentHref(ctxData.thread.id, parentComment.id)" class="hover:underline">parent</NuxtLink>
        </template>
        <template v-if="ctxData.ancestors.length > 1">
          <span aria-hidden="true">·</span>
          <NuxtLink :to="boardCommentHref(ctxData.thread.id, ctxData.ancestors[0]!.id)" class="hover:underline">root</NuxtLink>
        </template>
        <span aria-hidden="true">·</span>
        <NuxtLink :to="threadHref" class="hover:underline">full post</NuxtLink>
      </div>

      <AppBoardThreadHead v-if="!ctxData.thread.viewerCanAccess" :thread="ctxData.thread" />

      <div v-else class="relative border-t moh-border pb-6">
        <div v-if="ctxData.ancestors.length" class="border-b moh-border pb-1 opacity-80">
          <AppBoardCommentRow v-for="a in ctxData.ancestors" :key="a.id" :comment="a" :depth="0" />
        </div>
        <div v-if="live.pending.value.length" class="pointer-events-none sticky top-2 z-20 flex h-0 justify-center overflow-visible">
          <AppFeedNewPostsPill
            class="pointer-events-auto"
            :authors="live.pendingAuthors.value"
            :count="live.pending.value.length"
            :label="`${live.pending.value.length} new ${live.pending.value.length === 1 ? 'reply' : 'replies'}`"
            icon="tabler:message-circle"
            @reveal="revealPending"
          />
        </div>
        <AppBoardCommentRow v-for="c in comments" :key="c.id" :comment="c" :depth="0" />
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { BoardComment } from '~/types/api'

definePageMeta({ layout: 'app', title: 'Board', hideTopBar: true })

const route = useRoute()
const api = useBoardApi()
const threadId = computed(() => String(route.params.id ?? ''))
const commentId = computed(() => String(route.params.commentId ?? ''))

const { data: ctxData, pending, error, refresh } = await useAsyncData(
  () => `board-comment-${commentId.value}`,
  () => api.getCommentContext(commentId.value),
  { watch: [commentId] },
)

const threadHref = computed(() => boardThreadHref({ id: ctxData.value?.thread.id ?? threadId.value }))
const parentComment = computed(() => ctxData.value?.ancestors[ctxData.value.ancestors.length - 1] ?? null)
const comments = ref<BoardComment[]>(ctxData.value?.comment ? [ctxData.value.comment] : [])
watch(ctxData, (next) => { comments.value = next?.comment ? [next.comment] : [] })

const rootParentId = computed(() => ctxData.value?.comment?.parentId ?? null)
const liveThreadId = computed(() => ctxData.value?.thread.id ?? threadId.value)
const tree = useBoardCommentTree(comments, rootParentId)
const live = useBoardThreadLive({
  threadId: liveThreadId,
  tree,
  rootParentId,
  canAccess: computed(() => Boolean(ctxData.value?.thread.viewerCanAccess)),
  onThreadPatch: (payload) => {
    if (payload.patch.deletedAt) void navigateTo('/b')
  },
})
provide(BOARD_COMMENT_TREE_KEY, {
  threadId: liveThreadId,
  canReply: computed(() => Boolean(ctxData.value?.thread.viewerCanAccess && !ctxData.value.thread.articleId)),
  maxDepth: 8,
  highlightId: commentId,
  add: tree.add,
  remove: tree.remove,
  freshIds: live.freshIds,
  typingFor: live.typingFor,
  notifyTyping: live.notifyTyping,
  stopTyping: live.stopTyping,
})

function revealPending() {
  const firstId = live.reveal()
  if (!firstId) return
  nextTick(() => document.getElementById(`c-${firstId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
}

useBoardThreadSeo(computed(() => ctxData.value?.thread), computed(() => ctxData.value?.comment))

// Opening a comment permalink counts a view of that comment, like a post permalink.
const { markEngaged } = usePostViewTracker()
watch(
  () => (ctxData.value?.thread.viewerCanAccess ? ctxData.value.comment?.id ?? null : null),
  (id) => { if (id && import.meta.client) markEngaged(id) },
  { immediate: true },
)

const { isAuthed } = useAuth()
const { markReadBySubject } = useNotifications()
function markThreadRead() {
  const thread = ctxData.value?.thread
  if (thread?.viewerCanAccess && isAuthed.value && import.meta.client) void markReadBySubject({ board_thread_id: thread.id })
}
watch([() => ctxData.value?.thread.id, isAuthed], markThreadRead, { immediate: true })

let activatedOnce = false
onActivated(() => {
  if (!activatedOnce) {
    activatedOnce = true
    return
  }
  markThreadRead()
  void refresh()
})
</script>
