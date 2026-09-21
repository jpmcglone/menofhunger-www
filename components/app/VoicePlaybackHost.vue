<template>
  <div v-if="currentId" ref="bar" data-media-occluder class="fixed inset-x-0 top-0 z-[2000]" :style="{ top: `${viewportOffsetTop}px` }">
    <AppVoicePlayerBar />
  </div>
</template>
<script setup lang="ts">
import { useChatAudioPlayer } from '~/composables/chat/useChatAudioPlayer'
import { useIdentityVersion } from '~/composables/auth/authState'
import { addBreadcrumb } from '@sentry/nuxt'
import { mediaFocus } from '~/utils/mediaFocus'
const { currentId, stop } = useChatAudioPlayer()
const identity = useIdentityVersion()
const { viewportOffsetTop } = useKeyboardHeight()
const bar = ref<HTMLElement | null>(null)
let unsubscribeFocus: (() => void) | undefined
let observer: ResizeObserver | null = null
const videos = useEmbeddedVideoManager()
const route = useRoute()
watch(() => route.fullPath, () => nextTick(() => videos.schedule()))
function measure() { document.documentElement.style.setProperty('--moh-voice-player-height', `${bar.value?.getBoundingClientRect().height ?? 0}px`) }
watch(identity, () => { mediaFocus.reset(); stop(); videos.reset() })
watch(bar, (el) => { observer?.disconnect(); if (el) observer?.observe(el); measure() }, { flush: 'post' })
onMounted(() => {
  observer = new ResizeObserver(measure)
  if (bar.value) observer.observe(bar.value)
  measure()
  videos.mount()
  unsubscribeFocus = mediaFocus.subscribe(id => addBreadcrumb({ category: 'media', message: 'ownership', level: 'info', data: { kind: id?.split(':')[0] ?? 'released' } }))
})
onBeforeUnmount(() => {
  observer?.disconnect()
  unsubscribeFocus?.()
  videos.dispose()
  mediaFocus.reset()
  document.documentElement.style.removeProperty('--moh-voice-player-height')
})
</script>
