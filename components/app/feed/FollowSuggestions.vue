<template>
  <div class="w-full text-left">
    <div v-if="loading && users.length === 0" class="flex justify-center py-4">
      <AppLogoLoader compact />
    </div>
    <div v-else-if="users.length > 0">
      <AppWhoToFollowCompactRow v-for="u in users.slice(0, 3)" :key="u.id" :user="u" @followed="() => removeUserById(u.id)" />
    </div>
    <NuxtLink to="/who-to-follow" class="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium hover:underline underline-offset-2 moh-text-muted">
      {{ VOICE.actions.seeAllSuggestions }} suggestions
      <Icon name="tabler:arrow-right" class="text-xs" aria-hidden="true" />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { VOICE } from '~/config/voice'

const { users, loading, removeUserById } = useWhoToFollow({ defaultLimit: 3 })
</script>
