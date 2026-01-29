<template>
  <div class="space-y-4">
    <div>
      <p class="text-gray-700 dark:text-gray-300">
        Placeholder for your profile (bio, stats, posts).
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Profile'
})

usePageSeo({
  title: 'Profile',
  description: 'Your Men of Hunger profile — your mission, your wins, and what you’re building.',
  canonicalPath: '/profile',
  noindex: true,
})
</script>

