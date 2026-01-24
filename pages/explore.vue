<template>
  <div class="space-y-4">
    <div>
      <InputText class="w-full" placeholder="Search Explore…" />
    </div>

    <Card>
      <template #title>Explore</template>
      <template #content>
        <p class="text-gray-700 dark:text-gray-300">
          Placeholder for Explore (trending topics, discovery, groups, etc.).
        </p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Explore'
})

usePageSeo({
  title: 'Explore',
  description: 'Explore Men of Hunger — trending topics, discovery, and new groups worth joining.'
})
</script>

