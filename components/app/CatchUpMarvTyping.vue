<template>
  <div class="flex items-start gap-2.5" aria-live="polite">
    <AppUserAvatar
      v-if="marvUser"
      :user="marvUser"
      size-class="h-7 w-7"
      :show-presence="false"
      :show-status="false"
    />
    <AppMarvMark v-else :size="28" loading />
    <div class="min-w-0 flex flex-col items-start gap-1.5">
      <p class="text-xs font-medium moh-text-muted">{{ marvName }}</p>
      <div class="inline-flex items-center gap-1.5 rounded-[18px] border border-gray-200 px-3.5 py-3 dark:border-zinc-600">
        <span class="flex items-center gap-1" aria-hidden="true">
          <span class="h-1.5 w-1.5 rounded-full bg-current opacity-35" />
          <span class="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
          <span class="h-1.5 w-1.5 rounded-full bg-current opacity-85" />
        </span>
      </div>
      <p class="text-[11px] moh-text-muted">{{ label }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AvatarVideoDto } from '~/types/api-contracts.gen'

withDefaults(
  defineProps<{
    marvName: string
    label?: string
    marvUser?: {
      id: string
      username: string
      name: string
      avatarUrl?: string | null
      avatarVideo?: AvatarVideoDto | null
    } | null
  }>(),
  { label: 'Writing…', marvUser: null },
)
</script>
