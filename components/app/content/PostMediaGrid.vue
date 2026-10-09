<template>
  <!-- Single media -->
  <div
    v-if="items.length === 1"
    class="mt-3 flex justify-start"
    :class="{ 'pointer-events-none': !interactive }"
  >
    <!-- Single video -->
    <div
      v-if="items[0]?.kind === 'video'"
      ref="singleVideoContainerRef"
      class="relative overflow-hidden bg-transparent"
      :class="singleBoxClass"
      :style="[singleBoxStyle, mediaFrameStyle]"
    >
      <video
        v-if="interactive && direct && items[0]?.url"
        data-media-managed
        :src="items[0].url"
        :poster="posterFor(items[0])"
        class="absolute inset-0 h-full w-full object-contain"
        controls
        controlsList="nodownload"
        playsinline
        preload="metadata"
        aria-label="Video"
        @play="claimDirectPlayback"
        @pause="releaseDirectPlayback"
        @ended="releaseDirectPlayback"
        @contextmenu.prevent
      />
      <video
        v-else-if="interactive && items[0]?.url"
        ref="singleVideoEl"
        data-media-managed
        :src="singleVideoSrc"
        :poster="posterFor(items[0])"
        :preload="singleVideoPreload"
        class="absolute inset-0 h-full w-full object-contain"
        :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
        controls
        controlsList="nodownload"
        playsinline
        muted
        loop
        aria-label="Video"
        @volumechange="singleVideoMuted = ($event.target as HTMLVideoElement).muted"
        @contextmenu.prevent
      />
      <AppImg
        v-else-if="items[0]?.url"
        :src="posterFor(items[0]) || items[0]?.url"
        class="absolute inset-0 h-full w-full object-contain"
        :alt="items[0]?.alt ?? ''"
        sizes="(max-width: 640px) 100vw, 720px"
        loading="lazy"
        decoding="async"
      />
      <button
        v-if="interactive && !direct && singleVideoActive && singleVideoMuted"
        type="button"
        class="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        aria-label="Tap for sound"
        @click.stop="onTapUnmute"
      >
        <Icon name="tabler:volume-off" class="text-base" aria-hidden="true" />
      </button>
      <button
        v-else-if="interactive && !direct && singleVideoActive && !singleVideoMuted"
        type="button"
        class="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        aria-label="Mute"
        @click.stop="onTapMute"
      >
        <Icon name="tabler:volume" class="text-base" aria-hidden="true" />
      </button>
      <span
        v-if="interactive && !direct && items[0]?.durationSeconds != null && items[0].durationSeconds > 0"
        class="pointer-events-none absolute right-2 bottom-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white"
        aria-hidden="true"
      >
        {{ formatDuration(items[0].durationSeconds) }}
      </span>
    </div>

    <!-- Single image — interactive: the HoverZoom IS the outer box so the whole
         container (including border-radius) scales as a unit on hover. -->
    <AppHoverZoom
      v-else-if="items[0]?.url && interactive"
      mode="frame"
      :scale="1.02"
      :max-translate-px="4"
      pan-axes="xy"
      :root-class="`overflow-hidden bg-transparent ${singleBoxClass}`"
      :root-style="[singleBoxStyle, mediaFrameStyle]"
    >
      <button
        type="button"
        data-media-open
        class="absolute inset-0 m-0 block h-full w-full cursor-zoom-in select-none border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20"
        aria-label="View image"
        @click.stop="openAt($event, 0)"
      >
        <AppImg
          :src="items[0]?.url"
          class="absolute inset-0 h-full w-full object-contain"
          :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
          :width="singleWidth ?? undefined"
          :height="singleHeight ?? undefined"
          :alt="items[0]?.alt ?? ''"
          sizes="(max-width: 640px) 100vw, 720px"
          loading="lazy"
          decoding="async"
        />
      </button>
    </AppHoverZoom>
    <div
      v-else-if="items[0]?.url"
      class="relative overflow-hidden bg-transparent select-none"
      :class="singleBoxClass"
      :style="[singleBoxStyle, mediaFrameStyle]"
    >
      <AppImg
        :src="items[0]?.url"
        class="absolute inset-0 h-full w-full object-contain"
        :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
        :width="singleWidth ?? undefined"
        :height="singleHeight ?? undefined"
        :alt="items[0]?.alt ?? ''"
        sizes="(max-width: 640px) 100vw, 720px"
        loading="lazy"
        decoding="async"
      />
    </div>

    <!-- Deleted single media placeholder -->
    <div
      v-else
      class="flex shrink-0 items-center justify-center overflow-hidden border moh-border moh-surface"
      :style="[{
        maxHeight: `${FIXED_HEIGHT_REM}rem`,
        minHeight: '6rem',
        width: '100%',
        maxWidth: MAX_WIDTH_REM != null ? `${MAX_WIDTH_REM}rem` : undefined,
      }, mediaFrameStyle]"
      aria-label="Deleted media"
    >
      <div class="flex flex-col items-center gap-2 text-sm moh-text-muted select-none">
        <Icon name="tabler:photo" class="text-2xl opacity-70" aria-hidden="true" />
        <div class="font-semibold">Deleted</div>
      </div>
    </div>
  </div>

  <!-- Multi-media grid -->
  <div
    v-else-if="items.length > 1"
    class="mt-3"
    :class="{ 'pointer-events-none': !interactive }"
  >
    <!-- Outer frame + 1px seams use the same low-contrast divider as post rows
         (`moh-border`). Parent bg shows through `gap-px`; cells stay opaque. -->
    <div
      class="relative w-full overflow-hidden border moh-border"
      :style="[gridWrapperStyle, mediaFrameStyle, multiGridChromeStyle]"
    >
      <div class="grid h-full w-full gap-px" :class="gridClass" :style="gridStyle">
        <template v-for="(m, idx) in items" :key="m.id || idx">
          <!-- Valid media cell — interactive. Image/GIF cells use contain hover zoom. -->
          <button
            v-if="m.url && interactive"
            type="button"
            data-media-open
            class="relative m-0 block min-h-0 min-w-0 cursor-zoom-in overflow-hidden border-0 moh-surface p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20"
            :class="itemClass(idx)"
            :aria-label="m.kind === 'video' ? `View video ${idx + 1} of ${items.length}` : `View image ${idx + 1} of ${items.length}`"
            @click.stop="openAt($event, idx)"
          >
            <AppHoverZoom
              v-if="m.kind !== 'video'"
              mode="contain"
              :scale="1.04"
              root-class="overflow-hidden"
              :root-style="{ position: 'absolute', top: '0', right: '0', bottom: '0', left: '0' }"
            >
              <template #default="{ style: zoomStyle }">
                <AppImg
                  :src="m.url"
                  class="block h-full w-full object-cover object-center"
                  :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
                  :style="zoomStyle"
                  :alt="m.alt ?? ''"
                  sizes="(max-width: 640px) 50vw, 360px"
                  loading="lazy"
                  decoding="async"
                />
              </template>
            </AppHoverZoom>
            <template v-else>
              <AppImg
                :src="posterFor(m) || m.url"
                class="block h-full w-full object-cover object-center"
                :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
                :alt="m.alt ?? ''"
                sizes="(max-width: 640px) 50vw, 360px"
                loading="lazy"
                decoding="async"
              />
              <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20" aria-hidden="true">
                <Icon name="tabler:play" class="text-2xl text-white drop-shadow" aria-hidden="true" />
              </div>
            </template>
            <div
              class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 hover:bg-black/10"
              aria-hidden="true"
            />
          </button>

          <!-- Valid media cell — display-only -->
          <div
            v-else-if="m.url"
            class="relative min-h-0 min-w-0 overflow-hidden moh-surface"
            :class="itemClass(idx)"
          >
            <AppImg
              v-if="m.kind !== 'video'"
              :src="m.url"
              class="block h-full w-full object-cover object-center"
              :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
              :alt="m.alt ?? ''"
              sizes="(max-width: 640px) 50vw, 360px"
              loading="lazy"
              decoding="async"
            />
            <template v-else>
              <AppImg
                :src="posterFor(m) || m.url"
                class="block h-full w-full object-cover object-center"
                :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
                :alt="m.alt ?? ''"
                sizes="(max-width: 640px) 50vw, 360px"
                loading="lazy"
                decoding="async"
              />
              <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20" aria-hidden="true">
                <Icon name="tabler:play" class="text-2xl text-white drop-shadow" aria-hidden="true" />
              </div>
            </template>
          </div>

          <!-- Deleted media cell -->
          <div
            v-else
            class="relative min-w-0 min-h-0 overflow-hidden flex items-center justify-center moh-surface"
            :class="itemClass(idx)"
            aria-label="Deleted media"
          >
            <div class="flex flex-col items-center gap-1 text-[12px] moh-text-muted select-none">
              <Icon name="tabler:photo" class="text-xl opacity-70" aria-hidden="true" />
              <div class="font-semibold">Deleted</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppImg from '~/components/app/media/AppImg.vue'
import { mediaFocus } from '~/utils/mediaFocus'
import type { PostMedia } from '~/types/api'
import type { LightboxMediaItem } from '~/composables/useImageLightbox'
import { usePostMediaGridLayout } from '~/composables/media/usePostMediaGridLayout'
import { usePostMediaGridVideo } from '~/composables/media/usePostMediaGridVideo'

const props = withDefaults(
  defineProps<{
    media: PostMedia[]
    /** Post id (for single-video inline + lightbox "one playing globally"). */
    postId?: string | null
    /** When true, row is in view — single video loads src and is ready to play. */
    rowInView?: boolean
    /** When true, use smaller max height and cap aspect ratio at 4:6 (h:w). */
    compact?: boolean
    /** When false, media is display-only (no lightbox, no video playback). Clicks pass through to parent (e.g. embedded preview). */
    interactive?: boolean
    /** One video, no feed beside it. Native controls, paused, with sound. */
    direct?: boolean
  }>(),
  { compact: false, postId: null, rowInView: true, interactive: true, direct: false }
)

const viewer = useImageLightbox()
const videoManager = useEmbeddedVideoManager()
const videoInstanceId = `upload:${useId()}`
const directFocusId = `direct:${videoInstanceId}`

function claimDirectPlayback(event: Event) {
  const el = event.target
  if (!(el instanceof HTMLVideoElement)) return
  mediaFocus.claim(directFocusId, () => { el.pause() }, { exclusive: true })
}

function releaseDirectPlayback() {
  mediaFocus.release(directFocusId)
}

// Declared before any watch/computed that reads it — a later `const items`
// left watchEffect in the TDZ (`Cannot access 'items' before initialization`)
// and aborted every media-grid setup, remounting feed rows and embeds.
const items = computed(() => (props.media ?? []).filter((m) => Boolean(m?.url) || Boolean(m?.deletedAt)).slice(0, 4))

const { singleVideoContainerRef, singleVideoEl, singleVideoMuted, singleVideoActive, singleVideoSrc, singleVideoPreload, posterFor, formatDuration, onTapUnmute, onTapMute } = usePostMediaGridVideo(props, items, videoManager, videoInstanceId)
function toLightboxItems(): LightboxMediaItem[] {
  return items.value.map((m) => ({
    url: m.url ?? '',
    kind: (m.kind === 'video' ? 'video' : 'image') as 'image' | 'video',
    posterUrl: (m as { thumbnailUrl?: string | null }).thumbnailUrl ?? null,
    durationSeconds: (m as { durationSeconds?: number | null }).durationSeconds ?? null,
    width: (m as { width?: number | null }).width ?? null,
    height: (m as { height?: number | null }).height ?? null,
  }))
}

const mediaFrameStyle = { borderRadius: 'var(--moh-media-radius)' }
/** Seam color behind `gap-px` — matches post-row `moh-border`. */
const multiGridChromeStyle = { backgroundColor: 'var(--moh-border)' }

const hideThumbs = computed(() => viewer.kind.value === 'media' && viewer.hideOrigin.value)
const urls = computed(() => items.value.map((m) => m.url).filter(Boolean))

const { FIXED_HEIGHT_REM, MAX_WIDTH_REM, singleWidth, singleHeight, singleBoxStyle, singleBoxClass, gridClass, gridStyle, gridWrapperStyle, itemClass } = usePostMediaGridLayout(props, items)
function openAt(e: MouseEvent, idx: number) {
  const xs = urls.value
  if (!xs.length) return

  // Prevent the browser's default focus outline from lingering after closing the lightbox
  // when the user clicked/tapped (pointer). Keep keyboard focus behavior intact.
  const el = e.currentTarget as HTMLElement | null
  if (el && typeof e.detail === 'number' && e.detail > 0) el.blur()

  const urlIndex = Math.max(
    0,
    Math.min(
      xs.length - 1,
      items.value.slice(0, idx + 1).filter((m) => Boolean(m.url)).length - 1,
    ),
  )
  const startMode = items.value.length > 1 ? 'origin' : 'fitAnchored'
  if (props.postId) {
    viewer.openGalleryFromMediaItems(e, toLightboxItems(), urlIndex, 'Media', {
      mediaStartMode: startMode,
      postId: props.postId,
    })
  } else {
    viewer.openGalleryFromEvent(e, xs, urlIndex, 'Image', { mediaStartMode: startMode })
  }
}
</script>

