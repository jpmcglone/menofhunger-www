<template>
  <div class="min-h-screen flex flex-col moh-bg moh-texture moh-text">
    <main class="flex-1 flex items-center justify-center">
      <slot />
    </main>
    <footer>
      <div class="mx-auto w-full max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          {{ siteConfig.name }} &copy; {{ copyrightYear }} • Built by
          <a
            href="https://jpmcglone.com"
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-800 hover:underline dark:text-gray-200"
          >John McGlone</a>
        </p>
        <div class="flex items-center gap-3">
          <a
            :href="siteConfig.social.xUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-700 hover:underline dark:text-gray-300"
          >
            Follow on X
          </a>
          <ClientOnly>
            <AppThemeModeMenu />
          </ClientOnly>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { siteConfig, getCopyrightYear } from '~/config/site'
import { primaryTintCssForUser } from '~/utils/theme-tint'

const copyrightYear = getCopyrightYear(siteConfig.established)

// Ensure PrimeVue tint matches auth status even on "empty" pages (e.g. Login).
const { user } = useAuth()
const primaryCssVars = computed(() => primaryTintCssForUser(user.value ?? null))
useHead({
  style: [{ key: 'moh-primary-tint', textContent: primaryCssVars }],
})
</script>