<template>
  <ClientOnly>
    <div
      v-if="!didAttempt"
      class="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 moh-bg moh-texture"
      role="status"
      aria-live="polite"
      aria-label="Loading your account"
    >
      <AppLogo
        :alt="siteConfig.name"
        :width="72"
        :height="72"
        wrapper-class="inline-flex"
        img-class="h-[72px] w-[72px]"
      />
      <p class="text-sm moh-text-muted">Loading your account…</p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'

const { didAttempt } = useAuth()
</script>
