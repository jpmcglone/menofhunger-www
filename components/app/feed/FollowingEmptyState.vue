<template>
  <div
    class="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
    role="status"
  >
    <div class="font-semibold text-gray-900 dark:text-gray-50">Nothing here yet</div>
    <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
      <slot>
        <template v-if="followingCount === 0">
          Your Following feed shows posts from people you follow (plus you). Follow a few people to see posts here.
        </template>
        <template v-else-if="followingCount !== null">
          You're following people, but none of them have posted yet. Follow some more active accounts to fill your
          feed.
        </template>
        <template v-else>
          Your Following feed shows posts from people you follow (plus you). Follow a few people to see posts here.
        </template>
      </slot>
    </div>
    <div class="mt-3">
      <Button label="Find people" severity="secondary" @click="$emit('find-people')" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  followingCount: number | null
}>()

defineEmits<{
  (e: 'find-people'): void
}>()
</script>
