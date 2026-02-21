<template>
  <div
    ref="rowEl"
    :data-post-id="postView.id"
    :class="[
      'relative overflow-visible moh-gutter-x transition-colors',
      compact ? 'py-1.5 sm:py-2' : 'py-3 sm:py-4',
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
      class="pointer-events-none absolute left-[var(--moh-gutter-x)] z-10 flex w-10 justify-center"
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
      class="pointer-events-none absolute left-[var(--moh-gutter-x)] z-10 flex w-10 justify-center"
      :style="threadLineBelowOverlayStyle"
      aria-hidden="true"
    >
      <div
        class="w-[2px] h-full"
        :class="threadLineTint ? '' : 'bg-gray-200 dark:bg-zinc-700'"
        :style="threadLineBelowStyle"
      />
    </div>
    <div class="flex gap-2.5 sm:gap-3" :class="{ 'mt-2': showThreadLineAboveAvatar && noPaddingTop }">
      <div class="relative z-20 shrink-0 flex flex-col w-10">
        <NuxtLink
          v-if="authorProfilePath"
          :to="authorProfilePath"
          class="group shrink-0"
          :aria-label="`View @${author.username} profile`"
        >
          <div ref="avatarEl">
            <AppUserAvatar
              :user="author"
              size-class="h-10 w-10"
              bg-class="moh-surface"
            />
          </div>
        </NuxtLink>
        <div v-else ref="avatarEl">
          <AppUserAvatar
            :user="author"
            size-class="h-10 w-10"
            bg-class="moh-surface"
          />
        </div>
      </div>

      <div class="relative z-10 min-w-0 flex-1" :class="{ 'pt-3': showThreadLineAboveAvatar }">
        <div class="relative" @click.stop>
          <AppPostHeaderLine
            :display-name="author.name || author.username || 'User'"
            :username="author.username || ''"
            :verified-status="author.verifiedStatus"
            :premium="author.premium"
            :premium-plus="author.premiumPlus"
            :is-organization="author.isOrganization"
            :steward-badge-enabled="author.stewardBadgeEnabled ?? true"
            :edited-at="postView.editedAt ?? null"
            :hide-edited-badge="postView.visibility === 'onlyMe'"
            :profile-path="authorProfilePath"
            :post-id="postView.id"
            :post-permalink="postPermalink"
            :created-at-short="createdAtShort"
            :created-at-tooltip="createdAtTooltip"
          />

          <AppPostRowMoreMenu :items="moreMenuItems" :tooltip="moreTooltip" />
        </div>

        <div
          v-if="!isDeletedPost && postView.kind === 'checkin'"
          class="mt-2 rounded-lg moh-surface/50 px-2.5 py-2 sm:px-3 sm:py-2.5"
        >
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span v-if="postView.checkinPrompt" class="text-xs sm:text-[13px] moh-text-muted opacity-80">
              {{ postView.checkinPrompt }}
            </span>
          </div>
        </div>

        <div
          v-if="isDeletedPost"
          class="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-semibold text-gray-700 dark:border-zinc-800 dark:bg-black dark:text-white"
        >
          Post deleted.
        </div>
        <AppPostRowBody
          v-else
          :body="postView.body"
          :has-media="Boolean(postView.media?.length)"
          :mentions="postView.mentions"
          :visibility="postView.visibility"
        />

        <AppPostPoll
          v-if="!isDeletedPost && postView.poll"
          :post-id="postView.id"
          :poll="postView.poll"
          :post-visibility="postView.visibility"
          :viewer-is-author="isSelf"
          :viewer-can-interact="viewerCanInteract"
          @updated="onPollUpdated"
        />

        <AppPostMediaGrid v-if="!isDeletedPost && postView.media?.length" :media="postView.media" :post-id="postView.id" :row-in-view="rowInView" />

        <AppPostRowLinkPreview
          v-if="!isDeletedPost"
          :post-id="postView.id"
          :body="postView.body"
          :has-media="Boolean(postView.media?.length)"
          :row-in-view="rowInView"
          :activate-video-on-mount="activateVideoOnMount"
        />

        <div v-if="!isDeletedPost && metaTags.length" class="mt-2 flex items-center justify-between gap-3">
          <!-- Stop propagation so Cmd/Ctrl+Click behaves like a normal link (new tab), not row navigation. -->
          <div class="flex items-center gap-2" @click.stop>
            <template v-for="t in metaTags" :key="t.key">
              <NuxtLink
                v-if="t.to"
                :to="t.to"
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border cursor-pointer hover:opacity-90 moh-focus"
                :class="t.class"
                v-tooltip.bottom="t.tooltip"
              >
                <Icon v-if="t.icon" :name="t.icon" class="mr-1 text-[10px]" aria-hidden="true" />
                {{ t.label }}
              </NuxtLink>
              <span
                v-else
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border cursor-default"
                :class="t.class"
                v-tooltip.bottom="t.tooltip"
              >
                <Icon v-if="t.icon" :name="t.icon" class="mr-1 text-[10px]" aria-hidden="true" />
                {{ t.label }}
              </span>
            </template>
          </div>
        </div>

          <div v-if="!isDeletedPost" class="mt-2.5 sm:mt-3 flex items-center justify-between moh-text-muted">
          <div class="flex items-center gap-1">
            <!-- Reply: hidden for only-me posts -->
            <div v-if="!isOnlyMe" class="inline-flex w-16 items-center justify-start">
              <button
                type="button"
                class="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
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
                class="ml-0 inline-block min-w-[1.5rem] select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted hover:underline"
                aria-label="View replies"
              >
                {{ commentCountLabel ?? '' }}
              </NuxtLink>
              <span
                v-else
                class="ml-0 inline-block w-6 select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted"
                aria-hidden="true"
              >
                {{ commentCountLabel ?? '' }}
              </span>
            </div>

            <div v-if="!isOnlyMe" class="inline-flex w-16 items-center justify-start">
              <button
                type="button"
                class="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
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
              <span class="ml-0 inline-block w-6 select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted" aria-hidden="true">
                {{ boostCountLabel ?? '' }}
              </span>
            </div>
          </div>

          <div v-if="!isOnlyMe" class="relative flex items-center justify-end">
            <span class="mr-0 inline-block w-6 select-none text-right text-[11px] sm:text-xs tabular-nums moh-text-muted" aria-hidden="true">
              {{ bookmarkCountLabel ?? '' }}
            </span>
            <AppPostRowBookmarkButton
              :post-id="postView.id"
              :viewer-can-interact="viewerCanInteract"
              :initial-has-bookmarked="Boolean(postView.viewerHasBookmarked)"
              :initial-collection-ids="(postView.viewerBookmarkCollectionIds ?? []).filter(Boolean)"
              @bookmark-count-delta="onBookmarkCountDelta"
              @bookmark-state-changed="onBookmarkStateChanged"
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

  <Dialog
    v-if="editOpen"
    v-model:visible="editOpen"
    modal
    header="Edit post"
    :draggable="false"
    class="w-[min(40rem,calc(100vw-2rem))]"
  >
    <AppPostComposer
      auto-focus
      :show-divider="false"
      placeholder="Edit your post…"
      :initial-text="postView.body"
      :locked-visibility="postView.visibility"
      hide-visibility-picker
      disable-media
      :register-unsaved-guard="false"
      mode="edit"
      :edit-post-id="postView.id"
      :edit-post-is-draft="Boolean(postView.isDraft)"
      @edited="onEdited"
    />
  </Dialog>

  <AppReportDialog
    v-model:visible="reportOpen"
    target-type="post"
    :subject-post-id="postView.id"
    :subject-label="`@${author.username || 'user'}`"
    @submitted="onReportSubmitted"
  />
</template>

<script setup lang="ts">
import { inject } from 'vue'
import type { FeedPost } from '~/types/api'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import type { MenuItem } from 'primevue/menuitem'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { formatShortCount } from '~/utils/text'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { useInViewOnce } from '~/composables/useInViewOnce'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { MOH_OPEN_COMPOSER_FROM_ONLYME_KEY } from '~/utils/injection-keys'

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
  (e: 'edited', payload: { id: string; post: FeedPost }): void
  (e: 'bookmarkUpdated', payload: { postId: string; hasBookmarked: boolean; collectionIds: string[] }): void
}>()

const postState = ref(props.post)
watch(
  () => props.post,
  (p) => {
    postState.value = p
  },
)
const postView = computed(() => postState.value)

function onPollUpdated(poll: any) {
  postState.value = { ...(postState.value as any), poll }
}

const { user: author } = useUserOverlay(computed(() => postView.value.author))
const isDeletedPost = computed(() => Boolean(postView.value.deletedAt))
const clickable = computed(() => props.clickable !== false)
const highlightClass = computed(() => {
  if (!props.highlight) return ''
  const v = postView.value.visibility
  if (v === 'verifiedOnly') return 'moh-post-highlight moh-post-highlight-verified'
  if (v === 'premiumOnly') return 'moh-post-highlight moh-post-highlight-premium'
  if (v === 'onlyMe') return 'moh-post-highlight moh-post-highlight-onlyme'
  return 'moh-post-highlight'
})

// Thread line overlays: 2px; stay within row, gap between line and avatar (no overextend).
const THREAD_LINE_GAP = 4
const FALLBACK_AVATAR_H = 40

const avatarEl = ref<HTMLElement | null>(null)
const avatarTopPx = ref(0)
const avatarHPx = ref(FALLBACK_AVATAR_H)
let avatarRo: ResizeObserver | null = null
let avatarResizeRaf = 0

function recomputeAvatarMetrics() {
  if (!import.meta.client) return
  const row = rowEl.value
  const avatar = avatarEl.value
  if (!row || !avatar) return
  const rowRect = row.getBoundingClientRect()
  const avatarRect = avatar.getBoundingClientRect()
  // Clamp to avoid negative top from fractional rounding / transforms.
  avatarTopPx.value = Math.max(0, Math.round(avatarRect.top - rowRect.top))
  avatarHPx.value = Math.max(0, Math.round(avatarRect.height)) || FALLBACK_AVATAR_H
}

function scheduleAvatarMetricsRecompute() {
  if (!import.meta.client) return
  if (avatarResizeRaf) cancelAnimationFrame(avatarResizeRaf)
  avatarResizeRaf = requestAnimationFrame(() => {
    avatarResizeRaf = 0
    recomputeAvatarMetrics()
  })
}

onMounted(() => {
  scheduleAvatarMetricsRecompute()
  if (!import.meta.client) return
  try {
    avatarRo = new ResizeObserver(() => scheduleAvatarMetricsRecompute())
    if (rowEl.value) avatarRo.observe(rowEl.value)
    if (avatarEl.value) avatarRo.observe(avatarEl.value)
    window.addEventListener('resize', scheduleAvatarMetricsRecompute, { passive: true })
  } catch {
    // ignore
  }
})

watch(
  avatarEl,
  (el, prev) => {
    if (!import.meta.client) return
    if (!avatarRo) return
    if (prev) avatarRo.unobserve(prev)
    if (el) {
      avatarRo.observe(el)
      scheduleAvatarMetricsRecompute()
    }
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (avatarResizeRaf) cancelAnimationFrame(avatarResizeRaf)
  avatarResizeRaf = 0
  try {
    window.removeEventListener('resize', scheduleAvatarMetricsRecompute)
  } catch {
    // ignore
  }
  if (avatarRo) {
    try {
      if (rowEl.value) avatarRo.unobserve(rowEl.value)
      if (avatarEl.value) avatarRo.unobserve(avatarEl.value)
      avatarRo.disconnect()
    } catch {
      // ignore
    } finally {
      avatarRo = null
    }
  }
})

// When showThreadLineAboveAvatar: line should end THREAD_LINE_GAP px above the avatar.
const threadLineAboveOverlayStyle = computed(() => ({ top: '0' }))
const threadLineAboveOverlayHeight = computed(() => `${Math.max(0, avatarTopPx.value - THREAD_LINE_GAP)}px`)
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
// Line below starts (avatar bottom + gap), based on measured avatar position.
const threadLineBelowOverlayStyle = computed(() => {
  const top = avatarTopPx.value + avatarHPx.value + THREAD_LINE_GAP
  return { top: `${top}px`, bottom: '0' }
})
const rowStyle = computed(() => ({
  contentVisibility: 'auto' as const,
  containIntrinsicSize: '240px',
}))

// Resource preservation: only do heavy work (metadata fetch + embeds) when the row is near viewport.
const rowEl = ref<HTMLElement | null>(null)
const { inView: rowInView } = useInViewOnce(rowEl, { root: null, rootMargin: '800px 0px', threshold: 0.01 })
const { user, me: refetchMe, isAuthed, isVerified: viewerIsVerified } = useAuth()
const viewerHasUsername = computed(() => Boolean(user.value?.usernameIsSet))
const isSelf = computed(() => Boolean(user.value?.id && user.value.id === (author.value?.id ?? postView.value.author.id)))
const { apiFetchData } = useApiClient()
const { show: showAuthActionModal } = useAuthActionModal()
const boostState = useBoostState()

const isOnlyMe = computed(() => postView.value.visibility === 'onlyMe')
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

const authorBanned = computed(() => Boolean(postView.value.authorBanned ?? postView.value.author?.authorBanned))
const authorProfilePath = computed(() => {
  if (authorBanned.value) return null
  const username = (postView.value.author.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const isCheckinPost = computed(() => !isDeletedPost.value && postView.value.kind === 'checkin')
const metaTags = computed(() => {
  const out: Array<{ key: string; label: string; class: string; tooltip: any; icon?: string | null; to?: string | null }> = []

  // Visibility tag first (Verified/Premium/Only me), if any.
  const vis = visibilityTagLabel(postView.value.visibility)
  if (vis) {
    out.push({
      key: `vis:${postView.value.visibility}`,
      label: vis,
      class: visibilityTagClasses(postView.value.visibility),
      tooltip:
        postView.value.visibility === 'verifiedOnly'
          ? tinyTooltip('Visible to verified members')
          : postView.value.visibility === 'premiumOnly'
            ? tinyTooltip('Visible to premium members')
            : postView.value.visibility === 'onlyMe'
              ? tinyTooltip('Visible only to you')
              : null,
      icon: postView.value.visibility === 'onlyMe' ? 'tabler:eye-off' : null,
    })
  }

  // Check-in tag second (replaces nothing; appends after visibility).
  if (isCheckinPost.value) {
    out.push({
      key: 'kind:checkin',
      label: 'Check in',
      class: 'moh-tag-checkin',
      tooltip: tinyTooltip('Daily check-in'),
      icon: 'tabler:calendar-check',
      to: '/check-ins',
    })
  }

  return out
})

const postPermalink = computed(() => `/p/${encodeURIComponent(postView.value.id)}`)
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

const createdAtDate = computed(() => new Date(postView.value.createdAt))
const { nowMs } = useNowTicker({ everyMs: 15_000 })
const createdAtShort = computed(() => formatShortDate(createdAtDate.value, nowMs.value))
const createdAtTooltip = computed(() => tinyTooltip(createdAtDate.value.toLocaleString()))

function formatShortDate(d: Date, nowMs: number): string {
  const diffMs = Math.max(0, Math.floor((nowMs || 0) - d.getTime()))
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`

  const sameYear = new Date(nowMs).getFullYear() === d.getFullYear()
  const month = d.toLocaleString(undefined, { month: 'short' })
  const day = d.getDate()
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
}

type MenuItemWithIcon = MenuItem & { iconName?: string }

const openComposerFromOnlyMe = inject(MOH_OPEN_COMPOSER_FROM_ONLYME_KEY, null)

const moreMenuItems = computed<MenuItemWithIcon[]>(() => {
  const items: MenuItemWithIcon[] = []
  if (!authorBanned.value) {
    items.push({
      label: postView.value.author.username ? `View @${postView.value.author.username}` : 'View profile',
      iconName: 'tabler:user',
      command: () => {
        if (!authorProfilePath.value) return
        return navigateTo(authorProfilePath.value)
      },
    })
  } else {
    items.push({ label: 'User is banned', iconName: 'tabler:user-off', disabled: true })
  }

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
    if (!isDeletedPost.value && postView.value.visibility === 'onlyMe') {
      items.push({
        label: 'Use as draft',
        iconName: 'tabler:copy',
        command: () => {
          if (!viewerIsVerified.value) {
            showAuthActionModal({ kind: 'verify', action: 'useAsDraft' })
            return
          }
          if (openComposerFromOnlyMe) {
            openComposerFromOnlyMe(postView.value)
            return
          }
          toast.push({
            title: 'Could not open draft composer',
            message: 'Please try again from the Only me page.',
            tone: 'error',
            durationMs: 2400,
          })
        },
      })
    }
    if (canEditPost.value) {
      items.push({
        label: 'Edit post',
        iconName: 'tabler:edit',
        command: () => {
          editOpen.value = true
        },
      })
    }
    const pinnedPostId = user.value?.pinnedPostId ?? null
    const isPinned = pinnedPostId === postView.value.id
    const canPin = postView.value.visibility !== 'onlyMe'
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
const editOpen = ref(false)

const canEditPost = computed(() => {
  if (!isSelf.value) return false
  if (isDeletedPost.value) return false
  // Only-me posts are notes/drafts: allow unlimited edits (no age/edit-count cap).
  if (postView.value.visibility === 'onlyMe') return !Boolean(postView.value.parentId)
  if (postView.value.parentId) return false
  const createdAt = new Date(postView.value.createdAt)
  const ageMs = nowMs.value - createdAt.getTime()
  if (!Number.isFinite(ageMs) || ageMs > 30 * 60 * 1000) return false
  const editCount = Math.max(0, Math.floor(postView.value.editCount ?? 0))
  return editCount < 3
})
const deleteConfirmOpen = ref(false)
const deleting = ref(false)
const reportOpen = ref(false)

function onEdited(payload: { id: string; post: FeedPost }) {
  if (payload?.id !== postView.value.id) return
  postState.value = payload.post
  editOpen.value = false
  emit('edited', payload)
}

function onReportSubmitted() {
  // toast + close handled in dialog
}

async function pinToProfile() {
  if (postView.value.visibility === 'onlyMe') {
    toast.push({ title: 'Only-me posts cannot be pinned', tone: 'error', durationMs: 2200 })
    return
  }
  try {
    await apiFetchData<{ pinnedPostId: string }>('/users/me/pinned-post', {
      method: 'PUT',
      body: { postId: postView.value.id },
    })
    await refetchMe()
    toast.push({ title: 'Pinned to profile', tone: 'success', durationMs: 1400 })
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to pin.')
  }
}

async function unpinFromProfile() {
  try {
    await apiFetchData<{ pinnedPostId: null }>('/users/me/pinned-post', { method: 'DELETE' })
    await refetchMe()
    toast.push({ title: 'Unpinned from profile', tone: 'success', durationMs: 1400 })
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to unpin.')
  }
}

async function deletePost() {
  if (deleting.value) return
  deleting.value = true
  try {
    await apiFetchData<{ success: true }>('/posts/' + encodeURIComponent(postView.value.id), { method: 'DELETE' })
    emit('deleted', postView.value.id)
    toast.push({ title: 'Post deleted', tone: postView.value.visibility, durationMs: 1400 })
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to delete post.')
  } finally {
    deleting.value = false
    deleteConfirmOpen.value = false
  }
}

const { getCommentCountBump } = usePostCountBumps()
const boostEntry = computed(() => boostState.get(postView.value))
const isBoosted = computed(() => boostEntry.value.viewerHasBoosted)
const boostCount = computed(() => boostEntry.value.boostCount)
const boostCountLabel = computed(() => {
  const n = boostCount.value
  if (!n) return null
  return formatShortCount(n)
})

const bookmarkCountLabel = computed(() => {
  const n = Math.max(0, Math.floor(Number(postView.value.bookmarkCount ?? 0)))
  if (!n) return null
  return formatShortCount(n)
})

function onBookmarkCountDelta(delta: number) {
  const d = Math.trunc(Number(delta) || 0)
  if (!d) return
  const next = Math.max(0, Math.floor(Number(postState.value.bookmarkCount ?? 0)) + d)
  postState.value = { ...postState.value, bookmarkCount: next }
}

function onBookmarkStateChanged(payload: { hasBookmarked: boolean; collectionIds: string[] }) {
  const nextHas = Boolean(payload?.hasBookmarked)
  const nextCollectionIds = Array.isArray(payload?.collectionIds) ? payload.collectionIds.filter(Boolean) : []
  postState.value = {
    ...postState.value,
    viewerHasBookmarked: nextHas,
    viewerBookmarkCollectionIds: nextCollectionIds,
  }
  emit('bookmarkUpdated', {
    postId: postView.value.id,
    hasBookmarked: nextHas,
    collectionIds: nextCollectionIds,
  })
}
const displayedCommentCount = computed(
  () => (postView.value.commentCount ?? 0) + getCommentCountBump(postView.value.id),
)
const commentCountLabel = computed(() => {
  const n = displayedCommentCount.value
  if (n === 0) return null
  return formatShortCount(n)
})
const mentionsList = computed(() => {
  const m = postView.value.mentions
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
  const overall = postView.value.internal?.score
  const boost = postView.value.internal?.boostScore
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
    await boostState.toggleBoost(postView.value)
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to boost.')
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
  showReplyModal(postView.value)
}

const { addInterest, removeInterest } = usePresence()
const authorId = computed(() => props.post?.author?.id)
watch(
  authorId,
  (next, prev) => {
    if (!import.meta.client) return
    const prevId = typeof prev === 'string' ? prev : null
    const nextId = typeof next === 'string' ? next : null
    if (prevId && prevId !== nextId) removeInterest([prevId])
    if (nextId && nextId !== prevId) addInterest([nextId])
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (!import.meta.client) return
  const id = authorId.value
  if (id) removeInterest([id])
})

const { copyText: copyToClipboard } = useCopyToClipboard()
function toastToneForPostVisibility(): import('~/composables/useAppToast').AppToastTone {
  const v = postView.value.visibility
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

