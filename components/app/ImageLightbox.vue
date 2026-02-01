<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="visible && src && target"
        class="fixed inset-0 z-[9999]"
        role="dialog"
        aria-modal="true"
        :aria-label="alt"
        @click="onClose"
      >
        <div
          class="absolute inset-0 bg-black/70 transition-opacity duration-200"
          :class="backdropVisible ? 'opacity-100' : 'opacity-0'"
          aria-hidden="true"
        />

        <button
          type="button"
          class="absolute right-4 top-4 z-10 rounded-full bg-black/45 p-2 text-white shadow-sm"
          aria-label="Close"
          @click.stop="onClose"
        >
          <i class="pi pi-times text-lg" aria-hidden="true" />
        </button>

        <button
          v-if="showNav"
          type="button"
          class="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white shadow-sm disabled:opacity-40"
          aria-label="Previous image"
          :disabled="!canPrev"
          @click.stop="onPrev"
        >
          <i class="pi pi-angle-left text-xl" aria-hidden="true" />
        </button>

        <button
          v-if="showNav"
          type="button"
          class="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white shadow-sm disabled:opacity-40"
          aria-label="Next image"
          :disabled="!canNext"
          @click.stop="onNext"
        >
          <i class="pi pi-angle-right text-xl" aria-hidden="true" />
        </button>

        <div
          v-if="showNav && counterLabel"
          class="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white"
          aria-hidden="true"
        >
          {{ counterLabel }}
        </div>

        <div class="relative h-full w-full">
          <video
            v-if="kind === 'media' && currentMediaItem?.kind === 'video'"
            :src="src"
            :poster="currentMediaItem?.posterUrl ?? undefined"
            class="select-none object-contain will-change-transform"
            :style="imageStyle"
            controls
            playsinline
            autoplay
            :muted="!appWideSoundOn"
            @click.stop
            @volumechange="onLightboxVideoVolumeChange"
            @transitionend="onTransitionEnd"
          />
          <img
            v-else-if="kind === 'media'"
            :src="src"
            :alt="alt"
            class="select-none object-contain will-change-transform"
            :style="imageStyle"
            draggable="false"
            @click.stop
            @transitionend="onTransitionEnd"
          >
          <img
            v-else
            :src="src"
            :alt="alt"
            class="select-none object-cover will-change-transform"
            :style="imageStyle"
            draggable="false"
            @click.stop
            @transitionend="onTransitionEnd"
          >
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { LightboxMediaItem } from '~/composables/useImageLightbox'
import type { StyleValue } from 'vue'

defineProps<{
  visible: boolean
  backdropVisible: boolean
  src: string | null
  alt: string
  kind?: 'avatar' | 'banner' | 'media'
  currentMediaItem?: LightboxMediaItem | null
  target: unknown
  imageStyle: StyleValue
  showNav?: boolean
  canPrev?: boolean
  canNext?: boolean
  counterLabel?: string | null
  onPrev?: () => void
  onNext?: () => void
  onClose: () => void
  onTransitionEnd: (e: TransitionEvent) => void
}>()

const { appWideSoundOn } = useEmbeddedVideoManager()

function onLightboxVideoVolumeChange(e: Event) {
  const el = (e.target as HTMLVideoElement)
  if (el) appWideSoundOn.value = !el.muted
}
</script>

