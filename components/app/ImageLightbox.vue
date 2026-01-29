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

        <div class="relative h-full w-full">
          <img
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
import type { StyleValue } from 'vue'

defineProps<{
  visible: boolean
  backdropVisible: boolean
  src: string | null
  alt: string
  target: unknown
  imageStyle: StyleValue
  onClose: () => void
  onTransitionEnd: (e: TransitionEvent) => void
}>()
</script>

