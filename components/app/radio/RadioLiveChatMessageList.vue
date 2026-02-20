<template>
  <div class="space-y-1 px-3 py-2">
    <RadioLiveChatMessageRow
      v-for="m in messages"
      :key="m.id"
      :message="m"
    />
  </div>
</template>

<script setup lang="ts">
import type { SpaceChatMessage } from '~/types/api'
import RadioLiveChatMessageRow from '~/components/app/radio/RadioLiveChatMessageRow.vue'

defineProps<{
  messages: SpaceChatMessage[]
}>()
</script>

