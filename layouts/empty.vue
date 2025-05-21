<template>
  <div class="min-h-screen flex flex-col">
    <main class="flex-1 flex items-center justify-center">
      <slot />
    </main>
    <footer class="py-2 text-center text-white">
      <p class="text-sm">
        {{ siteConfig.name }} &copy; {{ copyrightYear }} • Built by
        <a
          href="https://jpmcglone.com"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline"
        >John McGlone</a>
      </p>
    </footer>
  </div>
</template>

<script setup>
import { siteConfig, getCopyrightYear } from '~/config/site'

const copyrightYear = getCopyrightYear(siteConfig.established)
</script>