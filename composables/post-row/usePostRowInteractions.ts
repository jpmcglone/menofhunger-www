import type { ComputedRef } from 'vue'
import type { FeedPost } from '~/types/api'
import type { MenuItem } from 'primevue/menuitem'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'

export type PostRowMenuItem = MenuItem & { iconName?: string }

/**
 * Engagement-bar interactions for a post row: boost, reply, repost (+menu),
 * share menu, and the gated/blocked/unauthenticated guard flows around them.
 *
 * Owned by the action-bar component; the parent row supplies the merged
 * `postView` plus viewer context, and receives bookmark mutations via the
 * `onBookmark*` callbacks.
 */
export function usePostRowInteractions(opts: {
  /** Merged (cache-overlaid) post — the single read point for mutable fields. */
  postView: ComputedRef<FeedPost>
  /** The original `post` prop — used for quote/share/bookmark dialogs. */
  sourcePost: () => FeedPost
  author: ComputedRef<{ id?: string | null; username?: string | null } | null>
  viewerCanInteract: ComputedRef<boolean>
  isGatedPost: ComputedRef<boolean>
  /** Open/toggle the repost menu anchored to the clicked button. */
  toggleRepostMenu: (anchorEl: HTMLElement) => void
  onBookmarkStateChanged: (payload: { hasBookmarked: boolean; collectionIds: string[] }) => void
  onBookmarkCountDelta: (delta: number) => void
}) {
  const { postView, sourcePost, author, viewerCanInteract, isGatedPost } = opts

  const { user, isAuthed, isVerified: viewerIsVerified, isPremium: viewerIsPremium } = useAuth()
  const viewerHasUsername = computed(() => Boolean(user.value?.usernameIsSet))
  const toast = useAppToast()
  const { show: showAuthActionModal } = useAuthActionModal()
  const boostState = useBoostState()
  const repostState = useRepostState()

  const isOnlyMe = computed(() => postView.value.visibility === 'onlyMe')

  // Block status from the post's API response (server-computed).
  const viewerBlockStatus = computed(() => postView.value.viewerBlockStatus ?? null)
  const isBlockedWithAuthor = computed(() => viewerBlockStatus.value !== null)
  const blockReasonText = computed(() => {
    if (viewerBlockStatus.value === 'viewer_blocked') {
      const handle = author.value?.username ? `@${author.value.username}` : 'this user'
      return `You've blocked ${handle}. Unblock them to engage with their posts.`
    }
    if (viewerBlockStatus.value === 'viewer_blocked_by') {
      const handle = author.value?.username ? `@${author.value.username}` : 'This user'
      return `${handle} has blocked you. You can view their posts but can't engage with them.`
    }
    return null
  })

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
    if (isBlockedWithAuthor.value) return tinyTooltip('Blocked')
    const text = isBoosted.value ? 'Unboost' : 'Boost'
    return tinyTooltip(text)
  })
  const shareTooltip = computed(() => tinyTooltip('Share'))
  const commentTooltip = computed(() => {
    if (!viewerCanInteract.value) return tinyTooltip('Reply')
    if (!isAuthed.value) return tinyTooltip('Log in to reply')
    if (!viewerIsVerified.value) return tinyTooltip('Verify to reply')
    if (isBlockedWithAuthor.value) return tinyTooltip('Blocked')
    return tinyTooltip('Reply')
  })

  const boostClickable = computed(() => {
    if (isBlockedWithAuthor.value) return true // clickable but shows block toast
    return viewerCanInteract.value && (!isAuthed.value || viewerHasUsername.value)
  })
  const commentClickable = computed(() => {
    if (isBlockedWithAuthor.value) return true // clickable but shows block toast
    return viewerCanInteract.value
  })

  const postPermalink = computed(() => `/p/${encodeURIComponent(postView.value.id)}`)
  const postShareUrl = computed(() => `${siteConfig.url}${postPermalink.value}`)

  // ── Boost ──────────────────────────────────────────────────────────────────
  const { getCommentCountBump } = usePostCountBumps()
  const boostEntry = computed(() => boostState.get(postView.value))
  const isBoosted = computed(() => boostEntry.value.viewerHasBoosted)
  const boostCount = computed(() => boostEntry.value.boostCount)

  async function onBoostClick() {
    if (!viewerCanInteract.value) return
    if (isGatedPost.value) {
      const kind = postView.value.visibility === 'premiumOnly' ? 'premium' : 'verify'
      showAuthActionModal({ kind, action: 'boost' })
      return
    }
    if (isBlockedWithAuthor.value && blockReasonText.value) {
      toast.push({ title: 'Can\'t boost', message: blockReasonText.value, tone: 'error', durationMs: 3500 })
      return
    }
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

  // ── Reply ──────────────────────────────────────────────────────────────────
  const { show: showReplyModal } = useReplyModal()
  const displayedCommentCount = computed(
    () => (postView.value.commentCount ?? 0) + getCommentCountBump(postView.value.id),
  )

  function onCommentClick() {
    if (!viewerCanInteract.value) return
    if (isGatedPost.value) {
      const kind = postView.value.visibility === 'premiumOnly' ? 'premium' : 'verify'
      showAuthActionModal({ kind, action: 'comment' })
      return
    }
    if (isBlockedWithAuthor.value && blockReasonText.value) {
      toast.push({ title: 'Can\'t reply', message: blockReasonText.value, tone: 'error', durationMs: 3500 })
      return
    }
    if (!isAuthed.value) {
      showAuthActionModal({ kind: 'login', action: 'comment' })
      return
    }
    if (!viewerIsVerified.value) {
      showAuthActionModal({ kind: 'verify', action: 'comment' })
      return
    }

    // Flat repost: reply goes to the original post, but also mentions the reposter.
    const post = postView.value
    if (post.kind === 'repost' && post.repostedPost) {
      const reposterUsername = post.author?.username
      showReplyModal(post.repostedPost, reposterUsername ? [reposterUsername] : [])
      return
    }

    showReplyModal(post)
  }

  // ── Repost ─────────────────────────────────────────────────────────────────
  const repostEntry = computed(() => repostState.get(postView.value))
  const isReposted = computed(() => repostEntry.value.viewerHasReposted)
  const repostCount = computed(() => repostEntry.value.repostCount)
  const repostActiveColor = computed(() => {
    const v = postView.value.visibility
    if (v === 'verifiedOnly') return 'var(--moh-verified)'
    if (v === 'premiumOnly') return 'var(--moh-premium)'
    if (v === 'onlyMe') return 'var(--moh-onlyme)'
    return 'var(--p-primary-color)'
  })
  const repostTooltip = computed(() => {
    if (!isAuthed.value) return tinyTooltip('Log in to repost')
    if (!viewerIsVerified.value) return tinyTooltip('Verify to repost')
    if (!viewerHasUsername.value) return tinyTooltip('Set a username to repost')
    return isReposted.value ? tinyTooltip('Repost options') : tinyTooltip('Repost')
  })

  const openComposerKey = inject(MOH_OPEN_COMPOSER_KEY, null)

  function onRepostClick(e: MouseEvent) {
    if (!viewerCanInteract.value) return
    if (isGatedPost.value) {
      const kind = postView.value.visibility === 'premiumOnly' ? 'premium' : 'verify'
      showAuthActionModal({ kind, action: 'boost' })
      return
    }
    if (!isAuthed.value) {
      showAuthActionModal({ kind: 'login', action: 'repost' as any })
      return
    }
    if (!viewerIsVerified.value) {
      showAuthActionModal({ kind: 'verify', action: 'repost' as any })
      return
    }
    if (!viewerHasUsername.value) {
      showAuthActionModal({ kind: 'setUsername', action: 'repost' as any })
      return
    }
    opts.toggleRepostMenu(e.currentTarget as HTMLElement)
  }

  async function onRepostMenuRepost() {
    try {
      await repostState.toggleRepost(postView.value)
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to repost.')
    }
  }

  function onRepostMenuQuote() {
    if (!openComposerKey) {
      toast.push({ title: 'Could not open composer', tone: 'error', durationMs: 2000 })
      return
    }
    openComposerKey({ quotedPost: sourcePost() })
  }

  // ── Counts ─────────────────────────────────────────────────────────────────
  const bookmarkCountValue = computed(() =>
    Math.max(0, Math.floor(Number(postView.value.bookmarkCount ?? 0))),
  )
  const viewerCount = computed(() => Math.max(0, Math.floor(Number(postView.value.viewerCount ?? 0))))

  // ── Gated guard for the right-side items (bookmark/share) ─────────────────
  function onGatedRightSideClick() {
    const kind = postView.value.visibility === 'premiumOnly' ? 'premium' : 'verify'
    showAuthActionModal({ kind, action: 'bookmark' })
  }

  // Click-capture guard for the bookmark + share items: only intercepts clicks when
  // the post is gated, so the unauth-prompt fires instead of letting the inner
  // button toggle. For non-gated posts the event passes through untouched.
  function onMaybeGatedRightSideClick(event: MouseEvent) {
    if (!isGatedPost.value) return
    event.stopPropagation()
    event.preventDefault()
    onGatedRightSideClick()
  }

  // ── Share menu ─────────────────────────────────────────────────────────────
  const { copyText: copyToClipboard } = useCopyToClipboard()
  const { isSupported: nativeShareSupported } = useWebShare()
  const { openDialog: openSendViaChat } = useSendViaChat()
  const { openDialog: openBookmarkDialog } = useBookmarkDialog()

  function toastToneForPostVisibility(): import('~/composables/useAppToast').AppToastTone {
    const v = postView.value.visibility
    if (v === 'verifiedOnly') return 'verifiedOnly'
    if (v === 'premiumOnly') return 'premiumOnly'
    if (v === 'onlyMe') return 'onlyMe'
    return 'public'
  }

  const postMediaItems = computed(() => postView.value.media ?? [])
  const postHasVideo = computed(() => postMediaItems.value.some((m) => m.kind === 'video'))
  const postHasImage = computed(() => postMediaItems.value.some((m) => m.kind === 'image' || m.kind === 'gif'))

  const shareMenuItems = computed<PostRowMenuItem[]>(() => {
    const items: PostRowMenuItem[] = []

    // Send via chat — verified or premium users only
    if (isAuthed.value && (viewerIsVerified.value || viewerIsPremium.value)) {
      items.push({
        label: 'Send via chat',
        iconName: 'tabler:send',
        command: () => {
          openSendViaChat(sourcePost())
        },
      })
    }

    // Copy link — always visible when canShare
    items.push({
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
    })

    // Share via OS sheet — only when the browser supports navigator.share().
    // We await nextTick so the menu finishes closing before the sheet opens;
    // modern browsers preserve user activation across microtasks so navigator.share()
    // remains permitted after the await.
    if (nativeShareSupported.value) {
      const url = postShareUrl.value
      items.push({
        label: 'Share via…',
        iconName: 'tabler:share-2',
        command: async () => {
          if (!import.meta.client || !navigator.share) return
          await nextTick()
          navigator.share({ title: 'Men of Hunger', url }).catch(() => {})
        },
      })
    }

    // Bookmark to folder — authed users only
    if (isAuthed.value) {
      items.push({
        label: 'Bookmark to folder',
        iconName: 'tabler:bookmark',
        command: () => {
          openBookmarkDialog({
            post: sourcePost(),
            hasBookmarked: Boolean(postView.value.viewerHasBookmarked),
            collectionIds: (postView.value.viewerBookmarkCollectionIds ?? []).filter(Boolean),
            onChange(state, delta) {
              opts.onBookmarkStateChanged({ hasBookmarked: state.hasBookmarked, collectionIds: state.collectionIds })
              if (delta !== 0) opts.onBookmarkCountDelta(delta)
            },
          })
        },
      })
    }

    // Post video / Post image — verified viewers, only when the post has that media type
    if (viewerIsVerified.value) {
      if (postHasVideo.value) {
        items.push({
          label: 'Post video',
          iconName: 'tabler:video',
          command: () => {
            onRepostMenuQuote()
          },
        })
      }
      if (postHasImage.value) {
        items.push({
          label: 'Post image',
          iconName: 'tabler:photo',
          command: () => {
            onRepostMenuQuote()
          },
        })
      }
    }

    return items
  })

  return {
    isOnlyMe,
    isBlockedWithAuthor,
    blockReasonText,
    postPermalink,
    // reply
    commentClickable,
    commentTooltip,
    displayedCommentCount,
    onCommentClick,
    // repost
    isReposted,
    repostCount,
    repostActiveColor,
    repostTooltip,
    onRepostClick,
    onRepostMenuRepost,
    onRepostMenuQuote,
    // boost
    isBoosted,
    boostCount,
    boostClickable,
    upvoteTooltip,
    onBoostClick,
    // counts
    bookmarkCountValue,
    viewerCount,
    // share
    canShare,
    shareTooltip,
    shareMenuItems,
    onMaybeGatedRightSideClick,
  }
}
