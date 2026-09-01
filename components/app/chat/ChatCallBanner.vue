<template>
  <div
    v-if="call && call.status !== 'ended'"
    class="shrink-0 border-b moh-border bg-emerald-50/70 px-4 py-2 dark:bg-emerald-950/30"
    role="status"
  >
    <div class="flex items-center gap-3">
      <span class="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <div class="flex -space-x-1.5">
          <AppUserAvatar
            v-for="u in participantUsers"
            :key="u.id"
            :user="u"
            size-class="h-6 w-6"
            :show-presence="false"
            :show-status="false"
            :enable-preview="false"
            class="ring-2 ring-white dark:ring-zinc-950 rounded-full"
          />
        </div>
        <div class="min-w-0 truncate text-sm">
          <span class="font-semibold moh-text">{{ call.type === 'video' ? 'Video call' : 'Voice call' }} in progress</span>
          <span class="moh-text-muted"> · {{ participantLabel }} · {{ call.participants.length }}/{{ call.capacity }}</span>
        </div>
      </div>
      <Button
        v-if="viewerInCall && inThisTab"
        size="small"
        severity="secondary"
        rounded
        label="Show call"
        @click="emit('show')"
      />
      <!-- Seated server-side (reload, other device, dropped leave) but not live here: take the seat back. -->
      <Button
        v-else-if="viewerInCall"
        size="small"
        rounded
        label="Rejoin"
        :disabled="busy"
        :loading="busy"
        @click="emit('join', call)"
      >
        <template #icon>
          <Icon :name="call.type === 'video' ? 'tabler:video' : 'tabler:phone'" aria-hidden="true" />
        </template>
      </Button>
      <Button
        v-else-if="isFull"
        size="small"
        severity="secondary"
        rounded
        label="Call full"
        disabled
      />
      <Button
        v-else
        v-tooltip.bottom="joinTooltip"
        size="small"
        rounded
        label="Join"
        :disabled="!canJoinCall || busy"
        :loading="busy"
        @click="emit('join', call)"
      >
        <template #icon>
          <Icon :name="call.type === 'video' ? 'tabler:video' : 'tabler:phone'" aria-hidden="true" />
        </template>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CallSession, MessageConversation, MessageUser } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useCallGating } from '~/composables/calls/useCallGating'
import { useCallSession } from '~/composables/calls/useCallSession'

const props = defineProps<{
  call: CallSession | null
  conversation: MessageConversation | null
  meId: string | null
}>()

const emit = defineEmits<{
  join: [call: CallSession]
  show: []
}>()

const { canJoin } = useCallGating()
const { phase, call: engagedCall, isEngaged } = useCallSession()

const participantUsers = computed<MessageUser[]>(() => {
  const c = props.call
  if (!c || !props.conversation) return []
  const byId = new Map(props.conversation.participants.map((p) => [p.user.id, p.user]))
  return c.participants.map((p) => byId.get(p.userId)).filter((u): u is MessageUser => Boolean(u))
})

const participantLabel = computed(() => {
  const names = participantUsers.value.map((u) => (u.id === props.meId ? 'You' : u.name || u.username || 'Member'))
  if (names.length === 0) return 'Nobody yet'
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
})

const viewerInCall = computed(() => Boolean(props.call && props.meId && props.call.participants.some((p) => p.userId === props.meId)))
const inThisTab = computed(() => Boolean(props.call && engagedCall.value?.id === props.call.id && isEngaged.value))
const isFull = computed(() => Boolean(props.call && props.call.participants.length >= props.call.capacity))
const canJoinCall = computed(() => Boolean(props.call && canJoin(props.call)))
const busy = computed(() => phase.value === 'requesting_media' || phase.value === 'joining')
const joinTooltip = computed(() => (canJoinCall.value ? null : tinyTooltip('Only verified members can join calls.')))
</script>
