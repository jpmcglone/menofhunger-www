<template>
  <header class="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 fixed w-full top-0">
    <nav class="h-16 flex items-center justify-between p-4">
      <NuxtLink to="/" class="flex items-center gap-3">
        <AppLogo
          :alt="siteConfig.name"
          :width="32"
          :height="32"
          imgClass="h-8 w-8 rounded"
        />
        <span class="text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-50">
          {{ siteConfig.name }}
        </span>
      </NuxtLink>

      <div class="flex items-center gap-2 sm:gap-4">
        <NuxtLink
          to="/about"
          class="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
        >
          About
        </NuxtLink>
        <UButton variant="ghost">Sign In</UButton>
        <UButton color="primary">Enroll</UButton>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
</script>