<template>
  <section
    class="relative mt-8 border-t moh-border pt-6"
    :style="{ '--article-accent': accentColor }"
  >
    <h2 class="mb-4 text-base font-semibold text-[var(--moh-text)]">
      Replies
      <span v-if="(totalCount ?? 0) > 0" class="ml-1 text-sm font-normal moh-text-muted">({{ totalCount }})</span>
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
              placeholder="Write a reply…"
              :maxlength="commentMaxLength"
              :hide-count="true"
              :disabled="submitting"
              :priority-users="composePriorityUsers"
              @submit="submitComment"
            />
            <div class="mt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                class="inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                :style="{ backgroundColor: accentColor }"
                :disabled="!newCommentBody.trim() || submitting || newCommentBodyOverLimit"
                @click="submitComment"
              >
                {{ submitting ? 'Posting…' : 'Post' }}
              </button>
              <span
                class="text-[11px] tabular-nums moh-text-soft"
                :class="{ 'text-red-500 font-medium': newCommentBodyOverLimit }"
              >{{ newCommentBody.length }} / {{ commentMaxLength }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- CTA: not logged in -->
      <div v-else-if="!isAuthed">
        <div class="flex items-start gap-3 rounded-xl border moh-border moh-surface-2 px-5 py-4">
          <AppIconGlyph name="reply" :size="20" class="mt-0.5 shrink-0 moh-text-soft" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[var(--moh-text)]">Want to join the conversation?</p>
            <div class="mt-2">
              <NuxtLink
                to="/login"
                class="inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-85"
                :style="{ backgroundColor: accentColor }"
              >
                Log in
              </NuxtLink>
            </div>
          </div>
        </div>
        <NuxtLink to="/login" class="mt-3 inline-block text-sm moh-text-muted hover:underline">
          or create a free account →
        </NuxtLink>
      </div>

      <!-- CTA: logged in but unverified -->
      <div v-else-if="!isVerified && !isPremium" class="flex items-start gap-3 rounded-xl border moh-border moh-surface-2 px-5 py-4">
        <AppIconGlyph name="verified" :size="20" class="mt-0.5 shrink-0 moh-text-soft" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[var(--moh-text)]">Want to join the conversation?</p>
          <p class="mt-0.5 text-sm moh-text-muted">Verification lets you reply on articles.</p>
          <div class="mt-2">
            <NuxtLink
              to="/verification"
              class="inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-85"
              :style="{ backgroundColor: accentColor }"
            >
              Get Verified
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- CTA: verified but article is premium-only -->
      <div v-else-if="visibility === 'premiumOnly' && !isPremium" class="flex items-start gap-3 rounded-xl border moh-border moh-surface-2 px-5 py-4">
        <AppIconGlyph name="premium" :size="20" class="mt-0.5 shrink-0 text-[var(--moh-premium)]" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[var(--moh-text)]">Want to join the conversation?</p>
          <p class="mt-0.5 text-sm moh-text-muted">Premium members can reply on all articles.</p>
          <div class="mt-2">
            <NuxtLink
              to="/settings/billing"
              class="inline-flex min-h-11 items-center rounded-full bg-[var(--moh-premium)] px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Upgrade to Premium
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <AppInlineAlert v-if="loadError" severity="warning">{{ loadError }}</AppInlineAlert>
    <!-- Loading state -->
    <AppRefreshIndicator :loading="loading && !initialLoading" />
    <div v-if="initialLoading" class="flex justify-center py-8">
      <Icon name="tabler:loader-2" class="animate-spin moh-text-soft" />
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
        <div v-if="comment.replies?.length" class="ml-10 mt-3 space-y-4 border-l-2 moh-border pl-4">
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
        <div v-if="hasMoreReplies(comment)" class="ml-10 mt-2 border-l-2 moh-border pl-4">
          <button
            type="button"
            class="text-xs font-medium moh-text-muted transition-colors hover:text-[var(--moh-text)] tabular-nums"
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
              <div class="mb-2 text-xs moh-text-muted" role="status">
                <p class="font-semibold">Replying to @{{ comment.author.username || comment.author.name }}</p>
                <p class="mt-1 line-clamp-2">{{ comment.body }}</p>
              </div>
              <AppArticleCommentTextarea
                ref="replyTextareaEl"
                v-model="replyBody"
                placeholder="Write a reply…"
                :maxlength="commentMaxLength"
                :priority-users="replyPriorityUsers(comment)"
                @submit="submitReply(replyingToId)"
                @esc="cancelReply"
              />
              <div class="mt-2 flex gap-2">
                <button
                  type="button"
                  class="inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                  :style="{ backgroundColor: accentColor }"
                  :disabled="!replyBody.trim() || submitting || replyBodyOverLimit"
                  @click="submitReply(replyingToId)"
                >
                  {{ submitting ? 'Posting…' : 'Reply' }}
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-11 items-center rounded-full px-4 text-sm moh-text-muted hover:bg-[var(--moh-surface-hover)]"
                  @click="cancelReply"
                >
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
        class="w-full rounded-xl border moh-border py-2.5 text-sm moh-text-muted transition-colors hover:bg-[var(--moh-surface-hover)]"
        @click="loadMore"
      >
        Load more replies
      </button>

      <p v-if="!initialLoading && !loadError && comments.length === 0" class="py-6 text-center text-sm moh-text-muted">
        No replies yet. Be the first!
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { articleVisibilityAccent } from '~/utils/article-visibility'
import type { ArticleComment, ArticleAuthor } from '~/types/api'
import { useArticleCommentsRealtime } from '~/composables/article/useArticleCommentsRealtime'
import { useArticleMentionUsers } from '~/composables/article/useArticleMentionUsers'

const props = defineProps<{
  articleId: string
  totalCount?: number
  visibility?: string
  author?: ArticleAuthor
  highlightedCommentId?: string | null
}>()

const { user, isAuthed, isVerified, isPremium, isPremiumPlus } = useAuth()

const commentMaxLength = computed(() => (isPremium.value || isPremiumPlus.value) ? 1000 : 500)
const newCommentBodyOverLimit = computed(() => newCommentBody.value.length > commentMaxLength.value)
const replyBodyOverLimit = computed(() => replyBody.value.length > commentMaxLength.value)

const canComment = computed(() => {
  if (props.visibility === 'premiumOnly') return isPremium.value
  return isVerified.value || isPremium.value
})

const accentColor = computed(() => articleVisibilityAccent(props.visibility))
const {
  comments,
  nextCursor,
  loading,
  loadError,
  submitting,
  load,
  loadMore,
  loadMoreReplies,
  isLoadingReplies,
  createComment,
  ensureComment,
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

onMounted(() => {
  load()
})

watch(
  () => [props.highlightedCommentId, loading.value] as const,
  async ([id, isLoading]) => {
    if (!id || isLoading) return
    await ensureComment(id)
  },
)

useArticleCommentsRealtime(props, comments)
const { composePriorityUsers, replyPriorityUsers } = useArticleMentionUsers(props, comments)
// ─── Compose / reply ────────────────────────────────────────────────────────

function focusCompose() {
  composeTextareaEl.value?.focus()
}

defineExpose({ focusCompose })

const { run } = useAsyncAction()

async function submitComment() {
  if (!newCommentBody.value.trim()) return
  await run(async () => {
    const comment = await createComment(newCommentBody.value, null)
    newCommentBody.value = ''
    await nextTick()
    scrollToComment(comment.id)
  }, { error: 'Could not post reply.' })
}

function handleReply(commentId: string, mentionUsername?: string) {
  replyingToId.value = commentId
  replyBody.value = mentionUsername ? `@${mentionUsername} ` : ''
}

async function submitReply(parentId: string) {
  if (!replyBody.value.trim()) return
  await run(async () => {
    const reply = await createComment(replyBody.value, parentId)
    replyBody.value = ''
    replyingToId.value = null
    await nextTick()
    scrollToComment(reply.id)
  }, { error: 'Could not post reply.' })
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
  await run(() => deleteComment(commentId, parentId), { error: 'Could not delete reply.' })
}

function hasMoreReplies(comment: ArticleComment): boolean {
  return (comment.replies?.length ?? 0) < (comment.replyCount ?? 0)
}

async function onLoadMoreReplies(parentId: string) {
  await loadMoreReplies(parentId)
}
const initialLoading = useInitialLoading(loading, () => comments.value.length > 0, loadError)
</script>
