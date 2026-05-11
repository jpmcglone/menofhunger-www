<template>
  <div class="min-h-screen flex flex-col moh-bg moh-texture moh-text">
    <header class="border-b border-gray-200 dark:border-zinc-800">
      <div class="mx-auto w-full max-w-6xl px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4">
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <AppLogo
            :alt="siteConfig.name"
            :light-src="logoLightSmall"
            :dark-src="logoDarkSmall"
            :width="40"
            :height="40"
            img-class="h-10 w-10 rounded"
          />
          <div class="text-base sm:text-lg font-semibold tracking-wide text-gray-900 dark:text-gray-50">
            {{ siteConfig.name }}
          </div>
        </NuxtLink>

        <nav class="flex items-center gap-2" aria-label="Primary">
          <NuxtLink v-if="isAuthed" to="/home" class="inline-flex">
            <Button class="rounded-full" size="small">
              <span class="flex items-center gap-2">
                <span>Open app</span>
                <Icon name="tabler:arrow-right" aria-hidden="true" />
              </span>
            </Button>
          </NuxtLink>
          <NuxtLink v-else to="/login" class="inline-flex">
            <Button class="rounded-full" size="small">
              <span class="flex items-center gap-2">
                <span>Log in</span>
                <Icon name="tabler:arrow-right" aria-hidden="true" />
              </span>
            </Button>
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-gray-200 dark:border-zinc-800" role="contentinfo">
      <div class="mx-auto w-full max-w-6xl px-5 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <ClientOnly>
            <AppThemeModeMenu />
          </ClientOnly>
          <NuxtLink to="/about" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">About</NuxtLink>
          <NuxtLink to="/tiers" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Tiers</NuxtLink>
          <NuxtLink to="/privacy" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Privacy</NuxtLink>
          <NuxtLink to="/terms" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Terms</NuxtLink>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          &copy; {{ currentYear }} {{ siteConfig.name }}
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import logoLightSmall from '~/assets/images/logo-white-bg-small.png'
import logoDarkSmall from '~/assets/images/logo-black-bg-small.png'

const { isAuthed } = useAuth()
const currentYear = new Date().getUTCFullYear()
</script>
