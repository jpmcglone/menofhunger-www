<template>
  <a
    :href="account.url"
    target="_blank"
    rel="noopener noreferrer nofollow"
    class="flex min-h-[56px] items-center gap-3 rounded-2xl border moh-border bg-[var(--moh-surface)] px-4 py-3 transition-colors hover:bg-[var(--moh-surface-hover)]"
  >
    <span class="flex size-8 shrink-0 items-center justify-center text-gray-900 dark:text-gray-50">
      <AppLinksBrandGlyph :icon="account.network" size-class="size-6" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-[15px] font-semibold text-gray-900 dark:text-gray-50">@{{ account.handle }}</span>
      <span class="block truncate text-sm moh-text-muted">{{ caption }}</span>
    </span>
    <!-- Neutral check on purpose: the blue badge means identity verification, not "linked". -->
    <span class="inline-flex shrink-0 items-center gap-1 text-sm moh-text-muted">
      <Icon name="tabler:check" class="size-4" aria-hidden="true" />
      Connected
    </span>
  </a>
</template>

<script setup lang="ts">
import type { ConnectedAccount } from '~/types/api'
import { CONNECTED_NETWORK_LABELS, followerCountLabel } from '~/utils/profile-link-icons'

const props = defineProps<{ account: ConnectedAccount }>()

const caption = computed(() => {
  const label = CONNECTED_NETWORK_LABELS[props.account.network] ?? props.account.network
  return typeof props.account.followerCount === 'number'
    ? `${label} · ${followerCountLabel(props.account.followerCount)}`
    : label
})
</script>
