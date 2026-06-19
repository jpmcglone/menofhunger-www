<template>
  <div class="relative min-h-screen flex flex-col moh-bg moh-text">
    <!-- Background gradients (matches landing page) -->
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-400/15 via-amber-400/10 to-transparent blur-3xl" />
      <div class="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-zinc-900/5 via-zinc-700/5 to-transparent blur-3xl dark:from-white/5 dark:via-white/5" />
    </div>

    <!-- Header -->
    <header class="pt-8 sm:pt-10">
      <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div class="flex items-center justify-between gap-4">
          <NuxtLink to="/" class="flex shrink-0 items-center gap-3">
            <AppLogo
              :alt="siteConfig.name"
              :width="40"
              :height="40"
              img-class="h-10 w-10 rounded"
            />
            <div class="text-base font-semibold tracking-wide text-gray-900 dark:text-gray-50">
              {{ siteConfig.name }}
            </div>
          </NuxtLink>

          <div class="flex shrink-0 items-center gap-2">
            <NuxtLink
              v-if="isAuthed"
              to="/home"
              class="inline-flex"
            >
              <Button class="rounded-full px-5">
                <span class="flex items-center gap-2">
                  <span>Open app</span>
                  <Icon name="tabler:arrow-right" aria-hidden="true" />
                </span>
              </Button>
            </NuxtLink>
            <template v-else>
              <NuxtLink
                to="/login"
                class="hidden items-center px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50 sm:inline-flex"
              >
                Log in
              </NuxtLink>
              <NuxtLink to="/login" class="inline-flex">
                <Button class="rounded-full px-5">
                  <span class="flex items-center gap-2">
                    <span>Join now</span>
                    <Icon name="tabler:arrow-right" aria-hidden="true" />
                  </span>
                </Button>
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer (matches landing page) -->
    <footer class="pb-10 sm:pb-14" role="contentinfo">
      <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <nav aria-label="Sitemap" class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6 text-sm text-gray-600 dark:border-zinc-800 dark:text-gray-300">
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
            <ClientOnly>
              <AppThemeModeMenu />
            </ClientOnly>
            <NuxtLink to="/about" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">About</NuxtLink>
            <NuxtLink to="/tiers" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Tiers</NuxtLink>
            <NuxtLink to="/articles" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Articles</NuxtLink>
            <NuxtLink to="/roadmap" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Roadmap</NuxtLink>
            <NuxtLink to="/privacy" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Privacy</NuxtLink>
            <NuxtLink to="/terms" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">Terms</NuxtLink>
            <NuxtLink to="/feeds" class="font-semibold text-gray-700 hover:underline dark:text-gray-200">RSS</NuxtLink>
            <a
              :href="siteConfig.social.xUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold text-gray-700 hover:underline dark:text-gray-200"
            >
              Follow on X
            </a>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            © {{ currentYear }} {{ siteConfig.name }}
          </div>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import { primaryTintCssForUser } from '~/utils/theme-tint'

const { isAuthed, user } = useAuth()
const currentYear = new Date().getUTCFullYear()

const primaryCssVars = computed(() => primaryTintCssForUser(user.value ?? null))
useHead({
  style: [{ key: 'moh-primary-tint', textContent: primaryCssVars }],
})
</script>
