<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3">
      <a
        v-if="iosAppLink.isConfigured"
        :href="iosAppLink.url"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200"
        @click="iosAppLink.trackClick('settings')"
      >
        <AppIconGlyph name="platformIOS" :size="20" class="text-[var(--moh-text-muted)]" />
        <span class="font-medium">Get the app</span>
      </a>
      <NuxtLink to="/about" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
        <AppIconGlyph name="help" :size="20" class="text-[var(--moh-text-muted)]" />
        <span class="font-medium">About</span>
      </NuxtLink>
      <NuxtLink to="/privacy" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
        <AppIconGlyph name="private" :size="20" class="text-[var(--moh-text-muted)]" />
        <span class="font-medium">Privacy</span>
      </NuxtLink>
      <NuxtLink to="/terms" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
        <AppIconGlyph name="article" :size="20" class="text-[var(--moh-text-muted)]" />
        <span class="font-medium">Terms</span>
      </NuxtLink>
      <NuxtLink to="/feedback" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
        <AppIconGlyph name="messages" :size="20" class="text-[var(--moh-text-muted)]" />
        <span class="font-medium">Send feedback</span>
      </NuxtLink>
      <button
        type="button"
        class="inline-flex items-center gap-3 text-left text-gray-800 hover:underline dark:text-gray-200"
        @click="requestLogout"
      >
        <AppIconGlyph name="logout" :size="20" class="text-[var(--moh-text-muted)]" />
        <span class="font-medium">Log out</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { requestLogout } = useUserMenu()
const iosAppLink = useIosAppLink()
</script>

