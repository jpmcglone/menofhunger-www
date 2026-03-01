<template>
  <Dialog
    v-model:visible="visible"
    modal
    :closable="true"
    :header="undefined"
    :style="{ width: '22rem', maxWidth: '94vw' }"
    :pt="{
      root: { class: 'moh-card rounded-2xl overflow-hidden' },
      header: { class: 'hidden' },
      content: { class: 'p-0' },
    }"
  >
    <div class="p-4 space-y-3">
      <!-- Sent by -->
      <div>
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide moh-text-muted">Sent by</div>
        <div class="flex items-center gap-3 rounded-xl moh-surface-2 px-3 py-2.5">
          <AppUserAvatar :user="senderForAvatar" size-class="h-9 w-9 shrink-0" />
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold">
              {{ message?.sender.name || message?.sender.username }}
            </div>
            <div v-if="message?.sender.username" class="truncate text-xs moh-text-muted">
              @{{ message.sender.username }}
            </div>
          </div>
        </div>
      </div>

      <!-- Sent at -->
      <div>
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide moh-text-muted">Sent</div>
        <div class="flex items-center gap-3 rounded-xl moh-surface-2 px-3 py-2.5">
          <Icon name="tabler:arrow-up-circle" class="shrink-0 text-lg moh-text-muted" aria-hidden="true" />
          <span class="text-sm">{{ formattedSentAt }}</span>
        </div>
      </div>

      <!-- Read by -->
      <div v-if="readReceipts.length">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide moh-text-muted">Read by</div>
        <div class="space-y-1">
          <div
            v-for="receipt in readReceipts"
            :key="receipt.userId"
            class="flex items-center gap-3 rounded-xl moh-surface-2 px-3 py-2.5"
          >
            <AppUserAvatar :user="receipt.user" size-class="h-6 w-6 shrink-0" />
            <div class="min-w-0 flex-1">
              <span class="truncate text-sm">{{ receipt.user.name || receipt.user.username || 'Unknown' }}</span>
            </div>
            <span class="shrink-0 text-xs moh-text-muted">{{ receipt.readAt }}</span>
          </div>
        </div>
      </div>

      <!-- Reactions -->
      <div v-if="message?.reactions?.length">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide moh-text-muted">Reactions</div>
        <div class="space-y-1">
          <div
            v-for="group in message.reactions"
            :key="group.reactionId"
            class="flex items-center gap-3 rounded-xl moh-surface-2 px-3 py-2.5"
          >
            <span class="text-lg">{{ group.emoji }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap gap-1">
                <span v-for="reactor in group.reactors" :key="reactor.id" class="text-sm truncate">
                  {{ reactor.username || reactor.id }}
                </span>
              </div>
            </div>
            <span class="shrink-0 text-xs font-semibold moh-text-muted">{{ group.count }}</span>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { Message, MessageParticipant } from '~/types/api'

const props = defineProps<{
  modelValue: boolean
  message: Message | null
  participants: MessageParticipant[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const senderForAvatar = computed(() => {
  if (!props.message?.sender) return null
  return {
    id: props.message.sender.id,
    username: props.message.sender.username,
    name: props.message.sender.name,
    avatarUrl: props.message.sender.avatarUrl,
    premium: props.message.sender.premium,
    premiumPlus: props.message.sender.premiumPlus,
    isOrganization: props.message.sender.isOrganization,
    verifiedStatus: props.message.sender.verifiedStatus,
    stewardBadgeEnabled: props.message.sender.stewardBadgeEnabled,
  }
})

const formattedSentAt = computed(() => {
  if (!props.message?.createdAt) return ''
  const d = new Date(props.message.createdAt)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})

type ReadReceipt = {
  userId: string
  user: { id: string; username: string | null; name: string | null; avatarUrl: string | null; premium: boolean; premiumPlus: boolean; isOrganization: boolean; verifiedStatus: 'none' | 'identity' | 'manual'; stewardBadgeEnabled: boolean }
  readAt: string
}

const readReceipts = computed<ReadReceipt[]>(() => {
  if (!props.message) return []
  const sentAt = new Date(props.message.createdAt)
  return props.participants
    .filter((p) => p.user.id !== props.message!.sender.id && p.lastReadAt && new Date(p.lastReadAt) >= sentAt)
    .map((p) => ({
      userId: p.user.id,
      user: {
        id: p.user.id,
        username: p.user.username,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        premium: p.user.premium,
        premiumPlus: p.user.premiumPlus,
        isOrganization: p.user.isOrganization,
        verifiedStatus: p.user.verifiedStatus,
        stewardBadgeEnabled: p.user.stewardBadgeEnabled,
      },
      readAt: new Date(p.lastReadAt!).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' }),
    }))
})
</script>
