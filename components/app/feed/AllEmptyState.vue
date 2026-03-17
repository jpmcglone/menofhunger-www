<template>
  <div
    class="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
    role="status"
  >
    <div class="font-semibold text-gray-900 dark:text-gray-50">{{ VOICE.feed.emptyTitle }}</div>
    <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
      <slot>
        {{ VOICE.feed.emptyBody }}
      </slot>
    </div>
    <div class="mt-3 flex flex-wrap gap-3">
      <Button :label="VOICE.actions.explore" severity="secondary" @click="$emit('explore')" />
      <Button :label="VOICE.actions.findPeople" severity="secondary" @click="$emit('who-to-follow')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { VOICE } from '~/config/voice'

defineEmits<{
  (e: 'explore'): void
  (e: 'who-to-follow'): void
}>()
</script>
