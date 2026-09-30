<template>
  <AppScreenState
    :title="VOICE.feed.emptyTitle" icon="inbox" :action-label="VOICE.actions.explore" action-to="/explore">
    <slot>{{ VOICE.feed.emptyBody }}</slot>
    <template #actions>
      <NuxtLink to="/who-to-follow" class="inline-flex items-center text-sm font-medium moh-text-muted">{{ VOICE.actions.findPeople }}</NuxtLink>
    </template>
  </AppScreenState>
</template>

<script setup lang="ts">
import { VOICE } from '~/config/voice'
</script>
