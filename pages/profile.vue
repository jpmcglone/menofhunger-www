<template>
  <div class="space-y-4">
    <Card>
      <template #title>Profile</template>
      <template #content>
        <p class="text-gray-700 dark:text-gray-300">
          Placeholder for your profile (bio, stats, posts).
        </p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Profile'
})

usePageSeo({
  title: 'Profile',
  description: 'Your Men of Hunger profile — your mission, your wins, and what you’re building.'
})
</script>

