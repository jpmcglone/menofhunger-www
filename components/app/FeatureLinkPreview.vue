<template>
  <NuxtLink
    :to="path"
    class="block min-w-0 overflow-hidden rounded-xl border moh-border moh-surface-1 moh-surface-hover moh-focus text-left"
    :aria-label="`Open ${title}`"
    @click.stop
  >
    <div v-if="image && !imageFailed" class="aspect-[1200/630] w-full overflow-hidden moh-surface-2" aria-hidden="true">
      <img :src="image" alt="" width="1200" height="630" class="h-full w-full object-contain" loading="lazy" decoding="async" @error="imageFailed = true">
    </div>
    <div class="space-y-1 p-3">
      <div class="line-clamp-2 text-sm font-semibold leading-5 moh-text">{{ title }}</div>
      <div v-if="description" class="line-clamp-2 text-xs leading-4 moh-text-muted">{{ description }}</div>
      <div class="truncate text-xs leading-4 moh-text-soft">menofhunger.com{{ displayPath }}</div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { featurePageForPath } from '~/utils/feature-pages'
import type { LinkMetadata } from '~/utils/link-metadata'

// Figma: Feature sharing / Feature preview, 974:54 and 974:78.
const props = defineProps<{ path: string; metadata?: LinkMetadata | null }>()
const feature = computed(() => featurePageForPath(props.path))
// The catalog gives an immediate, stable preview even with an older metadata cache.
const title = computed(() => feature.value?.title || props.metadata?.title || 'Men of Hunger')
const description = computed(() => feature.value?.description || props.metadata?.description)
const image = computed(() => feature.value?.image || props.metadata?.imageUrl)
const displayPath = computed(() => props.path.split(/[?#]/)[0])
const imageFailed = ref(false)
watch(image, () => { imageFailed.value = false })
</script>
