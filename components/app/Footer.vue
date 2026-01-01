<template>
  <footer class="bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ siteConfig.name }} &copy; {{ copyrightYear }}
      </p>
      <ClientOnly>
        <AppThemeModeMenu />
      </ClientOnly>
    </div>
  </footer>
</template>

<script setup>
import { siteConfig, getCopyrightYear } from '~/config/site'

const copyrightYear = getCopyrightYear(siteConfig.established)
</script> 