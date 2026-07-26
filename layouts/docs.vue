<template>
  <div class="min-h-screen moh-bg moh-text">
    <header class="sticky top-0 z-20 border-b moh-border moh-frosted backdrop-blur">
      <div class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-5">
        <NuxtLink to="/api" class="flex items-center gap-2.5">
          <AppLogo
            :alt="siteConfig.name"
            :width="28"
            :height="28"
            img-class="h-7 w-7 rounded"
          />
          <span class="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            {{ siteConfig.name }}
            <span class="font-normal text-gray-400 dark:text-zinc-500">API</span>
          </span>
        </NuxtLink>
        <NuxtLink
          to="/"
          class="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          {{ host }}
        </NuxtLink>
      </div>

      <!-- Mobile nav. CSS-only responsive swap with the sidebar below. -->
      <nav
        aria-label="API docs"
        class="flex gap-1 overflow-x-auto border-t moh-border px-4 py-2 lg:hidden"
      >
        <NuxtLink
          v-for="item in API_DOCS_NAV"
          :key="item.to"
          :to="item.to"
          class="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          :class="isActive(item.to)
            ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50'"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </header>

    <div class="mx-auto flex w-full max-w-5xl gap-12 px-5">
      <aside class="hidden w-40 shrink-0 lg:block">
        <nav aria-label="API docs" class="sticky top-24 space-y-0.5 py-12">
          <NuxtLink
            v-for="item in API_DOCS_NAV"
            :key="item.to"
            :to="item.to"
            class="block rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
            :class="isActive(item.to)
              ? 'bg-gray-100 text-gray-900 dark:bg-zinc-900 dark:text-gray-50'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50'"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </aside>

      <main class="min-w-0 flex-1 py-10 pb-24">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { API_DOCS_NAV } from '~/config/api-docs'
import { siteConfig } from '~/config/site'

const { host } = useRequestURL()
const route = useRoute()

function isActive(to: string) {
  return route.path === to
}
</script>
