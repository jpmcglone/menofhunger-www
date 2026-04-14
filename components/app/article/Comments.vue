<template>
  <section
    class="mt-8 border-t border-gray-200 pt-6 dark:border-zinc-800"
    :style="{ '--article-accent': accentColor }"
  >
    <h2 class="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
      Comments
      <span v-if="(totalCount ?? 0) > 0" class="ml-1 text-sm font-normal text-gray-500 dark:text-zinc-400">({{ totalCount }})</span>
    </h2>

    <!-- Compose box -->
    <div class="mb-6">
      <template v-if="canComment">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 pt-1">
            <AppUserAvatar v-if="user" :user="user" size-class="h-8 w-8" />
          </div>
          <div class="flex-1 min-w-0">
            <AppArticleCommentTextarea
              ref="composeTextareaEl"
              v-model="newCommentBody"
              placeholder="Write a comment…"
              :maxlength="commentMaxLength"
              :disabled="submitting"
              :priority-users="composePriorityUsers"
              @submit="submitComment"
            />
            <div class="mt-2 flex justify-end">
              <button
                type="button"
                class="rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                :style="{ backgroundColor: accentColor }"
                :disabled="!newCommentBody.trim() || submitting || newCommentBodyOverLimit"
                @click="submitComment"
              >
                {{ submitting ? 'Posting…' : 'Post' }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- CTA: not logged in -->
      <div v-else-if="!isAuthed" class="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
        <Icon name="tabler:message-circle" class="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500" size="20" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Want to join the conversation?</p>
          <div class="mt-2 flex flex-wrap items-center gap-3">
            <NuxtLink
              to="/login"
              class="inline-flex items-center rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
              :style="{ backgroundColor: accentColor }"
            >
              Log in
            </NuxtLink>
            <NuxtLink to="/register" class="text-sm text-gray-500 hover:underline dark:text-zinc-400">
              or create a free account →
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- CTA: logged in but unverified -->
      <div v-else-if="!isVerified && !isPremium" class="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
        <Icon name="tabler:rosette-discount-check" class="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500" size="20" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Want to join the conversation?</p>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">Verification lets you comment and reply on articles.</p>
          <div class="mt-2">
            <NuxtLink
              to="/verification"
              class="inline-flex items-center rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
              :style="{ backgroundColor: accentColor }"
            >
              Get Verified
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- CTA: verified but article is premium-only -->
      <div v-else-if="visibility === 'premiumOnly' && !isPremium" class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-950/30">
        <Icon name="tabler:crown" class="mt-0.5 shrink-0 text-amber-500" size="20" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Want to join the conversation?</p>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">Premium members can comment on all articles.</p>
          <div class="mt-2">
            <NuxtLink
              to="/settings/billing"
              class="inline-flex items-center rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            >
              Upgrade to Premium
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-8">
      <Icon name="tabler:loader-2" class="animate-spin text-gray-400" />
    </div>

    <!-- Comment list -->
    <div v-else class="space-y-6">
      <div v-for="comment in comments" :key="comment.id" :data-comment-id="comment.id">
        <AppArticleCommentRow
          :comment="comment"
          :article-id="articleId"
          :can-comment="canComment"
          :visibility="visibility"
          :is-highlighted="highlightedCommentId === comment.id"
          @reply="handleReply"
          @delete="handleDelete"
        />

        <!-- Replies -->
        <div v-if="comment.replies?.length" class="ml-10 mt-3 space-y-4 border-l-2 border-gray-100 pl-4 dark:border-zinc-800">
          <AppArticleCommentRow
            v-for="reply in comment.replies"
            :key="reply.id"
            :data-comment-id="reply.id"
            :comment="reply"
            :article-id="articleId"
            :parent-id="comment.id"
            :can-comment="canComment"
            :visibility="visibility"
            :is-reply="true"
            :is-highlighted="highlightedCommentId === reply.id"
            @reply="handleReply"
            @delete="handleDelete"
          />
        </div>
        <div v-if="hasMoreReplies(comment)" class="ml-10 mt-2 border-l-2 border-gray-100 pl-4 dark:border-zinc-800">
          <button
            type="button"
            class="text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            :disabled="isLoadingReplies(comment.id)"
            @click="onLoadMoreReplies(comment.id)"
          >
            {{ isLoadingReplies(comment.id) ? 'Loading replies…' : `Show more replies (${Math.max(0, comment.replyCount - (comment.replies?.length ?? 0))})` }}
          </button>
        </div>

        <!-- Inline reply compose for this comment -->
        <div v-if="replyingToId === comment.id" ref="replyBoxEl" class="ml-10 mt-3 border-l-2 pl-4" :style="{ borderColor: accentColor + '66' }">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 pt-1">
              <AppUserAvatar v-if="user" :user="user" size-class="h-7 w-7" />
            </div>
            <div class="flex-1 min-w-0">
              <AppArticleCommentTextarea
                ref="replyTextareaEl"
                v-model="replyBody"
                :placeholder="`Replying to @${comment.author.username || comment.author.name}…`"
                :maxlength="commentMaxLength"
                :priority-users="replyPriorityUsers(comment)"
                @submit="submitReply(replyingToId)"
                @esc="cancelReply"
              />
              <div class="mt-2 flex gap-2">
                <button
                  type="button"
                  class="rounded-lg px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                  :style="{ backgroundColor: accentColor }"
                  :disabled="!replyBody.trim() || submitting || replyBodyOverLimit"
                  @click="submitReply(replyingToId)"
                >
                  {{ submitting ? 'Posting…' : 'Reply' }}
                </button>
                <button type="button" class="text-xs text-gray-500 hover:text-gray-700 dark:text-zinc-400" @click="cancelReply">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load more -->
      <button
        v-if="nextCursor"
        type="button"
        class="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        @click="loadMore"
      >
        Load more comments
      </button>

      <p v-if="!loading && comments.length === 0" class="py-6 text-center text-sm text-gray-400 dark:text-zinc-500">
        No comments yet. Be the first!
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ArticleComment, ArticleAuthor, FollowListUser } from '~/types/api'

const props = defineProps<{
  articleId: string
  totalCount?: number
  visibility?: string
  author?: ArticleAuthor
  highlightedCommentId?: string | null
}>()

const { user, isAuthed, isVerified, isPremium, isPremiumPlus } = useAuth()

const commentMaxLength = computed(() => (isPremium.value || isPremiumPlus.value) ? 2000 : 500)
const newCommentBodyOverLimit = computed(() => newCommentBody.value.length > commentMaxLength.value)
const replyBodyOverLimit = computed(() => replyBody.value.length > commentMaxLength.value)

const canComment = computed(() => {
  if (props.visibility === 'premiumOnly') return isPremium.value
  return isVerified.value || isPremium.value
})

const accentColor = computed(() => {
  if (props.visibility === 'premiumOnly') return 'var(--moh-premium)'
  if (props.visibility === 'verifiedOnly') return 'var(--moh-verified)'
  return '#a1a1aa'
})
const {
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
} = useArticleComments(computed(() => props.articleId))

const newCommentBody = ref('')
const replyingToId = ref<string | null>(null)
const replyBody = ref('')
const composeTextareaEl = ref<{ focus: () => void; el: { value: HTMLTextAreaElement | null } } | null>(null)
// These refs are inside a v-for, so Vue stores them as arrays.
// Only one reply box is ever open at a time, so we always access [0].
const replyTextareaEl = ref<Array<{ focus: () => void; focusEnd: () => void }>>([])
const replyBoxEl = ref<HTMLElement[]>([])

watch(replyingToId, (id) => {
  if (!id) return
  // Step 1: wait for Vue to render the reply box into the DOM
  nextTick(() => {
    // Step 2: wait for the browser to do layout so getBoundingClientRect is accurate
    requestAnimationFrame(() => {
      // Focus with cursor at end of "@username "
      const textarea = replyTextareaEl.value?.[0]
      textarea?.focusEnd()

      // Scroll the whole reply box (textarea + buttons) into view with 20px padding
      const el = replyBoxEl.value?.[0]
      if (!el) return
      const scroller = document.getElementById('moh-middle-scroller')
      if (!scroller) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        return
      }
      const PADDING = 20
      const scrollerRect = scroller.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const relTop = elRect.top - scrollerRect.top
      const relBottom = elRect.bottom - scrollerRect.top
      const viewHeight = scroller.clientHeight
      if (relTop < PADDING) {
        scroller.scrollBy({ top: relTop - PADDING, behavior: 'smooth' })
      } else if (relBottom > viewHeight - PADDING) {
        scroller.scrollBy({ top: relBottom - viewHeight + PADDING, behavior: 'smooth' })
      }
    })
  })
})

// ─── Realtime ───────────────────────────────────────────────────────────────

const { addArticlesCallback, removeArticlesCallback } = usePresence()

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

onMounted(() => {
  load()
  addArticlesCallback(articlesCallback)
})

onUnmounted(() => {
  removeArticlesCallback(articlesCallback)
})

// ─── Mention priority users ──────────────────────────────────────────────────

const EMPTY_RELATIONSHIP: FollowListUser['relationship'] = {
  viewerFollowsUser: false,
  userFollowsViewer: false,
  viewerPostNotificationsEnabled: false,
}

function authorToMentionUser(a: ArticleAuthor): FollowListUser {
  return {
    id: a.id,
    username: a.username,
    name: a.name,
    avatarUrl: a.avatarUrl,
    premium: a.premium,
    premiumPlus: a.premiumPlus,
    isOrganization: a.isOrganization,
    stewardBadgeEnabled: a.stewardBadgeEnabled,
    verifiedStatus: a.verifiedStatus,
    relationship: EMPTY_RELATIONSHIP,
  }
}

/**
 * Unique mention users collected from all comment + reply authors in the thread.
 * The array is ordered by first appearance (top-level comments first, then replies).
 */
const threadMentionUsers = computed<FollowListUser[]>(() => {
  const seen = new Set<string>()
  const result: FollowListUser[] = []
  const articleAuthorId = props.author?.id

  function add(a: ArticleAuthor) {
    if (!a.id || seen.has(a.id) || a.id === articleAuthorId) return
    seen.add(a.id)
    result.push(authorToMentionUser(a))
  }

  for (const c of comments.value) {
    add(c.author)
    for (const r of c.replies ?? []) add(r.author)
  }
  return result
})

/** Priority users for the top-level compose box: article author first, then thread participants. */
const composePriorityUsers = computed<FollowListUser[]>(() => {
  const list: FollowListUser[] = []
  if (props.author) list.push(authorToMentionUser(props.author))
  list.push(...threadMentionUsers.value)
  return list
})

/** Priority users for a reply box: reply target first, then author, then other thread participants. */
function replyPriorityUsers(comment: ArticleComment): FollowListUser[] {
  const replyTargetId = comment.author.id
  const list: FollowListUser[] = [authorToMentionUser(comment.author)]
  if (props.author && props.author.id !== replyTargetId) list.push(authorToMentionUser(props.author))
  list.push(...threadMentionUsers.value.filter((u) => u.id !== replyTargetId))
  return list
}

// ─── Compose / reply ────────────────────────────────────────────────────────

function focusCompose() {
  composeTextareaEl.value?.focus()
}

defineExpose({ focusCompose })

const toast = useAppToast()

async function submitComment() {
  if (!newCommentBody.value.trim()) return
  try {
    const comment = await createComment(newCommentBody.value, null)
    newCommentBody.value = ''
    await nextTick()
    scrollToComment(comment.id)
  } catch (e: any) {
    toast.push({ title: e?.data?.meta?.errors?.[0]?.message ?? 'Could not post comment.', tone: 'error' })
  }
}

function handleReply(commentId: string, mentionUsername?: string) {
  replyingToId.value = commentId
  replyBody.value = mentionUsername ? `@${mentionUsername} ` : ''
}

async function submitReply(parentId: string) {
  if (!replyBody.value.trim()) return
  try {
    const reply = await createComment(replyBody.value, parentId)
    replyBody.value = ''
    replyingToId.value = null
    await nextTick()
    scrollToComment(reply.id)
  } catch (e: any) {
    toast.push({ title: e?.data?.meta?.errors?.[0]?.message ?? 'Could not post reply.', tone: 'error' })
  }
}

function scrollToComment(commentId: string) {
  const el = document.querySelector(`[data-comment-id="${commentId}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function cancelReply() {
  replyingToId.value = null
  replyBody.value = ''
}

async function handleDelete(commentId: string, parentId?: string | null) {
  try {
    await deleteComment(commentId, parentId)
  } catch (e: any) {
    toast.push({ title: e?.data?.meta?.errors?.[0]?.message ?? 'Could not delete comment.', tone: 'error' })
  }
}

function hasMoreReplies(comment: ArticleComment): boolean {
  return (comment.replies?.length ?? 0) < (comment.replyCount ?? 0)
}

async function onLoadMoreReplies(parentId: string) {
  await loadMoreReplies(parentId)
}
</script>
