<template>
  <span class="relative inline-flex shrink-0 items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <span v-if="channel.icon" class="leading-none" :style="{ fontSize: `${size - 2}px` }" aria-hidden="true">{{ channel.icon }}</span>
    <AppChannelsGlyph v-else kind="hash" :size="size" />
    <Icon v-if="channel.privacy === 'private'" name="tabler:lock-filled" class="absolute -bottom-0.5 -right-1 size-2.5 rounded-full bg-[var(--moh-bg)]" aria-label="Private" />
  </span>
</template>
<script setup lang="ts">
import type { GroupChannel } from '~/types/api'
withDefaults(defineProps<{ channel: Pick<GroupChannel, 'icon' | 'privacy'>; size?: number }>(), { size: 20 })
</script>
