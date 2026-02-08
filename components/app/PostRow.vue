<template>
  <div
    ref="rowEl"
    :data-post-id="post.id"
    :class="[
      'relative overflow-visible px-4 transition-colors',
      compact ? 'py-2' : 'py-4',
      noPaddingBottom ? 'pb-0' : '',
      noPaddingTop ? 'pt-0' : '',
      showThreadLineAboveAvatar && !noPaddingTop ? 'pt-3' : '',
      noBorderBottom ? '' : 'border-b moh-border',
      clickable ? 'cursor-pointer rounded-lg group' : '',
      highlight ? highlightClass : ''
    ]"
    :style="rowStyle"
    @click="onRowClick"
  >
    <!-- Animated background: white at 0, opacity up on hover (main.css), back to 0 on mouse out -->
    <div
      v-if="clickable"
      class="moh-post-row-hover-bg pointer-events-none absolute inset-0 z-0 rounded-lg"
      aria-hidden="true"
    />
    <!-- Overlay: line from top down to just above avatar (gap); no overextend -->
    <div
      v-if="showThreadLineAboveAvatar"
      class="pointer-events-none absolute left-4 z-10 flex w-10 justify-center"
      :style="threadLineAboveOverlayStyle"
      aria-hidden="true"
    >
      <div
        class="w-[2px]"
        :class="threadLineTint ? '' : 'bg-gray-200 dark:bg-zinc-700'"
        :style="threadLineAboveStyle"
      />
    </div>
    <!-- Overlay: line from just below avatar (gap) to row bottom; no overextend -->
    <div
      v-if="showThreadLineBelowAvatar"
      class="pointer-events-none absolute left-4 z-10 flex w-10 justify-center"
      :style="threadLineBelowOverlayStyle"
      aria-hidden="true"
    >
      <div
        class="w-[2px] h-full"
        :class="threadLineTint ? '' : 'bg-gray-200 dark:bg-zinc-700'"
        :style="threadLineBelowStyle"
      />
    </div>
    <div class="flex gap-3" :class="{ 'mt-2': showThreadLineAboveAvatar && noPaddingTop }">
      <div class="shrink-0 flex flex-col w-10">
        <NuxtLink
          v-if="authorProfilePath"
          :to="authorProfilePath"
          class="group shrink-0"
          :aria-label="`View @${post.author.username} profile`"
        >
          <AppUserAvatar
            :user="post.author"
            size-class="h-10 w-10"
            bg-class="moh-surface"
          />
        </NuxtLink>
        <AppUserAvatar
          v-else
          :user="post.author"
          size-class="h-10 w-10"
          bg-class="moh-surface"
        />
      </div>

      <div class="relative z-10 min-w-0 flex-1" :class="{ 'pt-3': showThreadLineAboveAvatar }">
        <div class="relative" @click.stop>
          <AppPostHeaderLine
            :display-name="post.author.name || post.author.username || 'User'"
            :username="post.author.username || ''"
            :verified-status="post.author.verifiedStatus"
            :premium="post.author.premium"
            :premium-plus="post.author.premiumPlus"
            :profile-path="authorProfilePath"
            :post-id="post.id"
            :post-permalink="postPermalink"
            :created-at-short="createdAtShort"
            :created-at-tooltip="createdAtTooltip"
          />

          <AppPostRowMoreMenu :items="moreMenuItems" :tooltip="moreTooltip" />
        </div>

        <div
          v-if="isDeletedPost"
          class="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-zinc-800 dark:bg-black dark:text-white"
        >
          Post deleted.
        </div>
        <AppPostRowBody
          v-else
          :body="post.body"
          :has-media="Boolean(post.media?.length)"
          :mentions="post.mentions"
          :visibility="post.visibility"
        />

        <AppPostMediaGrid v-if="!isDeletedPost && post.media?.length" :media="post.media" :post-id="post.id" :row-in-view="rowInView" />

        <AppPostRowLinkPreview
          v-if="!isDeletedPost"
          :post-id="post.id"
          :body="post.body"
          :has-media="Boolean(post.media?.length)"
          :row-in-view="rowInView"
          :activate-video-on-mount="activateVideoOnMount"
        />

        <div v-if="!isDeletedPost && visibilityTag" class="mt-2 flex items-center justify-between gap-3">
          <span
            v-if="visibilityTag"
            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border cursor-default"
            :class="visibilityTagClass"
            v-tooltip.bottom="visibilityTooltip"
          >
            <Icon v-if="post.visibility === 'onlyMe'" name="tabler:eye-off" class="mr-1 text-[10px]" aria-hidden="true" />
            {{ visibilityTag }}
          </span>
        </div>

          <div v-if="!isDeletedPost" class="mt-3 flex items-center justify-between moh-text-muted">
          <div class="flex items-center gap-1">
            <!-- Reply: hidden for only-me posts -->
            <div v-if="!isOnlyMe" class="inline-flex w-16 items-center justify-start">
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                :class="commentClickable ? 'cursor-pointer' : 'cursor-default opacity-60'"
                aria-label="Reply"
                v-tooltip.bottom="commentTooltip"
                @click.stop="onCommentClick"
              >
                <Icon name="tabler:message-circle" class="text-[18px]" aria-hidden="true" />
              </button>
              <NuxtLink
                v-if="displayedCommentCount > 0"
                :to="postPermalink"
                class="ml-0 inline-block min-w-[1.5rem] select-none text-left text-xs tabular-nums moh-text-muted hover:underline"
                aria-label="View replies"
              >
                {{ commentCountLabel ?? '' }}
              </NuxtLink>
              <span
                v-else
                class="ml-0 inline-block w-6 select-none text-left text-xs tabular-nums moh-text-muted"
                aria-hidden="true"
              >
                {{ commentCountLabel ?? '' }}
              </span>
            </div>

            <div v-if="!isOnlyMe" class="inline-flex w-16 items-center justify-start">
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                :class="boostClickable ? 'cursor-pointer' : 'cursor-default opacity-60'"
                :aria-label="isBoosted ? 'Remove upvote' : 'Upvote'"
                v-tooltip.bottom="upvoteTooltip"
                @click.stop="onBoostClick"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  aria-hidden="true"
                  :style="isBoosted ? { color: 'var(--p-primary-color)' } : undefined"
                >
                  <!-- Imgur-ish upvote: arrowhead + stem -->
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
              <span class="ml-0 inline-block w-6 select-none text-left text-xs tabular-nums moh-text-muted" aria-hidden="true">
                {{ boostCountLabel ?? '' }}
              </span>
            </div>
          </div>

          <div v-if="!isOnlyMe" class="relative flex items-center justify-end">
            <AppPostRowBookmarkButton
              :post-id="post.id"
              :viewer-can-interact="viewerCanInteract"
              :initial-has-bookmarked="Boolean((post as any)?.viewerHasBookmarked)"
              :initial-collection-ids="((((post as any)?.viewerBookmarkCollectionIds as string[]) ?? []).filter(Boolean))"
            />

            <AppPostRowShareMenu :can-share="canShare" :tooltip="shareTooltip" :items="shareMenuItems" />
          </div>
        </div>

        <!-- Thread footer content (e.g. "View X more replies") -->
        <div v-if="$slots.threadFooter" class="mt-1" @click.stop>
          <slot name="threadFooter" />
        </div>
      </div>
    </div>
  </div>

  <Dialog
    v-if="deleteConfirmOpen"
    v-model:visible="deleteConfirmOpen"
    modal
    header="Delete post?"
    :draggable="false"
    class="w-[min(28rem,calc(100vw-2rem))]"
  >
    <div class="text-sm moh-text-muted">
      This post will show as deleted, but replies will remain visible.
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text :disabled="deleting" @click="deleteConfirmOpen = false" />
      <Button
        label="Delete"
        severity="danger"
        :loading="deleting"
        :disabled="deleting"
        @click="deletePost"
      >
        <template #icon>
          <Icon name="tabler:trash" aria-hidden="true" />
        </template>
      </Button>
    </template>
  </Dialog>

  <AppReportDialog
    v-model:visible="reportOpen"
    target-type="post"
    :subject-post-id="post.id"
    :subject-label="`@${post.author.username || 'user'}`"
    @submitted="onReportSubmitted"
  />
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import type { MenuItem } from 'primevue/menuitem'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { getApiErrorMessage } from '~/utils/api-error'
import { formatShortCount } from '~/utils/text'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { useInViewOnce } from '~/composables/useInViewOnce'

const props = defineProps<{
  post: FeedPost
  clickable?: boolean
  /** When true, visually highlight this row (e.g. the post being viewed on /p/:id). */
  highlight?: boolean
  /** When true, omit the bottom border (e.g. parent in a thread block). */
  noBorderBottom?: boolean
  /** When true, show a vertical line in the avatar column from the bottom of the avatar down (parent in a thread). */
  showThreadLineBelowAvatar?: boolean
  /** When true, show a vertical line from the top of the row down to the top of the avatar (reply in a thread). */
  showThreadLineAboveAvatar?: boolean
  /** When true, omit bottom padding (e.g. parent in a thread block). */
  noPaddingBottom?: boolean
  /** When true, omit top padding (e.g. reply in a thread so lines connect). */
  noPaddingTop?: boolean
  /** When true, activate this post's video as soon as it's ready (e.g. newly posted). */
  activateVideoOnMount?: boolean
  /** When true, use tighter vertical padding (e.g. in reply lists). */
  compact?: boolean
  /** When set, color the thread line by root post visibility (e.g. blue for verified, orange for premium). */
  threadLineTint?: 'verified' | 'premium' | null
}>()
const emit = defineEmits<{
  (e: 'deleted', id: string): void
}>()

const post = computed(() => props.post)
const isDeletedPost = computed(() => Boolean(post.value.deletedAt))
const clickable = computed(() => props.clickable !== false)
const highlightClass = computed(() => {
  if (!props.highlight) return ''
  const v = props.post.visibility
  if (v === 'verifiedOnly') return 'moh-post-highlight moh-post-highlight-verified'
  if (v === 'premiumOnly') return 'moh-post-highlight moh-post-highlight-premium'
  if (v === 'onlyMe') return 'moh-post-highlight moh-post-highlight-onlyme'
  return 'moh-post-highlight'
})
// Thread line overlays: 2px; stay within row, gap between line and avatar (no overextend).
const THREAD_LINE_GAP = 4
const AVATAR_H = 40
// When showThreadLineAboveAvatar && noPaddingTop we add mt-2 (8px) so avatar starts at 8; line above 0–4px, gap 4px.
// When showThreadLineAboveAvatar && !noPaddingTop we have pt-3 (12px); line above 0–8px, gap 4px, avatar at 12.
const threadLineAboveOverlayStyle = computed(() => ({ top: '0' }))
const threadLineAboveOverlayHeight = computed(() =>
  props.noPaddingTop ? '4px' : '8px',
)
const threadLineAboveStyle = computed(() => {
  const base = { height: threadLineAboveOverlayHeight.value }
  if (props.threadLineTint === 'verified') return { ...base, backgroundColor: 'var(--moh-verified)' }
  if (props.threadLineTint === 'premium') return { ...base, backgroundColor: 'var(--moh-premium)' }
  return base
})
const threadLineBelowStyle = computed(() => {
  if (props.threadLineTint === 'verified') return { backgroundColor: 'var(--moh-verified)' }
  if (props.threadLineTint === 'premium') return { backgroundColor: 'var(--moh-premium)' }
  return undefined
})
// Line below starts (avatar bottom + gap). Avatar top: 8 when line above + noPaddingTop (mt-2), 12 when line above + pt-3, 8/16 when no line above (py-2/py-4).
const threadLineBelowOverlayStyle = computed(() => {
  const avatarTop = props.showThreadLineAboveAvatar
    ? props.noPaddingTop
      ? 8
      : 12
    : props.compact
      ? 8
      : 16
  const top = avatarTop + AVATAR_H + THREAD_LINE_GAP
  return { top: `${top}px`, bottom: '0' }
})
const rowStyle = computed(() => ({
  contentVisibility: 'auto' as const,
  containIntrinsicSize: '240px',
}))

// Resource preservation: only do heavy work (metadata fetch + embeds) when the row is near viewport.
const rowEl = ref<HTMLElement | null>(null)
const { inView: rowInView } = useInViewOnce(rowEl, { root: null, rootMargin: '800px 0px', threshold: 0.01 })
const { user, me: refetchMe } = useAuth()
const isAuthed = computed(() => Boolean(user.value?.id))
const viewerHasUsername = computed(() => Boolean(user.value?.usernameIsSet))
const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const isSelf = computed(() => Boolean(user.value?.id && user.value.id === post.value.author.id))
const { apiFetchData } = useApiClient()
const { show: showAuthActionModal } = useAuthActionModal()
const boostState = useBoostState()

const isOnlyMe = computed(() => post.value.visibility === 'onlyMe')
const viewerIsAdmin = computed(() => Boolean(user.value?.siteAdmin))
const viewerCanInteract = computed(() => {
  if (isDeletedPost.value) return false
  // Admin viewing someone else's Only-me post should be read-only.
  if (isOnlyMe.value && viewerIsAdmin.value && !isSelf.value) return false
  return true
})
const canBoost = computed(() => {
  // Only-me posts don't need boosts.
  if (isOnlyMe.value) return false
  return viewerCanInteract.value && isAuthed.value && viewerHasUsername.value
})
const canComment = computed(() => viewerCanInteract.value && isAuthed.value && viewerIsVerified.value)
const canShare = computed(() => {
  // Sharing private posts is confusing; keep it read-only.
  if (isOnlyMe.value) return false
  return viewerCanInteract.value
})

const upvoteTooltip = computed(() => {
  if (isOnlyMe.value) return tinyTooltip('Boosts are not available for Only me posts')
  if (!viewerCanInteract.value) return tinyTooltip('Boost')
  if (!isAuthed.value) return tinyTooltip('Log in to boost')
  if (!viewerHasUsername.value) return tinyTooltip('Set a username to boost')
  const text = isBoosted.value ? 'Unboost' : 'Boost'
  return tinyTooltip(text)
})
const shareTooltip = computed(() => tinyTooltip('Share'))
const moreTooltip = computed(() => tinyTooltip('More'))
const commentTooltip = computed(() => {
  if (!viewerCanInteract.value) return tinyTooltip('Reply')
  if (!isAuthed.value) return tinyTooltip('Log in to reply')
  if (!viewerIsVerified.value) return tinyTooltip('Verify to reply')
  return tinyTooltip('Reply')
})

const boostClickable = computed(() => {
  return viewerCanInteract.value && (!isAuthed.value || viewerHasUsername.value)
})
const commentClickable = computed(() => viewerCanInteract.value)

const authorProfilePath = computed(() => {
  const username = (post.value.author.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const visibilityTag = computed(() => {
  return visibilityTagLabel(post.value.visibility)
})

const visibilityTagClass = computed(() => {
  return visibilityTagClasses(post.value.visibility)
})

const visibilityTooltip = computed(() => {
  if (post.value.visibility === 'verifiedOnly') return tinyTooltip('Visible to verified members')
  if (post.value.visibility === 'premiumOnly') return tinyTooltip('Visible to premium members')
  if (post.value.visibility === 'onlyMe') return tinyTooltip('Visible only to you')
  return null
})

const postPermalink = computed(() => `/p/${encodeURIComponent(post.value.id)}`)
const postShareUrl = computed(() => `${siteConfig.url}${postPermalink.value}`)

function goToPost() {
  return navigateTo(postPermalink.value)
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  // Ignore clicks on any interactive element inside the row.
  return Boolean(
    el.closest(
      [
        'a',
        'button',
        'iframe',
        'input',
        'textarea',
        'select',
        '[role="menu"]',
        '[role="menuitem"]',
        '[data-pc-section]',
      ].join(','),
    ),
  )
}

function onRowClick(e: MouseEvent) {
  if (!clickable.value) return
  if (isInteractiveTarget(e.target)) return
  void goToPost()
}

const createdAtDate = computed(() => new Date(post.value.createdAt))
const createdAtShort = computed(() => formatShortDate(createdAtDate.value))
const createdAtTooltip = computed(() => tinyTooltip(createdAtDate.value.toLocaleString()))

function formatShortDate(d: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`

  const sameYear = now.getFullYear() === d.getFullYear()
  const month = d.toLocaleString(undefined, { month: 'short' })
  const day = d.getDate()
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
}

type MenuItemWithIcon = MenuItem & { iconName?: string }

const moreMenuItems = computed<MenuItemWithIcon[]>(() => {
  const items: MenuItemWithIcon[] = [
    {
      label: post.value.author.username ? `View @${post.value.author.username}` : 'View profile',
      iconName: 'tabler:user',
      command: () => {
        if (!authorProfilePath.value) return
        return navigateTo(authorProfilePath.value)
      },
    },
  ]

  if (isDeletedPost.value) {
    return items
  }

  if (viewerIsAdmin.value) {
    items.push({ separator: true })
    items.push({
      label: adminScoreLabel.value ?? '—',
      iconName: 'tabler:chart-line',
      disabled: true
    })
  }

  if (isAuthed.value && !isSelf.value) {
    items.push({
      label: 'Report post',
      iconName: 'tabler:flag',
      command: () => {
        reportOpen.value = true
      },
    })
  }

  if (isSelf.value) {
    items.push({ separator: true })
    const pinnedPostId = user.value?.pinnedPostId ?? null
    const isPinned = pinnedPostId === post.value.id
    const canPin = post.value.visibility !== 'onlyMe'
    if (isPinned || canPin) {
      items.push({
        label: isPinned ? 'Unpin from profile' : 'Pin to profile',
        iconName: isPinned ? 'tabler:x' : 'tabler:pin',
        command: () => (isPinned ? unpinFromProfile() : pinToProfile()),
      })
    }
    items.push({
      label: 'Delete post',
      iconName: 'tabler:trash',
      class: 'text-red-600 dark:text-red-400',
      command: () => {
        deleteConfirmOpen.value = true
      },
    })
  }

  return items
})

const toast = useAppToast()
const deleteConfirmOpen = ref(false)
const deleting = ref(false)
const reportOpen = ref(false)

function onReportSubmitted() {
  // toast + close handled in dialog
}

async function pinToProfile() {
  if (post.value.visibility === 'onlyMe') {
    toast.push({ title: 'Only-me posts cannot be pinned', tone: 'error', durationMs: 2200 })
    return
  }
  try {
    await apiFetchData<{ pinnedPostId: string }>('/users/me/pinned-post', {
      method: 'PUT',
      body: { postId: post.value.id },
    })
    await refetchMe()
    toast.push({ title: 'Pinned to profile', tone: 'success', durationMs: 1400 })
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to pin.', tone: 'error', durationMs: 2200 })
  }
}

async function unpinFromProfile() {
  try {
    await apiFetchData<{ pinnedPostId: null }>('/users/me/pinned-post', { method: 'DELETE' })
    await refetchMe()
    toast.push({ title: 'Unpinned from profile', tone: 'success', durationMs: 1400 })
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to unpin.', tone: 'error', durationMs: 2200 })
  }
}

async function deletePost() {
  if (deleting.value) return
  deleting.value = true
  try {
    await apiFetchData<{ success: true }>('/posts/' + encodeURIComponent(post.value.id), { method: 'DELETE' })
    emit('deleted', post.value.id)
    toast.push({ title: 'Post deleted', tone: post.value.visibility, durationMs: 1400 })
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to delete post.', tone: 'error', durationMs: 2200 })
  } finally {
    deleting.value = false
    deleteConfirmOpen.value = false
  }
}

const { getCommentCountBump } = usePostCountBumps()
const boostEntry = computed(() => boostState.get(post.value))
const isBoosted = computed(() => boostEntry.value.viewerHasBoosted)
const boostCount = computed(() => boostEntry.value.boostCount)
const boostCountLabel = computed(() => {
  const n = boostCount.value
  if (!n) return null
  return formatShortCount(n)
})
const displayedCommentCount = computed(
  () => (post.value.commentCount ?? 0) + getCommentCountBump(post.value.id),
)
const commentCountLabel = computed(() => {
  const n = displayedCommentCount.value
  if (n === 0) return null
  return formatShortCount(n)
})
const mentionsList = computed(() => {
  const m = post.value.mentions
  if (!m?.length) return []
  return m.map((x) => x.username).filter(Boolean)
})
const mentionsLabel = computed(() => mentionsList.value.length > 0)
const mentionsTooltip = computed(() => {
  const list = mentionsList.value
  if (!list.length) return null
  return tinyTooltip(list.map((u) => `@${u}`).join(', '))
})
const adminScoreLabel = computed(() => {
  if (!viewerIsAdmin.value) return null
  const overall = post.value.internal?.score
  const boost = post.value.internal?.boostScore
  const hasOverall = typeof overall === 'number'
  const hasBoost = typeof boost === 'number'
  if (hasOverall && hasBoost) return `Score: ${overall.toFixed(2)} (boost: ${boost.toFixed(2)})`
  if (hasOverall) return `Score: ${overall.toFixed(2)}`
  if (hasBoost) return `Boost score: ${boost.toFixed(2)}`
  return '—'
})

async function onBoostClick() {
  if (!viewerCanInteract.value) return
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'boost' })
    return
  }
  if (!viewerHasUsername.value) {
    showAuthActionModal({ kind: 'setUsername', action: 'boost' })
    return
  }
  try {
    await boostState.toggleBoost(post.value)
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to boost.', tone: 'error', durationMs: 2200 })
  }
}

const { show: showReplyModal } = useReplyModal()

function onCommentClick() {
  if (!viewerCanInteract.value) return
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'comment' })
    return
  }
  if (!viewerIsVerified.value) {
    showAuthActionModal({ kind: 'verify', action: 'comment' })
    return
  }
  showReplyModal(post.value)
}

const { addInterest, removeInterest } = usePresence()
const authorId = computed(() => props.post?.author?.id)
onMounted(() => {
  const id = authorId.value
  if (id) addInterest([id])
})
onBeforeUnmount(() => {
  const id = authorId.value
  if (id) removeInterest([id])
})

const { copyText: copyToClipboard } = useCopyToClipboard()
function toastToneForPostVisibility(): import('~/composables/useAppToast').AppToastTone {
  const v = post.value.visibility
  if (v === 'verifiedOnly') return 'verifiedOnly'
  if (v === 'premiumOnly') return 'premiumOnly'
  if (v === 'onlyMe') return 'onlyMe'
  return 'public'
}
const shareMenuItems = computed<MenuItemWithIcon[]>(() => [
  {
    label: 'Copy link',
    iconName: 'tabler:link',
    command: async () => {
      if (!import.meta.client) return
      try {
        await copyToClipboard(postShareUrl.value)
        toast.push({ title: 'Post link copied', tone: toastToneForPostVisibility(), durationMs: 1400 })
      } catch {
        toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
      }
    },
  },
])
</script>

