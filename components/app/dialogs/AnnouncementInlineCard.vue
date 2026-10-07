<template>
  <div v-if="announcement" class="px-3 pt-3 pb-4 sm:px-4">
    <article class="relative overflow-hidden rounded-xl border moh-border moh-surface">
      <button
        type="button"
        class="moh-tap moh-focus absolute top-2.5 right-2.5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full"
        aria-label="Dismiss"
        @click="emit('dismiss', 'close_button')"
      >
        <Icon
          name="tabler:x"
          size="20"
          class="font-bold"
          :class="announcement.imageUrl ? 'text-white' : 'moh-text'"
          :style="announcement.imageUrl
            ? 'filter: drop-shadow(0 0 1px #000) drop-shadow(0 0 1.5px #000) drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
            : undefined"
          aria-hidden="true"
        />
      </button>

      <button
        v-if="announcement.imageUrl"
        type="button"
        class="moh-tap relative block w-full cursor-zoom-in border-0 bg-transparent p-0"
        :aria-label="announcement.title ? `View ${announcement.title}` : 'View image'"
        @click="onImageClick"
      >
        <img
          :src="announcement.imageUrl"
          :alt="announcement.title || ''"
          class="aspect-video w-full object-cover"
        >
      </button>

      <div class="space-y-2 p-4" :class="announcement.imageUrl ? '' : 'pr-14'">
        <h2 v-if="announcement.title" class="moh-h1 text-balance">
          {{ announcement.title }}
        </h2>
        <div v-if="announcement.isAd" class="moh-meta">Ad</div>
        <p
          v-if="announcement.body"
          class="moh-body whitespace-pre-wrap text-pretty leading-[1.65]"
        >
          {{ announcement.body }}
        </p>
        <Button
          v-if="announcement.ctaLabel && announcement.ctaHref"
          :label="announcement.ctaLabel"
          class="w-full"
          @click="emit('cta')"
        />
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { Announcement, AnnouncementDismissMethod } from '~/types/api'

const props = defineProps<{
  announcement: Announcement | null
}>()

const emit = defineEmits<{
  (e: 'dismiss', method: AnnouncementDismissMethod): void
  (e: 'cta'): void
}>()

const { openFromEvent } = useImageLightbox()

function onImageClick(e: MouseEvent) {
  const url = props.announcement?.imageUrl
  if (!url) return
  void openFromEvent(e, url, props.announcement?.title || 'Announcement', 'media')
}
</script>
