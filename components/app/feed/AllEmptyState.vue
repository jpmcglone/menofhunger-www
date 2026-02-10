<template>
  <div
    class="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
    role="status"
  >
    <div class="font-semibold text-gray-900 dark:text-gray-50">Your feed is empty</div>
    <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
      <slot>
        Find people and topics to follow, or explore what’s trending.
      </slot>
    </div>
    <div class="mt-3 flex flex-wrap gap-3">
      <Button label="Explore" severity="secondary" @click="$emit('explore')" />
      <Button label="Who to follow" severity="secondary" @click="$emit('who-to-follow')" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'explore'): void
  (e: 'who-to-follow'): void
}>()
</script>

