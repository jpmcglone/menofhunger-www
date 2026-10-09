<template>
  <Transition name="moh-fade">
    <div
      v-if="replyTo"
      class="flex items-start gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 px-3 py-2 text-xs"
    >
      <Icon name="tabler:corner-up-right" size="13" class="shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <span class="font-semibold text-gray-600 dark:text-gray-300 mr-1">
          {{ replyTo.senderUsername ? `@${replyTo.senderUsername}` : 'Reply' }}
        </span>
        <span class="text-gray-500 dark:text-gray-400 line-clamp-1">{{ replyTo.bodyPreview }}</span>
      </div>
      <!-- Thumbnail of media from the original message -->
      <img
        v-if="replyTo.mediaThumbnailUrl"
        :src="replyTo.mediaThumbnailUrl"
        class="shrink-0 h-9 w-9 rounded-md object-cover"
        aria-hidden="true"
      >
      <button
        type="button"
        aria-label="Cancel reply"
        class="shrink-0 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
        @click="emit('cancel')"
      >
        <Icon name="tabler:x" size="13" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { MessageReplySnippet } from '~/types/api'

defineProps<{ replyTo: MessageReplySnippet | null }>()
const emit = defineEmits<{ cancel: [] }>()
</script>
