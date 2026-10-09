<template>
  <div
    :class="[
      'flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs opacity-75 cursor-pointer w-full',
      outgoing
        ? 'bg-black/10 dark:bg-white/10 text-current'
        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400',
      indented ? 'ml-[2.125rem]' : '',
    ]"
  >
    <Icon name="tabler:corner-up-right" size="12" class="shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1 overflow-hidden">
      <span class="font-semibold mr-1">{{ reply.senderUsername ? `@${reply.senderUsername}` : 'Unknown' }}</span><span
        class="break-words"
        style="display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line;"
      >{{ collapseBlankLines(reply.bodyPreview) }}</span>
    </div>
    <img
      v-if="reply.mediaThumbnailUrl"
      :src="reply.mediaThumbnailUrl"
      class="shrink-0 h-9 w-9 rounded-md object-cover"
      aria-hidden="true"
    >
  </div>
</template>

<script setup lang="ts">
import type { MessageReplySnippet } from '~/types/api'

/** The quoted-message chip above a reply. `indented` aligns it past the incoming avatar in group chats. */
defineProps<{ reply: MessageReplySnippet; outgoing: boolean; indented?: boolean }>()

function collapseBlankLines(text: string): string {
  return text.split('\n').filter((line) => line.trim() !== '').join('\n')
}
</script>
