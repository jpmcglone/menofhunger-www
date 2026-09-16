<template>
  <div v-if="currentId" ref="bar" class="fixed inset-x-0 top-0 z-[2000]" :style="{ top: `${viewportOffsetTop}px` }">
    <AppVoicePlayerBar />
  </div>
</template>
<script setup lang="ts">
import { useChatAudioPlayer } from '~/composables/chat/useChatAudioPlayer'
import { useIdentityVersion } from '~/composables/auth/authState'
import { mediaFocus } from '~/utils/mediaFocus'
const { currentId, stop } = useChatAudioPlayer()
const identity = useIdentityVersion()
const { viewportOffsetTop } = useKeyboardHeight()
const bar = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null
let counter = 0
const ids = new WeakMap<HTMLMediaElement, string>()
function onPlay(event: Event) {
  const el = event.target
  if (!(el instanceof HTMLMediaElement) || el.srcObject || el.dataset.mediaDecorative != null) return
  // App-owned video and local previews share focus; live call tracks own their call session.
  let id = ids.get(el)
  if (!id) { id = `video:${++counter}`; ids.set(el, id) }
  const explicit = el.dataset.mediaExplicit === 'true'
  delete el.dataset.mediaExplicit
  if (!mediaFocus.claim(id, () => { el.pause(); if (document.pictureInPictureElement === el) void document.exitPictureInPicture().catch(() => {}) }, { automatic: !explicit && (el.hasAttribute('data-media-autoplay') || (el.autoplay && el.muted)) })) el.pause()
}
function onEnded(event: Event) { const el = event.target; if (el instanceof HTMLMediaElement) { const id = ids.get(el); if (id) mediaFocus.release(id) } }
function measure() { document.documentElement.style.setProperty('--moh-voice-player-height', `${bar.value?.getBoundingClientRect().height ?? 0}px`) }
watch(identity, () => { mediaFocus.reset(); stop() })
watch(bar, (el) => { observer?.disconnect(); if (el) observer?.observe(el); measure() }, { flush: 'post' })
onMounted(() => {
  observer = new ResizeObserver(measure)
  if (bar.value) observer.observe(bar.value)
  measure()
  document.addEventListener('play', onPlay, true)
  document.addEventListener('ended', onEnded, true)
  document.addEventListener('pause', onEnded, true)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('play', onPlay, true)
  document.removeEventListener('ended', onEnded, true)
  document.removeEventListener('pause', onEnded, true)
  mediaFocus.reset()
  document.documentElement.style.removeProperty('--moh-voice-player-height')
})
</script>
