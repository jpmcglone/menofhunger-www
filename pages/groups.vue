<template>
  <div class="space-y-4">
    <Card>
      <template #title>Groups</template>
      <template #content>
        <p class="text-gray-700 dark:text-gray-300">
          Placeholder for Groups (brotherhood circles, local chapters, challenges).
        </p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Groups'
})

usePageSeo({
  title: 'Groups',
  description: 'Groups in Men of Hunger — accountability circles, disciplines, and builders helping builders.'
})
</script>

