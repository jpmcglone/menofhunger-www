<template>
  <AppPageContent class="flex min-h-0 flex-1 flex-col" bottom="standard">
    <div v-if="!viewerIsVerified" class="flex min-h-0 flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="rounded-2xl border moh-border moh-bg p-5 shadow-sm">
          <div class="text-lg font-semibold moh-text">Verify to use chat</div>
          <div class="mt-1 text-sm moh-text-muted">
            Chat is only available for verified members.
          </div>
          <div class="mt-4 flex items-center justify-end">
            <Button label="View tiers" severity="secondary" @click="navigateTo('/tiers')" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex min-h-0 flex-1 flex-col">
      <!-- Data-first: don't mount the chat screen until initial data is ready.
           When ready, fade OUT the loading screen, then mount the chat screen (no chat animation). -->
      <div
        v-if="chatBootState !== 'ready'"
        class="flex min-h-0 flex-1 items-center justify-center px-4 py-12 transition-opacity ease-out"
        :class="chatBootState === 'fading' ? 'opacity-0' : 'opacity-100'"
        :style="{ transitionDuration: `${CHAT_BOOT_FADE_MS}ms` }"
      >
        <AppLogoLoader />
      </div>

      <div
        v-else
        class="grid min-h-0 flex-1"
        :class="isTinyViewport ? 'grid-cols-1' : ''"
        :style="gridStyle"
      >
          <!-- Left column: thread list -->
          <ChatConversationList
            v-if="showListPane"
            :is-tiny-viewport="isTinyViewport"
            :can-start-new="viewerCanStartChats"
            :active-tab="activeTab"
            :active-list="activeList"
            :list-loading="listLoading"
            :show-requests-badge="showRequestsBadge"
            :requests-badge-text="requestsBadgeText"
            :badge-tone-class="badgeToneClass"
            :selected-conversation-id="selectedConversationId"
            :next-cursor="nextCursor"
            :loading-more="loadingMore"
            :typing-users-by-conversation-id="typingUsersByConversationId"
            :format-list-time="formatListTime"
            :get-conversation-title="getConversationTitle"
            :get-conversation-preview="getConversationPreview"
            :get-direct-user="getDirectUser"
            :typing-name-class="typingNameClass"
            :conversation-unread-highlight-class="conversationUnreadHighlightClass"
            :conversation-dot-class="conversationDotClass"
            @select="selectConversation"
            @set-tab="setTab"
            @open-new="openNewDialog"
            @open-blocks="openBlocksDialog"
            @load-more="loadMoreConversations"
          />

          <!-- Right column: chat for selected thread (edge-to-edge column, consistent content margins) -->
          <section v-if="showChatPane" class="h-full overflow-hidden">
            <div class="flex h-full min-h-0 flex-col">
              <div class="shrink-0 border-b border-gray-200 px-4 py-3 dark:border-zinc-800">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-2">
                    <Button
                      v-if="isTinyViewport && selectedChatKey"
                      text
                      severity="secondary"
                      aria-label="Back"
                      @click="clearSelection({ replace: true })"
                    >
                      <template #icon>
                        <Icon name="tabler:chevron-left" aria-hidden="true" />
                      </template>
                    </Button>
                    <div class="flex items-center gap-3 min-w-0">
                      <button
                        v-if="headerAvatarUser"
                        type="button"
                        class="rounded-full cursor-pointer transition-opacity hover:opacity-90"
                        :aria-label="headerAvatarUser.username ? `View @${headerAvatarUser.username}` : 'View profile'"
                        @click="goToProfile(headerAvatarUser)"
                      >
                        <AppUserAvatar :user="headerAvatarUser" size-class="h-10 w-10" />
                      </button>
                      <div class="min-w-0">
                        <div class="font-semibold min-w-0 flex items-center gap-2">
                          <template v-if="selectedConversation?.type === 'direct' && headerDirectUser">
                            <button
                              type="button"
                              class="min-w-0 truncate hover:underline cursor-pointer text-left"
                              :aria-label="headerDirectUser.username ? `View @${headerDirectUser.username}` : 'View profile'"
                              @click="goToProfile(headerDirectUser)"
                            >
                              {{ headerDirectUser.name || headerDirectUser.username || 'User' }}
                            </button>
                            <AppVerifiedBadge
                              :status="headerDirectUser.verifiedStatus"
                              :premium="headerDirectUser.premium"
                              :premium-plus="headerDirectUser.premiumPlus"
                            />
                          </template>
                          <template v-else>
                            <span class="min-w-0 truncate">
                              {{
                                selectedConversation
                                  ? getConversationTitle(selectedConversation)
                                : isDraftChat
                                  ? (draftRecipients.length === 1
                                      ? (draftRecipients[0]?.name || draftRecipients[0]?.username || 'User')
                                    : draftGroupTitle)
                                    : 'Select a conversation'
                              }}
                            </span>
                          </template>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                          <template v-if="selectedConversation?.type === 'group'">
                            <span>{{ headerMemberCountLabel }}</span>
                            <span v-if="headerMembers.length"> · </span>
                            <template v-for="(member, index) in headerMembers" :key="member.id">
                              <button
                                type="button"
                                class="font-semibold hover:underline cursor-pointer"
                                :class="member.toneClass"
                                :aria-label="member.username ? `View @${member.username}` : 'View profile'"
                                @click="goToProfile(member.user)"
                              >
                                {{ member.label }}
                              </button>
                              <span v-if="index < headerMembers.length - 1">, </span>
                            </template>
                          </template>
                          <template v-else-if="selectedConversation?.type === 'direct'">
                            <button
                              v-if="headerDirectUser?.username"
                              type="button"
                              class="hover:underline cursor-pointer"
                              :aria-label="`View @${headerDirectUser.username}`"
                              @click="goToProfile(headerDirectUser)"
                            >
                              @{{ headerDirectUser.username }}
                            </button>
                            <span v-else>Chat</span>
                          </template>
                          <template v-else-if="isDraftChat">
                            {{
                              draftRecipients.length === 1
                                ? (draftRecipients[0]?.username ? `@${draftRecipients[0].username}` : 'New chat')
                                : `${draftRecipients.length} recipients`
                            }}
                          </template>
                          <template v-else>
                            Pick a conversation from the left.
                          </template>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button text severity="secondary" aria-label="Conversation options">
                      <template #icon>
                        <Icon name="tabler:dots" aria-hidden="true" />
                      </template>
                    </Button>
                  </div>
                </div>
              </div>

          <div v-if="selectedChatKey" class="relative flex-1 min-h-0 flex flex-col">
            <div
              v-if="renderedChatKey"
              :key="renderedChatKey"
              ref="messagesScroller"
              data-chat-scroller="1"
              class="min-h-0 flex-1 overflow-y-auto py-4 moh-chat-scroll-hide"
              @scroll="onMessagesScroll"
              @wheel.passive="markUserScrollIntent"
              @touchstart.passive="markUserScrollIntent"
              @touchmove.passive="markUserScrollIntent"
            >
              <ChatMessageList
                :messages-ready="messagesReady"
                :messages-loading="messagesLoading"
                :messages-next-cursor="messagesNextCursor"
                :loading-older="loadingOlder"
                :is-draft-chat="isDraftChat"
                :messages-count="messages.length"
                :messages-with-dividers="messagesWithDividers"
                :sticky-divider-label="stickyDividerLabel"
                :recent-animated-message-ids="recentAnimatedMessageIds"
                :sending-message-ids="sendingMessageIds"
                :latest-my-message-id="latestMyMessageId"
                :animate-rows="animateMessageList"
                :is-group-chat="isGroupChat"
                :me-id="me?.id ?? null"
                :format-message-time="formatMessageTime"
                :format-message-time-full="formatMessageTimeFull"
                :bubble-shape-class="bubbleShapeClass"
                :bubble-class="bubbleClass"
                :register-divider-el="registerDividerEl"
                :register-bubble-el="registerBubbleEl"
                :should-show-incoming-avatar="shouldShowIncomingAvatar"
                :go-to-profile="goToProfile"
                @load-older="loadOlderMessages"
              />
            </div>
            <div
              v-else
              key="loading"
              class="h-full flex items-center justify-center transition-opacity ease-out"
              :class="messagesPaneState === 'fading' ? 'opacity-0' : 'opacity-100'"
              :style="{ transitionDuration: `${MESSAGES_PANE_FADE_MS}ms` }"
            >
              <AppLogoLoader />
            </div>
            <!-- Custom thin pill scrollbar (native scrollbar hidden) -->
            <div
              v-if="renderedChatKey && scrollPillNeeded"
              class="pointer-events-none absolute right-1 top-2 bottom-2 z-10 w-[4px] transition-opacity duration-200 ease-out"
              :class="scrollPillVisible ? 'opacity-90' : 'opacity-0'"
              aria-hidden="true"
            >
              <div class="w-full rounded-full" :style="scrollPillThumbStyle" />
            </div>
            <Transition name="moh-fade">
              <button
                v-if="showScrollToBottomButton"
                type="button"
                class="absolute left-1/2 bottom-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg cursor-pointer"
                :class="pendingButtonClass"
                :style="scrollToBottomButtonStyle"
                @click="onPendingButtonClick"
              >
                <Icon name="tabler:arrow-down" class="text-xs" aria-hidden="true" />
                <span>{{ pendingNewLabel }}</span>
              </button>
            </Transition>
          </div>
          <div v-else class="flex-1" />

          <div v-if="selectedChatKey" class="shrink-0 border-t border-gray-200 px-4 py-2.5 dark:border-zinc-800" :style="composerBarStyle">
            <div v-if="selectedConversation?.viewerStatus === 'pending'" class="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              This is a chat request. Replying accepts it and moves it to your inbox.
              <div class="mt-2">
                <Button label="Accept" size="small" severity="secondary" @click="acceptSelectedConversation" />
              </div>
            </div>
            <!-- Typing bar: always present (blank when nobody is typing) -->
            <div class="mb-2.5 flex w-full items-center gap-2">
              <div class="h-9 w-9 shrink-0" aria-hidden="true" />
              <div
                class="moh-typing-bar flex min-h-[28px] w-full items-center rounded-full border border-gray-200 px-3 py-1 text-sm leading-5 text-gray-500 dark:border-zinc-800 dark:text-gray-400"
                :class="typingUsersTotalCount > 0 ? 'moh-typing-bar--active' : ''"
                role="status"
                aria-live="polite"
              >
                <Transition name="moh-fade">
                  <div v-if="typingUsersTotalCount > 0" class="truncate">
                    <template v-if="typingUsersTotalCount === 1">
                      <span class="font-semibold" :class="typingNameClass(typingUsersForDisplay[0]!)">
                        @{{ typingUsersForDisplay[0]!.username }}
                      </span>
                      <span class="ml-1">is typing…</span>
                    </template>
                    <template v-else>
                      <span class="font-semibold" :class="typingNameClass(typingUsersForDisplay[0]!)">
                        @{{ typingUsersForDisplay[0]!.username }}
                      </span>
                      <span class="mx-1">and</span>
                      <span class="font-semibold" :class="typingNameClass(typingUsersForDisplay[1]!)">
                        @{{ typingUsersForDisplay[1]!.username }}
                      </span>
                      <span v-if="typingUsersTotalCount > 2" class="ml-1">and others</span>
                      <span class="ml-1">are typing…</span>
                    </template>
                  </div>
                </Transition>
              </div>
            </div>
            <AppDmComposer
              ref="dmComposerRef"
              v-model="composerText"
              :user="composerUser"
              placeholder="Type a chat…"
              :loading="sending"
              :auto-focus="!isTinyViewport"
              @send="sendCurrentMessage"
            />
          </div>
        </div>
      </section>
    </div>

    <Dialog
      v-model:visible="startChatInfoVisible"
      modal
      header="Starting new chats"
      :style="{ width: '28rem', maxWidth: '92vw' }"
    >
      <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>
          As a verified member, you can chat when someone starts a conversation with you.
        </p>
        <p>
          To start new chats yourself, upgrade to Premium.
        </p>
      </div>
      <template #footer>
        <Button label="Not now" text severity="secondary" @click="startChatInfoVisible = false" />
        <Button label="View tiers" severity="secondary" @click="goPremium" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="newDialogVisible"
      modal
      header="New chat"
      :style="{ width: '34rem', maxWidth: '92vw', minHeight: '22rem' }"
    >
      <div class="space-y-3">
        <AppFormField label="Recipients">
          <InputText v-model="recipientQuery" class="w-full" placeholder="@username or search" />
        </AppFormField>
        <div v-if="recipientLoading" class="text-xs text-gray-500 dark:text-gray-400">Searching…</div>
        <AppInlineAlert v-if="recipientError" severity="danger">{{ recipientError }}</AppInlineAlert>
        <div v-if="recipientResults.length" class="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-zinc-800">
          <button
            v-for="u in recipientResults"
            :key="u.id"
            type="button"
            class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-900"
            @click="addRecipient(u)"
          >
            <AppUserAvatar :user="u" size-class="h-8 w-8" />
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold truncate">{{ u.name || u.username || 'User' }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">@{{ u.username }}</div>
            </div>
          </button>
        </div>
        <div v-if="selectedRecipients.length" class="flex flex-wrap gap-2">
          <span
            v-for="u in selectedRecipients"
            :key="u.id"
            class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800 dark:bg-zinc-900 dark:text-gray-200"
          >
            <AppUserAvatar :user="u" size-class="h-5 w-5" />
            <span>@{{ u.username }}</span>
            <button type="button" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200" @click="removeRecipient(u.id)">
              <Icon name="tabler:x" aria-hidden="true" />
            </button>
          </span>
        </div>
        <AppInlineAlert v-if="newConversationError" severity="danger">{{ newConversationError }}</AppInlineAlert>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="newDialogVisible = false" />
        <Button
          label="Start chat"
          :disabled="!viewerCanStartChats || !canStartDraft"
          @click="createConversation"
        >
          <template #icon>
            <Icon name="tabler:arrow-right" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="blocksDialogVisible"
      modal
      header="Blocked users"
      :style="{ width: '32rem', maxWidth: '92vw', minHeight: '18rem' }"
    >
      <div v-if="blocksLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      <div v-else-if="blocks.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No blocked users.</div>
      <div v-else class="space-y-2">
        <div
          v-for="b in blocks"
          :key="b.blocked.id"
          class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-zinc-800"
        >
          <div class="flex items-center gap-2">
            <AppUserAvatar :user="b.blocked" size-class="h-8 w-8" />
            <div class="text-sm font-semibold">
              {{ b.blocked.name || (b.blocked.username ? `@${b.blocked.username}` : 'User') }}
            </div>
          </div>
          <Button label="Unblock" text severity="secondary" @click="unblockUser(b.blocked.id)" />
        </div>
      </div>
    </Dialog>
  </div>
</AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Chat',
  hideTopBar: true,
})

usePageSeo({
  title: 'Chat',
  description: 'Chat in Men of Hunger — keep conversations focused and intentional.',
  canonicalPath: '/chat',
  noindex: true,
})

import type {
  FollowListUser,
  GetMessageBlocksResponse,
  GetMessageConversationResponse,
  GetMessageConversationsResponse,
  GetMessagesResponse,
  LookupMessageConversationResponse,
  Message,
  MessageUser,
  MessageBlockListItem,
  MessageConversation,
  SendMessageResponse,
  CreateMessageConversationResponse,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useChatBubbleShape } from '~/composables/chat/useChatBubbleShape'
import { useChatTimeFormatting } from '~/composables/chat/useChatTimeFormatting'
import { useChatTyping } from '~/composables/chat/useChatTyping'
import ChatConversationList from '~/components/app/chat/ChatConversationList.vue'
import ChatMessageList from '~/components/app/chat/ChatMessageList.vue'

const { apiFetch, apiFetchData } = useApiClient()
const route = useRoute()
const router = useRouter()
const { user: me } = useAuth()
const viewerIsVerified = computed(() => (me.value?.verifiedStatus ?? 'none') !== 'none')
const viewerCanStartChats = computed(() => Boolean(me.value?.premium || me.value?.premiumPlus))
const CHAT_BOOT_FADE_MS = 160
const MESSAGES_PANE_FADE_MS = 160
const prefersReducedMotion = ref(false)
const chatBootState = ref<'loading' | 'fading' | 'ready'>('loading')
const messagesPaneState = ref<'loading' | 'fading' | 'ready'>('loading')
let chatBootTimer: ReturnType<typeof setTimeout> | null = null
let messagesPaneTimer: ReturnType<typeof setTimeout> | null = null

const composerBarStyle = computed<Record<string, string>>(() => ({
  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
}))
const scrollToBottomButtonStyle = computed<Record<string, string>>(() => ({
  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
}))

function clearChatBootTimer() {
  if (!chatBootTimer) return
  clearTimeout(chatBootTimer)
  chatBootTimer = null
}
function clearMessagesPaneTimer() {
  if (!messagesPaneTimer) return
  clearTimeout(messagesPaneTimer)
  messagesPaneTimer = null
}

function revealChatScreenAfterFade() {
  if (chatBootState.value === 'ready') return
  if (prefersReducedMotion.value) {
    chatBootState.value = 'ready'
    return
  }
  chatBootState.value = 'fading'
  clearChatBootTimer()
  chatBootTimer = setTimeout(() => {
    chatBootTimer = null
    chatBootState.value = 'ready'
  }, CHAT_BOOT_FADE_MS)
}

function revealMessagesPaneAfterFade(key: string) {
  // Mount the messages scroller only after the loader has faded out.
  if (prefersReducedMotion.value) {
    messagesPaneState.value = 'ready'
    renderedChatKey.value = key
    return
  }
  messagesPaneState.value = 'fading'
  clearMessagesPaneTimer()
  messagesPaneTimer = setTimeout(() => {
    messagesPaneTimer = null
    messagesPaneState.value = 'ready'
    renderedChatKey.value = key
  }, MESSAGES_PANE_FADE_MS)
}
const {
  addInterest,
  removeInterest,
  addMessagesCallback,
  removeMessagesCallback,
  emitMessagesTyping,
  emitMessagesScreen,
  isSocketConnected,
} = usePresence()
const { showRequests, displayRequests, toneClass } = useMessagesBadge()

const activeTab = ref<'primary' | 'requests'>('primary')
const conversations = ref<{ primary: MessageConversation[]; requests: MessageConversation[] }>({
  primary: [],
  requests: [],
})
const nextCursorByTab = ref<{ primary: string | null; requests: string | null }>({ primary: null, requests: null })
const listLoadingByTab = ref<{ primary: boolean; requests: boolean }>({ primary: false, requests: false })
const loadingMore = ref(false)

// Seed selection from URL so refresh doesn't "pop" the chat pane in after mount.
const selectedConversationId = ref<string | null>(typeof route.query.c === 'string' ? route.query.c : null)
// Two-pane layout key: either a real conversation id, 'draft' for a not-yet-created chat, or null.
const selectedChatKey = ref<string | null>(selectedConversationId.value)
const selectedConversation = computed(() =>
  [...conversations.value.primary, ...conversations.value.requests].find((c) => c.id === selectedConversationId.value) ?? null,
)
const isDraftChat = computed(() => selectedChatKey.value === 'draft')

type ChatMessage = Message & { __localStatus?: 'sending'; __clientKey?: string }
const messages = ref<ChatMessage[]>([])
const { buildMessagesWithDividers, formatListTime, formatMessageTime, formatMessageTimeFull } = useChatTimeFormatting()
const messagesWithDividers = computed(() => buildMessagesWithDividers(messages.value))
const stickyDividerLabel = ref<string | null>(null)
const messagesNextCursor = ref<string | null>(null)
const messagesLoading = ref(false)
const loadingOlder = ref(false)
const sending = ref(false)
const composerText = ref('')
const composerUser = computed(() =>
  me.value
    ? {
        premium: Boolean(me.value.premium),
        verifiedStatus: me.value.verifiedStatus ?? 'none',
      }
    : null,
)
const messagesScroller = ref<HTMLElement | null>(null)
const dmComposerRef = ref<{ focus?: () => void } | null>(null)
const messagesReady = ref(false)
const pendingNewCount = ref(0)
const pendingNewTier = ref<'premium' | 'verified' | 'normal'>('normal')
const animateMessageList = ref(true)
const renderedChatKey = ref<string | null>(null)
const atBottom = ref(true)
const scrollPillTopPx = ref(0)
const scrollPillHeightPx = ref(0)
const scrollPillVisible = ref(false)
let scrollPillHideTimer: ReturnType<typeof setTimeout> | null = null
let lastUserScrollIntentAt = 0
const USER_SCROLL_GRACE_MS = 2000

// Track recently-added messages so we can animate them reliably (even if scroll-to-bottom happens same frame).
const recentAnimatedMessageIds = ref<Set<string>>(new Set())
const recentAnimatedTimers = ref<Map<string, ReturnType<typeof setTimeout>>>(new Map())
const sendingMessageIds = ref<Set<string>>(new Set())
const latestMyMessageId = computed<string | null>(() => {
  const myId = me.value?.id ?? null
  if (!myId) return null
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const m = messages.value[i]!
    if (m.sender.id === myId) return m.id
  }
  return null
})

function reconcileOptimisticSend(serverMsg: Message): boolean {
  const myId = me.value?.id ?? null
  if (!myId) return false
  if (serverMsg.sender.id !== myId) return false
  if (!serverMsg.conversationId) return false
  const sendingIds = sendingMessageIds.value
  if (!sendingIds.size) return false

  const list = messages.value
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i]!
    if (!sendingIds.has(m.id)) continue
    if (!m.id.startsWith('local-')) continue
    if (m.conversationId !== serverMsg.conversationId) continue
    if (m.body !== serverMsg.body) continue

    const localId = m.id
    const next = [...list]
    // Keep the row's key stable (localId) and only swap the message content/metadata.
    next[i] = { ...serverMsg, __clientKey: localId } as ChatMessage
    // Guard: if the server message already exists elsewhere, drop duplicates.
    const deduped: ChatMessage[] = []
    for (let j = 0; j < next.length; j++) {
      const cur = next[j]!
      if (j !== i && cur.id === serverMsg.id) continue
      deduped.push(cur)
    }
    messages.value = deduped

    const sendingNext = new Set(sendingIds)
    sendingNext.delete(localId)
    sendingMessageIds.value = sendingNext

    return true
  }
  return false
}

function mergeServerMessageIntoOptimistic(localId: string, serverMsg: Message): boolean {
  const list = messages.value
  const idx = list.findIndex((m) => m.id === localId)
  if (idx === -1) return false

  const next = [...list]
  next[idx] = { ...serverMsg, __clientKey: localId } as ChatMessage

  // Guard: if the server message already exists elsewhere, drop duplicates (keep the optimistic row).
  const deduped: ChatMessage[] = []
  for (let j = 0; j < next.length; j++) {
    const cur = next[j]!
    if (j !== idx && cur.id === serverMsg.id) continue
    deduped.push(cur)
  }
  messages.value = deduped
  return true
}
function markMessageAnimated(id: string) {
  const mid = (id ?? '').trim()
  if (!mid) return
  const next = new Set(recentAnimatedMessageIds.value)
  next.add(mid)
  recentAnimatedMessageIds.value = next
  const timers = recentAnimatedTimers.value
  const existing = timers.get(mid)
  if (existing) clearTimeout(existing)
  timers.set(mid, setTimeout(() => {
    const n = new Set(recentAnimatedMessageIds.value)
    n.delete(mid)
    recentAnimatedMessageIds.value = n
    timers.delete(mid)
  }, 420))
}

const { bubbleShapeClass, registerBubbleEl } = useChatBubbleShape()

const {
  resetTyping,
  setRemoteTyping,
  typingNameClass,
  typingUsersByConversationId,
  typingUsersForDisplay,
  typingUsersTotalCount,
} = useChatTyping({
  me,
  conversations,
  selectedConversation,
  selectedConversationId,
  composerText,
  emitMessagesTyping,
})

const newDialogVisible = ref(false)
const startChatInfoVisible = ref(false)
const recipientQuery = ref('')
const recipientResults = ref<FollowListUser[]>([])
const recipientLoading = ref(false)
const recipientError = ref<string | null>(null)
const selectedRecipients = ref<FollowListUser[]>([])
const newConversationError = ref<string | null>(null)

const draftRecipients = ref<FollowListUser[]>([])

const blocksDialogVisible = ref(false)
const blocks = ref<MessageBlockListItem[]>([])
const blocksLoading = ref(false)

const activeList = computed(() => conversations.value[activeTab.value])
const nextCursor = computed(() => nextCursorByTab.value[activeTab.value])
const listLoading = computed(() => listLoadingByTab.value[activeTab.value])
const showRequestsBadge = computed(() => showRequests.value)
const requestsBadgeText = computed(() => displayRequests.value)
const badgeToneClass = computed(() => toneClass.value)

const canStartDraft = computed(() => selectedRecipients.value.length > 0)

const pendingButtonClass = computed(() => {
  // When there are unread/new messages below, keep the tier color treatment.
  if (pendingNewCount.value > 0) {
    if (pendingNewTier.value === 'premium') return 'bg-[var(--moh-premium)] text-white'
    if (pendingNewTier.value === 'verified') return 'bg-[var(--moh-verified)] text-white'
    return 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
  }
  // Otherwise, offer a neutral "scroll to bottom" affordance.
  return 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-zinc-900 dark:text-gray-200 dark:border-zinc-700'
})

const pendingNewLabel = computed(() => {
  const n = Math.max(0, Math.floor(Number(pendingNewCount.value) || 0))
  if (n > 0) return `${n} New ${n === 1 ? 'Message' : 'Messages'}`
  return 'Scroll to bottom'
})

const showScrollToBottomButton = computed(() => Boolean(selectedChatKey.value) && !atBottom.value)

const { isTinyViewport, showListPane, showDetailPane: showChatPane, gridStyle } = useTwoPaneLayout(selectedChatKey, {
  // Keep left pane consistent with Admin/Settings.
  leftCols: '22rem',
  rightCols: '1fr',
  minWidth: 1024,
  // Messages should not collapse panes due to short viewport height.
  // Only collapse when the viewport is actually narrow.
  minHeight: 0,
})

const headerAvatarUser = computed(() => {
  if (selectedConversation?.value?.type === 'direct') {
    return getDirectUser(selectedConversation.value)
  }
  if (isDraftChat.value && draftRecipients.value.length === 1) {
    return draftRecipients.value[0] ?? null
  }
  return null
})

const headerDirectUser = computed(() => {
  if (selectedConversation?.value?.type === 'direct') {
    return getDirectUser(selectedConversation.value)
  }
  return null
})

function userToneClass(u: MessageUser | null | undefined): string {
  if (u?.premium) return 'text-[var(--moh-premium)]'
  if (u?.verifiedStatus && u.verifiedStatus !== 'none') return 'text-[var(--moh-verified)]'
  return 'text-gray-700 dark:text-gray-200'
}

const headerMemberCountLabel = computed(() => {
  if (selectedConversation.value?.type !== 'group') return ''
  return `${selectedConversation.value.participants.length} members`
})

const headerMembers = computed(() => {
  if (selectedConversation.value?.type !== 'group') return []
  return selectedConversation.value.participants
    .map((p) => p.user ?? null)
    .filter((u): u is MessageUser => Boolean(u))
    .map((u) => {
    const label = u.name || u.username || 'User'
    return {
      id: u.id,
      label,
      username: u.username ?? '',
      user: u,
      toneClass: userToneClass(u),
    }
    })
})

const isGroupChat = computed(() => {
  if (selectedConversation.value?.type === 'group') {
    return (selectedConversation.value.participants?.length ?? 0) >= 3
  }
  if (isDraftChat.value) {
    return draftRecipients.value.length + 1 >= 3
  }
  return false
})

const draftGroupTitle = computed(() => {
  const names = draftRecipients.value.map((u) => u.name || u.username || 'User')
  if (names.length <= 2) return names.join(' and ')
  const [first, second, ...rest] = names
  return `${first}, ${second}, and ${rest.length} others`
})

// Treat user as "at bottom" even if a few pixels off (mobile scroll rounding, safe-area, etc).
const BOTTOM_THRESHOLD = 96

function isAtBottom() {
  const el = messagesScroller.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD
}

function scrollToBottom(behavior: ScrollBehavior = 'auto') {
  const el = messagesScroller.value
  if (!el) return
  let nextBehavior = behavior
  if (behavior === 'smooth' && typeof window !== 'undefined') {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (prefersReduced) nextBehavior = 'auto'
  }
  el.scrollTo({ top: el.scrollHeight, behavior: nextBehavior })
}

function onMessagesScrollerMounted(scroller: HTMLElement) {
  // Force instant jump regardless of any global scroll-behavior.
  scroller.scrollTop = scroller.scrollHeight
  requestAnimationFrame(() => {
    scroller.scrollTop = scroller.scrollHeight
    updateStickyDivider()
    updateScrollPill()
    atBottom.value = true
    // Re-enable per-row animations after the container is mounted.
    animateMessageList.value = true
  })
}

const scrollPillNeeded = computed(() => {
  const el = messagesScroller.value
  if (!el) return false
  return el.scrollHeight > el.clientHeight + 1
})

const scrollPillColor = computed(() => {
  const u = me.value
  if (u?.premium) return 'var(--moh-premium)'
  if (u?.verifiedStatus && u.verifiedStatus !== 'none') return 'var(--moh-verified)'
  return 'rgba(148, 163, 184, 0.9)' // neutral
})

const scrollPillThumbStyle = computed<Record<string, string>>(() => {
  const h = Math.max(0, Math.floor(scrollPillHeightPx.value))
  const y = Math.max(0, Math.floor(scrollPillTopPx.value))
  return {
    height: `${h}px`,
    transform: `translateY(${y}px)`,
    background: scrollPillColor.value,
  }
})

function updateScrollPill() {
  const el = messagesScroller.value
  if (!el) return
  // Overlay track is `top-2 bottom-2` => 8px inset each side.
  const insetPx = 8
  const trackH = Math.max(0, el.clientHeight - insetPx * 2)
  const scrollable = Math.max(1, el.scrollHeight - el.clientHeight)
  if (trackH <= 0 || el.scrollHeight <= el.clientHeight + 1) {
    scrollPillHeightPx.value = 0
    scrollPillTopPx.value = 0
    scrollPillVisible.value = false
    return
  }
  const ratio = el.clientHeight / el.scrollHeight
  const minThumb = 18
  const thumbH = Math.min(trackH, Math.max(minThumb, Math.floor(trackH * ratio)))
  const maxTop = Math.max(0, trackH - thumbH)
  const scrollRatio = el.scrollTop / scrollable
  scrollPillHeightPx.value = thumbH
  scrollPillTopPx.value = Math.floor(maxTop * scrollRatio)
}

function kickScrollPillVisibility() {
  if (!scrollPillNeeded.value) {
    scrollPillVisible.value = false
    return
  }
  scrollPillVisible.value = true
  if (scrollPillHideTimer) clearTimeout(scrollPillHideTimer)
  // Best-practice-ish: keep visible briefly after interaction.
  scrollPillHideTimer = setTimeout(() => {
    scrollPillHideTimer = null
    scrollPillVisible.value = false
  }, 1200)
}

function markUserScrollIntent() {
  if (!import.meta.client) return
  lastUserScrollIntentAt = Date.now()
  kickScrollPillVisibility()
}

let scrollPillRo: ResizeObserver | null = null
watch(
  messagesScroller,
  (el, prev) => {
    if (!import.meta.client) return
    if (!scrollPillRo) scrollPillRo = new ResizeObserver(() => updateScrollPill())
    if (prev) scrollPillRo.unobserve(prev)
    if (el) {
      scrollPillRo.observe(el)
      requestAnimationFrame(() => {
        updateScrollPill()
      })
    }
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  if (scrollPillHideTimer) {
    clearTimeout(scrollPillHideTimer)
    scrollPillHideTimer = null
  }
  if (scrollPillRo) {
    scrollPillRo.disconnect()
    scrollPillRo = null
  }
})

function resetPendingNew() {
  pendingNewCount.value = 0
  pendingNewTier.value = 'normal'
}

function getMessageTier(message: Message): 'premium' | 'verified' | 'normal' {
  if (message.sender.premium) return 'premium'
  if (message.sender.verifiedStatus && message.sender.verifiedStatus !== 'none') return 'verified'
  return 'normal'
}

function maybeUpgradePendingTier(message: Message) {
  if (message.sender.id === me.value?.id) return
  const next = getMessageTier(message)
  if (pendingNewTier.value === 'premium') return
  if (pendingNewTier.value === 'verified' && next === 'normal') return
  pendingNewTier.value = next
}

function onMessagesScroll() {
  const bottom = isAtBottom()
  atBottom.value = bottom
  if (bottom) resetPendingNew()
  updateStickyDivider()
  updateScrollPill()
  // Only show pill for user-driven scrolling (programmatic scrolls shouldn't surface it).
  if (import.meta.client && Date.now() - lastUserScrollIntentAt < USER_SCROLL_GRACE_MS) {
    kickScrollPillVisibility()
  }
}

watch(messages, () => {
  void nextTick().then(() => updateStickyDivider())
})

function onPendingButtonClick() {
  scrollToBottom('smooth')
  atBottom.value = true
  resetPendingNew()
}

function shouldShowIncomingAvatar(message: Message, index: number) {
  if (!isGroupChat.value) return false
  if (message.sender.id === me.value?.id) return false
  const next = messages.value[index + 1]
  if (!next) return true
  return next.sender.id !== message.sender.id
}

const dividerEls = new Map<string, { label: string; el: HTMLElement }>()

function registerDividerEl(dayKey: string, label: string, el: unknown) {
  if (!dayKey) return
  if (!el || !(el instanceof HTMLElement)) {
    dividerEls.delete(dayKey)
    return
  }
  dividerEls.set(dayKey, { label, el })
}

function updateStickyDivider() {
  if (!import.meta.client) return
  const scroller = messagesScroller.value
  if (!scroller) return
  const target = scroller.scrollTop + 1
  let active: { label: string; top: number } | null = null
  for (const { label, el } of dividerEls.values()) {
    const top = el.offsetTop
    if (top <= target && (!active || top > active.top)) {
      active = { label, top }
    }
  }
  stickyDividerLabel.value = active?.label ?? null
}

function getDirectUser(conversation: MessageConversation) {
  return conversation.participants.find((p) => p.user.id !== me.value?.id)?.user ?? null
}

function getConversationTitle(conversation: MessageConversation) {
  if (conversation.type === 'group') {
    return conversation.title || conversation.participants.map((p) => p.user.name || p.user.username || 'User').join(', ')
  }
  const other = getDirectUser(conversation)
  return other?.name || other?.username || 'Chat'
}

function getConversationPreview(conversation: MessageConversation) {
  return conversation.lastMessage?.body || 'No chats yet.'
}

function goToProfile(user: MessageUser | null | undefined) {
  const username = (user?.username ?? '').trim()
  if (!username) return
  void navigateTo(`/u/${username}`)
}

function goPremium() {
  return navigateTo('/tiers')
}

function getConversationLastMessageTier(conversation: MessageConversation): 'premium' | 'verified' | 'normal' {
  const senderId = conversation.lastMessage?.senderId ?? null
  if (!senderId) return 'normal'
  const sender = conversation.participants.find((p) => p.user.id === senderId)?.user
  if (sender?.premium) return 'premium'
  if (sender?.verifiedStatus && sender.verifiedStatus !== 'none') return 'verified'
  return 'normal'
}

function conversationDotClass(conversation: MessageConversation): string {
  const tier = getConversationLastMessageTier(conversation)
  if (tier === 'premium') return 'bg-[var(--moh-premium)]'
  if (tier === 'verified') return 'bg-[var(--moh-verified)]'
  return 'bg-gray-300 dark:bg-white'
}

function conversationUnreadHighlightClass(conversation: MessageConversation): string {
  const tier = getConversationLastMessageTier(conversation)
  if (tier === 'premium') {
    return 'bg-[rgba(var(--moh-premium-rgb),0.06)] dark:bg-[rgba(var(--moh-premium-rgb),0.09)]'
  }
  if (tier === 'verified') {
    return 'bg-[rgba(var(--moh-verified-rgb),0.06)] dark:bg-[rgba(var(--moh-verified-rgb),0.09)]'
  }
  return 'bg-gray-100/40 dark:bg-white/6'
}

function bubbleClass(m: Message) {
  const isMe = Boolean(m.sender.id && m.sender.id === me.value?.id)

  // Tier color always corresponds to the sender's tier.
  const tier =
    m.sender.premium
      ? 'premium'
      : m.sender.verifiedStatus && m.sender.verifiedStatus !== 'none'
        ? 'verified'
        : 'normal'

  if (isMe) {
    if (tier === 'premium') return 'bg-[var(--moh-premium)] text-white'
    if (tier === 'verified') return 'bg-[var(--moh-verified)] text-white'
    return 'bg-gray-100 text-gray-800 dark:bg-zinc-900 dark:text-gray-200'
  }

  // Incoming: outlined bubble (X-like).
  if (tier === 'premium') return 'bg-transparent border border-[rgba(var(--moh-premium-rgb),0.55)] text-gray-900 dark:text-gray-100'
  if (tier === 'verified') return 'bg-transparent border border-[rgba(var(--moh-verified-rgb),0.55)] text-gray-900 dark:text-gray-100'
  return 'bg-transparent border border-gray-200 text-gray-900 dark:border-zinc-600 dark:text-gray-100'
}

async function fetchConversations(tab: 'primary' | 'requests', opts?: { cursor?: string | null; forceRefresh?: boolean }) {
  const cursor = opts?.cursor ?? null
  const forceRefresh = opts?.forceRefresh ?? false
  if (!forceRefresh && !cursor && conversations.value[tab].length > 0) return
  listLoadingByTab.value = { ...listLoadingByTab.value, [tab]: true }
  try {
    const res = await apiFetch<MessageConversation[]>('/messages/conversations', {
      query: { tab, cursor: cursor || undefined },
    }) as GetMessageConversationsResponse
    const list = res.data ?? []
    if (cursor) conversations.value[tab] = [...conversations.value[tab], ...list]
    else conversations.value[tab] = list
    nextCursorByTab.value = { ...nextCursorByTab.value, [tab]: res.pagination?.nextCursor ?? null }
  } finally {
    listLoadingByTab.value = { ...listLoadingByTab.value, [tab]: false }
  }
}

async function loadMoreConversations() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    await fetchConversations(activeTab.value, { cursor: nextCursor.value })
  } finally {
    loadingMore.value = false
  }
}

async function selectConversation(id: string, opts?: { replace?: boolean }) {
  clearMessagesPaneTimer()
  selectedConversationId.value = id
  selectedChatKey.value = id
  // Leaving draft mode (if any)
  draftRecipients.value = []
  messagesReady.value = false
  animateMessageList.value = false
  renderedChatKey.value = null
  messagesPaneState.value = 'loading'
  atBottom.value = true
  resetPendingNew()
  const replace = opts?.replace ?? false
  const currentC = typeof route.query.c === 'string' ? route.query.c : null
  if (currentC !== id) {
    const nextQuery = { ...route.query, c: id }
    if (replace) await router.replace({ query: nextQuery })
    else await router.push({ query: nextQuery })
  }
  messagesLoading.value = true
  resetTyping()
  sendingMessageIds.value = new Set()
  try {
    const res = await apiFetch<{ conversation: MessageConversation; messages: Message[] }>(
      `/messages/conversations/${id}`,
      { query: { limit: 50 } },
    ) as GetMessageConversationResponse
    const list = res.data?.messages ?? []
    messages.value = [...list].reverse()
    messagesNextCursor.value = res.pagination?.nextCursor ?? null
    await apiFetch('/messages/conversations/' + id + '/mark-read', { method: 'POST' })
    updateConversationUnread(id, 0)
    messagesReady.value = true
    messagesLoading.value = false
    // If the user switched threads mid-request, don't mount the wrong scroller.
    if (selectedChatKey.value === id) {
      revealMessagesPaneAfterFade(id)
    }
  } finally {
    messagesLoading.value = false
    if (!messagesReady.value) messagesReady.value = true
  }
}

async function clearSelection(opts?: { replace?: boolean; preserveDraft?: boolean }) {
  clearMessagesPaneTimer()
  selectedConversationId.value = null
  selectedChatKey.value = null
  if (!opts?.preserveDraft) {
    draftRecipients.value = []
  }
  messages.value = []
  messagesNextCursor.value = null
  messagesReady.value = false
  animateMessageList.value = false
  renderedChatKey.value = null
  messagesPaneState.value = 'loading'
  atBottom.value = true
  resetPendingNew()
  resetTyping()
  sendingMessageIds.value = new Set()
  const replace = opts?.replace ?? false
  const q = { ...route.query } as Record<string, any>
  delete q.c
  if (replace) await router.replace({ query: q })
  else await router.push({ query: q })
}

function syncSelectedFromRoute() {
  const c = typeof route.query.c === 'string' ? route.query.c : null
  if (c && c !== selectedConversationId.value) {
    void selectConversation(c, { replace: true })
    return
  }
  if (!c && selectedConversationId.value) {
    selectedConversationId.value = null
    selectedChatKey.value = null
  }
}

async function loadOlderMessages() {
  if (!selectedConversationId.value || !messagesNextCursor.value || loadingOlder.value) return
  loadingOlder.value = true
  try {
    const res = await apiFetch<Message[]>(`/messages/conversations/${selectedConversationId.value}/messages`, {
      query: { cursor: messagesNextCursor.value, limit: 50 },
    }) as GetMessagesResponse
    const list = res.data ?? []
    const ordered = [...list].reverse()
    messages.value = [...ordered, ...messages.value]
    messagesNextCursor.value = res.pagination?.nextCursor ?? null
  } finally {
    loadingOlder.value = false
  }
}

function updateConversationUnread(conversationId: string, unreadCount: number) {
  const update = (tab: 'primary' | 'requests') => {
    const idx = conversations.value[tab].findIndex((c) => c.id === conversationId)
    if (idx === -1) return
    const next = [...conversations.value[tab]]
    const existing = next[idx]!
    next[idx] = { ...existing, unreadCount }
    conversations.value[tab] = next
  }
  update('primary')
  update('requests')
}

function updateConversationForMessage(message: Message) {
  const updateTab = (tab: 'primary' | 'requests') => {
    const idx = conversations.value[tab].findIndex((c) => c.id === message.conversationId)
    if (idx === -1) return false
    const next = [...conversations.value[tab]]
    const existing = next[idx]!
    const unreadInc = message.sender.id === me.value?.id ? 0 : 1
    const updated: MessageConversation = {
      ...existing,
      lastMessageAt: message.createdAt,
      updatedAt: message.createdAt,
      lastMessage: { id: message.id, body: message.body, createdAt: message.createdAt, senderId: message.sender.id },
      unreadCount: selectedConversationId.value === message.conversationId ? 0 : existing.unreadCount + unreadInc,
    }
    next.splice(idx, 1)
    next.unshift(updated)
    conversations.value[tab] = next
    return true
  }

  const inPrimary = updateTab('primary')
  const inRequests = inPrimary ? false : updateTab('requests')
  if (!inPrimary && !inRequests) {
    void fetchConversations('requests', { forceRefresh: true })
    void fetchConversations('primary', { forceRefresh: true })
  }
}

async function sendCurrentMessage() {
  if (!composerText.value.trim() || sending.value) return
  let body = composerText.value
  let localId: string | null = null
  sending.value = true
  try {
    // Draft chat: first send creates the conversation.
    if (!selectedConversationId.value && isDraftChat.value) {
      if (!viewerCanStartChats.value) {
        startChatInfoVisible.value = true
        return
      }
      const res = await apiFetchData<CreateMessageConversationResponse['data']>('/messages/conversations', {
        method: 'POST',
        body: {
          user_ids: draftRecipients.value.map((u) => u.id),
          title: undefined,
          body: composerText.value,
        },
      })
      const conversationId = res?.conversationId
      composerText.value = ''
      // Refresh lists so conversation appears in primary or requests tab.
      await fetchConversations('primary', { forceRefresh: true })
      await fetchConversations('requests', { forceRefresh: true })
      if (conversationId) {
        const inPrimary = conversations.value.primary.some((c) => c.id === conversationId)
        const inRequests = conversations.value.requests.some((c) => c.id === conversationId)
        activeTab.value = inRequests && !inPrimary ? 'requests' : 'primary'
        await selectConversation(conversationId, { replace: true })
      } else {
        // If something went wrong, stay in draft mode with composer cleared.
      }
      return
    }

    if (!selectedConversationId.value) return
    const my = me.value
    if (!my) return
    // Stop typing immediately when sending.
    try {
      emitMessagesTyping(selectedConversationId.value, false)
    } catch {
      // ignore
    }

    // Optimistic message row (shows "Sending").
    body = composerText.value
    localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticSender: MessageUser = {
      id: my.id,
      username: my.username ?? null,
      name: my.name ?? null,
      premium: Boolean(my.premium),
      premiumPlus: Boolean(my.premiumPlus),
      verifiedStatus: (my.verifiedStatus ?? 'none') as 'none' | 'identity' | 'manual',
      avatarUrl: my.avatarUrl ?? null,
    }
    const optimistic: Message = {
      id: localId,
      createdAt: new Date().toISOString(),
      body,
      conversationId: selectedConversationId.value,
      sender: optimisticSender,
    }
    messages.value = [...messages.value, ({ ...optimistic, __clientKey: localId } as ChatMessage)]
    sendingMessageIds.value = new Set([...sendingMessageIds.value, localId])
    composerText.value = ''
    await nextTick()
    scrollToBottom('smooth')

    const res = await apiFetchData<SendMessageResponse['data']>(
      `/messages/conversations/${selectedConversationId.value}/messages`,
      {
        method: 'POST',
        body: { body },
      },
    )
    const msg = res?.message
    if (msg) {
      // Replace optimistic row content in-place (stable row key), or append if missing.
      const merged = localId ? mergeServerMessageIntoOptimistic(localId, msg) : false
      if (!merged) {
        const exists = messages.value.some((m) => m.id === msg.id)
        if (!exists) {
          messages.value = [...messages.value, msg]
          markMessageAnimated(msg.id)
        }
      }

      // Clear sending state.
      const sendingNext = new Set(sendingMessageIds.value)
      sendingNext.delete(localId)
      sendingMessageIds.value = sendingNext

      updateConversationForMessage(msg)
      await nextTick()
      scrollToBottom('smooth')
      resetPendingNew()
    }
    // Ensure optimistic row doesn't linger if API returned no message.
    if (!msg) {
      messages.value = messages.value.filter((m) => m.id !== localId)
      const sendingNext = new Set(sendingMessageIds.value)
      sendingNext.delete(localId)
      sendingMessageIds.value = sendingNext
      composerText.value = body
    }
    if (selectedConversation.value?.viewerStatus === 'pending') {
      await fetchConversations('primary', { forceRefresh: true })
      await fetchConversations('requests', { forceRefresh: true })
    }
  } catch (e) {
    // Remove optimistic row and restore composer text.
    if (localId) {
      messages.value = messages.value.filter((m) => m.id !== localId)
      const sendingNext = new Set(sendingMessageIds.value)
      sendingNext.delete(localId)
      sendingMessageIds.value = sendingNext
    }
    if (body && !composerText.value.trim()) composerText.value = body
  } finally {
    sending.value = false
  }
}

async function acceptSelectedConversation() {
  if (!selectedConversationId.value) return
  await apiFetch(`/messages/conversations/${selectedConversationId.value}/accept`, { method: 'POST' })
  await fetchConversations('primary', { forceRefresh: true })
  await fetchConversations('requests', { forceRefresh: true })
}

function setTab(tab: 'primary' | 'requests') {
  activeTab.value = tab
  void fetchConversations(tab, { forceRefresh: true })
}

function openNewDialog() {
  if (!viewerCanStartChats.value) {
    startChatInfoVisible.value = true
    return
  }
  newDialogVisible.value = true
  recipientQuery.value = ''
  recipientResults.value = []
  selectedRecipients.value = []
  newConversationError.value = null
}

function openBlocksDialog() {
  blocksDialogVisible.value = true
  void fetchBlocks()
}

let recipientSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(recipientQuery, (val) => {
  recipientError.value = null
  if (recipientSearchTimer) clearTimeout(recipientSearchTimer)
  const q = val.trim()
  if (q.length < 2) {
    recipientResults.value = []
    return
  }
  recipientSearchTimer = setTimeout(async () => {
    recipientLoading.value = true
    try {
      const res = await apiFetchData<FollowListUser[]>('/search', {
        query: { type: 'users', q, limit: 8 },
      })
      const filtered = (res ?? []).filter((u) => u.id !== me.value?.id)
      recipientResults.value = filtered
    } catch (e) {
      recipientError.value = getApiErrorMessage(e) || 'Failed to search users.'
    } finally {
      recipientLoading.value = false
    }
  }, 250)
})

function addRecipient(user: FollowListUser) {
  if (selectedRecipients.value.find((u) => u.id === user.id)) return
  selectedRecipients.value = [...selectedRecipients.value, user]
  recipientQuery.value = ''
  recipientResults.value = []
}

function removeRecipient(userId: string) {
  selectedRecipients.value = selectedRecipients.value.filter((u) => u.id !== userId)
}

async function createConversation() {
  // Start a draft chat or jump to an existing conversation.
  if (!canStartDraft.value) return
  if (!viewerCanStartChats.value) {
    startChatInfoVisible.value = true
    return
  }
  newConversationError.value = null
  try {
    newDialogVisible.value = false
    const res = await apiFetchData<LookupMessageConversationResponse['data']>('/messages/lookup', {
      method: 'POST',
      body: { user_ids: selectedRecipients.value.map((u) => u.id) },
    })
    const conversationId = res?.conversationId ?? null
    if (conversationId) {
      await selectConversation(conversationId, { replace: true })
      return
    }

    draftRecipients.value = [...selectedRecipients.value]
    // Clear any selected existing chat and show draft pane.
    await clearSelection({ replace: true, preserveDraft: true })
    selectedChatKey.value = 'draft'
    messagesReady.value = true
    animateMessageList.value = false
    messagesPaneState.value = 'ready'
    renderedChatKey.value = 'draft'
  } catch (e) {
    newConversationError.value = getApiErrorMessage(e) || 'Failed to send message.'
  } finally {
    // no-op
  }
}

async function fetchBlocks() {
  blocksLoading.value = true
  try {
    const res = await apiFetch<MessageBlockListItem[]>('/messages/blocks') as GetMessageBlocksResponse
    blocks.value = res.data ?? []
  } finally {
    blocksLoading.value = false
  }
}

async function blockUser(userId: string) {
  await apiFetch('/messages/blocks', { method: 'POST', body: { user_id: userId } })
  await fetchBlocks()
  await clearSelection({ replace: true })
  await fetchConversations('primary', { forceRefresh: true })
  await fetchConversations('requests', { forceRefresh: true })
}

async function unblockUser(userId: string) {
  await apiFetch(`/messages/blocks/${userId}`, { method: 'DELETE' })
  await fetchBlocks()
  await fetchConversations('primary', { forceRefresh: true })
  await fetchConversations('requests', { forceRefresh: true })
}

async function blockDirectUser() {
  const convo = selectedConversation.value
  if (!convo || convo.type !== 'direct') return
  const other = getDirectUser(convo)
  if (!other?.id) return
  await blockUser(other.id)
}

const presenceInterestIds = computed(() => {
  const ids = new Set<string>()
  for (const list of [conversations.value.primary, conversations.value.requests]) {
    for (const convo of list) {
      if (convo.type !== 'direct') continue
      const other = getDirectUser(convo)
      if (other?.id) ids.add(other.id)
    }
  }
  return [...ids]
})

const presenceAddedIds = ref<Set<string>>(new Set())
watch(
  presenceInterestIds,
  (newIds) => {
    const added = presenceAddedIds.value
    const toRemove = [...added].filter((id) => !newIds.includes(id))
    const toAdd = newIds.filter((id) => !added.has(id))
    if (toRemove.length) {
      removeInterest(toRemove)
      toRemove.forEach((id) => added.delete(id))
    }
    if (toAdd.length) {
      addInterest(toAdd)
      toAdd.forEach((id) => added.add(id))
    }
  },
  { immediate: true },
)

const messageCallback = {
  onMessage: (payload: { conversationId?: string; message?: unknown }) => {
    const msg = payload?.message as Message | undefined
    if (!msg?.conversationId) return
    updateConversationForMessage(msg)
    if (selectedConversationId.value === msg.conversationId) {
      const shouldStick = isAtBottom()
      atBottom.value = shouldStick
      // If this is our own sent message, prefer reconciling it into an optimistic local row.
      reconcileOptimisticSend(msg)
      const exists = messages.value.some((m) => m.id === msg.id)
      if (!exists) {
        messages.value = [...messages.value, msg]
        markMessageAnimated(msg.id)
      }
      if (shouldStick) {
        void nextTick().then(() => {
          scrollToBottom('smooth')
          // One more frame to handle any layout updates (e.g. typing row enter/leave).
          requestAnimationFrame(() => scrollToBottom('smooth'))
        })
      } else if (msg.sender.id !== me.value?.id) {
        pendingNewCount.value += 1
        maybeUpgradePendingTier(msg)
      }
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void apiFetch(`/messages/conversations/${msg.conversationId}/mark-read`, { method: 'POST' })
        updateConversationUnread(msg.conversationId, 0)
      }
    }
  },
  onTyping: (payload: { conversationId?: string; userId?: string; typing?: boolean }) => {
    const convoId = payload?.conversationId ?? null
    const userId = payload?.userId ?? null
    if (!convoId || !userId) return
    if (route.path !== '/chat') return
    if (userId === me.value?.id) return
    setRemoteTyping(convoId, userId, payload?.typing)
  },
  onRead: (payload: { conversationId?: string; userId?: string; lastReadAt?: string }) => {
    const convoId = String(payload?.conversationId ?? '').trim()
    if (!convoId) return
    // Self-only event: another tab/device marked this conversation read.
    updateConversationUnread(convoId, 0)
    // If we currently have this conversation open, ensure UI stays consistent.
    if (selectedConversationId.value === convoId) {
      pendingNewCount.value = 0
    }
  },
}

onMounted(() => {
  if (!viewerIsVerified.value) return
  try {
    prefersReducedMotion.value = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
  } catch {
    // ignore
  }
  addMessagesCallback(messageCallback)
  emitMessagesScreen(true)
  ;(async () => {
    try {
      await fetchConversations('primary', { forceRefresh: true })
      if (selectedConversationId.value) {
        await selectConversation(selectedConversationId.value, { replace: true })
      }
      revealChatScreenAfterFade()
      // Prefetch requests tab in background.
      void fetchConversations('requests')
    } catch {
      // Even if fetch fails, show the screen so errors/empty states can render.
      revealChatScreenAfterFade()
    }
  })()
})

onBeforeUnmount(() => {
  clearChatBootTimer()
  clearMessagesPaneTimer()
  removeMessagesCallback(messageCallback)
  emitMessagesScreen(false)
  for (const t of recentAnimatedTimers.value.values()) clearTimeout(t)
  recentAnimatedTimers.value.clear()
})

watch(isSocketConnected, (connected) => {
  if (!viewerIsVerified.value) return
  if (connected && route.path === '/chat') emitMessagesScreen(true)
})

watch(
  () => route.query.c,
  () => {
    syncSelectedFromRoute()
  },
)

watch(
  () => selectedChatKey.value,
  () => {
    if (!import.meta.client) return
    if (!viewerIsVerified.value) return
    // Desktop: keep focus on the chat composer when switching threads.
    // Mobile: avoid auto-focus so the keyboard doesn't pop when selecting a chat.
    if (isTinyViewport.value) return
    void nextTick(() => dmComposerRef.value?.focus?.())
  },
  { flush: 'post' },
)

watch(
  renderedChatKey,
  (key) => {
    if (!import.meta.client) return
    if (!key) return
    void nextTick().then(() => {
      const el = messagesScroller.value
      if (el) onMessagesScrollerMounted(el)
    })
  },
  { flush: 'post' },
)
</script>

<style scoped>
.moh-chat-row-surface {
  transition: background-color 180ms ease, color 180ms ease;
}

.moh-chat-row-dot {
  transition: opacity 180ms ease;
}

.moh-dot-enter-active,
.moh-dot-leave-active {
  transition: opacity 180ms ease;
}

.moh-dot-enter-from,
.moh-dot-leave-to {
  opacity: 0;
}

.moh-chat-row-move {
  transition: transform 220ms ease;
}

.moh-chat-scroll-hide {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}

:deep(.moh-chat-scroll-hide::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}
</style>

