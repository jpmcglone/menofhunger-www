<template>
  <NuxtLink :to="`/p/${context.reply?.id || context.relatedPostId || postId}`" class="mt-2 block rounded-lg moh-surface-2 px-3 py-2 text-xs" @click.stop>
    <span class="flex items-center gap-1.5 moh-text-muted"><Icon :name="context.kind === 'followUp' ? 'tabler:corner-down-right' : 'tabler:message-circle'" aria-hidden="true" />{{ context.kind === 'followUp' ? 'Follow-up' : context.kind === 'unanswered' ? 'Be the first to reply' : 'New reply' }}</span>
    <span v-if="context.reply" class="mt-1 line-clamp-2"><span class="font-medium">{{ context.reply.author.name || context.reply.author.username }}: </span>{{ context.reply.body }}</span>
  </NuxtLink>
</template>
<script setup lang="ts">
import type { ConversationContext } from '~/types/api'
defineProps<{ postId: string; context: ConversationContext }>()
</script>
