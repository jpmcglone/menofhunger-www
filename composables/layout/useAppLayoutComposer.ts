import { computed, provide, ref, watch, type Ref } from 'vue'
import {
  MOH_GROUP_COMPOSER_KEY,
  MOH_HOME_COMPOSER_IN_VIEW_KEY,
  MOH_OPEN_COMPOSER_KEY,
  MOH_OPEN_COMPOSER_FROM_ONLYME_KEY,
  type ComposerOpenOptions,
  type ComposerVisibility,
  type GroupComposerContext,
} from '~/utils/injection-keys'
import type { FeedPost, PostVisibility } from '~/types/api'
import { isComposerEntrypointPath } from '~/config/routes'
import { useOnlyMePosts } from '~/composables/useOnlyMePosts'
import { useReplyModal } from '~/composables/useReplyModal'
import type { CreateMediaPayload } from '~/composables/useComposerMedia'
import type { ComposerPollPayload } from '~/composables/composer/types'

export type ComposerCreatePostFn = (
  body: string,
  visibility: PostVisibility,
  media: CreateMediaPayload[],
  poll?: ComposerPollPayload | null,
) => Promise<{ id: string } | FeedPost | null>

export interface UseAppLayoutComposerOptions {
  /** Center-column content element — the composer sheet aligns with it. */
  middleContentEl: Ref<HTMLElement | null>
  /** Center-column scroller — fallback alignment target. */
  middleScrollerEl: Ref<HTMLElement | null>
}

/**
 * The app layout's post-composer surface: the modal sheet state, the
 * left-nav / FAB entry points, the group-composer context, optimistic
 * pending-post submission, and the overlay-open scroll lock.
 *
 * MUST be called from the app layout's setup so the `provide()`d injection
 * keys (`MOH_OPEN_COMPOSER_KEY`, `MOH_OPEN_COMPOSER_FROM_ONLYME_KEY`,
 * `MOH_GROUP_COMPOSER_KEY`, `MOH_HOME_COMPOSER_IN_VIEW_KEY`) reach every
 * page rendered in the layout's slot.
 */
export function useAppLayoutComposer(opts: UseAppLayoutComposerOptions) {
  const { middleContentEl, middleScrollerEl } = opts

  const route = useRoute()
  const { user, isVerified: viewerIsVerified } = useAuth()
  const { profileTo } = useAppNav()
  const { apiFetchData } = useApiClient()

  const isOnlyMePage = computed(() => route.path === '/only-me')
  const isGroupPage = computed(() => /^\/g\/[^/]+$/.test(route.path))
  const groupComposerCtx = ref<GroupComposerContext | null>(null)
  provide(MOH_GROUP_COMPOSER_KEY, groupComposerCtx)

  // Post entrypoints (left-nav button + mobile FAB): only render on these routes.
  const isComposerEntrypointRoute = computed(() => {
    return isComposerEntrypointPath({ path: route.path, profileTo: profileTo.value })
  })

  // Ref owned by layout; home page injects and updates it when its composer is in view (so we can hide the FAB).
  const homeComposerInViewRef = ref(false)
  provide(MOH_HOME_COMPOSER_IN_VIEW_KEY, homeComposerInViewRef)
  const hideFabForHomeComposer = computed(
    () => route.path === '/home' && homeComposerInViewRef.value,
  )

  // Only show the nav Post button when onboarding is complete (user can actually post).
  const canOpenComposer = computed(() => {
    const u = user.value
    if (!u?.id) return false
    if (!u.usernameIsSet) return false
    if (!u.birthdate) return false
    if (!u.menOnlyConfirmed) return false
    if (!Array.isArray(u.interests) || u.interests.length < 1) return false
    return true
  })

  // ─── Modal state ─────────────────────────────────────────────────────────────

  const composerModalOpen = ref(false)
  const composerInitialText = ref<string | null>(null)
  const composerSourceOnlyMePost = ref<FeedPost | null>(null)
  const composerIsFromOnlyMe = computed(() => Boolean(composerSourceOnlyMePost.value?.id))
  const composerCustomPlaceholder = ref<string | null>(null)

  const shareDialogOpen = ref(false)
  const sharePost = ref<FeedPost | null>(null)
  const composerCustomGroupName = ref<string | null>(null)
  const composerCustomAllowedVisibilities = ref<PostVisibility[] | null>(null)
  const composerCustomDisableMedia = ref(false)
  const composerQuotedPost = ref<FeedPost | null>(null)
  const composerCustomCreatePost = ref<ComposerCreatePostFn | null>(null)

  const replyModal = useReplyModal()
  const replyModalOpen = computed(() => Boolean(replyModal.open.value))
  const replyModalHasParent = computed(() => Boolean(replyModal.parentPost.value?.id))

  // Failsafe: if reply modal is "open" without a parent post, it will lock scrolling
  // (via `anyOverlayOpen`) while rendering nothing. Auto-heal this inconsistent state.
  watch(
    () => [replyModalOpen.value, replyModalHasParent.value] as const,
    ([open, hasParent]) => {
      if (open && !hasParent) replyModal.hide()
    },
    { immediate: true },
  )

  const composerIsGroupMode = computed(() => Boolean(composerCustomGroupName.value) || Boolean(groupComposerCtx.value))
  const composerGroupName = computed(() => {
    const custom = (composerCustomGroupName.value ?? '').trim()
    if (custom) return custom
    const ctx = (groupComposerCtx.value?.groupName ?? '').trim()
    return ctx || null
  })
  const composerGroupId = computed(() => groupComposerCtx.value?.groupId ?? null)

  const anyOverlayOpen = computed(() => composerModalOpen.value || (replyModalOpen.value && replyModalHasParent.value))

  useScrollLock(anyOverlayOpen)
  const composerSheetStyle = ref<Record<string, string>>({ left: '0px', right: '0px', width: 'auto' })

  const composerSheetPlacementStyle = computed<Record<string, string>>(() => {
    // Keep composer placement consistent across breakpoints:
    // always a top-of-screen modal aligned with the center column.
    return { top: '0.75rem', bottom: 'auto' }
  })
  const { visibility: composerVisibility, feedVisibility: composerNonOnlyMeVisibility } = useComposerVisibility()

  // Drives --moh-scope-bg / --moh-scope-text on <html> synchronously so that
  // .moh-btn-scope buttons (nav Post, check-in) snap to the new color at the
  // same instant as the PostComposer tint, without waiting for a Vue render flush.
  useComposerScopeTint()

  // Keep the non-onlyMe shadow in sync so "publish from drafts" never defaults to onlyMe.
  watch(
    composerVisibility,
    (v) => {
      if (v && v !== 'onlyMe') composerNonOnlyMeVisibility.value = v
    },
    { immediate: true },
  )

  // Ascending exclusivity rank: public(0) < verifiedOnly(1) < premiumOnly(2) < onlyMe(3).
  const VISIBILITY_RANK: Record<PostVisibility, number> = { public: 0, verifiedOnly: 1, premiumOnly: 2, onlyMe: 3 }

  const composerLockedVisibility = computed<PostVisibility | null>(() => {
    if (composerIsFromOnlyMe.value) return null
    if (composerIsGroupMode.value) return 'public'
    if (!viewerIsVerified.value) return 'onlyMe'
    if (isOnlyMePage.value) return 'onlyMe'
    // Only lock when quoting an onlyMe post — private content can't be broadcast.
    if (composerQuotedPost.value?.visibility === 'onlyMe') return 'onlyMe'
    return null
  })

  const composerAllowedVisibilities = computed<PostVisibility[] | null>(() => {
    if (composerCustomAllowedVisibilities.value?.length) return composerCustomAllowedVisibilities.value
    if (groupComposerCtx.value) return ['public']
    if (composerIsFromOnlyMe.value) return ['public', 'verifiedOnly', 'premiumOnly']
    if (!viewerIsVerified.value) return ['onlyMe']
    if (isOnlyMePage.value) return ['onlyMe']
    const base: PostVisibility[] = ['public', 'verifiedOnly', 'premiumOnly']
    // Quote floor: the picker only offers tiers >= the quoted post's tier (never more open).
    const quotedVis = composerQuotedPost.value?.visibility as PostVisibility | undefined
    if (quotedVis && quotedVis !== 'onlyMe') {
      const floorRank = VISIBILITY_RANK[quotedVis] ?? 0
      return base.filter(v => (VISIBILITY_RANK[v] ?? 0) >= floorRank)
    }
    return base
  })
  const composerCreatePost = computed<ComposerCreatePostFn | null>(() => {
    if (composerCustomCreatePost.value) return composerCustomCreatePost.value
    // Group posts use optimistic pending via groupComposerCtx.onComposerPending.
    if (composerIsFromOnlyMe.value) return createPostFromOnlyMeDraft
    return null
  })

  function resetComposerCustomOptions() {
    composerCustomPlaceholder.value = null
    composerCustomGroupName.value = null
    composerCustomAllowedVisibilities.value = null
    composerCustomDisableMedia.value = false
    composerCustomCreatePost.value = null
    composerQuotedPost.value = null
  }

  function applyComposerCustomOptions(options?: ComposerOpenOptions | null) {
    resetComposerCustomOptions()
    if (!options) return
    composerCustomPlaceholder.value = (options.placeholder ?? '').trim() || null
    composerCustomGroupName.value = (options.groupName ?? '').trim() || null
    composerCustomAllowedVisibilities.value = Array.isArray(options.allowedVisibilities)
      ? options.allowedVisibilities.filter(Boolean) as PostVisibility[]
      : null
    composerCustomDisableMedia.value = Boolean(options.disableMedia)
    composerCustomCreatePost.value = (options.createPost as ComposerCreatePostFn | undefined) ?? null
    composerQuotedPost.value = options.quotedPost ?? null
  }

  async function createPostFromOnlyMeDraft(
    body: string,
    visibility: PostVisibility,
    media: CreateMediaPayload[],
    poll?: ComposerPollPayload | null,
  ) {
    if (poll) {
      // This flow hits /publish-from-only-me, which does not support polls.
      throw new Error('Polls cannot be added when publishing an Only me draft. Create a new post instead.')
    }
    const sourceId = composerSourceOnlyMePost.value?.id
    if (!sourceId) throw new Error('Missing source post.')
    return await apiFetchData<FeedPost>(`/posts/${encodeURIComponent(sourceId)}/publish-from-only-me`, {
      method: 'POST',
      body: { body, visibility, media },
    })
  }

  function defaultComposerInitialTextForRoute(): string | null {
    // On /u/:username, prefill @username unless it’s the current user.
    const m = route.path.match(/^\/u\/([^/]+)$/)
    if (!m?.[1]) return null
    const profileUsername = decodeURIComponent(m[1]).trim()
    if (!profileUsername) return null
    const myUsername = (user.value?.username ?? '').trim()
    if (myUsername && profileUsername.toLowerCase() === myUsername.toLowerCase()) return null
    return `@${profileUsername} `
  }

  function openComposerModal(initialText?: string | null) {
    resetComposerCustomOptions()
    if (viewerIsVerified.value && !isOnlyMePage.value && composerVisibility.value === 'onlyMe') {
      composerVisibility.value = composerNonOnlyMeVisibility.value ?? 'public'
    }
    composerInitialText.value = (initialText ?? defaultComposerInitialTextForRoute()) || null
    composerModalOpen.value = true
  }

  function openComposerWithVisibility(visibilityOrOptions?: ComposerVisibility | ComposerOpenOptions, initialText?: string | null) {
    const options: ComposerOpenOptions | null =
      visibilityOrOptions && typeof visibilityOrOptions === 'object'
        ? visibilityOrOptions
        : null
    const visibility = typeof visibilityOrOptions === 'string' ? visibilityOrOptions : options?.visibility
    const nextInitialText = options ? options.initialText : initialText
    applyComposerCustomOptions(options)
    if (visibility) {
      const next = !viewerIsVerified.value
        ? 'onlyMe'
        : visibility === 'onlyMe' && !isOnlyMePage.value
          ? (composerNonOnlyMeVisibility.value ?? 'public')
          : visibility
      composerVisibility.value = next
    } else if (options?.quotedPost?.visibility && options.quotedPost.visibility !== 'onlyMe') {
      // Default the composer to the quoted post's tier so the user starts equal to the quote.
      const qv = options.quotedPost.visibility as PostVisibility
      composerVisibility.value = qv
    }
    composerInitialText.value = (nextInitialText ?? (options?.quotedPost ? null : defaultComposerInitialTextForRoute())) || null
    composerModalOpen.value = true
  }

  function openComposerForCurrentRoute(initialText?: string | null) {
    if (isOnlyMePage.value || !viewerIsVerified.value) {
      openComposerWithVisibility('onlyMe', initialText)
      return
    }
    const gCtx = groupComposerCtx.value
    if (gCtx) {
      openComposerWithVisibility({
        visibility: 'public',
        allowedVisibilities: ['public'],
        placeholder: `Post to ${gCtx.groupName}…`,
        groupName: gCtx.groupName,
      }, initialText)
      return
    }
    openComposerModal(initialText)
  }
  provide(MOH_OPEN_COMPOSER_KEY, openComposerWithVisibility)

  function openComposerFromOnlyMe(post: FeedPost) {
    resetComposerCustomOptions()
    composerSourceOnlyMePost.value = post
    // Publishing from only-me should never use onlyMe visibility. Use last non-onlyMe (or public).
    if (composerVisibility.value === 'onlyMe') composerVisibility.value = composerNonOnlyMeVisibility.value ?? 'public'
    composerInitialText.value = (post?.body ?? '').trim() || null
    composerModalOpen.value = true
  }
  provide(MOH_OPEN_COMPOSER_FROM_ONLYME_KEY, openComposerFromOnlyMe)

  function closeComposerModal() {
    composerModalOpen.value = false
    composerInitialText.value = null
    composerSourceOnlyMePost.value = null
    resetComposerCustomOptions()
  }

  // ─── Posted / pending handling ───────────────────────────────────────────────

  const { prependPost: prependOnlyMePost } = useOnlyMePosts()
  const {
    prependToHomeFeed,
    prependOptimisticToHomeFeed,
    replaceOptimisticInHomeFeed,
    markOptimisticFailedInHomeFeed,
    markOptimisticPostingInHomeFeed,
    removeOptimisticFromHomeFeed,
  } = useHomeFeedPrepend()
  const { prependToProfileFeed } = useProfileFeedPrepend()
  const pendingPosts = usePendingPostsManager()

  function onComposerPending(payload: {
    localId: string
    optimisticPost: FeedPost
    perform: () => Promise<FeedPost | { id: string } | null | undefined>
  }) {
    // Close the modal immediately so the user can keep working.
    composerModalOpen.value = false
    composerInitialText.value = null
    composerSourceOnlyMePost.value = null
    resetComposerCustomOptions()
    const groupPending = groupComposerCtx.value?.onComposerPending
    if (groupPending) {
      groupPending(payload)
      return
    }
    pendingPosts.submit({
      localId: payload.localId,
      optimisticPost: payload.optimisticPost,
      perform: payload.perform,
      callbacks: {
        insert: (p) => prependOptimisticToHomeFeed(p),
        replace: (lid, real) => {
          replaceOptimisticInHomeFeed(lid, real)
          // Also prepend to the profile feed in case the viewer is on their own profile.
          if (real.id && real.visibility !== 'onlyMe' && !real.communityGroupId) {
            prependToProfileFeed(real)
          }
        },
        markFailed: (lid, msg) => markOptimisticFailedInHomeFeed(lid, msg),
        markPosting: (lid) => markOptimisticPostingInHomeFeed(lid),
        remove: (lid) => removeOptimisticFromHomeFeed(lid),
      },
    })
  }

  function onComposerPosted(payload: { id: string; visibility: string; post?: FeedPost }) {
    composerModalOpen.value = false
    composerInitialText.value = null
    composerSourceOnlyMePost.value = null
    resetComposerCustomOptions()
    if (payload.visibility === 'onlyMe' && payload.post) {
      prependOnlyMePost(payload.post)
      if (route.path !== '/only-me') {
        navigateTo('/only-me?posted=1')
      }
    } else if (payload.post && payload.post.id && payload.post.kind === 'checkin') {
      // Check-in posts: prepend to home feed and open the share dialog in place —
      // no navigation so the user stays on the current page.
      prependToHomeFeed(payload.post)
      prependToProfileFeed(payload.post)
      sharePost.value = payload.post
      shareDialogOpen.value = true
    } else if (payload.post && payload.post.id && !payload.post.communityGroupId) {
      // Prepend to home feed immediately and track in localInserts so it survives
      // the next hard refresh (home page uses keepalive → onActivated → refresh()).
      prependToHomeFeed(payload.post)
      // Also push to the profile feed in case the viewer is on their own profile.
      prependToProfileFeed(payload.post)
    }
  }

  // ─── Presentation ────────────────────────────────────────────────────────────

  const composerModalBorderClass = computed(() => {
    if (isGroupPage.value && groupComposerCtx.value) return 'border-[color:var(--moh-group)]'
    const v = composerLockedVisibility.value ?? (
      composerVisibility.value === 'onlyMe' && !isOnlyMePage.value
        ? (composerNonOnlyMeVisibility.value ?? 'public')
        : composerVisibility.value
    )
    if (v === 'verifiedOnly') return 'moh-thread-verified'
    if (v === 'premiumOnly') return 'moh-thread-premium'
    if (v === 'onlyMe') return 'moh-thread-onlyme'
    return 'border-gray-200 dark:border-zinc-800'
  })

  // Post button (FAB + left nav): color matches composer scope. Public = black/white (light) or white/black (dark).
  const fabButtonClass = computed(() => {
    if (isGroupPage.value && groupComposerCtx.value) return 'moh-btn-tone'
    // On /only-me, always present the "Only me" purple button and default the composer to onlyMe.
    // (We don't permanently change the cookie just by visiting the page.)
    if (isOnlyMePage.value || !viewerIsVerified.value) return 'moh-btn-onlyme moh-btn-tone'
    const v = composerVisibility.value === 'onlyMe'
      ? (composerNonOnlyMeVisibility.value ?? 'public')
      : composerVisibility.value
    // Use .moh-btn-scope for verified/premium: its background reads --moh-scope-bg which
    // is updated synchronously by useComposerScopeTint (via Unhead), so the button color
    // snaps in the same CSS-cascade tick as the composer tint rather than waiting for
    // Vue's async render flush.
    if (v === 'verifiedOnly' || v === 'premiumOnly') return 'moh-btn-scope moh-btn-tone'
    return 'bg-black text-white dark:bg-white dark:text-black'
  })
  const fabButtonStyle = computed(() => {
    if (isGroupPage.value && groupComposerCtx.value) {
      return { backgroundColor: 'var(--moh-group)', color: '#fff' }
    }
    return {}
  })

  // ─── Sheet alignment ─────────────────────────────────────────────────────────

  function updateComposerSheetStyle() {
    if (!import.meta.client) return
    const el = middleContentEl.value ?? middleScrollerEl.value
    if (!el) return
    const r = el.getBoundingClientRect()

    // Match the actual center-column content area so it lines up with posts/cards.
    composerSheetStyle.value = {
      left: `${Math.max(0, Math.floor(r.left))}px`,
      width: `${Math.max(0, Math.floor(r.width))}px`,
    }
  }

  useModalEscape(composerModalOpen, closeComposerModal)

  watch(
    composerModalOpen,
    (open) => {
      if (!import.meta.client) return

      if (open) {
        requestAnimationFrame(() => updateComposerSheetStyle())
        window.addEventListener('resize', updateComposerSheetStyle)
      }

      return () => {
        window.removeEventListener('resize', updateComposerSheetStyle)
      }
    },
    { flush: 'post' },
  )

  return {
    // Entry points
    canOpenComposer,
    isComposerEntrypointRoute,
    hideFabForHomeComposer,
    homeComposerInViewRef,
    groupComposerCtx,
    // Modal state
    composerModalOpen,
    composerInitialText,
    composerCustomPlaceholder,
    composerSourceOnlyMePost,
    composerIsFromOnlyMe,
    composerIsGroupMode,
    composerGroupName,
    composerGroupId,
    composerLockedVisibility,
    composerAllowedVisibilities,
    composerCustomDisableMedia,
    composerCreatePost,
    composerQuotedPost,
    composerModalBorderClass,
    composerSheetStyle,
    composerSheetPlacementStyle,
    // Share dialog (post-checkin share)
    sharePost,
    shareDialogOpen,
    // Overlay state
    anyOverlayOpen,
    // FAB / nav button presentation
    fabButtonClass,
    fabButtonStyle,
    // Actions
    openComposerForCurrentRoute,
    openComposerWithVisibility,
    openComposerFromOnlyMe,
    closeComposerModal,
    onComposerPending,
    onComposerPosted,
  }
}

export type AppLayoutComposerApi = ReturnType<typeof useAppLayoutComposer>
