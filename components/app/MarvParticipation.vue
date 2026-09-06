<template>
  <section v-if="data?.suggestions.length" class="border-t moh-border pt-5">
    <h3 class="text-sm font-semibold">Join the conversation</h3>
    <p class="mt-1 text-xs moh-text-muted">A few places where your perspective could help.</p>
    <div v-if="loading && !data" class="mt-4 space-y-3" aria-label="Finding conversations"><AppMarvMark :size="28" loading /><span class="moh-text-muted">Finding conversations…</span></div>
    <div v-else-if="data?.suggestions.length" class="mt-2 moh-divide">
      <NuxtLink v-for="suggestion in data.suggestions" :key="suggestion.postId" :to="`/p/${suggestion.postId}`" class="block py-4" @click="$emit('navigate')"><span class="text-xs moh-text-muted">{{ suggestion.reason }}</span><p class="mt-1 text-sm font-medium">{{ suggestion.name || `@${suggestion.username}` }}</p><p class="mt-1 line-clamp-2 text-sm moh-text-muted">{{ suggestion.body || 'Open the conversation' }}</p><span class="mt-2 inline-block text-xs font-medium">Read & reply →</span></NuxtLink>
    </div>
    <p v-else-if="error" class="mt-3 text-sm moh-text-muted">Conversations couldn't load. <button class="underline" @click="refresh">Try again</button></p>
    <p v-else class="mt-3 text-sm moh-text-muted">You're caught up with these conversations. Check the lodge for something new.</p>
  </section>
</template>
<script setup lang="ts">
import type { MarvinParticipationDto } from '~/types/api'
const props = defineProps<{ postId: string }>()
defineEmits<{ navigate: [] }>()
const { data, error, loading, refresh } = usePrivateApiData<MarvinParticipationDto>('/marvin/participation', () => ({ postId: props.postId }))
</script>
