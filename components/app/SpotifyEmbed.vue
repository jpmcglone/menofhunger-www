<template>
  <div data-post-row-interactive class="min-w-0 overflow-hidden rounded-xl" @click.stop @pointerdown.stop @keydown.stop>
    <iframe v-if="active && !failed" ref="frame" :key="content.embedUrl" :src="content.embedUrl" :height="content.height" width="100%" class="block w-full rounded-xl border-0" :title="`Spotify ${content.kind} player`" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy" @error="failed = true" />
    <div v-else-if="!failed" :style="{ height: `${content.height}px` }" class="moh-surface-2" />
    <button v-else type="button" class="moh-focus min-h-11 text-xs moh-text-muted" @click="failed = false">Try player again</button>
  </div>
</template>
<script setup lang="ts">
import { mediaFocus } from '~/utils/mediaFocus'
import type { SpotifyContent } from '~/utils/spotify-embed'
const props = defineProps<{ content: SpotifyContent }>()
const frame = ref<HTMLIFrameElement | null>(null)
const focusId = `spotify:${useId()}`
// Cross-origin embeds do not expose HTMLMediaElement play events. Claim focus
// when the user enters their controls; reloading releases their media pipeline.
function onWindowBlur() {
  requestAnimationFrame(() => {
    if (!frame.value || document.activeElement !== frame.value) return
    const stop = () => { if (frame.value) frame.value.src = props.content.embedUrl }
    if (!mediaFocus.claim(focusId, stop)) stop()
  })
}
onMounted(() => window.addEventListener('blur', onWindowBlur))
onBeforeUnmount(() => { window.removeEventListener('blur', onWindowBlur); mediaFocus.release(focusId) })
const failed = ref(false)
const active = ref(true)
watch(() => props.content.embedUrl, () => { failed.value = false })
onActivated(() => { active.value = true })
onDeactivated(() => { active.value = false; mediaFocus.release(focusId) })
</script>
