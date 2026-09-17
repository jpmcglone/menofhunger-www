<template>
  <div class="space-y-2">
    <dl class="grid grid-cols-2 gap-x-3 gap-y-3">
      <div v-if="weekly" class="min-w-0">
        <dt class="sr-only">Posts</dt>
        <dd class="flex items-center gap-1.5">
          <AppIconGlyph name="write" :size="16" class="moh-text-muted" />
          <span class="text-xl font-semibold tabular-nums tracking-tight">{{ number(data.postCount) }}</span>
        </dd>
        <p class="mt-0.5 text-[11px] moh-text-muted">Posts</p>
      </div>
      <div class="min-w-0">
        <dt class="sr-only">{{ participantLabel }}</dt>
        <dd class="flex items-center gap-1.5">
          <AppIconGlyph name="members" :size="16" class="moh-text-muted" />
          <span class="text-xl font-semibold tabular-nums tracking-tight">{{ weekly ? '+' : '' }}{{ number(data.participantCount) }}</span>
        </dd>
        <p class="mt-0.5 text-[11px] moh-text-muted">
          Participants<span v-if="data.newParticipantCount"> · {{ number(data.newParticipantCount) }} new</span>
        </p>
      </div>
      <template v-if="data.reach?.scope === 'lifetime'">
        <div class="min-w-0">
          <dt class="sr-only">People reached</dt>
          <dd class="flex items-center gap-1.5">
            <AppIconGlyph name="profile" :size="16" class="moh-text-muted" />
            <span class="text-xl font-semibold tabular-nums tracking-tight">{{ number(data.reach.people) }}</span>
          </dd>
          <p class="mt-0.5 text-[11px] moh-text-muted">Reached</p>
        </div>
        <div class="min-w-0">
          <dt class="sr-only">Impressions</dt>
          <dd class="flex items-center gap-1.5">
            <AppIconGlyph name="visibility" :size="16" class="moh-text-muted" />
            <span class="text-xl font-semibold tabular-nums tracking-tight">{{ number(data.reach.impressions) }}</span>
          </dd>
          <p class="mt-0.5 text-[11px] moh-text-muted">Impressions</p>
        </div>
      </template>
    </dl>
    <p v-if="weekly" class="text-[11px] moh-text-muted">Other people who replied, boosted or reposted. You are excluded.</p>
    <p v-if="data.reach?.scope === 'lifetime'" class="text-[11px] moh-text-muted">
      Lifetime totals on these posts. People counted once; guest reach is estimated.
    </p>
  </div>
</template>
<script setup lang="ts">
import type { ConversationInsights } from '~/types/api'
const props = defineProps<{ data: ConversationInsights; weekly: boolean }>()
const number = (value: number) => value.toLocaleString('en-US')
const participantLabel = computed(() => {
  const n = props.data.newParticipantCount
  const label = props.weekly ? 'Other participants, excluding you' : 'Participants'
  return n ? `${label}, ${n} new` : label
})
</script>
