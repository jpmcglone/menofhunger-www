<template>
  <!-- Single media -->
  <div
    v-if="items.length === 1"
    class="mt-3 flex justify-start"
    :class="{ 'pointer-events-none': !interactive }"
  >
    <!-- Single video: interactive = inline player; non-interactive = poster only -->
    <div
      v-if="items[0]?.kind === 'video'"
      ref="singleVideoContainerRef"
      :class="singleBoxClass"
      :style="singleBoxStyle"
      class="moh-squircle relative overflow-hidden rounded-2xl bg-black"
    >
      <video
        v-if="interactive && items[0]?.url"
        ref="singleVideoEl"
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
        @contextmenu.prevent
        @play="onSingleVideoPlay"
        @pause="onSingleVideoPause"
        @volumechange="onSingleVideoVolumeChange"
      />
      <!-- Non-interactive: poster/thumbnail only -->
      <AppImg
        v-else-if="items[0]?.url"
        :src="posterFor(items[0]) || items[0]?.url"
        class="absolute inset-0 h-full w-full object-contain"
        :alt="items[0]?.alt ?? ''"
        sizes="(max-width: 640px) 100vw, 720px"
        loading="lazy"
        decoding="async"
      />
      <!-- Small corner controls only (no dimming). Safari requires user gesture to unmute. -->
      <button
        v-if="interactive && singleVideoActive && singleVideoMuted"
        type="button"
        class="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        aria-label="Tap for sound"
        @click.stop="onTapUnmute"
      >
        <Icon name="tabler:volume-off" class="text-base" aria-hidden="true" />
      </button>
      <button
        v-else-if="interactive && singleVideoActive && !singleVideoMuted"
        type="button"
        class="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        aria-label="Mute"
        @click.stop="onTapMute"
      >
        <Icon name="tabler:volume" class="text-base" aria-hidden="true" />
      </button>
      <span
        v-if="interactive && items[0]?.durationSeconds != null && items[0].durationSeconds > 0"
        class="pointer-events-none absolute right-2 bottom-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white"
        aria-hidden="true"
      >
        {{ formatDuration(items[0].durationSeconds) }}
      </span>
    </div>
    <!-- Single image (interactive: button for lightbox; non-interactive: div) -->
    <component
      :is="interactive ? 'button' : 'div'"
      v-else-if="items[0]?.url"
      :type="interactive ? 'button' : undefined"
      :class="[
        singleBoxClass,
        interactive
          ? 'moh-tap cursor-zoom-in select-none text-left !bg-transparent !border-0 !p-0 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20'
          : 'select-none',
      ]"
      :style="singleBoxStyle"
      :aria-label="interactive ? 'View image' : undefined"
      @click.stop="interactive ? openAt($event, 0) : undefined"
    >
      <div class="absolute inset-0" aria-hidden="true" />
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
    </component>
    <div
      v-else
      :style="{
        maxHeight: `${FIXED_HEIGHT_REM}rem`,
        minHeight: '6rem',
        width: '100%',
        maxWidth: MAX_WIDTH_REM != null ? `${MAX_WIDTH_REM}rem` : undefined,
      }"
      class="moh-squircle flex shrink-0 items-center justify-center rounded-2xl border moh-border moh-surface"
      aria-label="Deleted media"
    >
      <div class="flex flex-col items-center gap-2 text-sm moh-text-muted select-none">
        <Icon name="tabler:photo" class="text-2xl opacity-70" aria-hidden="true" />
        <div class="font-semibold">Deleted</div>
      </div>
    </div>
  </div>

  <div
    v-else-if="items.length > 1"
    class="mt-3"
    :class="{ 'pointer-events-none': !interactive }"
  >
    <div class="moh-squircle w-full overflow-hidden rounded-2xl" :style="gridWrapperStyle">
      <div class="grid" :class="gridClass" :style="gridStyle">
        <template v-for="(m, idx) in items" :key="m.id || idx">
          <component
            :is="interactive ? 'button' : 'div'"
            v-if="m.url"
            :type="interactive ? 'button' : undefined"
            :class="[
              itemClass(idx),
              interactive
                ? 'moh-tap relative min-w-0 min-h-0 cursor-zoom-in overflow-hidden !bg-transparent !border-0 !p-0 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20'
                : 'relative min-w-0 min-h-0 overflow-hidden',
            ]"
            :aria-label="interactive ? (m.kind === 'video' ? `View video ${idx + 1} of ${items.length}` : `View image ${idx + 1} of ${items.length}`) : undefined"
            @click.stop="interactive ? openAt($event, idx) : undefined"
          >
            <AppImg
              v-if="m.kind !== 'video'"
              :src="m.url"
              class="block h-full w-full bg-black/3 dark:bg-white/3 object-cover object-center"
              :class="[imgClass(idx), hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100']"
              :alt="m.alt ?? ''"
              sizes="(max-width: 640px) 50vw, 360px"
              loading="lazy"
              decoding="async"
            />
            <template v-else>
              <AppImg
                :src="posterFor(m) || m.url"
                class="block h-full w-full bg-black/3 dark:bg-white/3 object-cover object-center"
                :class="[imgClass(idx), hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100']"
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
              v-if="interactive"
              class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 hover:bg-black/10"
              aria-hidden="true"
            />
          </component>
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
import AppImg from '~/components/app/AppImg.vue'
import type { PostMedia } from '~/types/api'
import type { LightboxMediaItem } from '~/composables/useImageLightbox'
import type { CSSProperties } from 'vue'

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
  }>(),
  { compact: false, postId: null, rowInView: true, interactive: true }
)

const viewer = useImageLightbox()
const videoManager = useEmbeddedVideoManager()
const { activePostId, appWideSoundOn } = videoManager

const singleVideoContainerRef = ref<HTMLElement | null>(null)
const singleVideoEl = ref<HTMLVideoElement | null>(null)
const singleVideoMuted = ref(true)
const singleVideoActive = computed(() => Boolean(props.postId && activePostId.value === props.postId))
/** Set when row is in view so the inline player is ready to play. */
const singleVideoSrc = computed(() =>
  props.rowInView !== false && items.value[0]?.kind === 'video' && items.value[0]?.url
    ? items.value[0].url
    : undefined,
)

/** Off-screen videos don't load; in-view load metadata only (poster/duration) until play. */
const singleVideoPreload = computed(() => (props.rowInView !== false ? 'metadata' : 'none'))

/** Placeholder when video has no thumbnail (img src=video URL doesn't render). */
const VIDEO_NO_THUMB_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect fill="%23374151" width="320" height="180"/></svg>',
  )

function posterFor(m: PostMedia): string {
  if (m.kind === 'video') {
    const thumb = (m as { thumbnailUrl?: string | null }).thumbnailUrl
    if (thumb) return thumb
    return VIDEO_NO_THUMB_PLACEHOLDER
  }
  return m.url ?? ''
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `0:${s.toString().padStart(2, '0')}`
}

function onSingleVideoPlay() {
  if (props.postId) videoManager.activate(props.postId)
}

function onSingleVideoPause() {
  // When user pauses, treat as mute preference so other players stay muted.
  appWideSoundOn.value = false
}

function onSingleVideoVolumeChange() {
  const el = singleVideoEl.value
  if (!el) return
  singleVideoMuted.value = el.muted
  appWideSoundOn.value = !el.muted
}

/** Unmute in response to user tap (required on Safari). */
function onTapUnmute() {
  const el = singleVideoEl.value
  if (!el) return
  el.muted = false
  singleVideoMuted.value = false
  appWideSoundOn.value = true
  el.play().catch(() => {})
}

function onTapMute() {
  const el = singleVideoEl.value
  if (!el) return
  el.muted = true
  singleVideoMuted.value = true
  appWideSoundOn.value = false
}

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

onMounted(() => {
  if (
    import.meta.client &&
    props.interactive &&
    props.postId &&
    items.value.length === 1 &&
    items.value[0]?.kind === 'video'
  ) {
    const el = (singleVideoEl.value ?? singleVideoContainerRef.value) as HTMLElement | null
    if (el) videoManager.register(props.postId, el)
  }
})

onBeforeUnmount(() => {
  if (props.postId) videoManager.unregister(props.postId)
})

watch(singleVideoActive, (active) => {
  const el = singleVideoEl.value
  if (!el) return
  if (active) {
    // Always start muted (Safari requires user gesture to unmute; tap overlay to unmute).
    el.muted = true
    singleVideoMuted.value = true
    el.play().catch(() => {})
  } else {
    el.pause()
  }
})

// When user mutes one player, sync others to muted.
watch(appWideSoundOn, (soundOn) => {
  const el = singleVideoEl.value
  if (!el) return
  if (!soundOn) {
    el.muted = true
    singleVideoMuted.value = true
  }
})

const items = computed(() => (props.media ?? []).filter((m) => Boolean(m?.url) || Boolean(m?.deletedAt)).slice(0, 4))
const hideThumbs = computed(() => viewer.kind.value === 'media' && viewer.hideOrigin.value)
const urls = computed(() => items.value.map((m) => m.url).filter(Boolean))

// Compact: 10rem height, max 6:4 (w:h) → max-width 15rem. Default: 36rem max height for single/grid media.
const FIXED_HEIGHT_REM = computed(() => (props.compact ? 10 : 36))
const MAX_WIDTH_REM = computed(() => (props.compact ? 15 : undefined))
const MAX_RATIO = 6 / 4 // width/height max

const single = computed(() => (items.value.length === 1 ? (items.value[0] ?? null) : null))
const singleIsImageLike = computed(() => Boolean(single.value && single.value.kind !== 'video'))

// Some phone photos rely on EXIF orientation. The browser displays them rotated, but our stored
// width/height metadata can be the unrotated pixel matrix. That mismatch makes the layout box
// wide while the rendered image is tall (centered letterbox). Measure the real decoded dimensions
// on the client and prefer them for layout.
const singleMeasured = ref<{ w: number; h: number } | null>(null)
let singleMeasureReq = 0
watch(
  () => (singleIsImageLike.value ? (single.value?.url ?? null) : null),
  (url) => {
    if (!import.meta.client) return
    singleMeasured.value = null
    const u = (url ?? '').trim()
    if (!u) return
    singleMeasureReq += 1
    const req = singleMeasureReq
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (req !== singleMeasureReq) return
      const w = Number(img.naturalWidth || 0)
      const h = Number(img.naturalHeight || 0)
      if (w > 0 && h > 0) singleMeasured.value = { w, h }
    }
    img.onerror = () => {
      if (req !== singleMeasureReq) return
      singleMeasured.value = null
    }
    img.src = u
  },
  { immediate: true },
)

const singleWidth = computed(() => {
  if (singleIsImageLike.value && singleMeasured.value?.w) return singleMeasured.value.w
  return typeof single.value?.width === 'number' ? single.value.width : null
})
const singleHeight = computed(() => {
  if (singleIsImageLike.value && singleMeasured.value?.h) return singleMeasured.value.h
  return typeof single.value?.height === 'number' ? single.value.height : null
})
const singleAspectRatio = computed(() => {
  const w = singleWidth.value ?? 0
  const h = singleHeight.value ?? 0
  if (!w || !h) return null
  return w / h
})
// Treat only truly-wide images as "full width"; otherwise keep fixed height and let width shrink.
const singleIsVeryWide = computed(() => {
  const r = singleAspectRatio.value
  if (!r) return false
  return r >= 1.6
})

const singleBoxStyle = computed<CSSProperties>(() => {
  const w = singleWidth.value
  const h = singleHeight.value
  const heightRem = FIXED_HEIGHT_REM.value
  const maxW = MAX_WIDTH_REM.value
  if (!w || !h) {
    // No dimensions: use max-height so it can shrink on small viewports; default aspect keeps a reasonable size.
    const base: CSSProperties = {
      aspectRatio: '16 / 9',
      maxHeight: `${heightRem}rem`,
      width: '100%',
    }
    if (maxW != null) base.maxWidth = `${maxW}rem`
    return base
  }
  // Max height so media can be smaller on narrow viewports; width from aspect ratio, capped when compact.
  const aspectRatio = w / h
  const cappedRatio = maxW != null ? Math.min(aspectRatio, MAX_RATIO) : aspectRatio
  const pxCap = singleIsImageLike.value ? `${w}px` : undefined
  const heightCap = singleIsImageLike.value ? `${h}px` : undefined
  return {
    aspectRatio: `${w} / ${h}`,
    maxHeight: heightCap ? `min(${heightRem}rem, ${heightCap})` : `${heightRem}rem`,
    width: maxW != null
      ? `min(${heightRem * cappedRatio}rem, ${maxW}rem, 100%${pxCap ? `, ${pxCap}` : ''})`
      : `min(${heightRem * aspectRatio}rem, 100%${pxCap ? `, ${pxCap}` : ''})`,
  }
})
const singleBoxClass = computed(() => {
  const heightRem = FIXED_HEIGHT_REM.value
  const maxW = MAX_WIDTH_REM.value
  if (!single.value) return ''
  if (!singleWidth.value || !singleHeight.value) {
    // Fallback: use style for dynamic dimensions
    return 'moh-squircle relative overflow-hidden rounded-2xl w-full shrink-0'
  }
  if (singleIsVeryWide.value) {
    return 'moh-squircle relative overflow-hidden rounded-2xl w-full shrink-0'
  }
  return 'moh-squircle relative overflow-hidden rounded-2xl shrink-0'
})

const gridClass = computed(() => {
  const n = items.value.length
  if (n === 2) return 'grid-cols-2'
  if (n === 3) return 'grid-cols-2 grid-rows-2'
  if (n === 4) return 'grid-cols-2 grid-rows-2'
  return 'grid-cols-2'
})

// Max height so grid can be smaller on narrow viewports; aspect-ratio gives height from width (2/1 = two rows of square-ish cells).
const gridStyle = computed(() => ({
  height: '100%',
}))

const gridWrapperStyle = computed<CSSProperties>(() => {
  const heightRem = FIXED_HEIGHT_REM.value
  const maxW = MAX_WIDTH_REM.value
  const base: CSSProperties = {
    aspectRatio: '2 / 1',
    maxHeight: `${heightRem}rem`,
    width: '100%',
  }
  if (maxW != null) base.maxWidth = `${maxW}rem`
  return base
})

function itemClass(idx: number): string {
  const n = items.value.length
  // 3-up: left tile spans both rows; right tiles stack.
  if (n === 3 && idx === 0) return 'row-span-2'
  return ''
}

function imgClass(idx: number): string {
  const n = items.value.length
  if (n === 2) return 'object-cover'
  if (n === 3) return 'object-cover'
  if (n === 4) return 'object-cover'
  return 'object-cover'
}

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

