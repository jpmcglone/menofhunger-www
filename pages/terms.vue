<template>
  <section class="mx-auto w-full max-w-2xl space-y-6">
    <header class="space-y-2">
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        Terms
      </h1>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        The rules of the road for using Men of Hunger.
      </p>
    </header>

    <Divider />

    <div class="space-y-4 text-gray-700 dark:text-gray-300">
      <p>
        This page is a placeholder for now. We’ll publish full terms as the product matures.
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        For questions, use the “Send feedback” link in Settings.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Terms'
})

usePageSeo({
  title: 'Terms',
  description: 'Terms for using Men of Hunger.',
  canonicalPath: '/terms',
  ogType: 'website',
  image: '/images/banner.png',
})
</script>

