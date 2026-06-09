<template>
  <div
    class="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
    :class="status === 'failed'
      ? 'border-red-300/70 bg-red-50/70 text-red-800 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-200'
      : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-gray-300'"
    @click.stop
  >
    <span class="inline-flex items-center gap-2">
      <template v-if="status === 'posting'">
        <Icon name="tabler:loader-2" class="animate-spin text-base" aria-hidden="true" />
        <span>Posting…</span>
      </template>
      <template v-else>
        <Icon name="tabler:alert-triangle" class="text-base" aria-hidden="true" />
        <span>{{ errorText }}</span>
      </template>
    </span>
    <span v-if="status === 'failed'" class="inline-flex items-center gap-2">
      <Button
        label="Retry"
        size="small"
        severity="secondary"
        rounded
        @click.stop="onRetry"
      />
      <Button
        label="Discard"
        size="small"
        severity="secondary"
        text
        rounded
        @click.stop="onDiscard"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

const props = defineProps<{
  post: FeedPost
  status: 'posting' | 'failed'
}>()

const errorText = computed(() => (props.post._pendingError ?? '').trim() || 'Failed to post.')

const pendingPostsManager = usePendingPostsManager()

function onRetry() {
  const lid = (props.post._localId ?? '').trim()
  if (!lid) return
  void pendingPostsManager.retry(lid)
}

function onDiscard() {
  const lid = (props.post._localId ?? '').trim()
  if (!lid) return
  pendingPostsManager.discard(lid)
}
</script>
