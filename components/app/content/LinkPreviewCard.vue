<template>
  <component
    :is="internalPath ? NuxtLink : 'a'"
    :to="internalPath || undefined"
    :href="internalPath ? undefined : url"
    :target="internalPath ? undefined : '_blank'"
    :rel="internalPath ? undefined : 'noopener noreferrer'"
    class="block overflow-hidden rounded-2xl moh-popover moh-card-matte moh-focus text-left"
    :aria-label="internalPath ? 'Open page' : 'Open link'"
    @click.stop
  >
    <div
      v-if="imageUrl"
      class="relative w-full overflow-hidden moh-surface"
      :class="imageReady ? 'aspect-video' : 'hidden'"
      aria-hidden="true"
    >
      <img
        :src="imageUrl"
        alt=""
        class="h-full w-full object-cover moh-img-outline"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        @load="imageReady = true"
        @error="imageReady = false"
      >
    </div>
    <div class="p-3">
      <div class="line-clamp-2 text-pretty text-sm font-semibold leading-5 moh-text">
        {{ title }}
      </div>
      <div
        v-if="description"
        class="mt-0.5 line-clamp-2 text-pretty text-xs leading-4 moh-text-muted"
      >
        {{ description }}
      </div>
      <div class="mt-1.5 flex items-center gap-1 text-[11px] moh-text-muted">
        <span class="min-w-0 truncate">{{ hostLabel }}</span>
        <Icon
          v-if="!internalPath"
          name="tabler:external-link"
          class="shrink-0 text-[11px] opacity-70"
          aria-hidden="true"
        />
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import type { LinkMetadata } from '~/utils/link-metadata'
import { isMohUrl, mohUrlPath, safeUrlDisplay, safeUrlHostname } from '~/utils/link-utils'

const NuxtLink = resolveComponent('NuxtLink')

const props = defineProps<{
  url: string
  preview: LinkMetadata | null
}>()

const internalPath = computed(() => {
  if (!isMohUrl(props.url)) return null
  return mohUrlPath(props.url)
})

const imageUrl = computed(() => (props.preview?.imageUrl ?? '').trim() || null)
const imageReady = ref(false)
watch(imageUrl, () => {
  imageReady.value = false
})

const hostLabel = computed(() => {
  if (internalPath.value) return 'menofhunger.com'
  const host = safeUrlHostname(props.url)?.replace(/^www\./, '')
  return host || safeUrlDisplay(props.url)
})

const title = computed(() => {
  const t = (props.preview?.title ?? '').trim()
  if (t) return t
  if (internalPath.value) return 'Men of Hunger'
  return hostLabel.value || 'Link'
})

const description = computed(() => (props.preview?.description ?? '').trim() || null)
</script>
