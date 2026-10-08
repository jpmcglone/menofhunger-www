import { formatLocaleDateTime } from '~/utils/time-format'
import { formatCount } from '~/utils/number-format'
import type { CommunityGroupShell, FeedPost } from '~/types/api'
import type { PostRowEmits, PostRowProps } from './post-row-types'
import { groupPreviewToFeedShell } from '~/utils/community-group-preview'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { postChainInvolvesAuthor } from '~/utils/post-block'
import { boardPostHref } from '~/utils/board-links'
import { useInViewOnce } from '~/composables/useInViewOnce'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { usePostRowMenus } from '~/composables/post-row/usePostRowMenus'
import { usePostRowThreadLines } from '~/composables/post-row/usePostRowThreadLines'
import { isPendingLocalId } from '~/composables/usePendingPostsManager'

/**
 * Script state for `AppPostRow`: the cache-merged post view, author overlay, row
 * chrome (classes, hover tint, thread lines), view tracking, Catch me up, menus,
 * row navigation, and count/bookmark sync. The row template stays in the SFC.
 */
export function usePostRow(props: PostRowProps, emit: PostRowEmits) {
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
  // Blocking promises "you won't see their posts": hide rows by, replying to, or embedding them.
  const { blockedIds } = useBlockState()
  const hiddenByBlock = computed(() => postChainInvolvesAuthor(postView.value, blockedIds.value))

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
    postCache.patch(postState.value.id, { poll })
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
  } as any))
  const isDeletedPost = computed(() => Boolean(postView.value.deletedAt))
  const isGatedPost = computed(() => postView.value.viewerCanAccess === false)
  const displayViewerCount = computed(() => Math.max(0, Math.floor(Number(postView.value.viewerCount ?? 0))))
  const displayTotalViewCount = computed(() =>
    Math.max(displayViewerCount.value, Math.floor(Number(postView.value.totalViewCount ?? displayViewerCount.value))),
  )
  const hydrated = useState<boolean>('moh-hydrated', () => false)
  const hasViewedPost = computed(() =>
    postView.value.viewerHasViewed === true
      || (hydrated.value && hasViewedLocally(postView.value.id)),
  )

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
  const rowBorderClass = computed(() => {
    if (props.noBorderBottom) return ''
    return props.subtleBorderBottom ? 'border-b border-gray-100 dark:border-white/[0.06]' : 'border-b moh-border'
  })
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
    // Public light hover is white-on-bone; it needs more opacity than a black wash to read.
    const lightOpacity = tierColor ? '0.1' : '0.55'
    return {
      '--moh-post-row-hover-bg-light': tierColor ?? '#ffffff',
      '--moh-post-row-hover-bg-dark': tierColor ?? '#ffffff',
      '--moh-post-row-hover-opacity-light': lightOpacity,
      '--moh-post-row-hover-opacity-dark': darkOpacity,
    }
  })

  const rowStyle = computed(() => ({
    contentVisibility: 'auto' as const,
    containIntrinsicSize: '240px',
    ...(clickable.value ? { cursor: 'pointer' } : {}),
  }))

  // Resource preservation: only do heavy work (metadata fetch + embeds) when the row is near viewport.
  // Use the middle scroller as IntersectionObserver root so margin is relative to the visible pane,
  // not the document viewport. 250px gives one-ish row of pre-load without triggering work 800px away.
  const rowEl = ref<HTMLElement | null>(null)
  const middleScrollerEl = useMiddleScroller()
  const { inView: rowInView } = useInViewOnce(rowEl, { root: middleScrollerEl, rootMargin: '250px 0px', threshold: 0.01 })

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
  // FeedPostRow observes the wrapper for the full chain — pass trackViews=false there.
  const { observe: observeView, noteAlreadyViewed, hasViewedLocally } = usePostViewTracker()
  let stopViewObserve: (() => void) | null = null

  function captureBoardRow(value: unknown) {
    rowEl.value = (value as { $el?: HTMLElement } | null)?.$el ?? null
  }

  function bindViewObserve() {
    stopViewObserve?.()
    stopViewObserve = null
    if (!import.meta.client) return
    if (props.trackViews === false) return
    if (
      rowEl.value
      && postView.value.id
      && postView.value.viewerCanAccess !== false
      && !isPendingLocalId(postView.value.id)
    ) {
      if (postView.value.viewerHasViewed === true) {
        noteAlreadyViewed(postView.value.id)
      }
      const gid = (postView.value.communityGroupId ?? '').trim()
      stopViewObserve = observeView([postView.value.id], rowEl.value, {
        groupIdByPostId: gid ? { [postView.value.id]: gid } : undefined,
        root: middleScrollerEl.value ?? null,
      })
    }
  }

  watch(
    [rowEl, middleScrollerEl, () => postView.value.id, () => props.trackViews],
    () => { bindViewObserve() },
    { flush: 'post' },
  )
  onMounted(() => { bindViewObserve() })

  onBeforeUnmount(() => {
    stopViewObserve?.()
    stopViewObserve = null
  })

  const { user, isAuthed } = useAuth()
  /** Author-only cross-post failure: the API sends `pickaxError` only to the author. */
  const pickaxError = computed(() => {
    const message = (postView.value.pickaxError ?? '').trim()
    if (!message) return null
    return user.value?.id && user.value.id === postView.value.author?.id ? message : null
  })
  const xError = computed(() => {
    const message = (postView.value.xError ?? '').trim()
    if (!message) return null
    return user.value?.id && user.value.id === postView.value.author?.id ? message : null
  })
  const { show: showAuthActionModal } = useAuthActionModal()
  const isSelf = computed(() => {
    const viewerId = user.value?.id ?? null
    const authorId = author.value?.id ?? authorSnapshot.value?.id ?? null
    return Boolean(viewerId && authorId && viewerId === authorId)
  })

  // Marv "Catch me up": offered to every signed-in viewer on every real post row. Marv
  // summarizes the post itself plus any thread above/below it, and can pull in broader
  // context (web search / current events) so it's useful even on a lone post. Opening the
  // modal is free; generating a summary spends credits (gated server-side; non-premium
  // sees an upsell).
  const { show: showCatchUp, post: catchUpPost, result: catchUpResult } = useMarvCatchUp()
  const showCatchUpButton = computed(
    () => isAuthed.value && !props.preview && !isPendingRow.value && !isDeletedPost.value,
  )
  // In-session signal: this post's summary is already loaded in global state.
  const catchUpSessionReady = computed(
    () => catchUpPost.value?.id === postView.value.id && !!catchUpResult.value,
  )
  // Persisted signal: we saw a summary for this post recently enough that the server cache
  // should still have it. The initial read is deferred to onMounted because localStorage is
  // client-only and reading it during setup would render a different icon class than SSR
  // emitted. The watcher covers this row being recycled for a different post while scrolling.
  const catchUpPersistedReady = ref(false)
  onMounted(() => {
    catchUpPersistedReady.value = isPostCaughtUp(postView.value.id)
  })
  watch(
    () => postView.value.id,
    (id) => {
      catchUpPersistedReady.value = isPostCaughtUp(id)
    },
  )
  // Combined: high-contrast icon when a result is either in-session or should still be cached.
  watch(catchUpSessionReady, (ready) => {
    if (ready) catchUpPersistedReady.value = true
  })
  const catchUpResultReady = computed(() => catchUpSessionReady.value || catchUpPersistedReady.value)
  function onCatchMeUp() {
    showCatchUp(postView.value)
  }

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
  const isStatusPost = computed(() => !isDeletedPost.value && postView.value.kind === 'status')

  function easternDayKeyNow(): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
    } catch {
      return new Date().toISOString().slice(0, 10)
    }
  }

  const NuxtLink = resolveComponent('NuxtLink')

  const isCheckinPromptToday = computed(() => {
    const dk = (postView.value.checkinDayKey ?? '').trim()
    return Boolean(dk && dk === easternDayKeyNow())
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
        label: 'Check-in answer',
        class: 'moh-tag-checkin',
        tooltip: tinyTooltip('Daily check-in'),
        icon: 'tabler:calendar-check',
        to: '/check-ins/new',
      })
    }

    return out
  })

  const postPermalink = computed(() => boardPostHref(postView.value) ?? `/p/${encodeURIComponent(postView.value.id)}`)
  /** Board threads and comments render as Board rows; deleted or pending ones keep the post shell. */
  const boardVariant = computed<'post' | 'comment' | null>(() => {
    if (postView.value.kind !== 'board' || isDeletedPost.value || isPendingRow.value) return null
    return postView.value.parentId ? 'comment' : 'post'
  })

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
    tinyTooltip(formatLocaleDateTime(createdAtDate.value)),
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
    const month = formatLocaleDateTime(d, { month: 'short' })
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
    onDeleted: (id) => {
      postCache.patch(id, { deletedAt: new Date().toISOString() })
      emit('deleted', id)
    },
    onGroupPinChanged: () => emit('groupPinChanged'),
  })

  // Edit and report dialogs own their dismissal and unsaved-change guards.

  function onEdited(payload: { id: string; post: FeedPost }) {
    if (payload?.id !== postView.value.id) return
    postCache.patch(payload.id, payload.post)
    postState.value = payload.post
    editOpen.value = false
    emit('edited', payload)
  }

  const repostersPostId = ref<string | null>(null)

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

  function onViewerCountSynced(payload: { viewerCount: number, totalViewCount: number }) {
    const nextUnique = Math.max(0, Math.floor(Number(payload.viewerCount ?? 0)))
    const nextTotal = Math.max(nextUnique, Math.floor(Number(payload.totalViewCount ?? 0)))
    const currentUnique = Math.max(0, Math.floor(Number(postState.value.viewerCount ?? 0)))
    const currentTotal = Math.max(currentUnique, Math.floor(Number(postState.value.totalViewCount ?? currentUnique)))
    if (nextUnique === currentUnique && nextTotal === currentTotal) return
    postState.value = {
      ...postState.value,
      viewerCount: Math.max(currentUnique, nextUnique),
      totalViewCount: Math.max(currentTotal, nextTotal),
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

  return {
    postView,
    hiddenByBlock,
    feedGroupTagForRow,
    onPollUpdated,
    author,
    isDeletedPost,
    isGatedPost,
    displayViewerCount,
    displayTotalViewCount,
    hasViewedPost,
    onGatedBannerClick,
    pendingStatus,
    isPendingRow,
    clickable,
    rowBorderClass,
    highlightClass,
    hoverBgStyle,
    rowStyle,
    rowEl,
    rowInView,
    avatarEl,
    threadLineAboveOverlayStyle,
    threadLineAboveStyle,
    threadLineBelowOverlayStyle,
    threadLineBelowStyle,
    captureBoardRow,
    pickaxError,
    xError,
    isSelf,
    showCatchUpButton,
    catchUpResultReady,
    onCatchMeUp,
    isOnlyMe,
    viewerCanInteract,
    authorProfilePath,
    NuxtLink,
    isCheckinPromptToday,
    metaTags,
    postPermalink,
    boardVariant,
    onRowClick,
    onRowAuxClick,
    onRowKeydown,
    createdAtShort,
    createdAtTooltip,
    moreMenuItems,
    moreTooltip,
    ensureAuthorFollowLoaded,
    editOpen,
    reportOpen,
    showAvatarMenu,
    avatarMenuRef,
    avatarMenuItems,
    toggleAvatarMenu,
    onEdited,
    repostersPostId,
    onReportSubmitted,
    onBookmarkCountDelta,
    onBookmarkStateChanged,
    onViewerCountSynced,
  }
}
