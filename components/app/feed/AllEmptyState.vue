<template>
  <div
    class="mx-4 mt-4 rounded-xl border moh-border moh-surface p-4 flex items-start gap-3.5"
    role="status"
  >
    <!-- Icon tile -->
    <div class="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800 mt-0.5">
      <Icon name="tabler:users" class="text-lg moh-text-muted" aria-hidden="true" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="font-semibold moh-text">{{ VOICE.feed.emptyTitle }}</div>
      <div class="mt-0.5 text-sm moh-text-muted leading-snug">
        <slot>{{ VOICE.feed.emptyBody }}</slot>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <Button
          as="NuxtLink"
          to="/explore"
          size="small"
          :label="VOICE.actions.explore"
          severity="secondary"
          rounded
        />
        <Button
          as="NuxtLink"
          to="/who-to-follow"
          size="small"
          :label="VOICE.actions.findPeople"
          severity="secondary"
          rounded
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VOICE } from '~/config/voice'
</script>
