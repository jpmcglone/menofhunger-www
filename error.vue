<template>
  <main class="min-h-dvh flex moh-bg moh-texture">
    <AppScreenState
      :title="is404 ? 'Page not found' : 'Something went wrong'"
      :icon="is404 ? 'search' : 'warning'" prominent
      :description="is404 ? 'This page may have moved or is no longer available.' : getSafeUserErrorMessage(props.error, 'We couldn’t load this page. Please try again.')"
      :action-label="is404 ? 'Go home' : 'Try again'" :action-to="is404 ? '/' : undefined"
      @action="handleTryAgain"
    >
      <template #actions>
        <NuxtLink v-if="!is404" to="/" class="inline-flex items-center text-sm font-medium moh-text-muted">Go home</NuxtLink>
        <NuxtLink to="/status" class="inline-flex items-center text-sm font-medium moh-text-muted">Check status</NuxtLink>
      </template>
    </AppScreenState>
  </main>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import { getSafeUserErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  error: { statusCode?: number; message?: string } | null
}>()

const is404 = computed(() => props.error?.statusCode === 404)

// SEO: clear title + noindex so 404/error pages don't get indexed
const pageTitle = computed(() =>
  props.error?.statusCode === 404 ? 'Page not found' : 'Something went wrong'
)
useHead({
  title: () => `${pageTitle.value} | ${siteConfig.name}`,
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'description', content: is404.value ? 'The page you’re looking for doesn’t exist or was moved.' : 'An unexpected error occurred.' },
  ],
})

function handleTryAgain() {
  clearError({ redirect: '/' })
}
</script>
