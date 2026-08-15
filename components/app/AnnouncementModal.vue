<template>
  <AppModal
    v-model="open"
    :title="announcement?.title ?? 'Announcement'"
    max-width-class="max-w-2xl"
    max-height="min(90vh, 52rem)"
    hide-header
    @dismiss="onDismiss"
  >
    <div v-if="announcement" class="flex flex-col">
      <div v-if="announcement.imageUrl">
        <button
          type="button"
          class="moh-tap relative block w-full cursor-zoom-in border-0 bg-transparent p-0"
          :aria-label="`View ${announcement.title}`"
          @click.stop="onImageClick"
        >
          <img
            :src="announcement.imageUrl"
            :alt="announcement.title"
            class="aspect-video w-full object-cover"
          >
        </button>
      </div>
      <div class="moh-gutter-x py-6 space-y-3" :class="announcement.imageUrl ? '' : 'pr-14'">
        <h2 class="moh-h1 text-balance">
          {{ announcement.title }}
        </h2>
        <div v-if="announcement.isAd" class="moh-meta">Ad</div>
        <p
          v-if="announcement.body"
          class="moh-body text-base leading-[1.65] whitespace-pre-wrap text-pretty"
        >
          {{ announcement.body }}
        </p>
      </div>
    </div>

    <template v-if="announcement?.ctaLabel && announcement.ctaHref" #footer>
      <Button
        :label="announcement.ctaLabel"
        class="w-full"
        @click="emit('cta')"
      />
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import type { Announcement, AnnouncementDismissMethod } from '~/types/api'

const props = defineProps<{
  modelValue: boolean
  announcement: Announcement | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'dismiss', method: AnnouncementDismissMethod): void
  (e: 'cta'): void
}>()

const { openFromEvent } = useImageLightbox()

const open = computed({
  get: () => props.modelValue && Boolean(props.announcement),
  set: (value: boolean) => emit('update:modelValue', value),
})

function onImageClick(e: MouseEvent) {
  const url = props.announcement?.imageUrl
  if (!url) return
  void openFromEvent(e, url, props.announcement?.title ?? 'Announcement', 'media')
}

function onDismiss(reason: 'close_button' | 'backdrop' | 'escape') {
  emit('dismiss', reason)
}
</script>
