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
      class="sticky -top-4 z-10 -mx-4 flex items-center moh-bg moh-texture px-4 py-2 pointer-events-none"
      style="position: sticky;"
    >
      <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
      <div class="mx-3 shrink-0 rounded-full bg-white px-2 text-[11px] font-semibold text-gray-500 shadow-sm dark:bg-zinc-900 dark:text-gray-400">
        {{ stickyDividerLabel }}
      </div>
      <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
    </div>

    <TransitionGroup :name="animateRows ? 'moh-chat-list' : ''" :css="animateRows" tag="div" class="space-y-3">
      <template v-for="item in messagesWithDividers" :key="item.key">
        <div
          v-if="item.type === 'divider'"
          :ref="(el) => registerDividerEl(item.dayKey, item.label, el)"
          class="relative -mx-4 flex items-center px-4 py-2"
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
              <time
                :datetime="item.message.createdAt"
                :title="formatMessageTimeFull(item.message.createdAt)"
                class="ml-auto shrink-0 text-xs opacity-75 whitespace-nowrap"
              >
                {{ formatMessageTime(item.message.createdAt) }}
              </time>
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

defineProps({
  messagesReady: { type: Boolean, required: true },
  messagesLoading: { type: Boolean, required: true },
  messagesNextCursor: { type: [String, null] as PropType<string | null>, required: true, default: null },
  loadingOlder: { type: Boolean, required: true },
  isDraftChat: { type: Boolean, required: true },
  messagesCount: { type: Number, required: true },
  messagesWithDividers: { type: Array as PropType<ChatListItem[]>, required: true },
  stickyDividerLabel: { type: [String, null] as PropType<string | null>, required: true, default: null },
  recentAnimatedMessageIds: { type: Object as PropType<Set<string>>, required: true },
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

const emit = defineEmits<{
  (e: 'load-older'): void
}>()
</script>
