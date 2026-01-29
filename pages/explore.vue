<template>
  <div class="space-y-4">
    <div>
      <InputText class="w-full" placeholder="Search Explore…" />
    </div>

    <div>
      <p class="text-gray-700 dark:text-gray-300">
        Placeholder for Explore (trending topics, discovery, groups, etc.).
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Explore'
})

usePageSeo({
  title: 'Explore',
  description: 'Explore Men of Hunger — trending topics, discovery, and new groups worth joining.',
  canonicalPath: '/explore',
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})
</script>

