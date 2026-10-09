<template>
  <section class="flex flex-col items-center px-2 pt-24 text-center">
    <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">This page isn't available</h1>
    <p class="mt-2 max-w-[340px] text-[15px] leading-relaxed moh-text-muted">
      The link may be wrong, or the page was removed.
    </p>
    <Button
      as="NuxtLink"
      to="/explore"
      :label="`Explore ${siteName}`"
      rounded
      class="mt-6 min-h-11"
    />
  </section>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'

const siteName = siteConfig.name
</script>
