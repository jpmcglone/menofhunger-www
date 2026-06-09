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
      noBorderBottom
        ? ''
        : subtleBorderBottom
          ? 'border-b border-gray-100 dark:border-white/[0.06]'
          : 'border-b moh-border',
      clickable ? 'cursor-pointer group' : '',
      highlight ? highlightClass : '',
      pendingStatus === 'posting' ? 'opacity-70' : '',
      pendingStatus === 'failed' ? 'opacity-90' : '',
    ]"
    :style="rowStyle"
    :role="clickable && postPermalink ? 'link' : undefined"
    :tabindex="clickable && postPermalink ? 0 : undefined"
    @click.capture="onRowClick"
    @auxclick.capture="onRowAuxClick"
    @keydown.enter.prevent="onRowKeydown"
    @keydown.space.prevent="onRowKeydown"
  >
    <!-- Animated background: transparent at 0, opacity up on hover (main.css), back to 0 on mouse out -->
    <div
      v-if="clickable"
      class="moh-post-row-hover-bg pointer-events-none absolute inset-0 z-0"
      :style="hoverBgStyle"
      aria-hidden="true"
    />
    <!-- Full-row background link: sits above the hover bg (z-[1]) but below all content (z-10+).
         Gives proper browser link semantics — middle-click, cmd+click, right-click → "Open in new tab". -->
    <NuxtLink
      v-if="clickable && postPermalink"
      :to="postPermalink"
      class="absolute inset-0 z-[1]"
      tabindex="-1"
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
    <div
      class="relative z-[2] flex gap-2.5 sm:gap-3"
      :class="{
        'mt-2': showThreadLineAboveAvatar && noPaddingTop,
        'pt-3': showThreadLineAboveAvatar && !noPaddingTop,
      }"
    >
      <div class="relative z-20 shrink-0 flex flex-col w-10">
        <!-- Own post + in a space: show context menu instead of direct navigation -->
        <template v-if="showAvatarMenu">
          <button
            type="button"
            class="group shrink-0"
            aria-label="Avatar options"
            @click.stop="toggleAvatarMenu"
          >
            <div ref="avatarEl">
              <AppUserAvatar
                :user="author"
                size-class="h-10 w-10"
                bg-class="moh-surface"
              />
            </div>
          </button>
          <Menu ref="avatarMenuRef" :model="avatarMenuItems" popup>
            <template #item="{ item, props: itemProps }">
              <a v-bind="itemProps.action" class="flex items-center gap-2">
                <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
                <span v-bind="itemProps.label">{{ item.label }}</span>
              </a>
            </template>
          </Menu>
        </template>
        <NuxtLink
          v-else-if="authorProfilePath"
          :to="authorProfilePath"
          class="group shrink-0"
          :aria-label="`View @${author?.username} profile`"
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

      <div class="relative z-10 min-w-0 flex-1">
        <div class="relative">
          <AppPostRowGroupTag v-if="feedGroupTagForRow" :group="feedGroupTagForRow" />
          <AppPostHeaderLine
            :display-name="author.name || author.username || 'User'"
            :username="author.username || ''"
            :verified-status="author.verifiedStatus"
            :premium="author.premium"
            :premium-plus="author.premiumPlus"
            :is-organization="author.isOrganization"
            :steward-badge-enabled="author.stewardBadgeEnabled ?? true"
            :org-affiliations="(author as any).orgAffiliations ?? postView.author?.orgAffiliations"
            :is-bot="postView.author?.isBot ?? false"
            :edited-at="postView.editedAt ?? null"
            :hide-edited-badge="postView.visibility === 'onlyMe'"
            :profile-path="authorProfilePath"
            :post-id="postView.id"
            :post-permalink="postPermalink"
            :created-at-short="createdAtShort"
            :created-at-tooltip="createdAtTooltip"
          />

          <!-- "Replying to" label — shown only when the prop is set (e.g. Notifications page) -->
          <AppPostRowReplyingTo v-if="showReplyingTo" :post="postView" />

          <AppPostRowMoreMenu v-if="!isPendingRow" :items="moreMenuItems" :tooltip="moreTooltip" :on-before-open="ensureAuthorFollowLoaded" />
        </div>

        <component
          :is="postView.checkinDayKey ? NuxtLink : 'div'"
          v-if="!isDeletedPost && postView.kind === 'checkin' && postView.checkinPrompt"
          :to="postView.checkinDayKey ? `/check-ins/day/${postView.checkinDayKey}` : undefined"
          class="mt-3 mb-3 inline-flex min-w-[12rem] max-w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-opacity hover:opacity-80"
          :class="postView.checkinDayKey ? 'cursor-pointer' : ''"
          style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.3)"
          @click.stop
        >
          <div
            class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style="background-color: rgba(var(--moh-checkin-rgb), 0.18)"
          >
            <Icon name="tabler:calendar-check" class="text-[13px]" aria-hidden="true" style="color: var(--moh-checkin)" />
          </div>
          <div class="min-w-0">
            <div class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--moh-checkin); opacity: 0.75">{{ checkinPromptEyebrow }}</div>
            <div class="mt-0.5 text-xs sm:text-[13px] leading-snug moh-text">{{ postView.checkinPrompt }}</div>
          </div>
        </component>

        <div
          v-if="isDeletedPost"
          class="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-semibold text-gray-700 dark:border-zinc-800 dark:bg-black dark:text-white"
        >
          Post deleted.
        </div>

        <!-- Gated post: show partial body (mid-word cut, faded) then gate card -->
        <template v-else-if="isGatedPost">
          <div
            v-if="postView.body"
            class="relative overflow-hidden"
            style="opacity: 0.75; mask-image: linear-gradient(to bottom, black 40%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);"
          >
            <AppPostRowBody
              :body="postView.body"
              :has-media="false"
              :mentions="[]"
              :visibility="postView.visibility"
            />
          </div>
          <button
            type="button"
            class="mt-2 flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-opacity duration-150 hover:opacity-80 active:opacity-60"
            :class="postView.visibility === 'premiumOnly'
              ? 'border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20'
              : 'border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20'"
            @click.stop="onGatedBannerClick"
          >
            <Icon
              name="tabler:lock"
              class="shrink-0 text-[15px]"
              :class="postView.visibility === 'premiumOnly' ? 'text-orange-500' : 'text-blue-500'"
              aria-hidden="true"
            />
            <span
              class="flex-1 text-[13px] font-medium"
              :class="postView.visibility === 'premiumOnly' ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400'"
            >
              {{ postView.visibility === 'premiumOnly' ? 'Become premium to read' : 'Verify to read' }}
            </span>
            <Icon
              name="tabler:arrow-right"
              class="shrink-0 text-[14px]"
              :class="postView.visibility === 'premiumOnly' ? 'text-orange-400 dark:text-orange-500' : 'text-blue-400 dark:text-blue-500'"
              aria-hidden="true"
            />
          </button>
        </template>

        <AppPostRowBody
          v-else
          :body="postView.body"
          :has-media="Boolean(postView.media?.length)"
          :mentions="postView.mentions"
          :visibility="postView.visibility"
        />

        <AppPostPoll
          v-if="!isDeletedPost && !isGatedPost && postView.poll"
          :post-id="postView.id"
          :poll="postView.poll"
          :post-visibility="postView.visibility"
          :viewer-is-author="isSelf"
          :viewer-can-interact="viewerCanInteract"
          @updated="onPollUpdated"
        />

        <AppPostMediaGrid v-if="!isDeletedPost && !isGatedPost && postView.media?.length" :media="postView.media" :post-id="postView.id" :row-in-view="rowInView" />

        <AppPostRowLinkPreview
          v-if="!isDeletedPost && !isGatedPost"
          :post-id="postView.id"
          :body="postView.body"
          :has-media="Boolean(postView.media?.length)"
          :row-in-view="rowInView"
          :activate-video-on-mount="activateVideoOnMount"
          :preloaded-article="postView.article ?? null"
          :quoted-post="postView.quotedPost ?? null"
        />

        <!-- Article share card: rendered directly from API data (no fetch needed).
             PostRowLinkPreview suppresses its own article block when preloadedArticle is set. -->
        <AppArticleShareCard
          v-if="!isDeletedPost && !isGatedPost && postView.kind === 'articleShare' && postView.article"
          :article="postView.article"
        />

        <div v-if="!isDeletedPost && !isGatedPost && metaTags.length" class="mt-3.5 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <template v-for="t in metaTags" :key="t.key">
              <NuxtLink
                v-if="t.to"
                v-tooltip.bottom="t.tooltip"
                :to="t.to"
                class="inline-flex items-center rounded-full py-0.5 text-[11px] font-semibold border cursor-pointer hover:opacity-90 moh-focus"
                :class="[t.class, t.icon ? 'pl-2 pr-2.5' : 'px-2']"
              >
                <Icon v-if="t.icon" :name="t.icon" class="mr-1 text-[10px]" aria-hidden="true" />
                {{ t.label }}
              </NuxtLink>
              <span
                v-else
                v-tooltip.bottom="t.tooltip"
                class="inline-flex items-center rounded-full py-0.5 text-[11px] font-semibold border cursor-default"
                :class="[t.class, t.icon ? 'pl-2 pr-2.5' : 'px-2']"
              >
                <Icon v-if="t.icon" :name="t.icon" class="mr-1 text-[10px]" aria-hidden="true" />
                {{ t.label }}
              </span>
            </template>
          </div>
        </div>

        <AppPostRowPendingBanner v-if="pendingStatus" :post="postView" :status="pendingStatus" />

        <!-- Engagement: typing indicator, "+N new" pill, and the action bar -->
        <AppPostRowActionBar
          :post="postView"
          :source-post="post"
          :author="author"
          :viewer-can-interact="viewerCanInteract"
          :is-gated-post="isGatedPost"
          @bookmark-count-delta="onBookmarkCountDelta"
          @bookmark-state-changed="onBookmarkStateChanged"
          @viewer-count-synced="onViewerCountSynced"
        />

        <!-- Thread footer content (e.g. "View X more replies") -->
        <div v-if="$slots.threadFooter" class="mt-1">
          <slot name="threadFooter" />
        </div>
      </div>
    </div>
  </div>


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
import type { CommunityGroupShell, FeedPost } from '~/types/api'
import { groupPreviewToFeedShell } from '~/utils/community-group-preview'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useInViewOnce } from '~/composables/useInViewOnce'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { usePostRowMenus } from '~/composables/post-row/usePostRowMenus'
import { usePostRowThreadLines } from '~/composables/post-row/usePostRowThreadLines'
import { isPendingLocalId } from '~/composables/usePendingPostsManager'

const props = withDefaults(defineProps<{
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
  /** Group wall: owner can pin a root post to the group feed top. */
  groupWall?: { groupId: string; viewerIsOwner: boolean } | null
  /** Combined feed / discovery: show inline group context in the header column. */
  feedGroup?: CommunityGroupShell | null
  /** Lighter row separator (matches home/profile feel vs default moh-border). */
  subtleBorderBottom?: boolean
  /**
   * When true, show a "Replying to @username" line between the header and body
   * when this post is a reply (has a parentId / parent author). Intended for the
   * Notifications page so viewers know whose post they are replying to.
   */
  showReplyingTo?: boolean
}>(), {
  clickable: true,
})
const emit = defineEmits<{
  (e: 'deleted', id: string): void
  (e: 'edited', payload: { id: string; post: FeedPost }): void
  (e: 'bookmarkUpdated', payload: { postId: string; hasBookmarked: boolean; collectionIds: string[] }): void
  (e: 'groupPinChanged'): void
}>()

const postState = ref(props.post)
watch(
  () => props.post,
  (p) => {
    postState.value = p
  },
)

// Merge the post with any cached realtime deltas (counts, body, flags, boost).
// This is the single read point for all mutable post fields — no matter which feed
// array the post came from, postView always reflects the latest server-confirmed state.
const postCache = usePostCache()
const postView = computed(() => postCache.get(postState.value))

const feedGroupForRow = computed((): CommunityGroupShell | null => {
  if (props.feedGroup) return props.feedGroup
  const gp = postView.value.groupPreview ?? null
  return gp ? groupPreviewToFeedShell(gp) : null
})

const route = useRoute()
const feedGroupTagForRow = computed((): CommunityGroupShell | null => {
  const group = feedGroupForRow.value
  if (!group) return null
  // On a single group wall page, the group context is already obvious.
  if (/^\/g\/[^/]+\/?$/.test(route.path)) return null
  return group
})

function onPollUpdated(poll: any) {
  postState.value = { ...(postState.value as any), poll }
}

const authorSnapshot = computed(() => postView.value?.author ?? null)
const { user: authorOverlay } = useUserOverlay(authorSnapshot)
const author = computed(() => authorOverlay.value ?? authorSnapshot.value ?? ({
  id: '',
  username: '',
  name: 'User',
  verifiedStatus: null,
  premium: false,
  premiumPlus: false,
  isOrganization: false,
  stewardBadgeEnabled: true,
} as any))
const isDeletedPost = computed(() => Boolean(postView.value.deletedAt))
const isGatedPost = computed(() => postView.value.viewerCanAccess === false)

function onGatedBannerClick() {
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'read' })
    return
  }
  if (postView.value.visibility === 'premiumOnly') {
    void navigateTo('/tiers')
  } else {
    void navigateTo('/settings/verification')
  }
}

const pendingStatus = computed<'posting' | 'failed' | null>(() => {
  const s = postView.value._pending
  return s === 'posting' || s === 'failed' ? s : null
})
const isPendingRow = computed(() => pendingStatus.value !== null)

const clickable = computed(() => props.clickable !== false && !isPendingRow.value)
const highlightClass = computed(() => {
  if (!props.highlight) return ''
  const v = postView.value.visibility
  if (v === 'verifiedOnly') return 'moh-post-highlight moh-post-highlight-verified'
  if (v === 'premiumOnly') return 'moh-post-highlight moh-post-highlight-premium'
  if (v === 'onlyMe') return 'moh-post-highlight moh-post-highlight-onlyme'
  return 'moh-post-highlight'
})

const hoverBgStyle = computed(() => {
  const v = postView.value.visibility
  const tierColor =
    v === 'premiumOnly'
      ? 'var(--moh-premium)'
      : v === 'verifiedOnly'
        ? 'var(--moh-verified)'
        : v === 'onlyMe'
          ? 'var(--moh-onlyme)'
          : null
  const darkOpacity = v === 'premiumOnly' || v === 'verifiedOnly' ? '0.05' : '0.01'
  return {
    '--moh-post-row-hover-bg-light': tierColor ?? '#000000',
    '--moh-post-row-hover-bg-dark': tierColor ?? '#ffffff',
    '--moh-post-row-hover-opacity-dark': darkOpacity,
  }
})

const rowStyle = computed(() => ({
  contentVisibility: 'auto' as const,
  containIntrinsicSize: '240px',
  ...(clickable.value ? { cursor: 'pointer' } : {}),
}))

// Resource preservation: only do heavy work (metadata fetch + embeds) when the row is near viewport.
const rowEl = ref<HTMLElement | null>(null)
const { inView: rowInView } = useInViewOnce(rowEl, { root: null, rootMargin: '800px 0px', threshold: 0.01 })

// Thread connector lines: measured against the avatar inside this row.
const avatarEl = ref<HTMLElement | null>(null)
const {
  threadLineAboveOverlayStyle,
  threadLineAboveStyle,
  threadLineBelowOverlayStyle,
  threadLineBelowStyle,
} = usePostRowThreadLines({
  rowEl,
  avatarEl,
  threadLineTint: () => props.threadLineTint,
})

// View tracking: report when this row is ≥50% visible for ≥1s.
// FeedPostRow also tracks the full thread chain; deduplication in usePostViewTracker handles overlap.
const { observe: observeView } = usePostViewTracker()
let stopViewObserve: (() => void) | null = null

onMounted(() => {
  if (!import.meta.client) return
  if (
    rowEl.value
    && postView.value.id
    && postView.value.viewerCanAccess !== false
    && !isPendingLocalId(postView.value.id)
  ) {
    stopViewObserve = observeView([postView.value.id], rowEl.value)
  }
})

onBeforeUnmount(() => {
  stopViewObserve?.()
  stopViewObserve = null
})

const { user, isAuthed } = useAuth()
const { show: showAuthActionModal } = useAuthActionModal()
const isSelf = computed(() => {
  const viewerId = user.value?.id ?? null
  const authorId = author.value?.id ?? authorSnapshot.value?.id ?? null
  return Boolean(viewerId && authorId && viewerId === authorId)
})

const isOnlyMe = computed(() => postView.value.visibility === 'onlyMe')
const viewerIsAdmin = computed(() => Boolean(user.value?.siteAdmin))
const viewerCanInteract = computed(() => {
  if (isDeletedPost.value) return false
  // Admin viewing someone else's Only-me post should be read-only.
  if (isOnlyMe.value && viewerIsAdmin.value && !isSelf.value) return false
  return true
})

const authorBanned = computed(() => Boolean(postView.value.authorBanned ?? postView.value.author?.authorBanned))
const authorProfilePath = computed(() => {
  if (authorBanned.value) return null
  const username = (author.value?.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const isCheckinPost = computed(() => !isDeletedPost.value && postView.value.kind === 'checkin')

function easternDayKeyNow(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

const NuxtLink = resolveComponent('NuxtLink')

const checkinPromptEyebrow = computed(() => {
  const dk = (postView.value.checkinDayKey ?? '').trim()
  if (dk && dk === easternDayKeyNow()) return "TODAY'S PROMPT"
  return 'PROMPT'
})
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
      to: '/check-ins/new',
    })
  }

  return out
})

const postPermalink = computed(() => `/p/${encodeURIComponent(postView.value.id)}`)

function goToPost() {
  return navigateTo(postPermalink.value)
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const raw = target as Node | null
  const el = raw instanceof Element
    ? raw
    : raw?.parentElement ?? null
  if (!el) return false
  // Ignore clicks on any interactive element inside the row.
  return Boolean(
    el.closest(
      [
        'a',
        'button',
        'iframe',
        'video',
        'audio',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '[role="menu"]',
        '[role="menuitem"]',
        '[contenteditable="true"]',
        '[data-post-row-interactive]',
        '[data-pc-section]',
      ].join(','),
    ),
  )
}

function onRowClick(e: MouseEvent) {
  if (!clickable.value) return
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    window.open(postPermalink.value, '_blank')
    return
  }
  void goToPost()
}

function onRowAuxClick(e: MouseEvent) {
  if (!clickable.value) return
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  window.open(postPermalink.value, '_blank')
}

function onRowKeydown(e: KeyboardEvent) {
  if (!clickable.value) return
  if (isInteractiveTarget(e.target)) return
  void goToPost()
}

const createdAtDate = computed(() => new Date(postView.value.createdAt))
const { nowMs } = useNowTicker({ everyMs: 15_000 })
const createdAtShort = computed(() => formatShortDate(createdAtDate.value, nowMs.value))
// Fixed locale for SSR: server and client must produce identical output.
const createdAtTooltip = computed(() =>
  tinyTooltip(createdAtDate.value.toLocaleString('en-US')),
)

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
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
}

// More menu + avatar context menu + their actions (follow/block/pin/edit/delete).
const {
  moreMenuItems,
  moreTooltip,
  ensureAuthorFollowLoaded,
  editOpen,
  reportOpen,
  showAvatarMenu,
  avatarMenuRef,
  avatarMenuItems,
  toggleAvatarMenu,
} = usePostRowMenus({
  postView,
  author,
  isSelf,
  isDeletedPost,
  isGatedPost,
  authorBanned,
  authorProfilePath,
  groupWall: () => props.groupWall,
  onDeleted: (id) => emit('deleted', id),
  onGroupPinChanged: () => emit('groupPinChanged'),
})

function onEdited(payload: { id: string; post: FeedPost }) {
  if (payload?.id !== postView.value.id) return
  postState.value = payload.post
  editOpen.value = false
  emit('edited', payload)
}

function onReportSubmitted() {
  // toast + close handled in dialog
}

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

function onViewerCountSynced(nextTotal: number) {
  if (nextTotal !== Math.max(0, Math.floor(Number(postState.value.viewerCount ?? 0)))) {
    postState.value = { ...postState.value, viewerCount: nextTotal }
  }
}

// Presence interest: keep the author's online status fresh while the row is mounted.
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
</script>
