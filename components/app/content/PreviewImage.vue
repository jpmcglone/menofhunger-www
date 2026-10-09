<!-- Lazy, cross-origin-safe preview thumbnail. Reports load/portrait/error so cards can pick an aspect ratio. -->
<template>
  <img
    :src="src"
    :alt="alt"
    loading="lazy"
    :decoding="decoding ?? undefined"
    :referrerpolicy="referrerpolicy ?? undefined"
    @load="onLoad"
    @error="emit('error')"
  >
</template>

<script setup lang="ts">
import { isPortraitPreviewImage } from '~/utils/link-utils'

withDefaults(defineProps<{
  src: string
  alt?: string
  decoding?: 'async' | null
  /** Pass `null` to omit the attribute. */
  referrerpolicy?: 'no-referrer' | null
}>(), {
  alt: '',
  decoding: null,
  referrerpolicy: 'no-referrer',
})

const emit = defineEmits<{
  load: [info: { portrait: boolean }]
  error: []
}>()

function onLoad(event: Event) {
  const img = event.target as HTMLImageElement | null
  emit('load', { portrait: isPortraitPreviewImage(img?.naturalWidth ?? 0, img?.naturalHeight ?? 0) })
}
</script>
