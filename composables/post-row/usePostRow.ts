import type { CommunityGroupShell, FeedPost, PostAuthor } from '~/types/api'
import type { PostRowEmits, PostRowProps } from './post-row-types'
import { groupPreviewToFeedShell } from '~/utils/community-group-preview'
import { postChainInvolvesAuthor } from '~/utils/post-block'
import { useInViewOnce } from '~/composables/useInViewOnce'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { usePostRowMenus } from '~/composables/post-row/usePostRowMenus'
import { usePostRowCatchUp } from '~/composables/post-row/usePostRowCatchUp'
import { usePostRowDisplay } from '~/composables/post-row/usePostRowDisplay'
import { usePostRowNavigation } from '~/composables/post-row/usePostRowNavigation'
import { usePostRowPatches } from '~/composables/post-row/usePostRowPatches'
import { usePresenceInterest } from '~/composables/presence/usePresenceInterest'
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

  function onPollUpdated(poll: FeedPost['poll']) {
    postCache.patch(postState.value.id, { poll })
    postState.value = { ...postState.value, poll }
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
  } as unknown as PostAuthor)) // placeholder for a post whose author snapshot is missing
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

  const showCatchUpButton = computed(
    () => isAuthed.value && !props.preview && !isPendingRow.value && !isDeletedPost.value,
  )
  const { catchUpResultReady, onCatchMeUp } = usePostRowCatchUp(postView)

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

  const NuxtLink = resolveComponent('NuxtLink')

  const { isCheckinPromptToday, metaTags, createdAtShort, createdAtTooltip } = usePostRowDisplay(postView, isCheckinPost)
  const { postPermalink, boardVariant, onRowClick, onRowAuxClick, onRowKeydown } = usePostRowNavigation(postView, {
    isDeletedPost,
    isPendingRow,
    clickable,
  })
  const { onBookmarkCountDelta, onBookmarkStateChanged, onViewerCountSynced } = usePostRowPatches(postState, postView, emit)
  usePresenceInterest(() => props.post?.author?.id)




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
