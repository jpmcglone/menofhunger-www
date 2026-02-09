<template>
  <section
    :class="[
      'h-full overflow-y-auto border-b border-gray-200 dark:border-zinc-800',
      // When both panes are visible, add the divider between them.
      !isTinyViewport ? 'border-b-0 border-r' : ''
    ]"
  >
    <div class="sticky top-0 z-10 border-b moh-border moh-frosted">
      <div class="px-4 pt-4 pb-3">
        <div class="flex items-center justify-between gap-3">
          <div class="text-lg font-semibold">Chat</div>
          <div class="flex items-center gap-2">
            <Button label="New" size="small" severity="secondary" @click="emit('open-new')">
              <template #icon>
                <Icon name="tabler:plus" aria-hidden="true" />
              </template>
            </Button>
            <Button label="Blocked" size="small" text severity="secondary" @click="emit('open-blocks')">
              <template #icon>
                <Icon name="tabler:ban" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <div
          v-if="!canStartNew"
          class="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-gray-300"
        >
          Verified members can reply to chats started with them. Premium members can start new chats.
        </div>

        <div class="mt-3 flex items-center gap-2">
          <button
            type="button"
            :class="[
              'rounded-full px-3 py-1 text-sm font-semibold',
              activeTab === 'primary'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 text-gray-700 dark:bg-zinc-900 dark:text-gray-300'
            ]"
            @click="emit('set-tab', 'primary')"
          >
            Chats
          </button>
          <button
            type="button"
            :class="[
              'relative rounded-full px-3 py-1 text-sm font-semibold',
              activeTab === 'requests'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 text-gray-700 dark:bg-zinc-900 dark:text-gray-300'
            ]"
            @click="emit('set-tab', 'requests')"
          >
            Chat requests
            <span
              v-if="showRequestsBadge"
              :class="[
                'ml-2 inline-flex min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center align-middle',
                badgeToneClass,
              ]"
            >
              {{ requestsBadgeText }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="listLoading" class="px-4 pt-2 pb-4 text-sm text-gray-500 dark:text-gray-400">
      Loading…
    </div>

    <div v-else-if="activeList.length === 0" class="px-4 pt-2 pb-4 text-sm text-gray-500 dark:text-gray-400">
      {{ activeTab === 'requests' ? 'No chat requests yet.' : 'No chats yet.' }}
    </div>

    <TransitionGroup
      v-else
      name="moh-chat-row"
      tag="div"
      class="divide-y divide-gray-200 dark:divide-zinc-800"
    >
      <button
        v-for="c in activeList"
        :key="c.id"
        type="button"
        class="w-full text-left"
        @click="emit('select', c.id)"
      >
        <div
          :class="[
            'moh-chat-row-surface w-full px-4 py-3 transition-colors',
            selectedConversationId === c.id
              ? 'bg-gray-50 dark:bg-zinc-900'
              : 'hover:bg-gray-50 dark:hover:bg-zinc-900',
            c.unreadCount > 0 ? conversationUnreadHighlightClass(c) : '',
          ]"
        >
          <div class="flex items-center gap-3">
            <div v-if="c.type === 'direct'">
              <AppUserAvatar :user="getDirectUserOverlay(c)" size-class="h-10 w-10" />
            </div>
            <div
              v-else
              class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-gray-300"
            >
              <Icon name="tabler:users" class="text-sm" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex items-center gap-2">
                  <div class="font-semibold truncate">
                    {{ getConversationTitle(c) }}
                  </div>
                  <AppVerifiedBadge
                    v-if="c.type === 'direct' && getDirectUserOverlay(c)"
                    :status="getDirectUserOverlay(c)!.verifiedStatus"
                    :premium="Boolean(getDirectUserOverlay(c)!.premium)"
                  />
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatListTime(c.lastMessageAt || c.updatedAt) }}
                </div>
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
                <Transition name="moh-fade" mode="out-in">
                  <div v-if="typingUsersByConversationId[c.id]?.length" :key="`typing-${c.id}`" class="truncate">
                    <template v-if="typingUsersByConversationId[c.id]?.length === 1">
                      <span class="font-semibold" :class="typingNameClass(typingUsersByConversationId[c.id]![0]!)">
                        @{{ typingUsersByConversationId[c.id]![0]!.username }}
                      </span>
                      <span class="ml-1">is typing…</span>
                    </template>
                    <template v-else>
                      <span class="font-semibold" :class="typingNameClass(typingUsersByConversationId[c.id]![0]!)">
                        @{{ typingUsersByConversationId[c.id]![0]!.username }}
                      </span>
                      <span class="mx-1">and</span>
                      <span class="font-semibold" :class="typingNameClass(typingUsersByConversationId[c.id]![1]!)">
                        @{{ typingUsersByConversationId[c.id]![1]!.username }}
                      </span>
                      <span v-if="typingUsersByConversationId[c.id]!.length > 2" class="ml-1">and others</span>
                      <span class="ml-1">are typing…</span>
                    </template>
                  </div>
                  <div v-else :key="`preview-${c.id}`" class="truncate">
                    {{ getConversationPreview(c) }}
                  </div>
                </Transition>
              </div>
            </div>
            <Transition name="moh-dot">
              <span
                v-if="c.unreadCount > 0"
                class="moh-chat-row-dot h-2 w-2 rounded-full"
                :class="conversationDotClass(c)"
              />
            </Transition>
          </div>
        </div>
      </button>

      <div v-if="nextCursor" key="load-more" class="px-4 py-3">
        <Button label="Load more" text size="small" severity="secondary" :loading="loadingMore" @click="emit('load-more')" />
      </div>
    </TransitionGroup>
  </section>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { MessageConversation, MessageUser } from '~/types/api'
import type { TypingUserDisplay } from '~/composables/chat/useChatTyping'
import { useUsersStore } from '~/composables/useUsersStore'

const props = defineProps({
  isTinyViewport: { type: Boolean, required: true },
  canStartNew: { type: Boolean, required: true },
  activeTab: { type: String as PropType<'primary' | 'requests'>, required: true },
  activeList: { type: Array as PropType<MessageConversation[]>, required: true },
  listLoading: { type: Boolean, required: true },
  showRequestsBadge: { type: Boolean, required: true },
  requestsBadgeText: { type: [String, Number] as PropType<string | number>, required: true },
  badgeToneClass: { type: String, required: true },
  selectedConversationId: { type: [String, null] as PropType<string | null>, required: true },
  nextCursor: { type: [String, null] as PropType<string | null>, required: true },
  loadingMore: { type: Boolean, required: true },
  typingUsersByConversationId: { type: Object as PropType<Record<string, TypingUserDisplay[]>>, required: true },
  formatListTime: { type: Function as PropType<(iso: string | null) => string>, required: true },
  getConversationTitle: { type: Function as PropType<(c: MessageConversation) => string>, required: true },
  getConversationPreview: { type: Function as PropType<(c: MessageConversation) => string>, required: true },
  getDirectUser: { type: Function as PropType<(c: MessageConversation) => MessageUser | null>, required: true },
  typingNameClass: { type: Function as PropType<(u: TypingUserDisplay) => string>, required: true },
  conversationUnreadHighlightClass: { type: Function as PropType<(c: MessageConversation) => string>, required: true },
  conversationDotClass: { type: Function as PropType<(c: MessageConversation) => string>, required: true },
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'set-tab', tab: 'primary' | 'requests'): void
  (e: 'open-new'): void
  (e: 'open-blocks'): void
  (e: 'load-more'): void
}>()

const usersStore = useUsersStore()
function getDirectUserOverlay(c: MessageConversation): MessageUser | null {
  const base = props.getDirectUser(c)
  if (!base?.id) return base
  return usersStore.overlay(base as any) as any
}
</script>
