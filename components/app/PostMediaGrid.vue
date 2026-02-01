<template>
  <!-- Single media -->
  <div v-if="items.length === 1" class="mt-3 flex justify-start">
    <!-- Single video: inline media player (ready to play when row in view); one playing globally -->
    <div
      v-if="items[0]?.kind === 'video'"
      ref="singleVideoContainerRef"
      :class="singleBoxClass"
      :style="singleBoxStyle"
      class="moh-squircle relative overflow-hidden rounded-2xl border moh-border bg-black"
    >
      <video
        v-if="items[0]?.url"
        ref="singleVideoEl"
        :src="singleVideoSrc"
        :poster="posterFor(items[0])"
        class="absolute inset-0 h-full w-full object-contain"
        :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
        controls
        playsinline
        muted
        loop
        aria-label="Video"
        @play="onSingleVideoPlay"
      />
      <span
        v-if="items[0]?.durationSeconds != null && items[0].durationSeconds > 0"
        class="pointer-events-none absolute right-2 bottom-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white"
        aria-hidden="true"
      >
        {{ formatDuration(items[0].durationSeconds) }}
      </span>
    </div>
    <!-- Single image -->
    <button
      v-else-if="items[0]?.url"
      type="button"
      class="cursor-zoom-in select-none text-left"
      :class="singleBoxClass"
      :style="singleBoxStyle"
      aria-label="View image"
      @click.stop="openAt($event, 0)"
    >
      <div class="absolute inset-0" aria-hidden="true" />
      <img
        :src="items[0]?.url"
        class="absolute inset-0 h-full w-full object-contain"
        :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
        :width="singleWidth ?? undefined"
        :height="singleHeight ?? undefined"
        alt=""
        loading="lazy"
        decoding="async"
      />
    </button>
    <div
      v-else
      :style="{
        height: `${FIXED_HEIGHT_REM}rem`,
        maxWidth: MAX_WIDTH_REM != null ? `${MAX_WIDTH_REM}rem` : undefined,
      }"
      class="moh-squircle flex w-full shrink-0 items-center justify-center rounded-2xl border moh-border moh-surface"
      aria-label="Deleted media"
    >
      <div class="flex flex-col items-center gap-2 text-sm moh-text-muted select-none">
        <i class="pi pi-image text-2xl opacity-70" aria-hidden="true" />
        <div class="font-semibold">Deleted</div>
      </div>
    </div>
  </div>

  <div v-else-if="items.length > 1" class="mt-3">
    <div class="moh-squircle w-full overflow-hidden rounded-2xl border moh-border" :style="gridWrapperStyle">
      <div class="grid gap-px bg-gray-200 dark:bg-zinc-800" :class="gridClass" :style="gridStyle">
        <template v-for="(m, idx) in items" :key="m.id || idx">
          <button
            v-if="m.url"
            type="button"
            class="relative min-w-0 min-h-0 cursor-zoom-in overflow-hidden"
            :class="itemClass(idx)"
            :aria-label="m.kind === 'video' ? `View video ${idx + 1} of ${items.length}` : `View image ${idx + 1} of ${items.length}`"
            @click.stop="openAt($event, idx)"
          >
            <img
              v-if="m.kind !== 'video'"
              :src="m.url"
              class="block h-full w-full bg-black/3 dark:bg-white/3 object-cover object-center"
              :class="[imgClass(idx), hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100']"
              alt=""
              loading="lazy"
              decoding="async"
            />
            <template v-else>
              <img
                :src="posterFor(m) || m.url"
                class="block h-full w-full bg-black/3 dark:bg-white/3 object-cover object-center"
                :class="[imgClass(idx), hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100']"
                alt=""
                loading="lazy"
                decoding="async"
              />
              <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20" aria-hidden="true">
                <i class="pi pi-play text-2xl text-white drop-shadow" aria-hidden="true" />
              </div>
            </template>
            <div
              class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 hover:bg-black/10"
              aria-hidden="true"
            />
          </button>
          <div
            v-else
            class="relative min-w-0 min-h-0 overflow-hidden flex items-center justify-center moh-surface"
            :class="itemClass(idx)"
            aria-label="Deleted media"
          >
            <div class="flex flex-col items-center gap-1 text-[12px] moh-text-muted select-none">
              <i class="pi pi-image text-xl opacity-70" aria-hidden="true" />
              <div class="font-semibold">Deleted</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  }>(),
  { compact: false, postId: null, rowInView: true }
)

const viewer = useImageLightbox()
const videoManager = useEmbeddedVideoManager()
const { activePostId, appWideSoundOn, setPausedWithSound, getShouldStartUnmuted } = videoManager

const singleVideoContainerRef = ref<HTMLElement | null>(null)
const singleVideoEl = ref<HTMLVideoElement | null>(null)
const singleVideoActive = computed(() => Boolean(props.postId && activePostId.value === props.postId))
/** Set when row is in view so the inline player is ready to play. */
const singleVideoSrc = computed(() =>
  props.rowInView !== false && items.value[0]?.kind === 'video' && items.value[0]?.url
    ? items.value[0].url
    : undefined,
)

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
  // User paused: next videos start muted; but unpausing THIS same video stays unmuted.
  if (singleVideoActive.value && props.postId) {
    const el = singleVideoEl.value
    setPausedWithSound(props.postId, el ? !el.muted : false)
  }
}

function onSingleVideoVolumeChange() {
  const el = singleVideoEl.value
  if (!el) return
  // Unmute → remember so next videos are unmuted. Mute → remember muted.
  appWideSoundOn.value = !el.muted
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
  if (import.meta.client && props.postId && singleVideoContainerRef.value && items.value.length === 1 && items.value[0]?.kind === 'video') {
    videoManager.register(props.postId, singleVideoContainerRef.value)
  }
})

onBeforeUnmount(() => {
  if (props.postId) videoManager.unregister(props.postId)
})

watch(singleVideoActive, (active) => {
  const el = singleVideoEl.value
  if (!el) return
  if (active) {
    // New video or resuming same video: start unmuted if appWideSoundOn or "resume same unmuted".
    if (props.postId) {
      const shouldUnmute = getShouldStartUnmuted(props.postId)
      el.muted = !shouldUnmute
    }
    el.play().catch(() => {})
  } else {
    el.pause()
  }
})

// When user mutes/unmutes one player, sync all others to the same state.
watch(appWideSoundOn, (soundOn) => {
  const el = singleVideoEl.value
  if (!el) return
  el.muted = !soundOn
})

const items = computed(() => (props.media ?? []).filter((m) => Boolean(m?.url) || Boolean(m?.deletedAt)).slice(0, 4))
const hideThumbs = computed(() => viewer.kind.value === 'media' && viewer.hideOrigin.value)
const urls = computed(() => items.value.map((m) => m.url).filter(Boolean))

// Compact: 10rem height, max 6:4 (w:h) → max-width 15rem
const FIXED_HEIGHT_REM = computed(() => (props.compact ? 10 : 18))
const MAX_WIDTH_REM = computed(() => (props.compact ? 15 : undefined))
const MAX_RATIO = 6 / 4 // width/height max

const single = computed(() => (items.value.length === 1 ? (items.value[0] ?? null) : null))
const singleWidth = computed(() => (typeof single.value?.width === 'number' ? single.value.width : null))
const singleHeight = computed(() => (typeof single.value?.height === 'number' ? single.value.height : null))
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
    const base: CSSProperties = { height: `${heightRem}rem`, width: '100%' }
    if (maxW != null) base.maxWidth = `${maxW}rem`
    return base
  }
  // Fixed height; width from aspect ratio, capped by max ratio (4:6 h:w) when compact.
  const aspectRatio = w / h
  const cappedRatio = maxW != null ? Math.min(aspectRatio, MAX_RATIO) : aspectRatio
  return {
    aspectRatio: `${w} / ${h}`,
    height: `${heightRem}rem`,
    width: maxW != null
      ? `min(${heightRem * cappedRatio}rem, ${maxW}rem, 100%)`
      : `min(${heightRem * aspectRatio}rem, 100%)`,
  }
})
const singleBoxClass = computed(() => {
  const heightRem = FIXED_HEIGHT_REM.value
  const maxW = MAX_WIDTH_REM.value
  if (!single.value) return ''
  if (!singleWidth.value || !singleHeight.value) {
    // Fallback: use style for dynamic dimensions
    return 'moh-squircle relative overflow-hidden rounded-2xl w-full shrink-0 border moh-border'
  }
  if (singleIsVeryWide.value) {
    return 'moh-squircle relative overflow-hidden rounded-2xl w-full shrink-0 border moh-border'
  }
  return 'moh-squircle relative overflow-hidden rounded-2xl shrink-0 border moh-border'
})

const gridClass = computed(() => {
  const n = items.value.length
  if (n === 2) return 'grid-cols-2'
  if (n === 3) return 'grid-cols-2 grid-rows-2'
  if (n === 4) return 'grid-cols-2 grid-rows-2'
  return 'grid-cols-2'
})

// Fixed overall height so single + multi-media previews align.
const gridStyle = computed(() => ({
  height: `${FIXED_HEIGHT_REM.value}rem`,
}))

const gridWrapperStyle = computed<CSSProperties>(() => {
  const maxW = MAX_WIDTH_REM.value
  if (maxW == null) return {}
  return { maxWidth: `${maxW}rem` }
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

