<template>
  <div v-if="dev" class="mx-auto max-w-xl space-y-6 p-6">
    <h1>Media validation</h1>
    <p>Owner: {{ media.activeId.value || 'none' }} · sound: {{ media.appWideSoundOn.value ? 'on' : 'muted' }}</p>
    <button @click="selectAudio">Select audio</button>
    <button @click="releaseAudio">Finish audio</button>
    <AppPostMediaGrid :media="upload" post-id="fixture-upload" />
    <div style="height:450px">Scroll to YouTube</div>
    <AppEmbeddedVideoPlayer youtube-url="https://www.youtube.com/watch?v=jNQXAC9IVRw" title="YouTube fixture" :frame-style="{ aspectRatio: '16 / 9' }" />
    <div style="height:450px">Scroll to Rumble</div>
    <AppEmbeddedVideoPlayer rumble-url="https://rumble.com/embed/v17j3tt/" title="Rumble fixture" :frame-style="{ aspectRatio: '16 / 9' }" />
    <AppSpotifyEmbed :content="spotify!" />
    <div style="height:500px" />
  </div>
</template>
<script setup lang="ts">
import { mediaFocus } from '~/utils/mediaFocus'
import { spotifyContent } from '~/utils/spotify-embed'
const upload = [{ id: 'test', kind: 'video' as const, source: 'upload' as const, url: '/media-validation.mp4', mp4Url: null, thumbnailUrl: null, width: 320, height: 180, durationSeconds: 1, alt: null, deletedAt: null }]
const dev = true
const media = useEmbeddedVideoManager()
const spotify = spotifyContent('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')
function selectAudio() { mediaFocus.claim('test-audio', () => {}) }
function releaseAudio() { mediaFocus.release('test-audio') }
</script>
