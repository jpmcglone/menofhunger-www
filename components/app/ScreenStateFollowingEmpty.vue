<template>
  <div class="px-3 sm:px-4 mt-4 space-y-3" role="status">
    <div class="rounded-xl border moh-border moh-surface p-4">
      <div class="text-sm font-semibold moh-text mb-3">{{ VOICE.feed.followingEmptyHeading }}</div>
      <AppFeedFollowSuggestions />
    </div>

    <div v-if="showCheckinCta" class="rounded-xl border px-4 py-3" style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.3)">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style="background-color: rgba(var(--moh-checkin-rgb), 0.18)">
          <Icon name="tabler:calendar-check" class="text-sm" aria-hidden="true" style="color: var(--moh-checkin)" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold moh-text">{{ VOICE.feed.checkinHeading }}</div>
          <div class="text-xs moh-text-muted mt-0.5">{{ VOICE.feed.checkinBody }}</div>
        </div>
        <Button
          label="Check in"
          size="small"
          rounded
          class="shrink-0 !h-8 !min-h-8 !px-3 !py-0 !text-xs !leading-none whitespace-nowrap moh-btn-scope moh-btn-tone"
          @click="emit('check-in')"
        />
      </div>
    </div>

    <div v-if="isVerified" class="rounded-xl border moh-border moh-surface p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800">
          <Icon name="tabler:pencil" class="text-sm moh-text-muted" aria-hidden="true" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold moh-text">{{ VOICE.feed.postHeading }}</div>
          <div class="text-xs moh-text-muted mt-0.5">{{ VOICE.feed.postBody }}</div>
        </div>
        <Button
          :label="VOICE.actions.post"
          size="small"
          severity="secondary"
          rounded
          class="shrink-0 !h-8 !min-h-8 !px-3 !py-0 !text-xs !leading-none whitespace-nowrap"
          @click="emit('post')"
        />
      </div>
    </div>

    <div v-else class="rounded-xl border moh-border moh-surface p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800">
          <Icon name="tabler:shield-check" class="text-sm moh-text-muted" aria-hidden="true" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold moh-text">{{ VOICE.feed.verifyHeading }}</div>
          <div class="text-xs moh-text-muted mt-0.5">{{ VOICE.feed.verifyBody }}</div>
        </div>
        <Button
          as="NuxtLink"
          to="/verification"
          :label="VOICE.actions.verify"
          size="small"
          rounded
          class="shrink-0 !h-8 !min-h-8 !px-3 !py-0 !text-xs !leading-none whitespace-nowrap"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VOICE } from '~/config/voice'

defineProps<{ showCheckinCta?: boolean }>()
const emit = defineEmits<{ post: []; 'check-in': [] }>()
const { isVerified } = useAuth()
</script>
