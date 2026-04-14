<template>
  <div
    :id="`comment-${comment.id}`"
    class="relative flex gap-3 py-2"
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
        <a
          :href="`/a/${articleId}#comment-${comment.id}`"
          class="text-[11px] text-gray-400 dark:text-zinc-500 hover:underline hover:text-gray-600 dark:hover:text-zinc-300"
          :title="fullTimestamp"
          @click.prevent="onTimestampClick"
        >{{ timeAgo }}</a>
      </div>

      <!-- Body -->
      <div v-if="!deleted" class="mt-0.5">
        <p
          class="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words"
          :class="{ 'line-clamp-4': !expanded && isTruncatable }"
        >
          {{ comment.body }}
        </p>
        <button
          v-if="isTruncatable"
          type="button"
          class="mt-0.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Show less' : 'Show more' }}
        </button>
      </div>
      <p v-else class="mt-0.5 text-sm italic text-gray-400 dark:text-zinc-500">[deleted]</p>

      <!-- Reaction pills + inline actions -->
      <div v-if="!deleted" class="mt-1.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <!-- Comments -->
          <button
            v-if="canComment"
            type="button"
            class="inline-flex items-center gap-1"
            aria-label="Reply"
            v-tooltip.bottom="replyTooltip"
            @click="emit('reply', isReply ? (parentId ?? comment.id) : comment.id, comment.author.username ?? undefined)"
          >
            <span class="inline-flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300">
              <Icon name="tabler:message-circle" size="15" aria-hidden="true" />
            </span>
            <span
              v-if="replyCountDisplay > 0"
              class="tabular-nums text-[12px] font-semibold leading-none text-gray-700 dark:text-zinc-200"
            >{{ replyCountDisplay }}</span>
          </button>

            <!-- Reactions (desktop) -->
            <AppArticleReactionBar
              :reactions="commentReactions"
              readonly
              class="hidden text-xs sm:flex"
              @toggle="reactionState.toggle"
            />

            <!-- Add reaction (desktop) -->
            <div v-if="isAuthed" class="relative hidden sm:block">
              <button
                ref="reactButtonDesktopRef"
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                aria-label="Add reaction"
                v-tooltip.bottom="reactTooltip"
                @click="toggleReactionPicker(reactButtonDesktopRef)"
              >
                <Icon name="tabler:mood-smile" size="15" />
              </button>
            </div>
          </div>

          <div class="ml-auto flex shrink-0 items-center gap-1">
            <!-- Share -->
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label="Share comment"
              v-tooltip.bottom="shareTooltip"
              @click="toggleShareMenu($event)"
            >
              <svg viewBox="0 0 24 24" class="h-[15px] w-[15px]" aria-hidden="true">
                <path
                  d="M12 3v10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                />
                <path
                  d="M7.5 7.5L12 3l4.5 4.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <Menu v-if="shareMenuMounted" ref="shareMenuRef" :model="shareMenuItems" popup>
              <template #item="{ item, props: menuProps }">
                <a v-bind="menuProps.action" class="flex items-center gap-2">
                  <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
                  <span v-bind="menuProps.label">{{ item.label }}</span>
                </a>
              </template>
            </Menu>

            <!-- More (only shown when there are items, e.g. delete for own comments) -->
            <div v-if="hasMoreOptions" ref="moreWrapRef" class="relative">
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                aria-label="More options"
                v-tooltip.bottom="moreTooltip"
                @click="moreOpen = !moreOpen"
              >
                <Icon name="tabler:dots" size="15" />
              </button>
              <Transition name="popover">
                <div
                  v-if="moreOpen"
                  class="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
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

        <!-- Mobile overflow-safe reactions row -->
        <div v-if="commentReactions.length > 0 || isAuthed" class="mt-1 sm:hidden">
          <div class="flex items-center gap-2">
            <div class="min-w-0 flex-1 overflow-x-auto no-scrollbar">
              <div class="flex w-max items-center gap-1.5 pr-2">
                <button
                  v-for="r in commentReactions"
                  :key="`mobile-pill-${r.reactionId}`"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium transition-colors"
                  :class="r.viewerHasReacted
                    ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700'"
                  :aria-pressed="r.viewerHasReacted"
                  :aria-label="`${r.emoji} ${r.count} reactions`"
                  @click="reactionState.toggle(r.reactionId, r.emoji)"
                >
                  <span>{{ r.emoji }}</span>
                  <span class="tabular-nums">{{ r.count }}</span>
                </button>
              </div>
            </div>
            <div v-if="isAuthed" class="relative shrink-0">
              <button
                ref="reactButtonMobileRef"
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                aria-label="Add reaction"
                v-tooltip.bottom="reactTooltip"
                @click="toggleReactionPicker(reactButtonMobileRef)"
              >
                <Icon name="tabler:mood-smile" size="15" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reaction picker rendered to body to avoid clipping/overflow issues -->
    <Teleport to="body">
      <div
        v-if="reactPickerOpen"
        ref="reactionPickerEl"
        class="fixed z-[10020] flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        :style="reactionPickerStyle"
        role="menu"
        aria-label="Pick a reaction"
      >
        <button
          v-for="reaction in REACTIONS"
          :key="`picker-${reaction.id}`"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
          :aria-label="reaction.label"
          :title="reaction.label"
          @click="pickReaction(reaction.id, reaction.emoji)"
        >
          {{ reaction.emoji }}
        </button>
      </div>
    </Teleport>

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
import type { MenuItem } from 'primevue/menuitem'
import type { ArticleComment } from '~/types/api'
import { ARTICLE_REACTIONS as REACTIONS } from '~/utils/article-reactions'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useAutoToggleMenu } from '~/composables/useAutoToggleMenu'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

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
const { copyText: copyToClipboard } = useCopyToClipboard()

const deleted = computed(() => Boolean(props.comment.deletedAt))
const isOwnComment = computed(() => user.value?.id === props.comment.author.id)
const hasMoreOptions = computed(() => isOwnComment.value)
const confirmingDelete = ref(false)
const moreOpen = ref(false)

// ─── Truncation ──────────────────────────────────────────────────────────────
// Offer "show more" when the body has many characters or multiple newlines,
// indicating it likely overflows 4 lines. This avoids DOM measurement complexity.
const expanded = ref(false)
const isTruncatable = computed(() => {
  const body = props.comment.body
  return body.length > 280 || (body.match(/\n/g)?.length ?? 0) >= 4
})

// ─── Timestamp deep-link ──────────────────────────────────────────────────────

function onTimestampClick() {
  const router = useRouter()
  router.push({ hash: `#comment-${props.comment.id}` })
}

const fullTimestamp = computed(() => {
  try {
    return new Date(props.comment.createdAt).toLocaleString()
  } catch {
    return ''
  }
})
const reactPickerOpen = ref(false)
const moreWrapRef = ref<HTMLElement | null>(null)
const reactButtonDesktopRef = ref<HTMLElement | null>(null)
const reactButtonMobileRef = ref<HTMLElement | null>(null)
const reactionPickerEl = ref<HTMLElement | null>(null)
const reactionPickerStyle = ref<Record<string, string>>({})
const reactionPickerAnchorEl = ref<HTMLElement | null>(null)

const replyTooltip = computed(() => tinyTooltip('Reply'))
const reactTooltip = computed(() => tinyTooltip('React'))
const shareTooltip = computed(() => tinyTooltip('Share'))
const moreTooltip = computed(() => tinyTooltip('More'))

type MenuItemWithIcon = MenuItem & { iconName?: string }
const { mounted: shareMenuMounted, menuRef: shareMenuRef, toggle: toggleShareMenu } = useAutoToggleMenu()

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
  if (
    reactPickerOpen.value
    && !reactionPickerAnchorEl.value?.contains(target)
    && !reactionPickerEl.value?.contains(target)
  ) {
    reactPickerOpen.value = false
  }
}

onMounted(() => window.addEventListener('pointerdown', onDocPointerDown, { capture: true }))
onBeforeUnmount(() => window.removeEventListener('pointerdown', onDocPointerDown, { capture: true } as EventListenerOptions))

function updateReactionPickerPosition() {
  if (!import.meta.client) return
  const anchor = reactionPickerAnchorEl.value
  if (!anchor) return
  const rect = anchor.getBoundingClientRect()
  const pickerWidth = 240
  const margin = 8
  let left = rect.left
  if (left + pickerWidth > window.innerWidth - margin) left = window.innerWidth - pickerWidth - margin
  if (left < margin) left = margin
  const top = rect.bottom + 6
  reactionPickerStyle.value = {
    top: `${Math.max(margin, top)}px`,
    left: `${left}px`,
  }
}

function toggleReactionPicker(anchor: HTMLElement | null) {
  if (!anchor) return
  if (reactPickerOpen.value && reactionPickerAnchorEl.value === anchor) {
    reactPickerOpen.value = false
    return
  }
  reactionPickerAnchorEl.value = anchor
  updateReactionPickerPosition()
  reactPickerOpen.value = true
}

function onViewportChange() {
  if (!reactPickerOpen.value) return
  updateReactionPickerPosition()
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('resize', onViewportChange, { passive: true })
  window.addEventListener('scroll', onViewportChange, { passive: true })
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange)
})

function onDeleteClick() {
  confirmingDelete.value = true
  moreOpen.value = false
}

async function onShare() {
  moreOpen.value = false
  const url = `${window.location.origin}/a/${props.articleId}#comment-${props.comment.id}`
  try {
    await copyToClipboard(url)
    toast.push({ title: 'Link copied!', message: 'Comment link copied to clipboard.', tone: 'success' })
  } catch {
    toast.push({ title: 'Comment link', message: url })
  }
}

const shareMenuItems = computed<MenuItemWithIcon[]>(() => [
  {
    label: 'Copy link',
    iconName: 'tabler:link',
    command: () => {
      void onShare()
    },
  },
])

const reactionState = useArticleReactions(
  'comment',
  computed(() => props.comment.id),
  computed(() => props.comment.reactions),
)
const commentReactions = reactionState.reactions
const replyCountDisplay = computed(() => Math.max(0, Math.floor(Number(props.comment.replyCount ?? 0))))

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
