<template>
  <NuxtImg
    v-bind="attrs"
    :src="props.src"
    :alt="props.alt ?? ''"
    :width="props.width"
    :height="props.height"
    :sizes="props.sizes"
    :loading="props.loading"
    :decoding="props.decoding"
  />
</template>

<script setup lang="ts">
import type { ImgHTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    sizes?: string
    width?: number | string
    height?: number | string
    loading?: ImgHTMLAttributes['loading']
    decoding?: ImgHTMLAttributes['decoding']
  }>(),
  {
    alt: '',
    sizes: undefined,
    width: undefined,
    height: undefined,
    loading: 'lazy',
    decoding: 'async',
  },
)

const attrs = useAttrs()
</script>

