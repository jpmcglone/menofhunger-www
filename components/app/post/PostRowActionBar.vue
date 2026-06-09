<template>
  <!-- Typing indicator: who is currently composing a reply -->
  <AppTypingIndicator
    v-if="!isDeletedPost && !isPendingRow && typingUsers.length > 0"
    :users="typingUsers"
    verb="replying"
    size="compact"
    class="mt-1"
    @click.stop
  />

  <!-- New-reply pill: transient "+N new" badge while viewing a feed row -->
  <div
    v-if="!isDeletedPost && !isPendingRow && newRepliesSinceMount > 0 && !isOnPermalink"
    class="mt-1"
    @click.stop
  >
    <NuxtLink
      :to="postPermalink"
      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-zinc-900/80 hover:opacity-80 transition-opacity"
    >
      <Icon name="tabler:message-circle" class="text-[10px]" aria-hidden="true" />
      +{{ newRepliesSinceMount }} new
    </NuxtLink>
  </div>

  <div
    v-else-if="!isDeletedPost && !isOnlyMe"
    class="mt-2.5 sm:mt-3 flex items-center justify-between sm:justify-start gap-1 moh-text-muted"
  >
    <!-- Reply -->
    <div class="inline-flex items-center">
      <button
        v-tooltip.bottom="commentTooltip"
        type="button"
        class="moh-tap moh-pressable inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors moh-surface-hover"
        :class="commentClickable ? 'cursor-pointer' : 'cursor-default opacity-60'"
        aria-label="Reply"
        @click.stop="onCommentClick"
      >
        <Icon name="tabler:message-circle" class="text-[18px]" aria-hidden="true" />
      </button>
      <NuxtLink
        :to="postPermalink"
        class="ml-0 inline-block sm:min-w-[1.5rem] select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted hover:underline moh-count-gutter"
        :class="displayedCommentCount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        :aria-hidden="displayedCommentCount === 0 ? 'true' : undefined"
        :tabindex="displayedCommentCount === 0 ? -1 : undefined"
        aria-label="View replies"
      >
        <AppAnimatedCount :value="displayedCommentCount" :format="formatCountOrBlank" />
      </NuxtLink>
    </div>

    <!-- Repost button + menu -->
    <div class="relative inline-flex items-center">
      <button
        v-tooltip.bottom="repostTooltip"
        type="button"
        class="moh-tap moh-pressable inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors moh-surface-hover"
        :class="viewerCanInteract ? 'cursor-pointer' : 'cursor-default opacity-60'"
        :aria-label="isReposted ? 'Repost options' : 'Repost'"
        @click.stop="onRepostClick"
      >
        <Icon
          name="tabler:repeat"
          class="text-[19px]"
          aria-hidden="true"
          :style="isReposted ? { color: repostActiveColor } : undefined"
        />
      </button>
      <span
        class="ml-0 inline-block sm:min-w-[1.5rem] select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted moh-count-gutter"
        :class="repostCount > 0 ? 'opacity-100' : 'opacity-0'"
        aria-hidden="true"
      >
        <AppAnimatedCount :value="repostCount" :format="formatCountOrBlank" />
      </span>

      <AppPostRowRepostMenu
        ref="repostMenuRef"
        :is-reposted="isReposted"
        @repost="onRepostMenuRepost"
        @quote="onRepostMenuQuote"
      />
    </div>

    <!-- Upvote -->
    <div class="inline-flex items-center">
      <button
        v-tooltip.bottom="upvoteTooltip"
        type="button"
        class="moh-tap moh-pressable inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors moh-surface-hover"
        :class="boostClickable ? 'cursor-pointer' : 'cursor-default opacity-60'"
        :aria-label="isBoosted ? 'Remove upvote' : 'Upvote'"
        @click.stop="onBoostClick"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-5 w-5"
          aria-hidden="true"
          :style="isBoosted ? { color: 'var(--p-primary-color)' } : undefined"
        >
          <path
            v-if="isBoosted"
            fill="currentColor"
            d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
          />
          <path
            v-else
            d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <span
        class="ml-0 inline-block sm:min-w-[1.5rem] select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted moh-count-gutter"
        :class="boostCount > 0 ? 'opacity-100' : 'opacity-0'"
        aria-hidden="true"
      >
        <AppAnimatedCount :value="boostCount" :format="formatCountOrBlank" />
      </span>
    </div>

    <!-- Views -->
    <AppPostRowViewerBreakdown
      :post-id="post.id"
      :viewer-count="viewerCount"
      @count-synced="$emit('viewerCountSynced', $event)"
    />

    <!-- Spacer: hidden on mobile (justify-between handles spacing), grows on desktop -->
    <div class="hidden sm:block sm:flex-1" aria-hidden="true" />

    <!-- Bookmark + count: count right of icon on mobile, left of icon on desktop -->
    <div
      class="inline-flex items-center sm:flex-row-reverse"
      @click.capture="onMaybeGatedRightSideClick"
    >
      <AppPostRowBookmarkButton
        :post-id="post.id"
        :viewer-can-interact="viewerCanInteract"
        :initial-has-bookmarked="Boolean(post.viewerHasBookmarked)"
        :initial-collection-ids="(post.viewerBookmarkCollectionIds ?? []).filter(Boolean)"
        @bookmark-count-delta="$emit('bookmarkCountDelta', $event)"
        @bookmark-state-changed="$emit('bookmarkStateChanged', $event)"
      />
      <span
        class="inline-block sm:min-w-[1.5rem] select-none text-left sm:text-right text-[11px] sm:text-xs tabular-nums moh-text-muted moh-count-gutter"
        :class="bookmarkCountValue > 0 ? 'opacity-100' : 'opacity-0'"
        aria-hidden="true"
      >
        <AppAnimatedCount :value="bookmarkCountValue" :format="formatCountOrBlank" />
      </span>
    </div>

    <!-- Share -->
    <div
      class="inline-flex items-center"
      @click.capture="onMaybeGatedRightSideClick"
    >
      <AppPostRowShareMenu
        :can-share="canShare"
        :tooltip="shareTooltip"
        :items="shareMenuItems"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { formatShortCount } from '~/utils/text'
import { usePostRowInteractions } from '~/composables/post-row/usePostRowInteractions'

const props = defineProps<{
  /** Merged (cache-overlaid) post view. */
  post: FeedPost
  /** The original `post` prop of the row — used for quote/share/bookmark dialogs. */
  sourcePost: FeedPost
  author: { id?: string | null; username?: string | null } | null
  viewerCanInteract: boolean
  isGatedPost: boolean
}>()

const emit = defineEmits<{
  bookmarkCountDelta: [delta: number]
  bookmarkStateChanged: [payload: { hasBookmarked: boolean; collectionIds: string[] }]
  viewerCountSynced: [total: number]
}>()

const formatCountOrBlank = (n: number) => n === 0 ? ' ' : formatShortCount(n)

const postView = computed(() => props.post)
const isDeletedPost = computed(() => Boolean(postView.value.deletedAt))
const isPendingRow = computed(() => {
  const s = postView.value._pending
  return s === 'posting' || s === 'failed'
})

const { user } = useAuth()
const route = useRoute()

const repostMenuRef = ref<{ toggleAt: (anchorEl: HTMLElement) => void } | null>(null)

const {
  isOnlyMe,
  postPermalink,
  commentClickable,
  commentTooltip,
  displayedCommentCount,
  onCommentClick,
  isReposted,
  repostCount,
  repostActiveColor,
  repostTooltip,
  onRepostClick,
  onRepostMenuRepost,
  onRepostMenuQuote,
  isBoosted,
  boostCount,
  boostClickable,
  upvoteTooltip,
  onBoostClick,
  bookmarkCountValue,
  viewerCount,
  canShare,
  shareTooltip,
  shareMenuItems,
  onMaybeGatedRightSideClick,
} = usePostRowInteractions({
  postView,
  sourcePost: () => props.sourcePost,
  author: computed(() => props.author),
  viewerCanInteract: computed(() => props.viewerCanInteract),
  isGatedPost: computed(() => props.isGatedPost),
  toggleRepostMenu: (anchorEl) => repostMenuRef.value?.toggleAt(anchorEl),
  onBookmarkStateChanged: (payload) => emit('bookmarkStateChanged', payload),
  onBookmarkCountDelta: (delta) => emit('bookmarkCountDelta', delta),
})

// ─── Live "is replying" indicator ────────────────────────────────────────────
const { typingUsers } = usePostTyping(computed(() => postView.value.id))

// ─── Transient "+N new" pill ─────────────────────────────────────────────────
// Show a pill when a new reply arrives while this row is on screen.
// Hidden on the permalink page (where the reply prepends inline) and for the
// viewer's own replies (already handled optimistically).
const newRepliesSinceMount = ref(0)
let newRepliesPillTimer: ReturnType<typeof setTimeout> | null = null

const isOnPermalink = computed(() => route.path === postPermalink.value)

const { addPostsCallback: addPostsCallbackForPill, removePostsCallback: removePostsCallbackForPill } = usePresence()
const newRepliesCb = {
  onCommentAdded(p: { parentPostId: string; comment: { author?: { id?: string } } }) {
    if (p.parentPostId !== postView.value.id) return
    if (p.comment?.author?.id === user.value?.id) return
    if (isOnPermalink.value) return
    newRepliesSinceMount.value += 1
    if (newRepliesPillTimer) clearTimeout(newRepliesPillTimer)
    newRepliesPillTimer = setTimeout(() => {
      newRepliesSinceMount.value = 0
      newRepliesPillTimer = null
    }, 6000)
  },
}

onMounted(() => {
  if (!import.meta.client) return
  addPostsCallbackForPill(newRepliesCb as any)
})
onBeforeUnmount(() => {
  removePostsCallbackForPill(newRepliesCb as any)
  if (newRepliesPillTimer) { clearTimeout(newRepliesPillTimer); newRepliesPillTimer = null }
})
</script>

<style scoped>
/* Count gutters (replies/boost/repost/bookmark): always render the digit so
   AppAnimatedCount's slide animation runs on the 0↔1 transitions too. The
   opacity fade is timed to match the digit slide (~240ms) so the number
   "rolls in" and fades up together (and rolls out + fades down). */
.moh-count-gutter {
  transition: opacity 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
</style>
