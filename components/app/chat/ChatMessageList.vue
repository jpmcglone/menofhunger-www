<template>
  <div v-show="messagesReady" class="w-full px-4">
    <div v-if="messagesLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading chat…</div>
    <div v-else-if="messagesNextCursor" class="pb-2">
      <Button label="Load older" text size="small" severity="secondary" :loading="loadingOlder" @click="emit('load-older')" />
    </div>
    <div v-else-if="isDraftChat && messagesCount === 0" class="py-6 text-sm text-gray-500 dark:text-gray-400">
      Send your first chat to start the conversation.
    </div>

    <div
      v-if="stickyDividerLabel"
      class="sticky -top-4 z-10 flex items-center moh-bg moh-texture py-2 pointer-events-none"
      style="position: sticky;"
    >
      <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
      <div class="mx-3 shrink-0 rounded-full bg-white px-2 text-[11px] font-semibold text-gray-500 shadow-sm dark:bg-zinc-900 dark:text-gray-400">
        {{ stickyDividerLabel }}
      </div>
      <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
    </div>

    <TransitionGroup :name="animateRows ? 'moh-chat-list' : ''" :css="animateRows" tag="div" class="space-y-3">
      <template v-for="(item, listIndex) in messagesWithDividers" :key="item.key">
        <div
          v-if="item.type === 'divider'"
          :ref="(el) => registerDividerEl(item.dayKey, item.label, el)"
          class="relative flex items-center py-2"
        >
          <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
          <div class="mx-3 shrink-0 rounded-full bg-white px-2 text-[11px] font-semibold text-gray-500 shadow-sm dark:bg-zinc-900 dark:text-gray-400">
            {{ item.label }}
          </div>
          <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
        </div>
        <div
          v-else
          :class="[
            animateRows && recentAnimatedMessageIds.has(item.message.id) ? 'moh-chat-item-enter' : '',
            'relative flex w-full',
            item.message.sender.id === meId ? 'justify-end' : 'justify-start',
            isGroupChat && item.message.sender.id !== meId ? 'pl-10' : ''
          ]"
        >
          <button
            v-if="shouldShowIncomingAvatar(item.message, item.index)"
            type="button"
            class="absolute left-0 bottom-0 translate-y-[-6px] rounded-full cursor-pointer transition-opacity hover:opacity-90"
            :aria-label="item.message.sender.username ? `View @${item.message.sender.username}` : 'View profile'"
            @click="goToProfile(item.message.sender)"
          >
            <AppUserAvatar :user="item.message.sender" size-class="h-7 w-7" />
          </button>
          <div
            :ref="(el) => registerBubbleEl(item.message.id, el)"
            :class="[
              'max-w-[85%] text-sm',
              bubbleShapeClass(item.message.id),
              bubbleClass(item.message)
            ]"
          >
            <div class="flex flex-wrap items-end gap-x-2 gap-y-1">
              <span class="min-w-0 flex-[1_1_auto] whitespace-pre-wrap break-words">{{ item.message.body }}</span>
              <div
                v-if="shouldShowMessageMeta(item, listIndex)"
                class="ml-auto shrink-0 inline-flex items-center gap-1 text-xs opacity-75 whitespace-nowrap"
              >
                <time
                  :datetime="item.message.createdAt"
                  :title="formatMessageTimeFull(item.message.createdAt)"
                >
                  {{ formatMessageTime(item.message.createdAt) }}
                </time>
                <template v-if="item.message.sender.id === meId">
                  <span
                    v-if="sendingMessageIds.has(item.message.id)"
                    class="inline-block h-[10px] w-[10px] rounded-full border border-current border-t-transparent opacity-70 animate-spin"
                    aria-label="Sending"
                  />
                  <Icon
                    v-else-if="latestMyMessageId && item.message.id === latestMyMessageId"
                    name="tabler:circle-check"
                    size="10"
                    class="opacity-80 translate-y-[0.5px]"
                    aria-hidden="true"
                  />
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { Message, MessageUser } from '~/types/api'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'

const props = defineProps({
  messagesReady: { type: Boolean, required: true },
  messagesLoading: { type: Boolean, required: true },
  messagesNextCursor: { type: [String, null] as PropType<string | null>, required: true, default: null },
  loadingOlder: { type: Boolean, required: true },
  isDraftChat: { type: Boolean, required: true },
  messagesCount: { type: Number, required: true },
  messagesWithDividers: { type: Array as PropType<ChatListItem[]>, required: true },
  stickyDividerLabel: { type: [String, null] as PropType<string | null>, required: true, default: null },
  recentAnimatedMessageIds: { type: Object as PropType<Set<string>>, required: true },
  sendingMessageIds: { type: Object as PropType<Set<string>>, required: true },
  latestMyMessageId: { type: [String, null] as PropType<string | null>, required: true, default: null },
  animateRows: { type: Boolean, required: false, default: true },
  isGroupChat: { type: Boolean, required: true },
  meId: { type: String as PropType<string | null>, required: true },
  formatMessageTime: { type: Function as PropType<(iso: string) => string>, required: true },
  formatMessageTimeFull: { type: Function as PropType<(iso: string) => string>, required: true },
  bubbleShapeClass: { type: Function as PropType<(id: string) => string>, required: true },
  bubbleClass: { type: Function as PropType<(m: Message) => string>, required: true },
  registerDividerEl: { type: Function as PropType<(dayKey: string, label: string, el: unknown) => void>, required: true },
  registerBubbleEl: { type: Function as PropType<(id: string, el: unknown) => void>, required: true },
  shouldShowIncomingAvatar: { type: Function as PropType<(m: Message, index: number) => boolean>, required: true },
  goToProfile: { type: Function as PropType<(u: MessageUser | null | undefined) => void>, required: true },
})

const CLUSTER_GAP_MS = 5 * 60 * 1000

function parseMs(iso: string): number {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : 0
}

function getPrevMessageItem(list: ChatListItem[], listIndex: number): ChatListItem | null {
  for (let i = listIndex - 1; i >= 0; i--) {
    const it = list[i]!
    if (it.type === 'divider') return null
    return it
  }
  return null
}

function getNextMessageItem(list: ChatListItem[], listIndex: number): ChatListItem | null {
  for (let i = listIndex + 1; i < list.length; i++) {
    const it = list[i]!
    if (it.type === 'divider') return null
    return it
  }
  return null
}

function shouldShowMessageMeta(item: ChatListItem, listIndex: number): boolean {
  if (item.type !== 'message') return false

  const list = props.messagesWithDividers
  const cur = item.message
  const prevItem = getPrevMessageItem(list, listIndex)
  const nextItem = getNextMessageItem(list, listIndex)

  const curMs = parseMs(cur.createdAt)
  const prevSameSender =
    prevItem?.type === 'message' && prevItem.message.sender.id === cur.sender.id

  // If this message follows a long gap from the previous message by the same sender,
  // show its time even if more messages follow soon.
  if (prevSameSender) {
    const prevMs = parseMs(prevItem.message.createdAt)
    if (curMs > prevMs && curMs - prevMs > CLUSTER_GAP_MS) return true
  }

  // Otherwise only show time for the last message in the contiguous cluster.
  if (!nextItem || nextItem.type !== 'message') return true
  if (nextItem.message.sender.id !== cur.sender.id) return true

  const nextMs = parseMs(nextItem.message.createdAt)
  if (nextMs > curMs && nextMs - curMs > CLUSTER_GAP_MS) return true

  return false
}

const emit = defineEmits<{
  (e: 'load-older'): void
}>()
</script>
