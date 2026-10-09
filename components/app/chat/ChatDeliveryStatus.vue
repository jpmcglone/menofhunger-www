<template>
  <span
    v-if="sending"
    class="inline-block h-[10px] w-[10px] rounded-full border border-current border-t-transparent opacity-70 animate-spin"
    aria-label="Sending"
  />
  <Icon
    v-else-if="latest"
    :name="read ? 'tabler:checks' : 'tabler:circle-check'"
    size="10"
    :class="['translate-y-[0.5px]', read ? 'text-blue-400 opacity-90' : 'opacity-60']"
    :aria-label="read ? 'Read' : 'Sent'"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
/** Delivery marker on my own messages: spinner while sending, check once sent or read (latest message only). */
defineProps<{ sending: boolean; latest: boolean; read: boolean }>()
</script>
