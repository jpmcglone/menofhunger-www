<template>
  <div class="space-y-4">
    <Card>
      <template #title>Messages</template>
      <template #content>
        <p class="text-gray-700 dark:text-gray-300">
          Placeholder for Direct Messages (DM).
        </p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Messages'
})

usePageSeo({
  title: 'Messages',
  description: 'Direct messages in Men of Hunger — keep conversations focused and intentional.'
})
</script>

