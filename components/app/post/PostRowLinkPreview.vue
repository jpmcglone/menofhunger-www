<template>
  <div v-if="showAny" class="mt-3">
    <!-- Video embeds (special cases) -->
    <div
      v-if="youtubeEmbedUrl || isPreviewLinkRumble"
      class="overflow-hidden rounded-xl border moh-border bg-black/5 dark:bg-white/5"
      data-post-row-interactive
    >
      <!-- YouTube: 16:9 landscape or 9:16 portrait for Shorts. Rumble: oEmbed dimensions (fallback 854x480). -->
      <div
        ref="videoBoxEl"
        class="relative w-full"
        :style="youtubeEmbedUrl ? undefined : { aspectRatio: rumbleAspectRatio }"
        :class="youtubeVideoInfo?.isShort ? 'aspect-[9/16] max-h-[480px]' : (youtubeEmbedUrl ? 'aspect-video' : '')"
        role="button"
        tabindex="0"
        :aria-label="youtubeOEmbed?.title ? `Play ${youtubeOEmbed.title}` : 'Play video'"
        @click.stop="activateEmbeddedVideo"
        @keydown.enter.prevent="activateEmbeddedVideo"
        @keydown.space.prevent="activateEmbeddedVideo"
      >
        <!-- Poster image: try maxres, fall back to hqdefault -->
        <img
          v-if="youtubePosterSrc || rumblePosterUrl"
          :src="youtubePosterSrc || rumblePosterUrl || ''"
          class="absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-250"
          :class="desiredVideoSrc && videoIframeLoaded ? 'opacity-0' : 'opacity-90'"
          alt=""
          loading="lazy"
          aria-hidden="true"
          @error="onPosterError"
        >
        <iframe
          :src="videoIframeSrc"
          class="relative z-10 h-full w-full transition-opacity duration-250"
          :class="desiredVideoSrc && videoIframeLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'"
          :title="youtubeOEmbed?.title ? youtubeOEmbed.title : 'Embedded video'"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          @load="onVideoIframeLoad"
        />
        <!-- Play overlay — hidden once the video is active -->
        <div
          v-if="!videoIsPlayable"
          class="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none"
          aria-hidden="true"
        >
          <!-- Title / channel strip at the bottom (YouTube only) -->
          <div
            v-if="youtubeOEmbed"
            class="mt-auto px-3 pb-3 pt-8 bg-gradient-to-t from-black/70 to-transparent"
          >
            <div class="text-sm font-semibold text-white line-clamp-2 leading-snug">
              {{ youtubeOEmbed.title }}
            </div>
            <div class="mt-0.5 text-xs text-white/70">
              {{ youtubeOEmbed.authorName }}
            </div>
          </div>
          <!-- Play button (centred) -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="rounded-full bg-black/60 p-3.5">
              <Icon name="tabler:player-play-filled" class="text-2xl text-white" aria-hidden="true" />
            </div>
          </div>
        </div>
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

    <!-- Generic link preview (last link only, external sites) -->
    <a
      v-else-if="showLinkPreview"
      :href="previewLink || undefined"
      target="_blank"
      rel="noopener noreferrer"
      class="group block overflow-hidden rounded-xl border moh-border transition-colors moh-surface-hover moh-focus"
      aria-label="Open link"
      @click.stop
    >
      <div class="relative flex gap-3 p-3">
        <!-- Slight brightness wash behind content -->
        <div class="pointer-events-none absolute inset-0 bg-white/10" aria-hidden="true" />
        <div
          v-if="linkMeta?.imageUrl"
          class="relative z-10 h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-900"
          aria-hidden="true"
        >
          <img :src="linkMeta.imageUrl" class="h-full w-full object-cover" alt="" loading="lazy" >
        </div>
        <div class="relative z-10 min-w-0 flex-1">
          <div class="text-sm font-semibold moh-text truncate">
            {{ linkMeta?.title || previewLinkHost || 'Link' }}
          </div>
          <div v-if="linkMeta?.description" class="mt-0.5 text-xs moh-text-muted line-clamp-3">
            {{ linkMeta.description }}
          </div>
          <div class="mt-1 text-[11px] moh-text-muted truncate">
            {{ previewLinkDisplay }}
          </div>
        </div>
        <div class="relative z-10 shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true">
          <Icon name="tabler:external-link" class="text-[12px]" aria-hidden="true" />
        </div>
      </div>
    </a>

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
    <template v-if="embeddedSpaceId && rowInView">
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
      <!-- Resolved space -->
      <div v-else class="overflow-hidden rounded-xl border moh-border" data-post-row-interactive @click.stop>
        <AppSpaceRow :space="embeddedSpace" preview />
      </div>
    </template>

    <!-- User profile link → compact user card -->
    <div v-if="embeddedUsername && rowInView" data-post-row-interactive @click.stop>
      <AppUserLinkCard :username="embeddedUsername" :enabled="rowInView" />
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
</template>

<script setup lang="ts">
import { extractLinksFromText, getYouTubeEmbedUrl, getYouTubePosterUrls, parseYouTubeUrl, isRumbleShortsUrl, isRumbleUrl, safeUrlDisplay, safeUrlHostname, isMohUrl, mohUrlPath, extractMohPostId, extractMohArticleId, extractMohSpaceId, extractMohUsername, isXPostUrl, isSubstackPostUrl } from '~/utils/link-utils'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'
import type { RumbleEmbedInfo } from '~/utils/rumble-embed'
import { useEmbeddedVideoManager } from '~/composables/useEmbeddedVideoManager'
import { usePreviewFetchLimiter } from '~/composables/usePreviewFetchLimiter'
import type { ArticleSharePreview } from '~/types/api'
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
  /** When provided, used immediately as the article preview — no fetch needed. */
  preloadedArticle?: ArticleSharePreview | null
  /** When provided, used immediately as the embedded post preview — no fetch needed. */
  quotedPost?: import('~/types/api').FeedPost | null
}>()

const postId = computed(() => props.postId)
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
    if (u && extractMohSpaceId(u)) return u
  }
  return null
})

const embeddedSpaceId = computed(() => (embeddedSpaceLink.value ? extractMohSpaceId(embeddedSpaceLink.value) : null))

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

const { spaces, loadedOnce: spacesLoadedOnce, loadSpaces, getById: getSpaceById } = useSpaces()

const embeddedSpace = computed(() => (embeddedSpaceId.value ? getSpaceById(embeddedSpaceId.value) : null))

watch(
  [embeddedSpaceId, rowInView],
  ([id, inView], _old, onCleanup) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    onCleanup(() => {
      if (timer) clearTimeout(timer)
      timer = null
    })
    if (!id || !inView || spacesLoadedOnce.value) return
    timer = setTimeout(() => {
      void runLimited(() => loadSpaces())
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
    if (extractMohSpaceId(u)) continue
    if (extractMohUsername(u)) continue
    return u
  }
  return null
})

const showLinkPreview = computed(() => Boolean(previewLink.value && !hasMedia.value))
const previewLinkHost = computed(() => (previewLink.value ? safeUrlHostname(previewLink.value) : null))
const previewLinkDisplay = computed(() => (previewLink.value ? safeUrlDisplay(previewLink.value) : ''))

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

const rumbleEmbedInfo = ref<RumbleEmbedInfo | null>(null)
const rumbleEmbedUrl = computed(() => rumbleEmbedInfo.value?.src ?? null)
const rumbleAspectRatio = computed(() => {
  const w = rumbleEmbedInfo.value?.width ?? 854
  const h = rumbleEmbedInfo.value?.height ?? 480
  return `${w} / ${h}`
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

const { activePostId, register: registerEmbeddedVideo, unregister: unregisterEmbeddedVideo, activate: activateEmbeddedVideoById } =
  useEmbeddedVideoManager()
const hasEmbeddedVideo = computed(() => Boolean(youtubeEmbedUrl.value || isPreviewLinkRumble.value))
const videoIsPlayable = computed(() => hasEmbeddedVideo.value && rowInView.value && activePostId.value === postId.value)
const videoBoxEl = ref<HTMLElement | null>(null)
const videoIframeLoaded = ref(false)
const desiredVideoSrc = computed(() => {
  if (!rowInView.value) return null
  if (!hasEmbeddedVideo.value) return null
  if (activePostId.value !== postId.value) return null
  if (previewLink.value && youtubeEmbedUrl.value) {
    // Pass autoplay:true — the click is a user gesture, so the browser will honour it.
    return getYouTubeEmbedUrl(previewLink.value, { autoplay: true })
  }
  if (isPreviewLinkRumble.value) return rumbleEmbedUrl.value
  return null
})
const videoIframeSrc = computed(() => desiredVideoSrc.value ?? 'about:blank')

let iframeLoadRaf: number | null = null
function onVideoIframeLoad() {
  if (!import.meta.client) return
  // Ignore load events for about:blank
  if (!desiredVideoSrc.value) return
  if (iframeLoadRaf != null) cancelAnimationFrame(iframeLoadRaf)
  // Wait a beat so the iframe has a chance to paint before we fade the poster out.
  iframeLoadRaf = requestAnimationFrame(() => {
    iframeLoadRaf = requestAnimationFrame(() => {
      iframeLoadRaf = null
      if (!desiredVideoSrc.value) return
      videoIframeLoaded.value = true
    })
  })
}

watch(
  desiredVideoSrc,
  () => {
    // Activation/deactivation should show poster immediately.
    videoIframeLoaded.value = false
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (iframeLoadRaf != null) cancelAnimationFrame(iframeLoadRaf)
  iframeLoadRaf = null
})

watchEffect((onCleanup) => {
  if (!import.meta.client) return
  if (!rowInView.value) return
  if (!hasEmbeddedVideo.value) return
  const el = videoBoxEl.value
  if (!el) return

  registerEmbeddedVideo(postId.value, el)
  if (props.activateVideoOnMount) {
    activateEmbeddedVideoById(postId.value)
  }
  onCleanup(() => unregisterEmbeddedVideo(postId.value))
})

function activateEmbeddedVideo() {
  if (!import.meta.client) return
  if (!hasEmbeddedVideo.value) return
  activateEmbeddedVideoById(postId.value)
}

const linkMeta = ref<LinkMetadata | null>(null)
watch(
  [previewLink, rowInView, showLinkPreview],
  ([url, inView, canPreview], _old, onCleanup) => {
    linkMeta.value = null
    rumbleEmbedInfo.value = null
    if (!import.meta.client) return
    if (!canPreview) return
    if (!inView) return
    if (!url) return
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
            const embed = meta?.videoEmbed
            if (embed?.platform === 'rumble' && embed.embedUrl) {
              rumbleEmbedInfo.value = {
                src: embed.embedUrl,
                width: embed.width,
                height: embed.height,
                thumbnailUrl: embed.thumbnailUrl,
              }
            }
          })
        return
      }
      void runLimited(() => getLinkMetadata(url, { signal: controller.signal }))
        .then((meta) => {
          if (cancelled) return
          linkMeta.value = meta
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

const xPostMeta = computed(() => {
  if (!previewLink.value || !isXPostUrl(previewLink.value)) return null
  return linkMeta.value?.socialPost?.platform === 'x' ? linkMeta.value.socialPost : null
})

const substackMeta = computed(() => {
  if (!previewLink.value || !isSubstackPostUrl(previewLink.value)) return null
  return linkMeta.value ?? null
})

// Embedded MOH post: always show block so SSR can fetch and render the preview before first paint.
// Space/article/user preview: show skeleton while loading, resolved card when ready (both require rowInView).
// External link preview: only show when row is in view (avoid metadata fetch for off-screen rows).
// Article: when preloadedArticle is provided, PostRow renders the card directly — skip showing anything here.
// Scripture preview card: rendered at lowest priority — only when the link preview slot is
// completely empty and the post has exactly one scripture reference.
const singleScriptureRef = computed(() => {
  if (showLinkPreview.value) return null
  if (embeddedPostId.value || embeddedArticleId.value || embeddedSpaceId.value || embeddedUsername.value) return null
  if (hasMedia.value) return null
  const segments = splitTextByScriptureDisplay(body.value)
  const refs = segments.filter(s => s.scripture).map(s => s.scripture!.reference)
  return refs.length === 1 ? refs[0] : null
})

const showAny = computed(() =>
  Boolean(
    embeddedPostId.value ||
    (embeddedArticleId.value && !preloadedArticle.value && rowInView.value) ||
    (embeddedSpaceId.value && rowInView.value) ||
    (embeddedUsername.value && rowInView.value) ||
    (showLinkPreview.value && rowInView.value) ||
    (singleScriptureRef.value && rowInView.value),
  )
)
</script>

