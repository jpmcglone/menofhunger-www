<template>
  <!-- Figma: YnuRSJB7p90n9jEY4mb4RN / 694:600 -->
  <div class="space-y-3">
    <dl class="grid grid-cols-2 gap-4">
      <div v-if="weekly" class="min-w-0">
        <dd class="text-[28px] leading-9 font-semibold tabular-nums tracking-tight break-words">{{ number(data.postCount) }}</dd>
        <dt class="mt-1 text-xs moh-text-muted">Posts published</dt>
      </div>
      <div class="min-w-0">
        <dd class="text-[28px] leading-9 font-semibold tabular-nums tracking-tight break-words">{{ number(data.participantCount) }}</dd>
        <dt class="mt-1 text-xs moh-text-muted">Participants<span v-if="data.newParticipantCount"> · {{ number(data.newParticipantCount) }} new</span></dt>
      </div>
    </dl>
    <p class="text-xs moh-text-muted">Unique people who replied, boosted or reposted.</p>
    <template v-if="data.reach?.scope === 'lifetime'">
      <h3 class="pt-1 text-xs font-semibold moh-text-muted">TOTAL REACH · {{ data.posts.length }} {{ data.posts.length === 1 ? 'RECAP POST' : 'RECAP POSTS' }}</h3>
      <dl class="grid grid-cols-2 gap-4">
        <div class="min-w-0">
          <dd class="text-[28px] leading-9 font-semibold tabular-nums tracking-tight break-words">{{ number(data.reach.people) }}</dd>
          <dt class="mt-1 text-xs moh-text-muted">People reached</dt>
        </div>
        <div class="min-w-0">
          <dd class="text-[28px] leading-9 font-semibold tabular-nums tracking-tight break-words">{{ number(data.reach.impressions) }}</dd>
          <dt class="mt-1 text-xs moh-text-muted">Impressions</dt>
        </div>
      </dl>
      <p class="text-xs moh-text-muted">Lifetime totals on these posts. People counted once; guest reach is estimated by browser.</p>
    </template>
  </div>
</template>
<script setup lang="ts">
import type { ConversationInsights } from '~/types/api'
defineProps<{ data: ConversationInsights; weekly: boolean }>()
const number = (value: number) => value.toLocaleString('en-US')
</script>
