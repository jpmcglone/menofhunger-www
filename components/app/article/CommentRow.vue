<template>
  <div
    :id="`comment-${comment.id}`"
    class="relative flex gap-3"
    :class="{ 'pb-10': confirmingDelete }"
  >
    <!-- Highlight ring (briefly shown on deep-link navigation) -->
    <Transition name="comment-highlight">
      <div
        v-if="isHighlighted"
        class="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-xl ring-2 transition-opacity"
        :style="{ '--tw-ring-color': highlightColor, backgroundColor: highlightColor + '18' }"
      />
    </Transition>

    <!-- Avatar -->
    <div class="flex-shrink-0">
      <AppUserAvatar :user="comment.author" size="sm" />
    </div>

    <div class="flex-1 min-w-0">
      <!-- Author + timestamp -->
      <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span
          class="text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:underline"
          @mouseenter="authorEnter"
          @mousemove="authorMove"
          @mouseleave="authorLeave"
        >
          {{ comment.author.name || comment.author.username }}
        </span>
        <AppVerifiedBadge
          :status="comment.author.verifiedStatus"
          :premium="comment.author.premium"
          :premium-plus="comment.author.premiumPlus"
          :is-organization="comment.author.isOrganization"
          :steward-badge-enabled="comment.author.stewardBadgeEnabled"
        />
        <AppOrgAffiliationAvatars
          v-if="comment.author.orgAffiliations?.length"
          :orgs="comment.author.orgAffiliations"
          size="xs"
        />
        <span class="text-[11px] text-gray-400 dark:text-zinc-500">@{{ comment.author.username }}</span>
        <span class="text-[11px] text-gray-400 dark:text-zinc-500">·</span>
        <span class="text-[11px] text-gray-400 dark:text-zinc-500">{{ timeAgo }}</span>
      </div>

      <!-- Body -->
      <p v-if="!deleted" class="mt-0.5 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
        {{ comment.body }}
      </p>
      <p v-else class="mt-0.5 text-sm italic text-gray-400 dark:text-zinc-500">[deleted]</p>

      <!-- Reaction pills + inline actions -->
      <div v-if="!deleted" class="mt-1.5 flex flex-wrap items-center gap-2">
        <AppArticleReactionBar
          :reactions="commentReactions"
          readonly
          class="text-xs"
          @toggle="reactionState.toggle"
        />

        <!-- Reply -->
        <button
          v-if="canComment && !isReply"
          type="button"
          class="inline-flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          @click="emit('reply', comment.id, comment.author.username ?? undefined)"
        >
          Reply
          <span
            v-if="comment.replyCount > 0"
            class="tabular-nums rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-gray-700 dark:bg-zinc-700 dark:text-zinc-200"
          >{{ comment.replyCount }}</span>
        </button>

        <!-- React -->
        <div v-if="isAuthed" ref="reactWrapRef" class="relative">
          <button
            type="button"
            class="inline-flex items-center justify-center text-gray-400 transition-colors hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            aria-label="Add reaction"
            @click="reactPickerOpen = !reactPickerOpen"
          >
            <Icon name="tabler:mood-smile" size="15" />
          </button>
          <div
            v-if="reactPickerOpen"
            class="absolute left-0 top-full z-50 mt-1 flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            role="menu"
            aria-label="Pick a reaction"
          >
            <button
              v-for="reaction in REACTIONS"
              :key="reaction.id"
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
              :aria-label="reaction.label"
              :title="reaction.label"
              @click="pickReaction(reaction.id, reaction.emoji)"
            >
              {{ reaction.emoji }}
            </button>
          </div>
        </div>

        <!-- Share -->
        <button
          type="button"
          class="inline-flex items-center justify-center text-gray-400 transition-colors hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          aria-label="Share comment"
          @click="onShare"
        >
          <Icon name="tabler:share" size="15" />
        </button>

        <!-- More (only shown when there are items, e.g. delete for own comments) -->
        <div v-if="isOwnComment" ref="moreWrapRef" class="relative">
          <button
            type="button"
            class="inline-flex items-center justify-center text-gray-400 transition-colors hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            aria-label="More options"
            @click="moreOpen = !moreOpen"
          >
            <Icon name="tabler:dots" size="15" />
          </button>
          <Transition name="popover">
            <div
              v-if="moreOpen"
              class="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              <button
                type="button"
                class="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                @click="onDeleteClick"
              >
                <Icon name="tabler:trash" size="15" class="shrink-0" />
                Delete
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Delete confirm bar -->
    <Transition name="fade">
      <div
        v-if="confirmingDelete"
        class="absolute inset-x-0 bottom-0 flex items-center gap-2 rounded-b-xl bg-red-50 px-3 py-2 dark:bg-red-950/40"
      >
        <span class="flex-1 text-xs text-gray-600 dark:text-zinc-300">Delete this comment?</span>
        <button
          type="button"
          class="rounded px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40"
          @click="emit('delete', comment.id, parentId); confirmingDelete = false"
        >
          Delete
        </button>
        <button
          type="button"
          class="rounded px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
          @click="confirmingDelete = false"
        >
          Cancel
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { ArticleComment } from '~/types/api'
import { ARTICLE_REACTIONS as REACTIONS } from '~/utils/article-reactions'

const props = defineProps<{
  comment: ArticleComment
  articleId: string
  parentId?: string | null
  canComment?: boolean
  isReply?: boolean
  visibility?: string
  isHighlighted?: boolean
}>()

const emit = defineEmits<{
  (e: 'reply', commentId: string, username?: string): void
  (e: 'delete', commentId: string, parentId?: string | null): void
}>()

const { user, isAuthed } = useAuth()
const { onEnter: authorEnter, onMove: authorMove, onLeave: authorLeave } = useUserPreviewTrigger({ username: computed(() => props.comment.author.username ?? '') })
const toast = useAppToast()

const deleted = computed(() => Boolean(props.comment.deletedAt))
const isOwnComment = computed(() => user.value?.id === props.comment.author.id)
const confirmingDelete = ref(false)
const moreOpen = ref(false)
const reactPickerOpen = ref(false)
const moreWrapRef = ref<HTMLElement | null>(null)
const reactWrapRef = ref<HTMLElement | null>(null)

const highlightColor = computed(() => {
  if (props.visibility === 'premiumOnly') return '#f97316'
  if (props.visibility === 'verifiedOnly') return '#3b82f6'
  return '#a1a1aa'
})

function onDocPointerDown(e: PointerEvent) {
  const target = e.target as Node
  if (moreOpen.value && !moreWrapRef.value?.contains(target)) {
    moreOpen.value = false
    confirmingDelete.value = false
  }
  if (reactPickerOpen.value && !reactWrapRef.value?.contains(target)) {
    reactPickerOpen.value = false
  }
}

onMounted(() => window.addEventListener('pointerdown', onDocPointerDown, { capture: true }))
onBeforeUnmount(() => window.removeEventListener('pointerdown', onDocPointerDown, { capture: true } as EventListenerOptions))

function onDeleteClick() {
  confirmingDelete.value = true
  moreOpen.value = false
}

async function onShare() {
  moreOpen.value = false
  const url = `${window.location.origin}/a/${props.articleId}#comment-${props.comment.id}`
  try {
    await navigator.clipboard.writeText(url)
    toast.push({ title: 'Link copied!', message: 'Comment link copied to clipboard.', tone: 'success' })
  } catch {
    toast.push({ title: 'Comment link', message: url })
  }
}

const reactionState = useArticleReactions(
  'comment',
  computed(() => props.comment.id),
  computed(() => props.comment.reactions),
)
const commentReactions = reactionState.reactions

function pickReaction(reactionId: string, emoji: string) {
  reactionState.toggle(reactionId, emoji)
  reactPickerOpen.value = false
}

const timeAgo = computed(() => {
  const date = new Date(props.comment.createdAt)
  const now = Date.now()
  const diff = now - date.getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return date.toLocaleDateString()
})
</script>

<style scoped>
.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.comment-highlight-enter-active {
  transition: opacity 0.3s ease;
}
.comment-highlight-leave-active {
  transition: opacity 1.5s ease 1.5s;
}
.comment-highlight-enter-from,
.comment-highlight-leave-to {
  opacity: 0;
}
</style>
