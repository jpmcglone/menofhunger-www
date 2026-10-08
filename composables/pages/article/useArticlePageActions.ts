import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import { surfaceMenuItems } from '~/utils/surface-actions'
import type { ArticleSharePreview } from '~/types/api'
import { useAutoToggleMenu } from '~/composables/useAutoToggleMenu'
import { siteConfig } from '~/config/site'
import { articleShareUrl } from '~/utils/acquisition-share'
import type { useArticlePageContent } from './useArticlePage'

/**
 * Tipping, author hover cards, view tracking, realtime counts and crosspost status,
 * comment deep links, delete/report/share, boost and reaction state, and the
 * auth-gated engagement handlers.
 */
export function useArticlePageActions(ctx: ReturnType<typeof useArticlePageContent>) {
  const { route, id, apiFetchData, isAuthed, user, markReadBySubject, showAuthActionModal, gateKind, article, viewerIsAuthor } = ctx

  // ─── Tip ────────────────────────────────────────────────────────────────────
  const TIP_PRESETS = [1, 3, 5, 10] as const
  const tipOpen = ref(false)
  const tipAmount = ref<number | null>(3)
  const tipLoading = ref(false)
  const canTip = computed(
    () =>
      isAuthed.value &&
      user.value?.verifiedStatus !== 'none' &&
      !viewerIsAuthor.value &&
      article.value?.author?.verifiedStatus !== 'none' &&
      Boolean(article.value?.author?.username),
  )

  // Hover preview trigger
  const { onEnter: authorEnter, onMove: authorMove, onLeave: authorLeave } = useUserPreviewTrigger({
    username: computed(() => article.value?.author?.username ?? ''),
  })

  const isHydrated = ref(false)

  // ─── View tracking (scroll-based) ────────────────────────────────────────────
  // A sentinel placed at the article midpoint triggers the view count after the
  // reader has kept it visible for 2 s (dwell threshold).
  const viewSentinelEl = ref<HTMLElement | null>(null)
  const { observe: observeArticleView, trackOnDwell: trackArticleViewOnDwell } = useArticleViewTracker()

  // ─── Realtime live updates ────────────────────────────────────────────────────
  const presence = usePresence()
  const liveCommentCount = ref<number | null>(null)
  const liveViewCount = ref<number | null>(null)
  const liveTotalViewCount = ref<number | null>(null)
  const articleViewAcks = useState<Record<string, { viewCount: number, totalViewCount: number, uniqueCounted?: boolean }>>('article-view-acks', () => ({}))

  const displayCommentCount = computed(() => liveCommentCount.value ?? article.value?.commentCount ?? 0)
  const displayViewCount = computed(() => {
    const id = article.value?.id
    const ack = id ? articleViewAcks.value[id] : null
    return liveViewCount.value ?? ack?.viewCount ?? article.value?.viewCount ?? 0
  })
  const displayTotalViewCount = computed(() => {
    const id = article.value?.id
    const ack = id ? articleViewAcks.value[id] : null
    const unique = displayViewCount.value
    return Math.max(
      unique,
      liveTotalViewCount.value ?? ack?.totalViewCount ?? article.value?.totalViewCount ?? unique,
    )
  })
  const hasViewedArticle = computed(() => {
    if (article.value?.viewerHasViewed === true) return true
    const id = article.value?.id
    if (!id) return false
    return articleViewAcks.value[id]?.uniqueCounted === true
  })

  const { pending: crosspostPending, settle: settleCrosspost } = useCrosspostPending()
  const crosspostWaiting = computed(() => crosspostPending.value[article.value?.id ?? ''] ?? { pickax: false, x: false })

  const articlesCallback: import('~/composables/usePresence').ArticlesCallback = {
    onLiveUpdated(payload) {
      if (payload.articleId !== article.value?.id || !article.value) return
      const current = article.value
      let next = current
      if (typeof payload.patch.pickaxUrl === 'string') {
        next = { ...next, pickaxUrl: payload.patch.pickaxUrl, pickaxError: null }
        settleCrosspost(current.id, 'pickax')
      }
      if (typeof payload.patch.xUrl === 'string') {
        next = { ...next, xUrl: payload.patch.xUrl, xError: null }
        settleCrosspost(current.id, 'x')
      }
      if (typeof payload.patch.pickaxError === 'string') {
        next = { ...next, pickaxError: payload.patch.pickaxError }
        settleCrosspost(current.id, 'pickax')
      }
      if (typeof payload.patch.xError === 'string') {
        next = { ...next, xError: payload.patch.xError }
        settleCrosspost(current.id, 'x')
      }
      if (next !== current) article.value = next
      if (payload.patch.commentCount !== undefined) liveCommentCount.value = payload.patch.commentCount
      if (payload.patch.viewCount !== undefined) {
        liveViewCount.value = Math.max(liveViewCount.value ?? 0, payload.patch.viewCount)
      }
      if (payload.patch.totalViewCount !== undefined) {
        liveTotalViewCount.value = Math.max(liveTotalViewCount.value ?? 0, payload.patch.totalViewCount)
      }
      if (payload.patch.boostCount !== undefined) boostState.count.value = payload.patch.boostCount
      if (payload.patch.reactions !== undefined) reactionState.reactions.value = payload.patch.reactions
      if (payload.reason === 'article_deleted' || payload.patch.deletedAt) article.value = undefined
    },
  }

  watch(article, (value) => {
    if (!value?.id) return
    if (value.pickaxUrl || value.pickaxError) settleCrosspost(value.id, 'pickax')
    if (value.xUrl || value.xError) settleCrosspost(value.id, 'x')
  })

  function onArticleViewSynced(payload: { viewerCount: number, totalViewCount: number }) {
    liveViewCount.value = Math.max(liveViewCount.value ?? 0, payload.viewerCount)
    liveTotalViewCount.value = Math.max(liveTotalViewCount.value ?? 0, payload.totalViewCount)
  }

  let stopObservingView: (() => void) | null = null

  // ─── Comment deep-link (hash = #comment-<id>) ────────────────────────────────
  const highlightedCommentId = ref<string | null>(null)

  function extractCommentIdFromHash(hash: string): string | null {
    const m = hash.match(/^#?comment-(.+)$/)
    return m?.[1] ?? null
  }

  function commentIdFromRoute(): string | null {
    const fromHash = extractCommentIdFromHash(route.hash)
    if (fromHash) return fromHash
    const q = route.query.comment
    return typeof q === 'string' && q.trim() ? q : null
  }

  /**
   * Scroll the custom middle scroller the minimum amount needed to bring `el`
   * fully into view, with `padding` px of breathing room above and below.
   * If the element is already fully visible, nothing happens.
   */
  function scrollIntoViewIfNeeded(el: HTMLElement, padding = 20) {
    const scroller = document.getElementById('moh-middle-scroller')
    if (!scroller) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return
    }
    const scrollerRect = scroller.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const relTop = elRect.top - scrollerRect.top
    const relBottom = elRect.bottom - scrollerRect.top
    const viewHeight = scroller.clientHeight

    if (relTop < padding) {
      scroller.scrollBy({ top: relTop - padding, behavior: 'smooth' })
    } else if (relBottom > viewHeight - padding) {
      scroller.scrollBy({ top: relBottom - viewHeight + padding, behavior: 'smooth' })
    }
  }

  function scrollToComment(commentId: string) {
    const el = document.getElementById(`comment-${commentId}`)
    if (!el) return
    scrollIntoViewIfNeeded(el)
    highlightedCommentId.value = commentId
    setTimeout(() => { highlightedCommentId.value = null }, 4000)
  }

  const closeTipPopover = () => { tipOpen.value = false }

  usePresenceCallback('Articles', articlesCallback)
  onMounted(() => {
    isHydrated.value = true
    document.addEventListener('click', closeTipPopover)

    // Comment deep-link polling is started by the article watcher below,
    // so it only begins once the article (and its comments section) have mounted.
  })

  watch(
    () => article.value?.id,
    (articleId, prevId) => {
      if (prevId) presence.unsubscribeArticles([prevId])
      if (articleId) presence.subscribeArticles([articleId])
    },
    { immediate: true },
  )

  watch(
    [() => article.value?.id, () => isAuthed.value],
    ([articleId, authed]) => {
      if (!authed || !articleId) return
      void markReadBySubject({ article_id: articleId })
    },
    { immediate: true },
  )

  watch(
    () => route.hash,
    () => {
      const commentId = commentIdFromRoute()
      if (commentId) scrollToComment(commentId)
    },
  )

  // ─── Comment deep-link: poll until the target comment element appears ─────────
  // Start only after the article loads (ensures AppArticleComments is mounted).
  // Uses double-rAF once found so the scroll fires after the layout is stable.
  let deepLinkInterval: ReturnType<typeof setInterval> | null = null

  watch(
    article,
    (art) => {
      if (!art || deepLinkInterval !== null) return
      const commentId = commentIdFromRoute()
      if (!commentId) return

      highlightedCommentId.value = commentId

      const POLL_MS = 150
      const TIMEOUT_MS = 10_000
      let elapsed = 0
      deepLinkInterval = setInterval(() => {
        elapsed += POLL_MS
        const el = document.getElementById(`comment-${commentId}`)
        if (el) {
          clearInterval(deepLinkInterval!)
          deepLinkInterval = null
          // Double rAF: ensures the scroll fires after the browser has painted
          // the newly-added comment nodes and the layout is fully stable.
          requestAnimationFrame(() => requestAnimationFrame(() => scrollToComment(commentId)))
        } else if (elapsed >= TIMEOUT_MS) {
          clearInterval(deepLinkInterval!)
          deepLinkInterval = null
        }
      }, POLL_MS)
    },
    { immediate: true },
  )

  // Attach scroll observer once the sentinel element is rendered.
  // Guard: never track views for articles the viewer cannot access.
  watch(viewSentinelEl, (el) => {
    stopObservingView?.()
    stopObservingView = null
    if (el && article.value?.id && article.value.viewerCanAccess !== false) {
      stopObservingView = observeArticleView(article.value.id, el)
    }
  })

  // Page-dwell view tracker: counts a view after 5 s on the page even if the
  // reader never scrolls to the end sentinel.  Works for logged-out visitors
  // (anon_id cookie) and logged-in users alike, matching how post feed rows
  // count views when visible in the feed without requiring a full scroll-through.
  let stopDwellTracking: (() => void) | null = null
  watch(
    () => article.value?.id,
    (articleId) => {
      stopDwellTracking?.()
      stopDwellTracking = null
      if (articleId && article.value?.viewerCanAccess !== false) {
        stopDwellTracking = trackArticleViewOnDwell(articleId)
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (article.value?.id) presence.unsubscribeArticles([article.value.id])
    stopObservingView?.()
    stopObservingView = null
    stopDwellTracking?.()
    stopDwellTracking = null
    document.removeEventListener('click', closeTipPopover)
    if (deepLinkInterval) {
      clearInterval(deepLinkInterval)
      deepLinkInterval = null
    }
  })

  const articleBoostCount = computed(() =>
    Math.max(0, isHydrated.value ? boostState.count.value : (article.value?.boostCount ?? 0)),
  )

  // Comments ref for scroll + focus
  const commentsEl = ref<{ focusCompose: () => void; composeTextareaEl: HTMLTextAreaElement | null } | null>(null)

  function scrollToComments() {
    const textarea = commentsEl.value?.composeTextareaEl
    if (textarea) {
      scrollIntoViewIfNeeded(textarea)
      setTimeout(() => textarea.focus({ preventScroll: true }), 300)
    } else {
      const section = document.getElementById('comments')
      if (section) scrollIntoViewIfNeeded(section)
      setTimeout(() => commentsEl.value?.focusCompose(), 350)
    }
  }

  // Share menu — using the same PrimeVue Menu popup pattern as PostRowShareMenu
  const toast = useAppToast()
  const { run } = useAsyncAction()

  async function sendTip() {
    const amt = tipAmount.value
    const username = article.value?.author?.username
    if (!amt || amt < 1 || !username || tipLoading.value) return
    tipLoading.value = true
    await run(async () => {
      const title = (article.value?.title ?? '').trim()
      const note = title ? `Tip on "${title}"` : 'Tip from article'
      await apiFetchData('/coins/transfer', {
        method: 'POST',
        body: { recipientUsername: username, amount: Math.trunc(amt), note },
      })
      tipOpen.value = false
      tipAmount.value = 3
      toast.push({
        title: `${Math.trunc(amt)} coin${amt === 1 ? '' : 's'} sent!`,
        message: `To ${article.value?.author?.name || username}`,
        tone: 'success',
        to: '/coins',
        durationMs: 3000,
      })
    }, { error: (e) => (e instanceof Error ? e.message : 'Failed to send tip.'), durationMs: 2500 })
    tipLoading.value = false
  }
  const confirmingArticleDelete = ref(false)
  const deletingArticle = ref(false)
  async function deleteArticle() {
    if (deletingArticle.value) return
    deletingArticle.value = true
    await run(async () => {
      await apiFetchData(`/articles/${id.value}`, { method: 'DELETE' })
      toast.push({ title: 'Article deleted', tone: 'success' })
      await navigateTo('/articles')
    }, { error: 'Could not delete the article.', durationMs: 3000, onError: () => { deletingArticle.value = false } })
  }
  const showArticleReport = ref(false)
  const sharing = ref(false)
  const shareCommentModalOpen = ref(false)
  useOverlayDismiss(shareCommentModalOpen, () => (shareCommentModalOpen.value = false))
  const shareCommentText = ref('')

  const { mounted: shareMenuMounted, menuRef: shareMenuRef, toggle: toggleShareMenu } = useAutoToggleMenu()

  const shareMenuItems = computed(() => surfaceMenuItems([
    { id: 'copy', label: 'Copy link', icon: 'tabler:link', section: 'share', run: onCopyLink },
    { id: 'share', label: 'Share to feed', icon: 'tabler:repeat', section: 'share', available: isAuthed.value && article.value?.viewerCanAccess !== false, run: onShareToFeed },
    { id: 'note', label: 'Share with note', icon: 'tabler:message-share', section: 'share', available: isAuthed.value && article.value?.viewerCanAccess !== false, run: onShareWithComment },
    { id: 'report', label: 'Report article', icon: 'tabler:flag', section: 'moderation', available: isAuthed.value && article.value?.viewerCanAccess !== false, run: () => { showArticleReport.value = true } },
  ]))

  const { ensureReferralCode } = useEnsureReferralCode()

  async function onCopyLink() {
    await run(async () => {
      const articleId = article.value?.id
      const ref = await ensureReferralCode()
      await navigator.clipboard.writeText(articleId ? articleShareUrl(articleId, ref) : window.location.href)
      toast.push({ title: 'Link copied!', tone: 'success' })
    }, { error: () => 'Could not copy link' })
  }

  async function onShareToFeed() {
    if (!article.value) return
    sharing.value = true
    await run(async () => {
      const articleUrl = `${siteConfig.url}/a/${article.value!.id}`
      await apiFetchData('/posts', {
        method: 'POST',
        body: { body: articleUrl, visibility: 'public' },
      })
      toast.push({ title: 'Shared to your feed!', tone: 'success' })
    }, { error: () => 'Could not share article.' })
    sharing.value = false
  }

  function onShareWithComment() {
    shareCommentText.value = ''
    shareCommentModalOpen.value = true
  }

  async function onSubmitShareWithComment() {
    if (!article.value) return
    sharing.value = true
    await run(async () => {
      const articleUrl = `${siteConfig.url}/a/${article.value!.id}`
      const comment = shareCommentText.value.trim()
      const body = comment ? `${comment}\n\n${articleUrl}` : articleUrl
      await apiFetchData('/posts', {
        method: 'POST',
        body: { body, visibility: 'public' },
      })
      shareCommentModalOpen.value = false
      toast.push({ title: 'Shared to your feed!', tone: 'success' })
    }, { error: () => 'Could not share article.' })
    sharing.value = false
  }

  // Share preview (for the modal)
  const articleSharePreview = computed<ArticleSharePreview | null>(() => {
    const a = article.value
    if (!a) return null
    return {
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      thumbnailUrl: a.thumbnailUrl,
      visibility: a.visibility,
      publishedAt: a.publishedAt,
      author: a.author,
      viewerCanAccess: a.viewerCanAccess,
    }
  })

  // Boost state
  const boostState = useArticleBoost(
    computed(() => article.value?.id ?? ''),
    computed(() => article.value?.viewerHasBoosted ?? false),
    computed(() => article.value?.boostCount ?? 0),
  )

  // Reaction state
  const reactionState = useArticleReactions(
    'article',
    computed(() => article.value?.id ?? ''),
    computed(() => article.value?.reactions ?? []),
  )

  function guardedBoost() {
    if (!isAuthed.value) {
      showAuthActionModal({ kind: 'login', action: 'article-boost' })
      return
    }
    if (article.value?.viewerCanAccess === false) {
      showAuthActionModal({ kind: gateKind.value, action: 'article-boost' })
      return
    }
    boostState.toggle()
  }

  function guardedScrollToComments() {
    if (!isAuthed.value) {
      showAuthActionModal({ kind: 'login', action: 'article-comment' })
      return
    }
    if (article.value?.viewerCanAccess === false) {
      showAuthActionModal({ kind: gateKind.value, action: 'article-comment' })
      return
    }
    scrollToComments()
  }

  function guardedReact(reactionId: string, emoji: string) {
    if (!isAuthed.value) {
      showAuthActionModal({ kind: 'login', action: 'article-react' })
      return
    }
    if (article.value?.viewerCanAccess === false) {
      showAuthActionModal({ kind: gateKind.value, action: 'article-react' })
      return
    }
    reactionState.toggle(reactionId, emoji)
  }

  return {
    TIP_PRESETS,
    tipOpen,
    tipAmount,
    tipLoading,
    canTip,
    authorEnter,
    authorMove,
    authorLeave,
    isHydrated,
    viewSentinelEl,
    displayCommentCount,
    displayViewCount,
    displayTotalViewCount,
    hasViewedArticle,
    crosspostWaiting,
    onArticleViewSynced,
    highlightedCommentId,
    articleBoostCount,
    commentsEl,
    sendTip,
    confirmingArticleDelete,
    deletingArticle,
    deleteArticle,
    showArticleReport,
    sharing,
    shareCommentModalOpen,
    shareCommentText,
    shareMenuMounted,
    shareMenuRef,
    toggleShareMenu,
    shareMenuItems,
    onSubmitShareWithComment,
    articleSharePreview,
    boostState,
    reactionState,
    guardedBoost,
    guardedScrollToComments,
    guardedReact,
  }
}
