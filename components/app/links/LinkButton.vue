<template>
  <a
    :href="link.url"
    target="_blank"
    rel="noopener noreferrer nofollow"
    class="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border moh-border bg-[var(--moh-surface)] px-4 py-3 transition-colors hover:bg-[var(--moh-surface-hover)]"
  >
    <span class="flex size-6 shrink-0 items-center justify-center text-gray-700 dark:text-gray-200">
      <AppLinksBrandGlyph :icon="link.icon" size-class="size-5" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-[15px] font-semibold text-gray-900 dark:text-gray-50">{{ link.title || link.host }}</span>
    </span>
    <Icon name="tabler:external-link" class="size-[18px] shrink-0 moh-text-muted" aria-hidden="true" />
    <span class="sr-only">(opens in a new tab)</span>
  </a>
</template>

<script setup lang="ts">
import type { ProfileLink } from '~/types/api'

defineProps<{ link: ProfileLink }>()
</script>
