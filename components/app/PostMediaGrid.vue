<template>
  <div v-if="items.length === 1" class="mt-3 flex justify-start">
    <button
      v-if="items[0]?.url"
      type="button"
      class="cursor-zoom-in select-none text-left"
      :class="singleBoxClass"
      :style="singleBoxStyle"
      aria-label="View image"
      @click.stop="openAt($event, 0)"
    >
      <!-- Placeholder surface to reserve space pre-load -->
      <div class="absolute inset-0 bg-black/3 dark:bg-white/3 rounded-xl" aria-hidden="true" />
      <img
        :src="items[0]?.url"
        class="absolute inset-0 h-full w-full object-contain rounded-xl"
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
      class="flex h-[18rem] w-full items-center justify-center rounded-xl border moh-border moh-surface"
      aria-label="Deleted media"
    >
      <div class="flex flex-col items-center gap-2 text-sm moh-text-muted select-none">
        <i class="pi pi-image text-2xl opacity-70" aria-hidden="true" />
        <div class="font-semibold">Deleted</div>
      </div>
    </div>
  </div>

  <div v-else-if="items.length > 1" class="mt-3">
    <div class="w-full overflow-hidden rounded-xl border moh-border">
      <div class="grid gap-px bg-gray-200 dark:bg-zinc-800" :class="gridClass" :style="gridStyle">
        <template v-for="(m, idx) in items" :key="m.id || idx">
          <button
            v-if="m.url"
            type="button"
            class="relative min-w-0 min-h-0 cursor-zoom-in overflow-hidden"
            :class="itemClass(idx)"
            :aria-label="`View image ${idx + 1} of ${items.length}`"
            @click.stop="openAt($event, idx)"
          >
            <img
              :src="m.url"
              class="block h-full w-full bg-black/3 dark:bg-white/3 object-cover object-center"
              :class="[imgClass(idx), hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100']"
              alt=""
              loading="lazy"
              decoding="async"
            />
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
import type { CSSProperties } from 'vue'

const props = defineProps<{
  media: PostMedia[]
}>()

const viewer = useImageLightbox()

const items = computed(() => (props.media ?? []).filter((m) => Boolean(m?.url) || Boolean(m?.deletedAt)).slice(0, 4))
const hideThumbs = computed(() => viewer.kind.value === 'media' && viewer.hideOrigin.value)
const urls = computed(() => items.value.map((m) => m.url).filter(Boolean))

const single = computed(() => (items.value.length === 1 ? (items.value[0] ?? null) : null))
const singleWidth = computed(() => (typeof single.value?.width === 'number' ? single.value.width : null))
const singleHeight = computed(() => (typeof single.value?.height === 'number' ? single.value.height : null))
const singleAspectRatio = computed(() => {
  const w = singleWidth.value ?? 0
  const h = singleHeight.value ?? 0
  if (!w || !h) return null
  return w / h
})
// Treat only truly-wide images as "full width"; otherwise keep the 18rem height and let width shrink.
const singleIsVeryWide = computed(() => {
  const r = singleAspectRatio.value
  if (!r) return false
  return r >= 1.6
})

const FIXED_HEIGHT_REM = 18
const singleBoxStyle = computed<CSSProperties>(() => {
  const w = singleWidth.value
  const h = singleHeight.value
  if (!w || !h) return {}
  // Fixed height; width from aspect ratio so image is only as wide as needed (no letterboxing).
  const aspectRatio = w / h
  return {
    aspectRatio: `${w} / ${h}`,
    height: `${FIXED_HEIGHT_REM}rem`,
    width: `min(${FIXED_HEIGHT_REM * aspectRatio}rem, 100%)`,
  }
})
const singleBoxClass = computed(() => {
  // Single image: fixed height, width only as needed, left-justified (parent has flex justify-start).
  // - With dimensions: intrinsic width from aspect ratio; no letterboxing.
  // - Very wide: cap at 100% so it doesn't overflow.
  // - Missing dims: fallback to full-width 18rem box.
  if (!single.value) return ''
  if (!singleWidth.value || !singleHeight.value) return 'relative overflow-hidden rounded-xl h-[18rem] w-full shrink-0'
  if (singleIsVeryWide.value) return 'relative overflow-hidden rounded-xl w-full max-h-[18rem] shrink-0'
  return 'relative overflow-hidden rounded-xl shrink-0'
})

const gridClass = computed(() => {
  const n = items.value.length
  if (n === 2) return 'grid-cols-2'
  if (n === 3) return 'grid-cols-2 grid-rows-2'
  if (n === 4) return 'grid-cols-2 grid-rows-2'
  return 'grid-cols-2'
})

// Fixed overall height so single + multi-media previews align.
const gridStyle = computed(() => {
  return { height: '18rem' }
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
  // Only open real URLs (deleted placeholders are not interactive).
  const xs = urls.value
  if (!xs.length) return
  // Map the clicked item index to the corresponding URL index (skipping deleted placeholders).
  const urlIndex = Math.max(
    0,
    Math.min(
      xs.length - 1,
      items.value.slice(0, idx + 1).filter((m) => Boolean(m.url)).length - 1,
    ),
  )
  const startMode = items.value.length > 1 ? 'origin' : 'fitAnchored'
  viewer.openGalleryFromEvent(e, xs, urlIndex, 'Image', { mediaStartMode: startMode })
}
</script>

