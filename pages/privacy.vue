<template>
  <section class="mx-auto w-full max-w-2xl space-y-6">
    <header class="space-y-2">
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        Privacy
      </h1>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        A plain-language overview of how Men of Hunger handles your data.
      </p>
    </header>

    <Divider />

    <div class="space-y-4 text-gray-700 dark:text-gray-300">
      <p>
        This page is a placeholder for now. We’ll publish a full privacy policy as the product matures.
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
  title: 'Privacy'
})

usePageSeo({
  title: 'Privacy',
  description: 'Privacy information for Men of Hunger.',
  canonicalPath: '/privacy',
  ogType: 'website',
  image: '/images/banner.png',
})
</script>

