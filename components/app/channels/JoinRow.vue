<template>
  <article class="channel-join flex items-start gap-3 px-4 py-2" :aria-label="`${name} joined the group`">
    <span class="w-8 shrink-0 text-[15px] font-semibold leading-snug moh-text-soft" aria-hidden="true">→</span>
    <div class="min-w-0 flex-1">
      <p class="flex flex-wrap items-baseline gap-x-1.5 text-[15px] leading-snug">
        <NuxtLink v-if="message.sender.username" :to="`/u/${message.sender.username}`" class="font-semibold hover:underline">{{ name }}</NuxtLink>
        <strong v-else>{{ name }}</strong>
        <span class="moh-text-muted">joined the group</span>
        <time class="text-xs moh-text-soft" :datetime="message.createdAt">{{ time }}</time>
      </p>
      <button v-if="message.joinWelcome?.canWelcome" type="button" class="moh-focus relative mt-2 inline-flex h-9 items-center gap-2 rounded-[10px] border moh-border bg-[var(--moh-surface-1)] px-3 text-[13px] font-semibold after:absolute after:-inset-y-1 after:inset-x-0 hover:bg-[var(--moh-surface-2)] disabled:opacity-60" :disabled="busy" :aria-label="`Welcome ${first}`" data-testid="channel-welcome" @click="emit('welcome')"><span aria-hidden="true">🤝</span>Welcome {{ first }}</button>
    </div>
  </article>
</template>
<script setup lang="ts">
import type { ChannelMessage } from '~/types/api'
import { welcomeFirstName } from '~/utils/channels/join-row'
import { formatClockTime } from '~/utils/time-format'
const props = defineProps<{ message: ChannelMessage; busy?: boolean }>()
const emit = defineEmits<{ welcome: [] }>()
const name = computed(() => props.message.sender.name?.trim() || props.message.sender.username || 'A new member')
const first = computed(() => welcomeFirstName(props.message.sender))
const time = computed(() => formatClockTime(props.message.createdAt))
</script>
