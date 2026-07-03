<template>
  <div
    v-if="authors.length"
    class="inline-flex shrink-0 items-center"
    aria-hidden="true"
  >
    <AppUserAvatar
      v-for="(author, index) in authors"
      :key="author.id"
      :user="author"
      :size-class="sizeClass"
      :enable-preview="false"
      :show-status="false"
      :show-presence="false"
      class="ring-2 ring-[var(--moh-bg)]"
      :class="index > 0 ? overlapClass : undefined"
      :style="{ zIndex: authors.length - index }"
    />
  </div>
</template>

<script setup lang="ts">
import type { ReplyAuthorPreview } from '~/utils/thread-reply-authors'

withDefaults(
  defineProps<{
    authors: ReplyAuthorPreview[]
    sizeClass?: string
    overlapClass?: string
  }>(),
  {
    sizeClass: 'h-5 w-5',
    overlapClass: '-ml-1.5',
  },
)
</script>
