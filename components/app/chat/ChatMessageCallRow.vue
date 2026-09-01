<template>
  <div class="flex w-full justify-center py-1" :data-message-id="message.id">
    <div
      class="flex max-w-[90%] items-center gap-2.5 rounded-full border px-3 py-1.5 text-xs"
      :class="isLive
        ? 'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
        : 'moh-border bg-gray-50 text-gray-600 dark:bg-zinc-900 dark:text-gray-300'"
    >
      <Icon :name="iconName" size="14" class="shrink-0" :class="isMissed ? 'text-red-500' : ''" aria-hidden="true" />
      <span class="min-w-0 truncate">
        <!-- Explicit `{{ ' ' }}`: Vue's whitespace condensing drops a leading space inside a span. -->
        <template v-if="label.lead"><span class="font-semibold">{{ label.lead }}</span>{{ ' ' }}</template>{{ label.rest }}
        <time class="ml-1.5 tabular-nums opacity-70" :datetime="message.createdAt" :title="formatMessageTimeFull(message.createdAt)">
          {{ formatMessageTime(message.createdAt) }}
        </time>
      </span>
      <Button
        v-if="isLive && showJoin"
        size="small"
        rounded
        :label="joinLabel"
        :disabled="!canJoinThis || busy"
        :loading="busy"
        class="!h-6 !px-2.5 !text-xs"
        @click="joinCall({ id: call.callId, type: call.type })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message, MessageCall } from '~/types/api'
import { useChatActiveCall } from '~/composables/chat/useChatActiveCall'
import { useCallGating } from '~/composables/calls/useCallGating'
import { useCallSession } from '~/composables/calls/useCallSession'

const props = defineProps<{
  message: Message & { call: MessageCall }
  meId: string | null
  formatMessageTime: (iso: string) => string
  formatMessageTimeFull: (iso: string) => string
}>()

const { canJoin } = useCallGating()
const { phase, call: engagedCall, isEngaged, joinCall } = useCallSession()
/** The conversation's live call (provided by the chat page); hides Join once it's full or gone. */
const activeCall = useChatActiveCall()

const call = computed(() => props.message.call)
/** The row's sender is always the caller, so `isMine` means "the viewer placed this call". */
const isMine = computed(() => props.message.sender.id === props.meId)
const senderLabel = computed(() => (isMine.value ? 'You' : props.message.sender.name || props.message.sender.username || 'Someone'))
const isLive = computed(() => {
  const o = call.value.outcome
  if (o !== 'started' && o !== 'active') return false
  // The row says live but the conversation has a different live session (or none): trust the session.
  return activeCall.value?.id === call.value.callId
})
const isMissed = computed(() => call.value.outcome === 'missed' || call.value.outcome === 'declined')

const typeLabel = computed(() => (call.value.type === 'video' ? 'video call' : 'voice call'))
const typeTitle = computed(() => (call.value.type === 'video' ? 'Video call' : 'Voice call'))

/**
 * Perspective-aware copy. `missed` / `declined` / `cancelled` only happen on direct calls and
 * describe what the *callee* did (or didn't do), so the bold lead is the actor, not the sender.
 */
const label = computed<{ lead: string | null; rest: string }>(() => {
  const c = call.value
  switch (c.outcome) {
    case 'started':
    case 'active':
      return { lead: senderLabel.value, rest: `started a ${typeLabel.value}` }
    case 'ended':
      return {
        lead: null,
        rest: c.durationSeconds != null ? `${typeTitle.value} · ${formatDuration(c.durationSeconds)}` : `${typeTitle.value} ended`,
      }
    case 'missed':
      return isMine.value
        ? { lead: null, rest: `${typeTitle.value} · no answer` }
        : { lead: null, rest: `Missed ${typeLabel.value} from ${senderLabel.value}` }
    case 'declined':
      return isMine.value
        ? { lead: null, rest: `${typeTitle.value} declined` }
        : { lead: 'You', rest: `declined the ${typeLabel.value}` }
    case 'cancelled':
      return { lead: senderLabel.value, rest: `cancelled the ${typeLabel.value}` }
  }
  return { lead: null, rest: props.message.body }
})

const iconName = computed(() => {
  const c = call.value
  if (c.outcome === 'missed' || c.outcome === 'declined') return c.type === 'video' ? 'tabler:video-off' : 'tabler:phone-x'
  return c.type === 'video' ? 'tabler:video' : 'tabler:phone'
})

const viewerInCall = computed(() => Boolean(props.meId && activeCall.value?.participants.some((p) => p.userId === props.meId)))
const inThisTab = computed(() => engagedCall.value?.id === call.value.callId && isEngaged.value)
const isFull = computed(() => Boolean(activeCall.value && activeCall.value.participants.length >= activeCall.value.capacity))
/** Hide only when this tab is live in the call; a seat held elsewhere still gets "Rejoin". */
const showJoin = computed(() => !inThisTab.value)
const canJoinThis = computed(() => viewerInCall.value || (!isFull.value && (activeCall.value ? canJoin(activeCall.value) : true)))
const busy = computed(() => phase.value === 'requesting_media' || phase.value === 'joining')
const joinLabel = computed(() => (viewerInCall.value ? 'Rejoin' : isFull.value ? 'Full' : 'Join'))

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h} hr ${rem} min` : `${h} hr`
}
</script>
