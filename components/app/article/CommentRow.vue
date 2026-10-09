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
      <AppCommentRowChrome
        :author="comment.author"
        :name-text="comment.author.name || comment.author.username || ''"
        name-class="text-sm font-semibold text-[var(--moh-text)] cursor-pointer hover:underline"
        :preview="authorPreview"
        :age="commentAge"
        :time-title="fullTimestamp"
        :time-href="`/a/${articleId}#comment-${comment.id}`"
        time-class="text-[11px] moh-text-soft hover:underline hover:text-[var(--moh-text-muted)]"
        separator-class="text-[11px] moh-text-soft"
        @time-click="onTimestampClick"
      >
        <template #after-badge>
          <AppOrgAffiliationAvatars
            v-if="comment.author.orgAffiliations?.length"
            :orgs="comment.author.orgAffiliations"
            size="xs"
          />
          <span class="text-[11px] moh-text-soft">@{{ comment.author.username }}</span>
        </template>
      </AppCommentRowChrome>

      <!-- Body -->
      <div v-if="!deleted" class="mt-0.5">
        <div
          ref="bodyWrapEl"
          class="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          :style="bodyClampStyle"
        >
          <p
            ref="bodyTextEl"
            class="text-sm text-[var(--moh-text)] whitespace-pre-wrap break-words"
          >
            {{ comment.body }}
          </p>
        </div>
        <button
          v-if="isTruncatable"
          type="button"
          class="mt-0.5 text-xs font-medium moh-text-muted hover:text-[var(--moh-text)]"
          @click="toggleExpand"
        >
          {{ expanded ? 'Show less' : 'Show more' }}
        </button>
      </div>
      <p v-else class="mt-0.5 text-sm italic moh-text-muted">[deleted]</p>

      <!-- Reaction pills + inline actions -->
      <div v-if="!deleted" class="mt-1.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <!-- Comments -->
          <button
            v-if="canComment"
            v-tooltip.bottom="replyTooltip"
            type="button"
            class="inline-flex items-center gap-1"
            aria-label="Reply"
            @click="emit('reply', isReply ? (parentId ?? comment.id) : comment.id, comment.author.username ?? undefined)"
          >
            <span class="inline-flex h-8 w-8 items-center justify-center moh-text-soft transition-colors hover:text-[var(--moh-text)]">
              <Icon name="tabler:message-circle" size="15" aria-hidden="true" />
            </span>
            <span class="text-[12px] font-semibold leading-none text-[var(--moh-text)]">
              <AppAnimatedCount :value="replyCountDisplay" blank-zero :min-ch="1" />
            </span>
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
                v-tooltip.bottom="reactTooltip"
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center moh-text-soft transition-colors hover:text-[var(--moh-text)]"
                aria-label="Add reaction"
                @click="toggleReactionPicker(reactButtonDesktopRef)"
              >
                <Icon name="tabler:mood-smile" size="15" />
              </button>
            </div>
          </div>

          <div class="ml-auto flex shrink-0 items-center gap-1">
            <!-- Share -->
            <button
              v-tooltip.bottom="shareTooltip"
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center moh-text-soft transition-colors hover:text-[var(--moh-text)]"
              aria-label="Share reply"
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
            <AppArticleCommentRowMoreMenu
              v-if="hasMoreOptions"
              ref="moreMenuRef"
              @delete="confirmingDelete = true"
              @dismiss="confirmingDelete = false"
            />
          </div>
        </div>

        <AppArticleCommentRowMobileReactions
          :reactions="commentReactions"
          :is-authed="isAuthed"
          @toggle="reactionState.toggle"
          @react="toggleReactionPicker"
        />
      </div>
    </div>

    <!-- Reaction picker rendered to body to avoid clipping/overflow issues -->
    <Teleport to="body">
      <div
        v-if="reactPickerOpen"
        ref="reactionPickerEl"
        class="fixed z-[var(--moh-z-menu)] flex items-center gap-1 rounded-xl border moh-border moh-surface p-2 shadow-lg"
        :style="reactionPickerStyle"
        role="menu"
        aria-label="Pick a reaction"
      >
        <button
          v-for="reaction in REACTIONS"
          :key="`picker-${reaction.id}`"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-[var(--moh-surface-hover)]"
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
        <span class="flex-1 text-xs text-[var(--moh-text)]">Delete this reply?</span>
        <button
          type="button"
          class="rounded px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40"
          @click="emit('delete', comment.id, parentId); confirmingDelete = false"
        >
          Delete
        </button>
        <button
          type="button"
          class="rounded px-2.5 py-1 text-xs moh-text-muted hover:bg-[var(--moh-surface-hover)]"
          @click="confirmingDelete = false"
        >
          Cancel
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { formatCompactAge, formatLocaleDateTime } from '~/utils/time-format'
import type { MenuItem } from 'primevue/menuitem'
import type { ArticleComment } from '~/types/api'
import { ARTICLE_REACTIONS as REACTIONS } from '~/utils/article-reactions'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useAutoToggleMenu } from '~/composables/useAutoToggleMenu'
import { useExpandableCommentBody } from '~/composables/article/useExpandableCommentBody'
import { useCommentReactionPicker } from '~/composables/article/useCommentReactionPicker'
import { useCommentRowActions } from '~/composables/useCommentRowActions'

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
const authorPreview = useUserPreviewTrigger({ username: computed(() => props.comment.author.username ?? '') })

const deleted = computed(() => Boolean(props.comment.deletedAt))
const isOwnComment = computed(() => user.value?.id === props.comment.author.id)
const hasMoreOptions = computed(() => isOwnComment.value)
const confirmingDelete = ref(false)
const moreMenuRef = ref<{ close: () => void } | null>(null)
const {
  expanded, bodyWrapEl, bodyTextEl, isTruncatable, bodyClampStyle, toggleExpand,
} = useExpandableCommentBody(computed(() => props.comment.body))

// ─── Timestamp deep-link ──────────────────────────────────────────────────────

function onTimestampClick() {
  const router = useRouter()
  router.push({ hash: `#comment-${props.comment.id}` })
}

const fullTimestamp = computed(() => {
  try {
    return formatLocaleDateTime(new Date(props.comment.createdAt))
  } catch {
    return ''
  }
})
const reactionState = useArticleReactions(
  'comment',
  computed(() => props.comment.id),
  computed(() => props.comment.reactions),
)
const commentReactions = reactionState.reactions
const {
  open: reactPickerOpen,
  buttonDesktopRef: reactButtonDesktopRef,
  pickerEl: reactionPickerEl,
  pickerStyle: reactionPickerStyle,
  toggle: toggleReactionPicker,
  pick: pickReaction,
} = useCommentReactionPicker((reactionId, emoji) => reactionState.toggle(reactionId, emoji))

const replyTooltip = computed(() => tinyTooltip('Reply'))
const reactTooltip = computed(() => tinyTooltip('React'))
const shareTooltip = computed(() => tinyTooltip('Share'))

type MenuItemWithIcon = MenuItem & { iconName?: string }
const { mounted: shareMenuMounted, menuRef: shareMenuRef, toggle: toggleShareMenu } = useAutoToggleMenu()

const highlightColor = computed(() => {
  if (props.visibility === 'premiumOnly') return '#f97316'
  if (props.visibility === 'verifiedOnly') return '#3b82f6'
  return '#a1a1aa'
})

const { copyLink, buildMenuItems } = useCommentRowActions({
  linkUrl: () => `${window.location.origin}/a/${props.articleId}#comment-${props.comment.id}`,
  copySuccess: { title: 'Link copied!', message: 'Reply link copied to clipboard.', tone: 'success' },
  copyFailure: (url) => ({ title: 'Reply link', message: url }),
})
async function onShare() {
  moreMenuRef.value?.close()
  await copyLink()
}
const shareMenuItems = computed<MenuItemWithIcon[]>(() => buildMenuItems({}).map((item) => ({ ...item, command: () => void onShare() })))

const replyCountDisplay = computed(() => Math.max(0, Math.floor(Number(props.comment.replyCount ?? 0))))

const commentAge = computed(() => formatCompactAge(props.comment.createdAt))
</script>

<style scoped>
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
