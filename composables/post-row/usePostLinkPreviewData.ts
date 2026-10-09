import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata, peekLinkMetadata } from '~/utils/link-metadata'
import type { RumbleEmbedInfo } from '~/utils/rumble-embed'
import { getYouTubeEmbedUrl, getYouTubePosterUrls, isRumbleShortsUrl, isRumbleUrl, parseYouTubeUrl, pausedRumbleEmbedUrl, portraitEmbedFrameStyle, sameNormalizedUrl } from '~/utils/link-utils'
import { usePreviewFetchLimiter } from '~/composables/usePreviewFetchLimiter'
import type { PostLinkTargets } from '~/composables/post-row/usePostLinkTargets'
import type { ArticleSharePreview, PostVideoEmbed } from '~/types/api'

export type PostLinkPreviewDataInput = {
  direct?: boolean
  preloadedArticle?: ArticleSharePreview | null
  /** Server-cached embed for the preview link — sizes the player before any fetch. */
  videoEmbed?: PostVideoEmbed | null
}

const PREVIEW_FETCH_DWELL_MS = 400

/** Everything fetched for a post's links: article, space, YouTube/Rumble embeds, and link metadata. */
export function usePostLinkPreviewData(props: PostLinkPreviewDataInput, targets: PostLinkTargets) {
  const { rowInView, previewLink, showLinkPreview, embeddedArticleId, embeddedSpaceId, embeddedSpaceUsername } = targets
  const preloadedArticle = computed(() => props.preloadedArticle ?? null)
  const embeddedArticle = ref<ArticleSharePreview | null>(null)

  // Seed from preloaded data immediately (no fetch needed for articleShare posts).
  watchEffect(() => {
    if (preloadedArticle.value) {
      embeddedArticle.value = preloadedArticle.value
    }
  })


  const { apiFetchData } = useApiClient()
  const { runLimited } = usePreviewFetchLimiter()

  watch(
    [embeddedArticleId, rowInView],
    ([articleId, inView], _old, onCleanup) => {
      let cancelled = false
      let timer: ReturnType<typeof setTimeout> | null = null
      onCleanup(() => {
        cancelled = true
        if (timer) clearTimeout(timer)
        timer = null
      })

      if (!articleId || !inView) return
      // Skip fetch when article data is already available (either preloaded or previously fetched).
      if (embeddedArticle.value?.id === articleId) return
      // Skip fetch entirely when a preloaded article covers this ID.
      if (preloadedArticle.value?.id === articleId) return

      timer = setTimeout(() => {
        if (cancelled) return
        void runLimited(() => apiFetchData<ArticleSharePreview>(`/articles/${articleId}`))
          .then((res) => {
            if (cancelled) return
            embeddedArticle.value = res ?? null
          })
          .catch(() => {
            if (cancelled) return
            embeddedArticle.value = null
          })
      }, PREVIEW_FETCH_DWELL_MS)
    },
    { immediate: true },
  )

  const {
    getById: getSpaceById,
    getByOwnerUsername: getSpaceByOwnerUsername,
    fetchSpaceById,
    fetchSpaceByUsername,
  } = useSpaces()

  const embeddedSpace = computed(() => {
    if (embeddedSpaceId.value) return getSpaceById(embeddedSpaceId.value)
    if (embeddedSpaceUsername.value) return getSpaceByOwnerUsername(embeddedSpaceUsername.value)
    return null
  })

  watch(
    [embeddedSpaceId, embeddedSpaceUsername, rowInView],
    ([id, username, inView], _old, onCleanup) => {
      let timer: ReturnType<typeof setTimeout> | null = null
      onCleanup(() => {
        if (timer) clearTimeout(timer)
        timer = null
      })
      if (!inView || (!id && !username) || embeddedSpace.value) return
      timer = setTimeout(() => {
        if (id) {
          void runLimited(() => fetchSpaceById(id))
        } else if (username) {
          void runLimited(() => fetchSpaceByUsername(username))
        }
      }, PREVIEW_FETCH_DWELL_MS)
    },
    { immediate: true },
  )


  const youtubeVideoInfo = computed(() => (previewLink.value ? parseYouTubeUrl(previewLink.value) : null))
  const youtubeEmbedUrl = computed(() => (previewLink.value ? getYouTubeEmbedUrl(previewLink.value) : null))
  const isPreviewLinkRumble = computed(() => {
    const u = (previewLink.value ?? '').trim()
    if (!u) return false
    if (!showLinkPreview.value) return false
    if (!isRumbleUrl(u)) return false
    // Shorts should NOT attempt oEmbed/embed; treat as normal link preview.
    if (isRumbleShortsUrl(u)) return false
    return true
  })

  function rumbleInfoFromMeta(meta: LinkMetadata | null | undefined): RumbleEmbedInfo | null {
    const embed = meta?.videoEmbed
    if (embed?.platform !== 'rumble' || !embed.embedUrl) return null
    return { src: embed.embedUrl, width: embed.width, height: embed.height, thumbnailUrl: embed.thumbnailUrl }
  }

  /** Fetched embed info, pinned to the URL it was fetched for (survives scroll out/in). */
  const rumbleEmbedFetched = ref<{ url: string; info: RumbleEmbedInfo } | null>(null)
  /** Feed rows arrive with the embed already cached server-side — size on first paint. */
  const rumbleEmbedFromPost = computed<RumbleEmbedInfo | null>(() => {
    const embed = props.videoEmbed
    if (!embed || embed.platform !== 'rumble' || !embed.embedUrl) return null
    if (!sameNormalizedUrl(embed.url, previewLink.value)) return null
    return { src: embed.embedUrl, width: embed.width, height: embed.height, thumbnailUrl: embed.thumbnailUrl }
  })
  const rumbleEmbedInfo = computed<RumbleEmbedInfo | null>(() => {
    if (!isPreviewLinkRumble.value) return null
    if (rumbleEmbedFromPost.value) return rumbleEmbedFromPost.value
    const fetched = rumbleEmbedFetched.value
    return fetched && fetched.url === previewLink.value ? fetched.info : null
  })
  const rumbleEmbedUrl = computed(() => rumbleEmbedInfo.value?.src ?? null)
  const directEmbedSrc = computed(() => {
    if (!props.direct || !previewLink.value) return null
    if (youtubeEmbedUrl.value) return getYouTubeEmbedUrl(previewLink.value)
    return rumbleEmbedUrl.value ? pausedRumbleEmbedUrl(rumbleEmbedUrl.value) : null
  })
  const rumbleAspectRatio = computed(() => {
    const w = rumbleEmbedInfo.value?.width ?? 854
    const h = rumbleEmbedInfo.value?.height ?? 480
    return `${w} / ${h}`
  })
  const isRumblePortrait = computed(() => {
    if (!isPreviewLinkRumble.value) return false
    const w = rumbleEmbedInfo.value?.width ?? 854
    const h = rumbleEmbedInfo.value?.height ?? 480
    return h > w
  })
  /** Outer frame: explicit px width for portrait (left-aligned), full row otherwise. */
  const videoFrameStyle = computed(() => {
    if (youtubeVideoInfo.value?.isShort) return portraitEmbedFrameStyle(9, 16)
    if (isRumblePortrait.value) {
      return portraitEmbedFrameStyle(rumbleEmbedInfo.value?.width ?? 9, rumbleEmbedInfo.value?.height ?? 16)
    }
    return undefined
  })
  /** Inner box fills the frame; only the aspect ratio varies. */
  const videoBoxStyle = computed(() => {
    if (youtubeVideoInfo.value?.isShort) return { aspectRatio: '9 / 16' }
    if (youtubeEmbedUrl.value) return { aspectRatio: '16 / 9' }
    return { aspectRatio: rumbleAspectRatio.value }
  })
  const rumblePosterUrl = computed(() => rumbleEmbedInfo.value?.thumbnailUrl ?? null)

  const youtubePosterUrls = computed(() => (previewLink.value ? getYouTubePosterUrls(previewLink.value) : null))
  // Start with maxres; onPosterError() drops it to the hqdefault fallback.
  const youtubePosterUsingMaxres = ref(true)
  const youtubePosterSrc = computed(() => {
    if (!youtubePosterUrls.value) return null
    return youtubePosterUsingMaxres.value
      ? youtubePosterUrls.value.maxres
      : youtubePosterUrls.value.fallback
  })
  function onPosterError() {
    if (youtubePosterUsingMaxres.value) youtubePosterUsingMaxres.value = false
  }
  // Reset whenever the link changes.
  watch(() => previewLink.value, () => { youtubePosterUsingMaxres.value = true })

  // YouTube oEmbed: keyless public endpoint — gives us title + channel without an API key.
  type YouTubeOEmbed = { title: string; authorName: string }
  const youtubeOEmbed = ref<YouTubeOEmbed | null>(null)
  watch(
    [youtubeVideoInfo, rowInView],
    ([info, inView], _old, onCleanup) => {
      youtubeOEmbed.value = null
      if (!info || !inView || !import.meta.client) return
      let cancelled = false
      onCleanup(() => { cancelled = true })
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(info.id)}&format=json`
      fetch(oEmbedUrl)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (cancelled || !json) return
          const title = (json.title ?? '').trim()
          const authorName = (json.author_name ?? '').trim()
          if (title) youtubeOEmbed.value = { title, authorName }
        })
        .catch(() => { /* best-effort */ })
    },
    { immediate: true },
  )

  const linkMeta = ref<LinkMetadata | null>(null)
  /** True once the metadata request for the current link finished (with or without data). */
  const linkMetaSettled = ref(false)
  watch(
    [previewLink, rowInView, showLinkPreview],
    ([url, inView, canPreview], _old, onCleanup) => {
      linkMeta.value = null
      linkMetaSettled.value = false
      if (!import.meta.client) return
      if (!canPreview) return
      if (!inView) return
      if (!url) return
      // Rumble: already sized from the post payload or a previous fetch — nothing to do.
      if (isRumbleUrl(url) && !isRumbleShortsUrl(url) && rumbleEmbedInfo.value) return
      // Rumble: the shared client cache is synchronous — skip the dwell + round trip.
      if (isRumbleUrl(url) && !isRumbleShortsUrl(url)) {
        const cachedInfo = rumbleInfoFromMeta(peekLinkMetadata(url))
        if (cachedInfo) {
          rumbleEmbedFetched.value = { url, info: cachedInfo }
          return
        }
      }
      let cancelled = false
      let timer: ReturnType<typeof setTimeout> | null = null
      const controller = new AbortController()
      onCleanup(() => {
        cancelled = true
        if (timer) clearTimeout(timer)
        timer = null
        controller.abort()
      })

      timer = setTimeout(() => {
        if (cancelled) return
        // Special cases (embed) do not need metadata.
        if (getYouTubeEmbedUrl(url)) return
        if (isRumbleUrl(url) && !isRumbleShortsUrl(url)) {
          void runLimited(() => getLinkMetadata(url, { signal: controller.signal }))
            .then((meta) => {
              if (cancelled) return
              const info = rumbleInfoFromMeta(meta)
              if (info) rumbleEmbedFetched.value = { url, info }
            })
          return
        }
        void runLimited(() => getLinkMetadata(url, { signal: controller.signal }))
          .then((meta) => {
            if (cancelled) return
            linkMeta.value = meta
            linkMetaSettled.value = true
          })
          .catch(() => {
            if (!cancelled) linkMetaSettled.value = true
          })
      }, PREVIEW_FETCH_DWELL_MS)
    },
    { immediate: true },
  )


  return {
    preloadedArticle, embeddedArticle, embeddedSpace,
    youtubeEmbedUrl, youtubeOEmbed, youtubePosterSrc, onPosterError,
    isPreviewLinkRumble, rumbleEmbedUrl, rumblePosterUrl,
    directEmbedSrc, videoFrameStyle, videoBoxStyle,
    linkMeta, linkMetaSettled,
  }
}

export type PostLinkPreviewData = ReturnType<typeof usePostLinkPreviewData>
