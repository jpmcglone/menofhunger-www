<template>
  <div class="min-h-screen flex flex-col">
    <main class="flex-1">
      <slot />
    </main>
    <footer class="py-8 text-center">
      <p class="text-sm text-gray-400 dark:text-gray-500">
        {{ siteConfig.name }} &copy; {{ copyrightYear }} • Built by <a 
          href="https://jpmcglone.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >John McGlone</a>
      </p>
    </footer>
  </div>
</template>

<script setup>
import { siteConfig, getCopyrightYear } from '~/config/site'

const copyrightYear = getCopyrightYear(siteConfig.established)
</script>