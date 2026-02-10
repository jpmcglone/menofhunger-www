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

    <!-- Generic link preview (last link only) -->
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
          <div v-if="linkMeta?.description" class="mt-0.5 text-xs moh-text-muted overflow-hidden text-ellipsis">
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

    <AppEmbeddedPostPreview
      v-if="embeddedPostId"
      :post-id="embeddedPostId"
      :enabled="embeddedPreviewEnabled"
    />

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
import { siteConfig } from '~/config/site'
import { extractLinksFromText, getYouTubeEmbedUrl, getYouTubePosterUrl, isRumbleShortsUrl, isRumbleUrl, safeUrlDisplay, safeUrlHostname } from '~/utils/link-utils'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'
import type { RumbleEmbedInfo } from '~/utils/rumble-embed'
import { resolveRumbleEmbedInfo } from '~/utils/rumble-embed'
import { useEmbeddedVideoManager } from '~/composables/useEmbeddedVideoManager'

const props = defineProps<{
  postId: string
  body: string
  hasMedia: boolean
  rowInView: boolean
  activateVideoOnMount?: boolean
}>()

const postId = computed(() => props.postId)
const body = computed(() => (props.body ?? '').toString())
const hasMedia = computed(() => Boolean(props.hasMedia))
const rowInView = computed(() => Boolean(props.rowInView))

function isLocalHost(host: string, expected: string) {
  const h = (host ?? '').trim().toLowerCase()
  const e = (expected ?? '').trim().toLowerCase()
  if (!h || !e) return false
  return h === e || h === `www.${e}`
}

function tryExtractLocalPostId(url: string): string | null {
  const raw = (url ?? '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null

    const allowedHosts = new Set<string>()
    try {
      const fromCfg = new URL(siteConfig.url)
      if (fromCfg.hostname) allowedHosts.add(fromCfg.hostname.toLowerCase())
    } catch {
      // ignore
    }
    if (import.meta.client) {
      const h = window.location.hostname
      if (h) allowedHosts.add(h.toLowerCase())
    }

    const host = u.hostname.toLowerCase()
    const ok = Array.from(allowedHosts).some((a) => isLocalHost(host, a))
    if (!ok) return null

    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    if (parts[0] !== 'p') return null
    const id = (parts[1] ?? '').trim()
    return id || null
  } catch {
    return null
  }
}

const capturedLinks = computed(() => extractLinksFromText(body.value))

const embeddedPostLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && tryExtractLocalPostId(u)) return u
  }
  return null
})

const embeddedPostId = computed(() => (embeddedPostLink.value ? tryExtractLocalPostId(embeddedPostLink.value) : null))

const previewLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (!u) continue
    if (tryExtractLocalPostId(u)) continue
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
  async ([url, inView, canPreview]) => {
    linkMeta.value = null
    rumbleEmbedInfo.value = null
    if (!import.meta.client) return
    if (!canPreview) return
    if (!inView) return
    if (!url) return
    // Special cases (embed) do not need metadata.
    if (getYouTubeEmbedUrl(url)) return
    if (isRumbleUrl(url) && !isRumbleShortsUrl(url)) {
      rumbleEmbedInfo.value = await resolveRumbleEmbedInfo(url)
      return
    }
    linkMeta.value = await getLinkMetadata(url)
  },
  { immediate: true },
)

const embeddedPreviewEnabled = computed(() => {
  // Allow SSR to fetch embedded post previews on first paint.
  if (import.meta.server) return true
  return rowInView.value
})

// Embedded MOH post: always show block so SSR can fetch and render the preview before first paint.
// External link preview: only show when row is in view (avoid metadata fetch for off-screen rows).
const showAny = computed(() => Boolean(embeddedPostId.value || (showLinkPreview.value && rowInView.value)))
</script>

