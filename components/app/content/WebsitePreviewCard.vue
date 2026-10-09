<template>
  <AppExternalLinkCard
    :href="linkHref"
    :preview-only="!linkHref"
    class="group block w-full max-w-full text-left moh-focus"
    :aria-label="linkHref ? 'Open link' : undefined"
  >
    <div v-if="showImage" class="relative moh-card-frame moh-border">
      <div
        class="relative w-full overflow-hidden moh-surface"
        :class="isPortraitImage ? 'aspect-[4/5]' : 'aspect-video'"
        aria-hidden="true"
      >
        <AppPreviewImage
          :src="imageUrl!"
          decoding="async"
          class="h-full w-full object-cover"
          :class="isPortraitImage ? 'object-top' : 'object-center'"
          @load="onImageLoad"
          @error="onImageError"
        />
      </div>
      <div
        class="pointer-events-none absolute inset-x-2 bottom-2 rounded-lg bg-black/80 px-2 py-2"
      >
        <div class="truncate text-sm font-semibold text-white">
          {{ title }}
        </div>
      </div>
      <button
        v-if="dismissible"
        type="button"
        class="absolute left-1 top-1 z-10 flex h-11 w-11 items-center justify-center"
        aria-label="Remove preview"
        @click.stop.prevent="$emit('dismiss')"
      >
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
          <Icon name="tabler:x" class="text-[12px]" aria-hidden="true" />
        </span>
      </button>
    </div>
    <div
      v-else
      class="relative moh-card-frame moh-border moh-surface-2"
    >
      <div class="flex items-start gap-2 px-4 py-4">
        <div class="min-w-0 flex-1 text-sm font-semibold moh-text line-clamp-2">
          {{ title }}
        </div>
        <button
          v-if="dismissible"
          type="button"
          class="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center"
          aria-label="Remove preview"
          @click.stop.prevent="$emit('dismiss')"
        >
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
            <Icon name="tabler:x" class="text-[12px]" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
    <div class="mt-2 flex flex-col gap-2">
      <p
        v-if="dek"
        class="line-clamp-2 text-[13px] leading-[1.4] moh-text-muted text-pretty"
      >
        {{ dek }}
      </p>
      <div class="truncate text-[13px] moh-text-muted">
        {{ sourceLabel }}
      </div>
    </div>
  </AppExternalLinkCard>
</template>

<script setup lang="ts">
import { previewDescription } from '~/utils/link-utils'

const props = defineProps<{
  href?: string | null
  title: string
  sourceLabel: string
  description?: string | null
  imageUrl?: string | null
  previewOnly?: boolean
  dismissible?: boolean
}>()

defineEmits<{ dismiss: [] }>()

const imageFailed = ref(false)
const isPortraitImage = ref(false)
watch(() => props.imageUrl, () => {
  imageFailed.value = false
  isPortraitImage.value = false
})

const showImage = computed(() => Boolean((props.imageUrl ?? '').trim()) && !imageFailed.value)
const dek = computed(() => previewDescription(props.description, props.title))
const linkHref = computed(() => {
  if (props.previewOnly || props.dismissible) return undefined
  const href = (props.href ?? '').trim()
  return href || undefined
})

function onImageLoad(info: { portrait: boolean }) {
  isPortraitImage.value = info.portrait
}

function onImageError() {
  imageFailed.value = true
  isPortraitImage.value = false
}
</script>
