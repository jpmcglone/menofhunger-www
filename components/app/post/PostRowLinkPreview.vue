<template>
  <div v-if="showAny" class="mt-3">
    <!-- Video embeds (special cases) -->
    <div
      v-if="youtubeEmbedUrl || isPreviewLinkRumble"
      class="overflow-hidden rounded-xl border moh-border bg-black/5 dark:bg-white/5"
    >
      <!-- YouTube: fixed 16:9. Rumble: use oEmbed dimensions (fallback 854x480). -->
      <div
        class="relative w-full"
        ref="videoBoxEl"
        :style="youtubeEmbedUrl ? undefined : { aspectRatio: rumbleAspectRatio }"
        :class="youtubeEmbedUrl ? 'aspect-video' : ''"
        @click.stop="activateEmbeddedVideo"
      >
        <img
          v-if="youtubePosterUrl || rumblePosterUrl"
          :src="youtubePosterUrl || rumblePosterUrl || ''"
          class="absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-250"
          :class="desiredVideoSrc && videoIframeLoaded ? 'opacity-0' : 'opacity-90'"
          alt=""
          loading="lazy"
          aria-hidden="true"
        />
        <iframe
          :src="videoIframeSrc"
          class="relative z-10 h-full w-full transition-opacity duration-250"
          :class="desiredVideoSrc && videoIframeLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'"
          title="Embedded video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          @load="onVideoIframeLoad"
        />
        <!-- Thin black film + click-to-play when video is not yet active -->
        <div
          v-if="!videoIsPlayable"
          class="absolute inset-0 z-20 flex items-center justify-center bg-black/10"
          aria-hidden="true"
        >
          <div class="flex flex-col items-center gap-2 rounded-full bg-black/50 px-4 py-3">
            <Icon name="tabler:play" class="text-2xl text-white" aria-hidden="true" />
            <span class="text-xs font-medium text-white/90">Click to play</span>
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
          <img :src="logoLight" class="h-full w-full object-cover dark:hidden" alt="" loading="lazy" />
          <img :src="logoDark" class="h-full w-full object-cover hidden dark:block" alt="" loading="lazy" />
        </div>
        <div class="relative z-10 min-w-0 flex-1">
          <div class="text-sm font-semibold moh-text truncate">
            {{ linkMeta?.title || 'Men of Hunger' }}
          </div>
          <div v-if="linkMeta?.description" class="mt-0.5 text-xs moh-text-muted line-clamp-2">
            {{ linkMeta.description }}
          </div>
          <div class="mt-1 text-[11px] moh-text-muted">menofhunger.com</div>
        </div>
      </div>
    </NuxtLink>

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
          <img :src="linkMeta.imageUrl" class="h-full w-full object-cover" alt="" loading="lazy" />
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

    <!-- MOH article link → article share card (or skeleton while fetching) -->
    <!-- Suppressed when a preloaded article is passed in — the parent PostRow renders
         AppArticleShareCard directly in that case to avoid a duplicate card. -->
    <template v-if="embeddedArticleId && !preloadedArticle">
      <!-- Resolved -->
      <div v-if="embeddedArticle" @click.stop>
        <AppArticleShareCard :article="embeddedArticle" />
      </div>
      <!-- Skeleton: matches AppArticleShareCard layout so the row height is stable -->
      <div
        v-else-if="rowInView"
        class="mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-700 animate-pulse"
        aria-hidden="true"
        @click.stop
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
    <div v-if="embeddedPostId" @click.stop>
      <AppEmbeddedPostPreview
        :post-id="embeddedPostId"
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
        @click.stop
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
      <div v-else class="overflow-hidden rounded-xl border moh-border" @click.stop>
        <AppSpaceRow :space="embeddedSpace" preview />
      </div>
    </template>

    <!-- User profile link → compact user card -->
    <div v-if="embeddedUsername && rowInView" @click.stop>
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
import { extractLinksFromText, getYouTubeEmbedUrl, getYouTubePosterUrl, isRumbleShortsUrl, isRumbleUrl, safeUrlDisplay, safeUrlHostname, isMohUrl, mohUrlPath, extractMohPostId, extractMohArticleId, extractMohSpaceId, extractMohUsername } from '~/utils/link-utils'
import logoLight from '~/assets/images/logo-white-bg-small.png'
import logoDark from '~/assets/images/logo-black-bg-small.png'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'
import type { RumbleEmbedInfo } from '~/utils/rumble-embed'
import { resolveRumbleEmbedInfo } from '~/utils/rumble-embed'
import { useEmbeddedVideoManager } from '~/composables/useEmbeddedVideoManager'
import { usePreviewFetchLimiter } from '~/composables/usePreviewFetchLimiter'
import type { ArticleSharePreview } from '~/types/api'

const props = defineProps<{
  postId: string
  body: string
  hasMedia: boolean
  rowInView: boolean
  activateVideoOnMount?: boolean
  /** When provided, used immediately as the article preview — no fetch needed. */
  preloadedArticle?: ArticleSharePreview | null
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
const youtubePosterUrl = computed(() => (previewLink.value ? getYouTubePosterUrl(previewLink.value) : null))

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
  if (youtubeEmbedUrl.value) return youtubeEmbedUrl.value
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
        void runLimited(() => resolveRumbleEmbedInfo(url))
          .then((info) => {
            if (cancelled) return
            rumbleEmbedInfo.value = info
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

// Embedded MOH post: always show block so SSR can fetch and render the preview before first paint.
// Space/article/user preview: show skeleton while loading, resolved card when ready (both require rowInView).
// External link preview: only show when row is in view (avoid metadata fetch for off-screen rows).
// Article: when preloadedArticle is provided, PostRow renders the card directly — skip showing anything here.
const showAny = computed(() =>
  Boolean(
    embeddedPostId.value ||
    (embeddedArticleId.value && !preloadedArticle.value && rowInView.value) ||
    (embeddedSpaceId.value && rowInView.value) ||
    (embeddedUsername.value && rowInView.value) ||
    (showLinkPreview.value && rowInView.value),
  )
)
</script>

