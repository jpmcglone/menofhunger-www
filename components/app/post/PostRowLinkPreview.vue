<template>
  <div v-if="showAny" class="mt-3" :inert="previewInteractionLocked || undefined">
    <AppSpotifyEmbed v-if="showLinkPreview && spotifyPreview" :content="spotifyPreview" />
    <!-- Video embeds (special cases) -->
    <!-- Portrait frames get an explicit px width (left-aligned); landscape fills the row.
         The frame width lives here, not on the inner box, so no percentage is resolved
         against a shrink-to-fit parent — that made portrait Rumble start tiny and grow. -->
    <div
      v-else-if="youtubeEmbedUrl || isPreviewLinkRumble"
      :style="videoFrameStyle"
    >
    <div
      class="overflow-hidden rounded-xl border moh-border bg-black/5 dark:bg-white/5"
      data-post-row-interactive
    >
      <!-- YouTube: 16:9 landscape or 9:16 portrait for Shorts.
           Rumble: encoded file size from the API (fallback 854x480). -->
      <AppEmbeddedVideoPlayer
        v-if="!previewOnly"
        :youtube-url="youtubeEmbedUrl ? previewLink : null"
        :rumble-url="rumbleEmbedUrl"
        :poster="youtubePosterSrc || rumblePosterUrl"
        :title="youtubeOEmbed?.title"
        :author="youtubeOEmbed?.authorName"
        :frame-style="videoBoxStyle"
        @poster-error="onPosterError"
      />
      <img v-else-if="youtubePosterSrc || rumblePosterUrl" :src="youtubePosterSrc || rumblePosterUrl || ''" :style="videoBoxStyle" class="w-full object-cover" alt="Video preview">

    </div>
    <div v-if="isPreviewLinkRumble && previewLink" class="mt-2 flex justify-end">
      <a
        :href="previewLink || undefined"
        target="_blank"
        rel="noopener noreferrer"
        class="text-[11px] font-semibold transition-colors"
        style="color: #85c742;"
        aria-label="Open on Rumble"
        @click.stop
      >
        Open on Rumble
      </a>
    </div>
    </div>

    <!-- MoH internal link preview — branded card, navigates in-app -->
    <NuxtLink
      v-else-if="showLinkPreview && isMohInternalLink && mohInternalPath"
      :to="mohInternalPath"
      class="group block overflow-hidden rounded-xl border moh-border transition-colors moh-surface-hover moh-focus"
      aria-label="Open page"
      @click.stop
    >
      <div class="relative flex items-center gap-3 p-3">
        <div class="pointer-events-none absolute inset-0 bg-white/10" aria-hidden="true" />
        <div class="relative z-10 h-12 w-12 shrink-0 overflow-hidden rounded-lg border moh-border" aria-hidden="true">
          <img :src="logoLight" class="h-full w-full object-cover dark:hidden" alt="" loading="lazy" >
          <img :src="logoDark" class="h-full w-full object-cover hidden dark:block" alt="" loading="lazy" >
        </div>
        <div class="relative z-10 min-w-0 flex-1">
          <div class="text-sm font-semibold moh-text truncate">
            {{ linkMeta?.title || mohInternalTitle }}
          </div>
          <div v-if="linkMeta?.description" class="mt-0.5 text-xs moh-text-muted line-clamp-2">
            {{ linkMeta.description }}
          </div>
          <div class="mt-1 text-[11px] moh-text-muted">menofhunger.com</div>
        </div>
      </div>
    </NuxtLink>

    <AppXPostPreviewCard
      v-else-if="showLinkPreview && xPostMeta && previewLink"
      :post="xPostMeta"
      :href="previewLink"
    />

    <AppSubstackPostCard
      v-else-if="showLinkPreview && substackMeta && substackMeta.title && previewLink"
      :meta="substackMeta"
      :href="previewLink"
    />

    <AppLinkCard
      v-else-if="showGenericWebsitePreview && previewLink && (!mayBecomeCustomEmbed || linkMetaSettled)"
      :href="previewLink"
      :site-label="linkCardSiteLabel"
      :state="linkCardState"
      :title="linkMeta?.title || linkMeta?.siteName"
      :description="linkMeta?.description"
      :image-url="linkMeta?.imageUrl"
      :preview-only="previewOnly"
      :dismissible="dismissible"
      @dismiss="dismissGenericPreview"
    />

    <!-- Scripture preview card: lowest priority, only when slot is otherwise empty and
         exactly one scripture reference is present in the post body. -->
    <AppScriptureVerseCard
      v-if="singleScriptureRef && rowInView"
      :reference="singleScriptureRef"
    />

    <!-- MOH article link → article share card (or skeleton while fetching) -->
    <!-- Suppressed when a preloaded article is passed in — the parent PostRow renders
         AppArticleShareCard directly in that case to avoid a duplicate card. -->
    <template v-if="embeddedArticleId && !preloadedArticle">
      <!-- Resolved -->
      <div v-if="embeddedArticle" data-post-row-interactive @click.stop>
        <AppArticleShareCard :article="embeddedArticle" />
      </div>
      <!-- Skeleton: matches AppArticleShareCard layout so the row height is stable -->
      <div
        v-else-if="rowInView"
        class="mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-700 animate-pulse"
        aria-hidden="true"
      >
        <!-- Thumbnail placeholder (16:9) -->
        <div class="aspect-[16/9] w-full bg-gray-200 dark:bg-zinc-800" />
        <!-- Content placeholder -->
        <div class="p-3 space-y-2">
          <!-- Label row -->
          <div class="h-2.5 w-16 rounded bg-gray-200 dark:bg-zinc-700" />
          <!-- Title -->
          <div class="h-3.5 w-4/5 rounded bg-gray-200 dark:bg-zinc-700" />
          <div class="h-3.5 w-3/5 rounded bg-gray-200 dark:bg-zinc-700" />
          <!-- Excerpt -->
          <div class="h-2.5 w-full rounded bg-gray-200 dark:bg-zinc-700" />
          <div class="h-2.5 w-2/3 rounded bg-gray-200 dark:bg-zinc-700" />
          <!-- Author row -->
          <div class="flex items-center gap-1.5 pt-1">
            <div class="h-4 w-4 rounded-full bg-gray-200 dark:bg-zinc-700 shrink-0" />
            <div class="h-2.5 w-24 rounded bg-gray-200 dark:bg-zinc-700" />
          </div>
        </div>
      </div>
    </template>

    <!-- Stop propagation so the parent PostRow's row-click handler never fires when
         clicking the embedded preview — the NuxtLink inside handles navigation. -->
    <div v-if="embeddedPostId" data-post-row-interactive @click.stop>
      <AppEmbeddedPostPreview
        :post-id="embeddedPostId"
        :preloaded-post="props.quotedPost ?? undefined"
        :enabled="embeddedPreviewEnabled"
      />
    </div>

    <!-- Space preview — rendered as a card using the exact same row as /spaces -->
    <template v-if="hasEmbeddedSpace && rowInView">
      <!-- Skeleton while the space store is loading -->
      <div
        v-if="!embeddedSpace"
        class="overflow-hidden rounded-xl border moh-border animate-pulse"
        aria-hidden="true"
      >
        <div class="flex items-center gap-3 px-4 py-2.5">
          <div class="h-8 w-8 shrink-0 rounded-full bg-black/10 dark:bg-white/10" />
          <div class="flex-1 space-y-1.5">
            <div class="h-3 w-2/5 rounded bg-black/10 dark:bg-white/10" />
            <div class="h-2.5 w-1/3 rounded bg-black/10 dark:bg-white/10" />
          </div>
        </div>
      </div>
      <!-- Resolved space — AppSpaceRow is already the card -->
      <div v-else data-post-row-interactive @click.stop>
        <AppSpaceRow :space="embeddedSpace" preview />
      </div>
    </template>

    <!-- User profile link → compact user card -->
    <div v-if="embeddedUsername && rowInView" data-post-row-interactive @click.stop>
      <AppUserLinkCard :username="embeddedUsername" :enabled="rowInView" />
    </div>

  </div>
</template>

<script setup lang="ts">
import { extractLinksFromText, getYouTubeEmbedUrl, getYouTubePosterUrls, parseYouTubeUrl, isRumbleShortsUrl, isRumbleUrl, portraitEmbedFrameStyle, sameNormalizedUrl, safeUrlHostname, isMohUrl, mohUrlPath, extractMohPostId, extractMohArticleId, extractMohSpaceId, extractMohSpaceUsername, isMohSpaceLink, extractMohUsername, isXPostUrl, isSubstackPostUrl } from '~/utils/link-utils'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata, peekLinkMetadata } from '~/utils/link-metadata'
import type { RumbleEmbedInfo } from '~/utils/rumble-embed'
import { usePreviewFetchLimiter } from '~/composables/usePreviewFetchLimiter'
import type { ArticleSharePreview, PostVideoEmbed } from '~/types/api'
import { spotifyContent, isSpotifyShareUrl } from '~/utils/spotify-embed'
import { splitTextByScriptureDisplay } from '~/utils/scripture-reference'

// Stable public paths (not `~/assets` imports) so the URL is identical on
// server and client — avoids the Vite dev `?t=<timestamp>` hydration mismatch.
const logoLight = '/images/logo-white-bg-small.png'
const logoDark = '/images/logo-black-bg-small.png'

const props = defineProps<{
  postId: string
  body: string
  hasMedia: boolean
  rowInView: boolean
  activateVideoOnMount?: boolean
  /** Drafts share the exact card layout without participating in feed autoplay. */
  previewOnly?: boolean
  /** Composer-only: show a dismiss control on generic website cards. */
  dismissible?: boolean
  /** When provided, used immediately as the article preview — no fetch needed. */
  preloadedArticle?: ArticleSharePreview | null
  /** When provided, used immediately as the embedded post preview — no fetch needed. */
  quotedPost?: import('~/types/api').FeedPost | null
  /** Server-cached embed for the preview link — sizes the player before any fetch. */
  videoEmbed?: PostVideoEmbed | null
}>()

const body = computed(() => (props.body ?? '').toString())
const hasMedia = computed(() => Boolean(props.hasMedia))
const rowInView = computed(() => Boolean(props.rowInView))

const capturedLinks = computed(() => extractLinksFromText(body.value))

const embeddedPostLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && extractMohPostId(u)) return u
  }
  return null
})

const embeddedPostId = computed(() => (embeddedPostLink.value ? extractMohPostId(embeddedPostLink.value) : null))

const embeddedArticleLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && extractMohArticleId(u)) return u
  }
  return null
})

const embeddedArticleId = computed(() => (embeddedArticleLink.value ? extractMohArticleId(embeddedArticleLink.value) : null))

const preloadedArticle = computed(() => props.preloadedArticle ?? null)
const embeddedArticle = ref<ArticleSharePreview | null>(null)

// Seed from preloaded data immediately (no fetch needed for articleShare posts).
watchEffect(() => {
  if (preloadedArticle.value) {
    embeddedArticle.value = preloadedArticle.value
  }
})

const embeddedSpaceLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && isMohSpaceLink(u)) return u
  }
  return null
})

const embeddedSpaceId = computed(() => (embeddedSpaceLink.value ? extractMohSpaceId(embeddedSpaceLink.value) : null))
const embeddedSpaceUsername = computed(() => (embeddedSpaceLink.value ? extractMohSpaceUsername(embeddedSpaceLink.value) : null))
const hasEmbeddedSpace = computed(() => Boolean(embeddedSpaceId.value || embeddedSpaceUsername.value))

const embeddedUserLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && extractMohUsername(u)) return u
  }
  return null
})

const embeddedUsername = computed(() => (embeddedUserLink.value ? extractMohUsername(embeddedUserLink.value) : null))

const { apiFetchData } = useApiClient()
const { runLimited } = usePreviewFetchLimiter()
const PREVIEW_FETCH_DWELL_MS = 400

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

const previewLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (!u) continue
    if (extractMohPostId(u)) continue
    if (extractMohArticleId(u)) continue
    if (isMohSpaceLink(u)) continue
    if (extractMohUsername(u)) continue
    return u
  }
  return null
})

const showLinkPreview = computed(() => Boolean(previewLink.value && !hasMedia.value))
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

const embeddedPreviewEnabled = computed(() => {
  // Keep embedded post hydration strictly viewport-driven to avoid eager single-post fetches.
  return rowInView.value
})

const isMohInternalLink = computed(() => Boolean(previewLink.value && isMohUrl(previewLink.value)))
const mohInternalPath = computed(() => (previewLink.value ? mohUrlPath(previewLink.value) : null))

const mohInternalTitle = computed(() => {
  const p = mohInternalPath.value
  if (!p) return 'Men of Hunger'
  const segment = p.split('/').filter(Boolean)[0]
  if (!segment) return 'Men of Hunger'
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
})

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
</script>

