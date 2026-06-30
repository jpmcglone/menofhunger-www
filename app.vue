<template>
  <div>
    <!-- Keep SSR/client first paint stable: loading bar tint can update after hydration via CSS vars. -->
    <NuxtLoadingIndicator color="var(--p-primary-color)" :height="4" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// Intentionally do not compute loading indicator color from authed user:
// it creates hydration mismatches when SSR can't know the viewer yet.

import { siteConfig } from '~/config/site'

// Smart App Banner — prompts iOS Safari users to open in the native app.
// Reactive (not static in nuxt.config.ts) so `app-argument` always carries the
// current path, letting the banner deep-link into the right screen via Universal Links
// instead of just opening the App Store root.
const config = useRuntimeConfig()
const route = useRoute()
const iosAppStoreId = config.public.iosAppStoreId as string
if (iosAppStoreId) {
  const appArgument = computed(() => `${siteConfig.url}${route.fullPath}`)
  useHead({
    meta: [
      {
        key: 'moh-apple-itunes-app',
        name: 'apple-itunes-app',
        content: computed(() => `app-id=${iosAppStoreId}, app-argument=${appArgument.value}`),
      },
    ],
  })
}
</script>
