<template>
  <CheckinClosedNotice v-if="!isOpen" />
  <!-- Streak-intact state: user has already checked in today -->
  <div v-else-if="hasCheckedInToday" class="px-3 pb-3 pt-2 sm:px-4">
    <NuxtLink
      to="/leaderboard"
      class="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 hover:opacity-90 transition-opacity"
      style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.3)"
    >
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style="background-color: rgba(var(--moh-checkin-rgb), 0.18)"
      >
        <Icon name="tabler:check" class="text-sm text-[var(--moh-checkin)]" aria-hidden="true" />
      </div>
      <div class="flex-1 min-w-0">
        <span class="text-sm font-semibold moh-text">Check-in answered</span>
        <span v-if="streak > 0" class="ml-1.5 text-sm moh-text-muted">· Day {{ streak }}</span>
      </div>
      <Icon name="tabler:chevron-right" class="text-xs moh-text-muted shrink-0" aria-hidden="true" />
    </NuxtLink>
  </div>

  <!-- Prompt state: user hasn't checked in today -->
  <div v-else class="px-3 pb-3 pt-2 sm:px-4">
    <button
      type="button"
      class="block w-full rounded-xl border text-left transition-opacity hover:opacity-90 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moh-checkin)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--moh-bg)] dark:focus-visible:ring-offset-zinc-950"
      style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.3)"
      @click="$emit('check-in')"
    >
      <div class="space-y-3 p-4">
        <AppCheckinPromptContext :prompt="prompt" metadata="Open until midnight ET · New prompt daily at 5pm ET" />
        <p class="text-xs moh-text-muted">
          <template v-if="streak > 0">Answer to keep your {{ streak }}-day streak alive.</template>
          <template v-else>Answer today's check-in prompt to start your streak.</template>
        </p>
        <span class="inline-flex min-h-11 items-center rounded-full bg-[var(--moh-checkin)] px-5 text-sm font-semibold text-white">Answer</span>
      </div>
    </button>

    <AppInlineAlert v-if="error" class="mt-2" severity="danger">
      {{ error }}
    </AppInlineAlert>
  </div>
</template>

<script setup lang="ts">
import AppCheckinPromptContext from '~/components/app/CheckinPromptContext.vue'
import CheckinClosedNotice from './CheckinClosedNotice.vue'
const { isOpen } = useCheckinWindow()
defineProps<{
  prompt: string
  streak: number
  hasCheckedInToday?: boolean
  error?: string | null
}>()

defineEmits<{
  (e: 'check-in'): void
}>()
</script>
