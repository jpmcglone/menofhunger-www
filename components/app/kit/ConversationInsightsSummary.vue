<template>
  <div class="space-y-3">
    <template v-if="weekly">
      <p class="text-xs moh-text-muted">{{ range ? `${range} · Private to you` : 'Private to you' }}</p>
      <h3 class="text-sm font-semibold">This week</h3>
      <dl class="grid grid-cols-2 gap-2">
        <div class="rounded-xl border moh-border moh-surface-2 p-3">
          <dd class="text-[22px] font-semibold tabular-nums tracking-tight">{{ number(data.postCount) }}</dd>
          <dt class="mt-1 text-[13px] moh-text-muted">{{ data.postCount === 1 ? 'Post' : 'Posts' }}</dt>
        </div>
        <div class="rounded-xl border moh-border moh-surface-2 p-3">
          <dd class="text-[22px] font-semibold tabular-nums tracking-tight">+{{ number(data.participantCount) }}</dd>
          <dt class="mt-1 text-[13px] moh-text-muted">{{ participantNoun }}</dt>
          <p v-if="data.newParticipantCount" class="mt-1 text-xs moh-text-muted">{{ number(data.newParticipantCount) }} new</p>
        </div>
        <template v-if="data.windowReach">
          <div class="rounded-xl border moh-border moh-surface-2 p-3">
            <dd class="text-[22px] font-semibold tabular-nums tracking-tight">{{ number(data.windowReach.people) }}</dd>
            <dt class="mt-1 text-[13px] moh-text-muted">Unique viewers</dt>
            <p class="mt-1 text-xs moh-text-muted">Last 7 days</p>
          </div>
          <div class="rounded-xl border moh-border moh-surface-2 p-3">
            <dd class="text-[22px] font-semibold tabular-nums tracking-tight">{{ number(data.windowReach.impressions) }}</dd>
            <dt class="mt-1 text-[13px] moh-text-muted">Impressions</dt>
            <p class="mt-1 text-xs moh-text-muted">Last 7 days</p>
          </div>
        </template>
      </dl>
    </template>
    <dl v-else class="grid grid-cols-2 gap-x-3 gap-y-3">
      <div class="min-w-0">
        <dt class="sr-only">{{ participantLabel }}</dt>
        <dd class="flex items-center gap-1.5">
          <AppIconGlyph name="members" :size="16" class="moh-text-muted" />
          <span class="text-xl font-semibold tabular-nums tracking-tight">{{ number(data.participantCount) }}</span>
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
    <p v-if="weekly && data.windowReach?.complete === false" class="text-[11px] moh-text-muted">* View tracking began {{ formatLocaleDate(new Date(data.windowReach.trackedSince)) }}. Earlier views are unavailable.</p>
    <p v-if="!weekly && data.reach?.scope === 'lifetime'" class="text-[11px] moh-text-muted">
      Lifetime totals on these posts. People counted once; guest reach is estimated.
    </p>
  </div>
</template>
<script setup lang="ts">
import { formatLocaleDate } from '~/utils/time-format'
import { formatCount } from '~/utils/number-format'
import type { ConversationInsights } from '~/types/api'
const props = defineProps<{ data: ConversationInsights; weekly: boolean }>()
const number = (value: number) => formatCount(value)
const participantNoun = computed(() => props.data.participantCount === 1 ? 'Participant' : 'Participants')
const participantLabel = computed(() => {
  const n = props.data.newParticipantCount
  const label = 'Participants'
  return n ? `${label}, ${n} new` : label
})
const range = computed(() => {
  const start = formatDay(props.data.from)
  const end = formatDay(props.data.to)
  return start && end ? `${start}–${end}` : ''
})
function formatDay(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(date)
}
</script>
