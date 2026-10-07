import { usePostPermalinkMedia } from '~/composables/usePostPermalink'
import { usePostPermalinkSeo } from '~/composables/usePostPermalinkSeo'
import type { LinkMetadata } from '~/utils/link-metadata'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { computeAlignDelta, findInnermostPostEl, isUsableHighlightTarget, readTitleBarOffset } from '~/utils/align-highlighted-post-scroll'
import type { usePostPageRoute, usePostPagePost , usePostPageConversation } from './usePostPage'
import type { usePostPageThread } from './usePostPageThread'

export interface CatchUpPillState { lastSeenCount: number; dismissedCount: number | null }
// Scroll the highlighted reply so its top sits just under the sticky title bar.
// Load-only: run once per post visit while layout settles. Do not re-run when the
// selected post is patched in place (boost, bookmark, live counts, edits).
export type FeedPostRowExposed = { getHighlightedEl: () => HTMLElement | null }

/**
 * Error copy, link metadata and SEO, the catch-me-up pill, and highlighted-post
 * scroll alignment.
 */
export function usePostPageMeta(ctx: ReturnType<typeof usePostPageRoute> & ReturnType<typeof usePostPagePost> & ReturnType<typeof usePostPageConversation> & ReturnType<typeof usePostPageThread>) {
  const { route, requestURL, postId, apiFetchData, highlightedPostRef, isAuthed, viewerIsVerified, viewerIsPremium, post, errorText, accessHint, apiErrorStatus, commentCountDisplay, isRestricted } = ctx

  const showServerErrorCta = computed(
    () =>
      Boolean(errorText.value) &&
      accessHint.value === 'none' &&
      (apiErrorStatus.value >= 500 || apiErrorStatus.value === 0),
  )

  const {
    previewLink,
    bodyTextSansLinks,
    primaryMedia,
    extraOgMediaUrls,
    primaryVideo,
  } = usePostPermalinkMedia({
    post,
    requestURL,
  })

  const linkMetaKey = computed(() => {
    const u = (previewLink.value ?? '').trim()
    return `post:${postId.value}:linkmeta:${u || 'none'}`
  })

  const { data: linkMetaData } = useAsyncData(
    linkMetaKey,
    async () => {
      if (!post.value || post.value.viewerCanAccess === false) return null
      if ((post.value.media ?? []).filter((m) => m && !m.deletedAt && (m.url ?? '').trim()).length) return null
      const url = (previewLink.value ?? '').trim()
      if (!url) return null
      try {
        return await apiFetchData<LinkMetadata | null>('/link-metadata', {
          method: 'GET',
          query: { url },
          timeout: 3000,
        })
      } catch {
        return null
      }
    },
    { server: false, watch: [previewLink] },
  )

  const linkMeta = computed<LinkMetadata | null>(() => (linkMetaData.value as LinkMetadata | null) ?? null)

  const restrictionLabel = computed(() => {
    const v = post.value?.visibility
    if (v === 'verifiedOnly') return 'Verified-only post'
    if (v === 'premiumOnly') return 'Premium-only post'
    if (v === 'onlyMe') return 'Private post'
    if (accessHint.value === 'verifiedOnly') return 'Verified-only post'
    if (accessHint.value === 'premiumOnly') return 'Premium-only post'
    if (accessHint.value === 'private') return 'Private post'
    return 'Post'
  })

  const restrictionSeoDescription = computed(() => {
    const v = post.value?.visibility
    const hint = accessHint.value
    if (v === 'verifiedOnly' || hint === 'verifiedOnly') return 'This post is only available to verified members.'
    if (v === 'premiumOnly' || hint === 'premiumOnly') return 'This post is only available to premium members.'
    if (v === 'onlyMe' || hint === 'private') return 'This post is private and only available to its author.'
    return 'Post.'
  })

  usePostPermalinkSeo({
    postId,
    post,
    errorText,
    isRestricted,
    restrictionLabel,
    restrictionSeoDescription,
    previewLink,
    linkMeta,
    primaryMedia,
    extraOgMediaUrls,
    primaryVideo,
    bodyTextSansLinks,
  })

  const showLoginCta = computed(() => {
    if (isAuthed.value) return false
    return accessHint.value !== 'none'
  })

  const errorTitle = computed(() => {
    if (!errorText.value) return ''
    if (accessHint.value !== 'none') return restrictionLabel.value
    return 'Post unavailable'
  })

  const errorBody = computed(() => {
    if (!errorText.value) return ''
    if (accessHint.value !== 'none') {
      const parts: string[] = []
      if (!isAuthed.value) parts.push("You're not logged in.")
      if (accessHint.value === 'verifiedOnly') {
        parts.push(
          isAuthed.value && !viewerIsVerified.value
            ? 'Your account is not verified yet.'
            : 'This post is verified only.',
        )
      } else if (accessHint.value === 'premiumOnly') {
        parts.push(
          isAuthed.value && !viewerIsPremium.value
            ? "Your account does not have premium access."
            : 'This post is premium only.',
        )
      } else if (accessHint.value === 'private') {
        parts.push("This post is private. If it's yours, log in to view it.")
      } else {
        parts.push(errorText.value)
      }
      return parts.join(' ')
    }
    return errorText.value
  })

  function goToLogin() {
    const redirect = encodeURIComponent(route.fullPath)
    return navigateTo(`/login?redirect=${redirect}`)
  }

  // ─── Catch me up pill ──────────────────────────────────────────────────────────
  // Shown to authed users on busy threads (≥8 replies), dismissed per-post in
  // localStorage and re-shown when ≥5 new replies arrive since last visit.
  const CATCH_UP_PILL_THRESHOLD = 8
  const CATCH_UP_NEW_REPLY_THRESHOLD = 5
  const CATCH_UP_STORAGE_KEY = 'moh:catch-up-pill'

  const isMounted = ref(false)
  onMounted(() => { isMounted.value = true })

  /** Hidden until localStorage is read — most busy-thread visits have already dismissed. */
  const pillDismissed = ref(true)
  function readPillState(pid: string): CatchUpPillState {
    try {
      const raw = localStorage.getItem(CATCH_UP_STORAGE_KEY)
      const map: Record<string, CatchUpPillState> = raw ? JSON.parse(raw) : {}
      return map[pid] ?? { lastSeenCount: 0, dismissedCount: null }
    } catch {
      return { lastSeenCount: 0, dismissedCount: null }
    }
  }
  function writePillState(pid: string, state: CatchUpPillState) {
    try {
      const raw = localStorage.getItem(CATCH_UP_STORAGE_KEY)
      const map: Record<string, CatchUpPillState> = raw ? JSON.parse(raw) : {}
      map[pid] = state
      localStorage.setItem(CATCH_UP_STORAGE_KEY, JSON.stringify(map))
    } catch { /* ignore */ }
  }

  const showCatchMeUpPill = computed(() => {
    if (!isAuthed.value) return false
    if (pillDismissed.value) return false
    const count = commentCountDisplay.value ?? 0
    if (count < CATCH_UP_PILL_THRESHOLD) return false
    return true
  })

  onMounted(() => {
    if (!postId.value) return
    const state = readPillState(postId.value)
    const count = commentCountDisplay.value ?? 0
    // Re-show if ≥5 new replies since last seen and was previously dismissed.
    if (state.dismissedCount !== null && count >= state.dismissedCount + CATCH_UP_NEW_REPLY_THRESHOLD) {
      pillDismissed.value = false
      writePillState(postId.value, { lastSeenCount: count, dismissedCount: null })
    } else if (state.dismissedCount !== null) {
      pillDismissed.value = true
    } else {
      pillDismissed.value = false
    }
    writePillState(postId.value, { ...state, lastSeenCount: count })
  })

  const { show: showMarvCatchUp } = useMarvCatchUp()

  function onCatchMeUpPill() {
    if (!post.value) return
    showMarvCatchUp(post.value)
  }

  function dismissCatchMeUpPill() {
    pillDismissed.value = true
    if (postId.value) {
      const state = readPillState(postId.value)
      writePillState(postId.value, { ...state, dismissedCount: commentCountDisplay.value ?? 0 })
    }
  }

  function reloadPage() {
    if (import.meta.client) globalThis.location?.reload()
  }
  const feedPostRowRef = ref<FeedPostRowExposed | null>(null)
  const middleScrollerEl = useMiddleScroller()

  function findHighlightedRowEl(): HTMLElement | null {
    const pid = post.value?.id
    if (!pid) return null
    // Dedicated highlight ref — trust it even though the inner AppPostRow also
    // carries data-post-id (isUsableHighlightTarget would reject the wrapper).
    const fromExpose = feedPostRowRef.value?.getHighlightedEl?.() ?? null
    if (fromExpose) return fromExpose
    const root = highlightedPostRef.value
    if (!root) return null
    const el = findInnermostPostEl(root, pid)
    if (!el || !isUsableHighlightTarget(el)) return null
    return el
  }

  /** `true` when the real highlighted row is sitting under the title bar. */
  function alignHighlightedPost(): boolean {
    if (!post.value?.parent) return false
    const scroller = middleScrollerEl.value
    const el = findHighlightedRowEl()
    if (!scroller || !el) return false
    const delta = computeAlignDelta({
      elTop: el.getBoundingClientRect().top,
      scrollerTop: scroller.getBoundingClientRect().top,
      titleBarOffset: readTitleBarOffset(scroller),
    })
    if (Math.abs(delta) <= 1) return true
    scroller.scrollTop += delta
    const after = computeAlignDelta({
      elTop: el.getBoundingClientRect().top,
      scrollerTop: scroller.getBoundingClientRect().top,
      titleBarOffset: readTitleBarOffset(scroller),
    })
    return Math.abs(after) <= 1
  }

  let alignHighlightCleanup: (() => void) | null = null
  /** After settle or user scroll for this postId, never snap again until navigation. */
  let highlightAlignFinishedForId: string | null = null

  function scheduleHighlightAlign() {
    alignHighlightCleanup?.()
    alignHighlightCleanup = null
    if (!import.meta.client || !post.value?.parent) return
    const id = String(postId.value ?? '').trim()
    if (!id || highlightAlignFinishedForId === id) return

    let cancelled = false
    let stableFrames = 0
    const neededStableFrames = 10
    const startedAt = Date.now()
    // Client nav paints a long ancestor chain after fetch; images above the
    // highlight keep shifting it. Direct loads are already in HTML so they
    // settle fast. Keep trying until the real row is stable — not a fixed 2s.
    const maxMs = 8_000

    const tick = () => {
      if (cancelled) return
      if (alignHighlightedPost()) stableFrames += 1
      else stableFrames = 0
      if (stableFrames >= neededStableFrames) {
        finishAlignPass()
        return
      }
      if (Date.now() - startedAt > maxMs) {
        finishAlignPass()
        return
      }
      requestAnimationFrame(tick)
    }

    // middle-scroll-restore resets scrollTop at page:finish + 2 rAFs; start after that.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(tick)
      })
    })

    const scroller = middleScrollerEl.value
    let ro: ResizeObserver | null = null

    const finishAlignPass = () => {
      cancelled = true
      highlightAlignFinishedForId = id
      ro?.disconnect()
      scroller?.removeEventListener('wheel', cancelForUser)
      scroller?.removeEventListener('touchmove', cancelForUser)
    }

    // Wheel/touch only — do not listen to `scroll`. middle-scroll-restore writes
    // scrollTop during settle and would finish the pass before the first align.
    const cancelForUser = () => {
      finishAlignPass()
    }
    scroller?.addEventListener('wheel', cancelForUser, { passive: true })
    scroller?.addEventListener('touchmove', cancelForUser, { passive: true })

    const root = highlightedPostRef.value
    if (root && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (cancelled) return
        if (alignHighlightedPost()) stableFrames += 1
        else stableFrames = 0
      })
      ro.observe(root)
    }

    alignHighlightCleanup = () => {
      // Tear down without marking finished — caller may be rescheduling (e.g. page:finish).
      cancelled = true
      ro?.disconnect()
      scroller?.removeEventListener('wheel', cancelForUser)
      scroller?.removeEventListener('touchmove', cancelForUser)
    }
  }

  if (import.meta.client) {
    const nuxtApp = useNuxtApp()
    // Register in setup (not onMounted): page:finish can fire before onMounted,
    // which made the old hookOnce path silently no-op.
    const removePageFinishHook = nuxtApp.hook('page:finish', () => {
      void nextTick(() => scheduleHighlightAlign())
    })

    // Watch primitive sources — NOT `() => [postId, parentId]`. A getter that returns a
    // fresh array retriggers on every `post` identity change (boost/live patch), which
    // re-snapped the selected reply under the title bar after the page had already settled.
    watch(
      [postId, () => post.value?.parent?.id ?? null],
      (curr, prev) => {
        const id = curr[0]
        const prevId = prev?.[0]
        if (id !== prevId) highlightAlignFinishedForId = null
        void nextTick(() => scheduleHighlightAlign())
      },
      { immediate: true },
    )

    onBeforeUnmount(() => {
      removePageFinishHook()
      alignHighlightCleanup?.()
      alignHighlightCleanup = null
    })
  }

  return {
    showServerErrorCta,
    showLoginCta,
    errorTitle,
    errorBody,
    goToLogin,
    isMounted,
    showCatchMeUpPill,
    onCatchMeUpPill,
    dismissCatchMeUpPill,
    reloadPage,
    feedPostRowRef,
  }
}
