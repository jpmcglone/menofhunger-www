<template>
  <div class="space-y-6">
    <div
      class="flex min-h-[min(50vh,24rem)] flex-col items-center justify-center rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-6 py-12 text-center"
    >
      <div
        class="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-gray-200/80 dark:bg-zinc-800/80 text-gray-500 dark:text-zinc-400"
        aria-hidden="true"
      >
        <i class="pi pi-users text-5xl" aria-hidden="true" />
      </div>
      <p class="mt-6 max-w-sm text-sm font-medium text-gray-700 dark:text-gray-300">
        Groups aren't ready yet. We're building accountability circles, disciplines, and builders helping builders.
      </p>
      <p class="mt-2 text-xs moh-text-muted">
        Check back later.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Groups',
})

usePageSeo({
  title: 'Groups',
  description: 'Groups in Men of Hunger — accountability circles, disciplines, and builders helping builders.',
  canonicalPath: '/groups',
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})
</script>
