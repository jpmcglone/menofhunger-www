<template>
  <button
    type="button"
    class="new-posts-pill inline-flex min-h-11 items-center gap-2 px-3.5 py-1.5 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--moh-text)]"
    :class="inline ? 'new-posts-row w-full justify-center border-b moh-border' : 'rounded-full shadow-lg'"
    :aria-label="`${count} new ${count === 1 ? 'post' : 'posts'}. Show new posts`"
    @click="$emit('reveal')"
  >
    <Icon name="tabler:arrow-up" class="h-5 w-5" aria-hidden="true" />
    <AppAvatarFacepile :authors="authors" size-class="h-8 w-8" overlap-class="-ml-2" />
    <span>New posts</span>
  </button>
</template>

<script setup lang="ts">
// Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=847-224
import type { ReplyAuthorPreview } from '~/utils/thread-reply-authors'
defineProps<{ authors: ReplyAuthorPreview[]; count: number; inline?: boolean }>()
defineEmits<{ reveal: [] }>()
</script>

<style scoped>
.new-posts-pill {
  background: var(--moh-button-primary-fill);
  color: var(--moh-button-primary-label);
  transition: transform 120ms ease, opacity 120ms ease;
}
.new-posts-row { height: 44px; padding-block: 5px; background: var(--moh-bg); color: var(--moh-text); }
.new-posts-pill:active { transform: scale(.97); }
.new-posts-pill :deep(.ring-2) { --tw-ring-color: var(--moh-button-primary-fill); }
.new-posts-row :deep(.ring-2) { --tw-ring-color: var(--moh-bg); }
.new-posts-row:active { transform: none; }
@media (prefers-reduced-motion: reduce) {
  .new-posts-pill { transition: none; }
  .new-posts-pill:active { transform: none; }
}
</style>
