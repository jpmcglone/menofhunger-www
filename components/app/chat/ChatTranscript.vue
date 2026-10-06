<template>
  <div v-if="media.transcriptStatus === 'pending' || media.transcript" class="mt-1 text-xs leading-snug" data-testid="chat-transcript">
    <p v-if="media.transcriptStatus === 'pending'" class="inline-flex min-h-6 items-center gap-1.5 moh-text-muted" role="status">
      <Icon name="tabler:loader-2" class="animate-spin motion-reduce:animate-none" size="12" aria-hidden="true" />
      Transcribing…
    </p>
    <template v-else>
      <button
        type="button"
        class="moh-focus inline-flex min-h-11 w-full items-center gap-1.5 text-left text-xs font-semibold moh-text-muted"
        :aria-expanded="open"
        @click.stop="open = !open"
      >
        <Icon name="tabler:text-caption" size="14" aria-hidden="true" />
        {{ open ? 'Hide transcript' : 'Read transcript' }}
        <Icon :name="open ? 'tabler:chevron-up' : 'tabler:chevron-down'" size="12" aria-hidden="true" />
      </button>
      <p v-if="open" class="whitespace-pre-wrap break-words pb-1">{{ media.transcript }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { MessageMedia } from '~/types/api'

defineProps<{ media: Pick<MessageMedia, 'transcriptStatus' | 'transcript'> }>()
const open = ref(false)
</script>
