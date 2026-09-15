<template>
  <div data-post-row-interactive class="min-w-0 overflow-hidden rounded-xl" @click.stop @pointerdown.stop @keydown.stop>
    <iframe v-if="active && !failed" :key="content.embedUrl" :src="content.embedUrl" :height="content.height" width="100%" class="block w-full rounded-xl border-0" :title="`Spotify ${content.kind} player`" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy" @error="failed = true" />
    <div v-else-if="!failed" :style="{ height: `${content.height}px` }" class="moh-surface-2" />
    <div class="flex min-h-11 items-center justify-end gap-3">
      <button v-if="failed" type="button" class="moh-focus min-h-11 text-xs moh-text-muted" @click="failed = false">Try player again</button>
      <a :href="content.url" target="_blank" rel="noopener noreferrer" class="moh-focus inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold moh-text-muted">Open in Spotify<Icon name="tabler:external-link" class="text-sm" aria-hidden="true" /></a>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { SpotifyContent } from '~/utils/spotify-embed'
const props = defineProps<{ content: SpotifyContent }>()
const failed = ref(false)
const active = ref(true)
watch(() => props.content.embedUrl, () => { failed.value = false })
onActivated(() => { active.value = true })
onDeactivated(() => { active.value = false })
</script>
