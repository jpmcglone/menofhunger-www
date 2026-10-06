<template>
  <div class="my-2">
    <img v-if="imageUrl" :src="imageUrl" :alt="media.alt ?? 'Attachment'" class="max-h-80 max-w-full rounded-lg object-contain" >
    <video v-else-if="streamUrl && media.source !== 'upload' && media.kind !== 'audio'" :key="streamUrl" :src="streamUrl" autoplay loop muted playsinline preload="auto" :aria-label="media.alt ?? 'Animated GIF'" class="max-h-80 max-w-full rounded-lg" @error="error = true; streamUrl = null" />
    <video v-else-if="streamUrl && media.kind !== 'audio'" ref="player" :key="streamUrl" :src="streamUrl" controls playsinline crossorigin="use-credentials" preload="metadata" class="max-h-80 max-w-full rounded-lg" />
    <div v-else-if="streamUrl" class="max-w-xs">
      <audio ref="player" :src="streamUrl" controls crossorigin="use-credentials" preload="metadata" />
      <AppChatTranscript :media="media" />
    </div>
    <p v-else-if="error" class="text-sm moh-text-muted" role="status">Attachment unavailable.</p>
    <p v-else class="text-sm moh-text-muted" role="status">Loading attachment…</p>
  </div>
</template>
<script setup lang="ts">
import type { ChannelMessage } from '~/types/api'
const props = defineProps<{ media: NonNullable<ChannelMessage['media']>[number] }>()
const { apiFetchBlob, apiUrl } = useApiClient()
const { user } = useAuth()
const imageUrl = ref<string | null>(null)
const streamUrl = ref<string | null>(null)
const error = ref(false)
const player = ref<HTMLMediaElement | null>(null)
let generation = 0
function clear() { player.value?.pause(); player.value?.removeAttribute("src"); player.value?.load(); generation++; if (imageUrl.value?.startsWith('blob:')) URL.revokeObjectURL(imageUrl.value); imageUrl.value = null; streamUrl.value = null }
async function load() {
  clear()
  error.value = false
  const request = generation
  try {
    const media = props.media
    if (media.source !== 'upload') {
      if (media.mp4Url) streamUrl.value = media.mp4Url
      else imageUrl.value = media.url
      return
    }
    if (!/^\/groups\/[^/]+\/channels\/[^/]+\/media\/[^/?]+/.test(media.url)) throw new Error('Invalid protected media path')
    if (media.kind === 'video' || media.kind === 'audio') { streamUrl.value = apiUrl(media.url); return }
    const blob = await apiFetchBlob(media.url)
    if (generation === request) imageUrl.value = URL.createObjectURL(blob)
  } catch { if (generation === request) error.value = true }
}
onMounted(load)
watch(() => props.media.id, load)
watch(() => user.value?.id, load)
onBeforeUnmount(clear)
</script>
