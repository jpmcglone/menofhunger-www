<template>
  <ClientOnly>
    <div
      v-if="!didAttempt && route.meta.layout === 'app'"
      class="account-boot fixed inset-0 z-[200]"
      role="status"
      aria-live="polite"
      :aria-label="accessibilityLabel"
    >
      <div class="pointer-events-none absolute inset-0 overflow-hidden moh-text-muted" aria-hidden="true">
        <div class="mx-auto flex max-w-xl flex-col px-6 pt-14">
          <div v-for="row in 4" :key="row" class="flex items-start gap-3 py-3">
            <div class="h-10 w-10 shrink-0 rounded-full bg-current opacity-45" />
            <div class="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <div class="h-2.5 rounded bg-current opacity-45" />
              <div class="h-2.5 w-40 rounded bg-current opacity-45" />
            </div>
          </div>
        </div>
      </div>
      <div class="account-boot-frost absolute inset-0" aria-hidden="true" />
      <div class="relative flex h-full flex-col items-center justify-center gap-4 p-6">
        <AppAvatarCircle
          v-if="preview"
          :src="preview.avatarUrl"
          :name="preview.name"
          size-class="h-28 w-28"
          :round-class="avatarRoundClass(preview.isOrganization)"
          :is-organization="preview.isOrganization"
          :show-presence="false"
        />
        <AppLogo
          v-else
          :alt="siteConfig.name"
          :width="72"
          :height="72"
          wrapper-class="inline-flex"
          img-class="h-[72px] w-[72px]"
        />
        <p class="text-center text-sm moh-text-muted">{{ statusText }}</p>
        <AppIconGlyph name="refresh" :size="24" class="moh-text-muted motion-safe:animate-spin" aria-hidden="true" />
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
// Figma: YnuRSJB7p90n9jEY4mb4RN / 735:87. Same surface as switching into an account.
import { siteConfig } from '~/config/site'
import { avatarRoundClass } from '~/utils/avatar-rounding'
import { loadSessionIdentity } from '~/utils/session-identity-preview'

const { didAttempt } = useAuth()
const route = useRoute()
const preview = loadSessionIdentity()
const statusText = preview ? `Loading ${preview.label}…` : 'Loading your account…'
const accessibilityLabel = preview ? `Loading ${preview.label}` : 'Loading your account'
</script>

<style scoped>
.account-boot {
  background: var(--moh-bg);
}
.account-boot-frost {
  background: color-mix(in srgb, var(--moh-bg) 38%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
</style>
