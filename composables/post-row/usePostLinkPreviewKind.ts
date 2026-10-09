import { isMohUrl, isSubstackPostUrl, isXPostUrl, mohUrlPath, safeUrlHostname } from '~/utils/link-utils'
import { isSpotifyShareUrl, spotifyContent } from '~/utils/spotify-embed'
import { splitTextByScriptureDisplay } from '~/utils/scripture-reference'
import type { PostLinkPreviewData } from '~/composables/post-row/usePostLinkPreviewData'
import type { PostLinkTargets } from '~/composables/post-row/usePostLinkTargets'

export type PostLinkPreviewKindInput = {
  /** Drafts share the exact card layout without participating in feed autoplay. */
  previewOnly?: boolean
  /** Composer-only: show a dismiss control on generic website cards. */
  dismissible?: boolean
}

/** Decides which preview card a post shows (video, Spotify, X, Substack, MoH, generic) and whether any shows at all. */
export function usePostLinkPreviewKind(props: PostLinkPreviewKindInput, targets: PostLinkTargets, data: PostLinkPreviewData) {
  const {
    body, hasMedia, rowInView, previewLink, showLinkPreview,
    embeddedPostId, embeddedArticleId, hasEmbeddedSpace, embeddedUsername,
  } = targets
  const { preloadedArticle, linkMeta, linkMetaSettled, youtubeEmbedUrl, isPreviewLinkRumble } = data
  const dismissedPreviewUrl = ref<string | null>(null)
  watch(previewLink, (url) => {
    if (url !== dismissedPreviewUrl.value) dismissedPreviewUrl.value = null
  })
  function dismissGenericPreview() {
    dismissedPreviewUrl.value = previewLink.value
  }
  const genericPreviewSuppressed = computed(() =>
    Boolean(props.dismissible && dismissedPreviewUrl.value && dismissedPreviewUrl.value === previewLink.value),
  )

  const embeddedPreviewEnabled = computed(() => {
    // Keep embedded post hydration strictly viewport-driven to avoid eager single-post fetches.
    return rowInView.value
  })

  const isMohInternalLink = computed(() => Boolean(previewLink.value && isMohUrl(previewLink.value)))
  const mohInternalPath = computed(() => (previewLink.value ? mohUrlPath(previewLink.value) : null))

  const spotifyPreview = computed(() => spotifyContent(previewLink.value)
    ?? (isSpotifyShareUrl(previewLink.value) ? spotifyContent(linkMeta.value?.url) : null))

  const xPostMeta = computed(() => {
    if (!previewLink.value || !isXPostUrl(previewLink.value)) return null
    return linkMeta.value?.socialPost?.platform === 'x' ? linkMeta.value.socialPost : null
  })

  const substackMeta = computed(() => {
    if (!previewLink.value || !isSubstackPostUrl(previewLink.value)) return null
    return linkMeta.value ?? null
  })

  const isCustomWebsitePreview = computed(() => Boolean(
    spotifyPreview.value
    || youtubeEmbedUrl.value
    || isPreviewLinkRumble.value
    || (isMohInternalLink.value && mohInternalPath.value)
    || xPostMeta.value
    || (substackMeta.value && substackMeta.value.title),
  ))
  const showGenericWebsitePreview = computed(() =>
    Boolean(showLinkPreview.value && !isCustomWebsitePreview.value && !genericPreviewSuppressed.value),
  )
  /** Links that turn into their own embed once metadata arrives; they keep the existing card path. */
  const mayBecomeCustomEmbed = computed(() => {
    const url = previewLink.value
    return Boolean(url && (isXPostUrl(url) || isSubstackPostUrl(url) || isSpotifyShareUrl(url)))
  })
  const linkCardSiteLabel = computed(() => (safeUrlHostname(previewLink.value ?? '') ?? '').replace(/^www\./, '') || 'Link')
  const linkCardState = computed<'loading' | 'ready' | 'unavailable'>(() => {
    const meta = linkMeta.value
    if (meta && (meta.title || meta.siteName || meta.imageUrl || meta.description)) return 'ready'
    return linkMetaSettled.value ? 'unavailable' : 'loading'
  })
  const previewInteractionLocked = computed(() =>
    Boolean(props.previewOnly && !(props.dismissible && showGenericWebsitePreview.value)),
  )

  // Embedded MOH post: always show block so SSR can fetch and render the preview before first paint.
  // Space/article/user preview: show skeleton while loading, resolved card when ready (both require rowInView).
  // External link preview: only show when row is in view (avoid metadata fetch for off-screen rows).
  // Article: when preloadedArticle is provided, PostRow renders the card directly — skip showing anything here.
  // Scripture preview card: rendered at lowest priority — only when the link preview slot is
  // completely empty and the post has exactly one scripture reference.
  const singleScriptureRef = computed(() => {
    if (showLinkPreview.value) return null
    if (embeddedPostId.value || embeddedArticleId.value || hasEmbeddedSpace.value || embeddedUsername.value) return null
    if (hasMedia.value) return null
    const segments = splitTextByScriptureDisplay(body.value)
    const refs = segments.filter(s => s.scripture).map(s => s.scripture!.reference)
    return refs.length === 1 ? refs[0] : null
  })

  const showAny = computed(() =>
    Boolean(
      embeddedPostId.value ||
      (embeddedArticleId.value && !preloadedArticle.value && rowInView.value) ||
      (hasEmbeddedSpace.value && rowInView.value) ||
      (embeddedUsername.value && rowInView.value) ||
      (showLinkPreview.value && rowInView.value && !genericPreviewSuppressed.value) ||
      (singleScriptureRef.value && rowInView.value),
    )
  )

  return {
    previewInteractionLocked, spotifyPreview, xPostMeta, substackMeta,
    isMohInternalLink, mohInternalPath, showGenericWebsitePreview, mayBecomeCustomEmbed,
    linkCardSiteLabel, linkCardState, dismissGenericPreview, singleScriptureRef,
    embeddedPreviewEnabled, showAny,
  }
}
