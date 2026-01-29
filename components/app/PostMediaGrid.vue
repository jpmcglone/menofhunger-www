<template>
  <div v-if="items.length === 1" class="mt-3 pr-12">
    <div class="group relative inline-block">
      <img
        :src="items[0]?.url"
        class="block max-h-[28rem] max-w-full rounded-xl border moh-border object-contain bg-black/5 dark:bg-white/5"
        :class="hideThumbs ? 'opacity-0 transition-opacity duration-150' : 'opacity-100'"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div
        class="pointer-events-none absolute inset-0 rounded-xl bg-black/0 transition-colors duration-200 group-hover:bg-black/10"
        aria-hidden="true"
      />
      <button
        type="button"
        class="absolute inset-0 cursor-zoom-in"
        aria-label="View image"
        @click.stop="openAt($event, 0)"
      />
    </div>
  </div>

  <div v-else-if="items.length > 1" class="mt-3 pr-12">
    <div class="overflow-hidden rounded-xl border moh-border">
      <div class="grid gap-px bg-gray-200 dark:bg-zinc-800" :class="gridClass" :style="gridStyle">
        <button
          v-for="(m, idx) in items"
          :key="m.id || idx"
          type="button"
          class="relative cursor-zoom-in"
          :aria-label="`View image ${idx + 1} of ${items.length}`"
          @click.stop="openAt($event, idx)"
        >
          <img
            :src="m.url"
            class="h-full w-full bg-black/5 dark:bg-white/5"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PostMedia } from '~/types/api'

const props = defineProps<{
  media: PostMedia[]
}>()

const viewer = useImageLightbox()

const items = computed(() => (props.media ?? []).filter((m) => Boolean(m?.url)).slice(0, 4))
const hideThumbs = computed(() => viewer.kind.value === 'media' && viewer.hideOrigin.value)
const urls = computed(() => items.value.map((m) => m.url))

const gridClass = computed(() => {
  const n = items.value.length
  if (n === 2) return 'grid-cols-2'
  if (n === 3) return 'grid-cols-2 grid-rows-2'
  if (n === 4) return 'grid-cols-2 grid-rows-2'
  return 'grid-cols-2'
})

// Fixed overall height to keep the feed stable + match "max height" designs.
const gridStyle = computed(() => {
  // Slightly taller on larger screens.
  return { height: '18rem' }
})

function imgClass(idx: number): string {
  const n = items.value.length
  if (n === 2) return 'object-cover'
  if (n === 3) {
    if (idx === 0) return 'row-span-2 object-cover'
    return 'object-cover'
  }
  if (n === 4) return 'object-cover'
  return 'object-cover'
}

function openAt(e: MouseEvent, idx: number) {
  const xs = urls.value
  if (!xs.length) return
  viewer.openGalleryFromEvent(e, xs, idx, 'Image')
}
</script>

