<template>
  <div class="min-h-screen flex flex-col moh-bg moh-texture moh-text">
    <main class="flex-1 flex items-center justify-center">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import { primaryTintCssForUser } from '~/utils/theme-tint'

// Ensure PrimeVue tint matches auth status even on "empty" pages (e.g. Login).
const { user } = useAuth()
const primaryCssVars = computed(() => primaryTintCssForUser(user.value ?? null))
useHead({
  style: [{ key: 'moh-primary-tint', textContent: primaryCssVars }],
})
</script>