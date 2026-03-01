<template>
  <AppPageContent class="flex min-h-0 flex-1 flex-col">
    <div v-if="!viewerIsVerified && !viewerIsPremium" class="flex min-h-0 flex-1 items-center justify-center px-4 py-12">
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
            @open-blocks="navigateTo('/settings/blocked')"
            @load-more="loadMoreConversations"
          />

          <!-- Right column: chat for selected thread (edge-to-edge column, consistent content margins) -->
          <section v-if="showChatPane" class="h-full overflow-hidden">
            <div class="flex h-full min-h-0 flex-col">
              <div class="shrink-0 border-b border-gray-200 px-4 py-2 sm:py-3 dark:border-zinc-800">
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
                        <AppUserAvatar :user="headerAvatarUser" size-class="h-9 w-9 sm:h-10 sm:w-10" />
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
                              :is-organization="headerDirectUser.isOrganization"
                              :steward-badge-enabled="headerDirectUser.stewardBadgeEnabled ?? true"
                            />
                          </template>
                          <template v-else-if="selectedConversation?.type === 'group' && !selectedConversation?.title">
                            <span class="min-w-0 truncate">
                              <template v-if="headerMembers.length">
                                <template v-for="(member, index) in headerMembers" :key="`header-title-${member.id}`">
                                  <button
                                    type="button"
                                    class="hover:underline cursor-pointer"
                                    :aria-label="member.username ? `View @${member.username}` : 'View profile'"
                                    @click="goToProfile(member.user)"
                                    @mouseenter="(e) => onUserPreviewEnter(member.username, e)"
                                    @mousemove="onUserPreviewMove"
                                    @mouseleave="onUserPreviewLeave"
                                  >
                                    {{ member.label }}
                                  </button>
                                  <span v-if="index < headerMembers.length - 1">, </span>
                                </template>
                              </template>
                              <template v-else>
                                Group chat
                              </template>
                            </span>
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
                            <template v-if="headerMembers.length">
                              <template v-for="(member, index) in headerMembers" :key="member.id">
                                <button
                                  type="button"
                                  class="font-semibold hover:underline cursor-pointer"
                                  :class="member.toneClass"
                                  :aria-label="member.username ? `View @${member.username}` : 'View profile'"
                                  @click="goToProfile(member.user)"
                                  @mouseenter="(e) => onUserPreviewEnter(member.username, e)"
                                  @mousemove="onUserPreviewMove"
                                  @mouseleave="onUserPreviewLeave"
                                >
                                  {{ member.label }}
                                </button>
                                <span v-if="index < headerMembers.length - 1">, </span>
                              </template>
                            </template>
                            <template v-else>
                              Group chat
                            </template>
                          </template>
                          <template v-else-if="selectedConversation?.type === 'direct'">
                            <button
                              v-if="headerDirectUser?.username"
                              type="button"
                              class="hover:underline cursor-pointer"
                              :aria-label="`View @${headerDirectUser.username}`"
                              @click="goToProfile(headerDirectUser)"
                              @mouseenter="(e) => onUserPreviewEnter(headerDirectUser?.username, e)"
                              @mousemove="onUserPreviewMove"
                              @mouseleave="onUserPreviewLeave"
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
                :available-reactions="availableReactions"
                :participants="otherParticipants"
                @load-older="loadOlderMessages"
                @react="handleReact"
                @reply="handleReply"
                @info="handleInfo"
                @delete-for-me="handleDeleteForMe"
                @restore="handleRestore"
                @scroll-to-reply="handleScrollToReply"
              />

              <Transition name="moh-typing-fade">
                <div
                  v-if="typingUsersTotalCount > 0"
                  class="w-full px-4 pb-2 mt-3 text-sm text-gray-500 dark:text-gray-400"
                  role="status"
                  aria-live="polite"
                >
                  <div class="flex w-full items-center gap-2">
                    <div class="h-7 w-7 shrink-0" aria-hidden="true" />
                    <div class="truncate">
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
                  </div>
                </div>
              </Transition>
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
              <div
                class="w-full rounded-full transition-[height,transform] duration-150 ease-out will-change-transform"
                :style="scrollPillThumbStyle"
              />
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
          <div v-else class="flex-1 flex items-center justify-center px-4 py-12">
            <div class="w-full max-w-lg">
              <div class="rounded-2xl border moh-border moh-bg p-5 shadow-sm">
                <div class="text-lg font-semibold moh-text">Select a conversation</div>
                <div class="mt-1 text-sm moh-text-muted">
                  Pick a conversation from the left, or start a new one.
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedChatKey" class="shrink-0 border-t border-gray-200 px-4 py-2 sm:py-2.5 dark:border-zinc-800" :style="composerBarStyle">
            <div v-if="selectedConversation?.viewerStatus === 'pending'" class="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              This is a chat request. Replying accepts it and moves it to your inbox.
              <div class="mt-2 flex items-center gap-2">
                <Button label="Accept" size="small" severity="secondary" @click="acceptSelectedConversation" />
                <Button label="Delete" size="small" text severity="secondary" @click="deleteSelectedConversation" />
              </div>
            </div>
            <div
              v-if="selectedConversation?.isBlockedWith"
              class="mb-3 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <Icon name="tabler:ban" class="shrink-0 text-zinc-400" aria-hidden="true" />
              <span v-if="headerDirectUser && blockState.isBlockedByMe(headerDirectUser.id)">
                You've blocked <strong class="font-semibold text-white">@{{ headerDirectUser.username }}</strong>. You can read past messages but can't send new ones.
                <NuxtLink to="/settings/blocked" class="ml-1 underline text-zinc-300">Manage in Settings.</NuxtLink>
              </span>
              <span v-else>
                <strong class="font-semibold text-white">@{{ headerDirectUser?.username }}</strong> has blocked you. You can read past messages but can't send new ones.
              </span>
            </div>
            <AppInlineAlert v-if="sendError" class="mb-2" severity="danger">{{ sendError }}</AppInlineAlert>
            <AppDmComposer
              v-if="!selectedConversation?.isBlockedWith"
              ref="dmComposerRef"
              v-model="composerText"
              :user="composerUser"
              placeholder="Type a chat…"
              :loading="sending"
              :auto-focus="!isTabBarMode"
              :reply-to="replyToMessage ? { id: replyToMessage.id, senderUsername: replyToMessage.sender.username, bodyPreview: replyToMessage.body.slice(0, 200), mediaThumbnailUrl: replyToMessage.media?.[0]?.thumbnailUrl ?? replyToMessage.media?.[0]?.url ?? null } : null"
              @send="sendCurrentMessage"
              @cancel-reply="replyToMessage = null"
            />
          </div>
        </div>
      </section>
    </div>

    <ChatMessageInfoModal
      v-model="infoModalVisible"
      :message="infoMessage"
      :participants="selectedConversation?.participants ?? []"
    />

    <Dialog
      v-model:visible="startChatInfoVisible"
      modal
      header="Can't start this chat"
      :style="{ width: '28rem', maxWidth: '92vw' }"
    >
      <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <p>
          You need a verified account to send messages.
        </p>
      </div>
      <template #footer>
        <Button label="Got it" severity="secondary" @click="startChatInfoVisible = false" />
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
          <InputText
            v-model="recipientQuery"
            class="w-full"
            placeholder="Search for a username or display name…"
            aria-label="Recipient search"
            autofocus
          />
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
            <AppUserIdentityLine :user="u" class="min-w-0 flex-1" />
          </button>
        </div>
        <div v-if="selectedRecipients.length" class="flex flex-wrap gap-2">
          <span
            v-for="u in selectedRecipients"
            :key="u.id"
            class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs"
            :style="recipientTagStyle(u)"
          >
            <AppUserAvatar :user="u" size-class="h-5 w-5" />
            <span class="font-medium">@{{ u.username }}</span>
            <button
              type="button"
              class="opacity-60 hover:opacity-100 transition-opacity leading-none"
              @click="removeRecipient(u.id)"
            >
              <Icon name="tabler:x" class="h-3 w-3" aria-hidden="true" />
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
  LookupMessageConversationResponse,
  Message,
  MessageUser,
  MessageConversation,
  MessageReaction,
  SendMessageResponse,
  CreateMessageConversationResponse,
  UserPreview,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useChatBubbleShape } from '~/composables/chat/useChatBubbleShape'
import { useChatTimeFormatting } from '~/composables/chat/useChatTimeFormatting'
import { useChatTyping } from '~/composables/chat/useChatTyping'
import ChatConversationList from '~/components/app/chat/ChatConversationList.vue'
import ChatMessageList from '~/components/app/chat/ChatMessageList.vue'
import ChatMessageInfoModal from '~/components/app/chat/ChatMessageInfoModal.vue'
import { useMediaQuery } from '@vueuse/core'
import { userColorTier, type UserColorTier } from '~/utils/user-tier'

const { apiFetch, apiFetchData } = useApiClient()
const route = useRoute()
const router = useRouter()
const { user: me, ensureLoaded } = useAuth()
const viewerIsVerified = computed(() => (me.value?.verifiedStatus ?? 'none') !== 'none')
const viewerIsPremium = computed(() => Boolean(me.value?.premium || me.value?.premiumPlus))
// Any verified or premium user can start new chats; non-premium can't start with premium recipients (API enforces).
const viewerCanStartChats = computed(() => viewerIsVerified.value || viewerIsPremium.value)
const CHAT_BOOT_FADE_MS = 160
const MESSAGES_PANE_FADE_MS = 160
const prefersReducedMotion = ref(false)
const chatBootState = ref<'loading' | 'fading' | 'ready'>('loading')
const messagesPaneState = ref<'loading' | 'fading' | 'ready'>('loading')
let chatBootTimer: ReturnType<typeof setTimeout> | null = null
let messagesPaneTimer: ReturnType<typeof setTimeout> | null = null

const composerBarStyle = computed<Record<string, string>>(() => ({
  paddingBottom: 'calc(var(--moh-safe-bottom, 0px) - 4px)',
}))
const scrollToBottomButtonStyle = computed<Record<string, string>>(() => ({
  bottom: 'calc(var(--moh-safe-bottom, 0px) + 1rem)',
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
  suppressMessageUnreadBumpsForMs,
  isSocketConnected,
} = usePresence()
const { showRequests, displayRequests, toneClass } = useMessagesBadge()

const activeTab = ref<'primary' | 'requests'>('primary')
type MessageTone = UserColorTier
type MessageConversationWithTone = MessageConversation & { unreadTone?: MessageTone }

const conversations = ref<{ primary: MessageConversationWithTone[]; requests: MessageConversationWithTone[] }>({
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

type ChatMessage = Message & { __clientKey?: string }
const messages = ref<ChatMessage[]>([])
const { buildMessagesWithDividers, formatListTime, formatMessageTime, formatMessageTimeFull } = useChatTimeFormatting()
const messagesWithDividers = computed(() => buildMessagesWithDividers(messages.value))
const stickyDividerLabel = ref<string | null>(null)
const messagesNextCursor = ref<string | null>(null)
const messagesLoading = ref(false)
const loadingOlder = ref(false)
const sending = ref(false)
const composerText = ref('')
const sendError = ref<string | null>(null)

// Message actions
const replyToMessage = ref<Message | null>(null)
const infoMessage = ref<Message | null>(null)
const infoModalVisible = ref(false)
const availableReactions = ref<import('~/types/api').MessageReaction[]>([])
const composerUser = computed(() =>
  me.value
    ? {
        premium: Boolean(me.value.premium),
        verifiedStatus: me.value.verifiedStatus ?? 'none',
      }
    : null,
)
const messagesScroller = ref<HTMLElement | null>(null)
const dmComposerRef = ref<{ focus?: () => void; getMedia?: () => import('~/composables/composer/types').CreateMediaPayload[]; clearMedia?: () => void } | null>(null)
const messagesReady = ref(false)
const pendingNewCount = ref(0)
const pendingNewTier = ref<MessageTone>('normal')
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
let recentAnimatedTimers = new Map<string, ReturnType<typeof setTimeout>>()
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

// --- Helpers ---

function clearSendingId(localId: string) {
  const next = new Set(sendingMessageIds.value)
  next.delete(localId)
  sendingMessageIds.value = next
}

/** Swap an optimistic row in-place and deduplicate any server-message that already landed elsewhere. */
function replaceOptimisticAtIndex(list: ChatMessage[], idx: number, serverMsg: Message, localId: string): ChatMessage[] {
  const next = [...list]
  next[idx] = { ...serverMsg, __clientKey: localId } as ChatMessage
  return next.filter((m, j) => j === idx || m.id !== serverMsg.id)
}

/**
 * Update a conversation row in both tab lists.
 * Returns true if the conversation was found in at least one tab.
 * Pass `moveToTop: true` to splice it to the front (e.g. when a new message arrives).
 */
function patchConversation(
  conversationId: string,
  updater: (c: MessageConversationWithTone) => MessageConversationWithTone,
  opts?: { moveToTop?: boolean },
): boolean {
  let found = false
  for (const tab of ['primary', 'requests'] as const) {
    const idx = conversations.value[tab].findIndex((c) => c.id === conversationId)
    if (idx === -1) continue
    const next = [...conversations.value[tab]]
    const updated = updater(next[idx]!)
    if (opts?.moveToTop) {
      next.splice(idx, 1)
      next.unshift(updated)
    } else {
      next[idx] = updated
    }
    conversations.value[tab] = next
    found = true
  }
  return found
}

async function refreshAllConversationTabs() {
  await Promise.all([
    fetchConversations('primary', { forceRefresh: true }),
    fetchConversations('requests', { forceRefresh: true }),
  ])
  // If the user is on the primary tab with nothing in it but requests has conversations,
  // auto-switch so inbound chat requests don't silently pile up out of view.
  if (activeTab.value === 'primary' && conversations.value.primary.length === 0 && conversations.value.requests.length > 0) {
    activeTab.value = 'requests'
  }
}

// --- Optimistic message reconciliation ---

function reconcileOptimisticSend(serverMsg: Message): boolean {
  const myId = me.value?.id ?? null
  if (!myId || serverMsg.sender.id !== myId || !serverMsg.conversationId) return false
  const sendingIds = sendingMessageIds.value
  if (!sendingIds.size) return false

  const list = messages.value
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i]!
    if (!sendingIds.has(m.id) || !m.id.startsWith('local-')) continue
    if (m.conversationId !== serverMsg.conversationId) continue
    if (m.body.trim() !== serverMsg.body.trim()) continue

    messages.value = replaceOptimisticAtIndex(list, i, serverMsg, m.id)
    clearSendingId(m.id)
    return true
  }
  return false
}

function mergeServerMessageIntoOptimistic(localId: string, serverMsg: Message): boolean {
  const list = messages.value
  const idx = list.findIndex((m) => m.id === localId)
  if (idx === -1) return false
  messages.value = replaceOptimisticAtIndex(list, idx, serverMsg, localId)
  return true
}
function markMessageAnimated(id: string) {
  const mid = (id ?? '').trim()
  if (!mid) return
  const next = new Set(recentAnimatedMessageIds.value)
  next.add(mid)
  recentAnimatedMessageIds.value = next
  const existing = recentAnimatedTimers.get(mid)
  if (existing) clearTimeout(existing)
  recentAnimatedTimers.set(mid, setTimeout(() => {
    const n = new Set(recentAnimatedMessageIds.value)
    n.delete(mid)
    recentAnimatedMessageIds.value = n
    recentAnimatedTimers.delete(mid)
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

watch(
  () => typingUsersTotalCount.value,
  () => {
    if (!import.meta.client) return
    if (!selectedChatKey.value) return
    if (!atBottom.value) return
    requestAnimationFrame(() => scrollToBottom('auto'))
  },
  { flush: 'post' },
)

const newDialogVisible = ref(false)
const startChatInfoVisible = ref(false)
const recipientQuery = ref('')
const recipientResults = ref<FollowListUser[]>([])
const recipientLoading = ref(false)
const recipientError = ref<string | null>(null)
const selectedRecipients = ref<FollowListUser[]>([])
const newConversationError = ref<string | null>(null)

const draftRecipients = ref<FollowListUser[]>([])

const blockState = useBlockState()

const activeList = computed(() => conversations.value[activeTab.value])
const nextCursor = computed(() => nextCursorByTab.value[activeTab.value])
const listLoading = computed(() => listLoadingByTab.value[activeTab.value])
// Drive the requests tab badge from local state so it clears immediately when a request
// is accessed (unreadCount → 0) or deleted (removed from the list). The global nav badge
// still uses the server-pushed count from useMessagesBadge.
const requestsBadgeCount = computed(() => conversations.value.requests.filter((c) => c.unreadCount > 0).length)
const showRequestsBadge = computed(() => requestsBadgeCount.value > 0)
const requestsBadgeText = computed(() => (requestsBadgeCount.value >= 99 ? '99+' : String(requestsBadgeCount.value)))
const badgeToneClass = computed(() => toneClass.value)

const canStartDraft = computed(() => selectedRecipients.value.length > 0)

const pendingButtonClass = computed(() => {
  // When there are unread/new messages below, keep the tier color treatment.
  if (pendingNewCount.value > 0) {
    if (pendingNewTier.value === 'organization') return 'bg-[var(--moh-org)] text-white'
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
const isTabBarMode = useMediaQuery('(max-width: 639px)')

const { isTinyViewport, showListPane, showDetailPane: showChatPane, gridStyle } = useTwoPaneLayout(selectedChatKey, {
  // Cap left at 22rem but never more than 45% so the chat panel is always at least as wide.
  leftCols: 'min(22rem, 45%)',
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
  const tier = userColorTier(u as any)
  if (tier === 'organization') return 'text-[var(--moh-org)]'
  if (tier === 'premium') return 'text-[var(--moh-premium)]'
  if (tier === 'verified') return 'text-[var(--moh-verified)]'
  return 'text-gray-700 dark:text-gray-200'
}

const headerMembers = computed(() => {
  if (selectedConversation.value?.type !== 'group') return []
  return selectedConversation.value.participants
    .map((p) => p.user ?? null)
    .filter((u): u is MessageUser => Boolean(u))
    .filter((u) => u.id !== me.value?.id)
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

const otherParticipants = computed(() =>
  (selectedConversation.value?.participants ?? []).filter((p) => p.user.id !== me.value?.id),
)

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
const BOTTOM_THRESHOLD = 24

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
  const tier = userColorTier(me.value as any)
  if (tier === 'organization') return 'var(--moh-org)'
  if (tier === 'premium') return 'var(--moh-premium)'
  if (tier === 'verified') return 'var(--moh-verified)'
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

function markSelectedConversationReadIfVisible(conversationId: string) {
  const id = (conversationId ?? '').trim()
  if (!id) return
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
  void apiFetch(`/messages/conversations/${id}/mark-read`, { method: 'POST' }).catch(() => {
    // Non-fatal: badge will eventually sync from server.
  })
  updateConversationUnread(id, 0)
}

function getMessageTier(message: Message): MessageTone {
  return userColorTier(message.sender as any)
}

function setPendingTierFromIncoming(message: Message) {
  if (message.sender.id === me.value?.id) return
  // UX: the button tint should match the last non-self sender while you're scrolled up.
  pendingNewTier.value = getMessageTier(message)
}

function onMessagesScroll() {
  const wasAtBottom = atBottom.value
  const bottom = isAtBottom()
  atBottom.value = bottom
  if (bottom) {
    // Only clear pending state when the user actually reaches bottom.
    const convoId = selectedConversationId.value
    const shouldMarkRead = !wasAtBottom && pendingNewCount.value > 0 && Boolean(convoId)
    resetPendingNew()
    if (shouldMarkRead && convoId) markSelectedConversationReadIfVisible(convoId)
  }
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
  const convoId = selectedConversationId.value
  if (convoId) {
    void nextTick().then(() => {
      requestAnimationFrame(() => markSelectedConversationReadIfVisible(convoId))
    })
  }
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

const pop = useUserPreviewPopover()
const { onMove: onUserPreviewMove, onLeave: onUserPreviewLeave } = useUserPreviewTrigger({ username: '' })
function onUserPreviewEnter(username: string | null | undefined, event: MouseEvent) {
  const u = (username ?? '').trim()
  if (!u) return
  pop.onTriggerEnter({ username: u, event })
}

function goToProfile(user: MessageUser | null | undefined) {
  const username = (user?.username ?? '').trim()
  if (!username) return
  void navigateTo(`/u/${username}`)
}

function goPremium() {
  return navigateTo('/tiers')
}

function getConversationLastMessageTier(conversation: MessageConversationWithTone): MessageTone {
  // If there are unread messages and we've tracked the last incoming tier, prefer it for unread indicators.
  const tracked = conversation.unreadTone
  if (conversation.unreadCount > 0 && tracked) return tracked
  const senderId = conversation.lastMessage?.senderId ?? null
  if (!senderId) return 'normal'
  const sender = conversation.participants.find((p) => p.user.id === senderId)?.user
  return userColorTier(sender as any)
}

const ORG_CHAT_SILVER_DOT_CLASS = 'bg-[#313643] text-white'
const ORG_CHAT_SILVER_UNREAD_CLASS = 'bg-[rgba(49,54,67,0.24)] dark:bg-[rgba(49,54,67,0.34)]'
const ORG_CHAT_SILVER_FILLED_BUBBLE_CLASS = 'bg-[#313643] text-white'
const ORG_CHAT_SILVER_OUTLINE_BUBBLE_CLASS = 'bg-transparent border border-[rgba(49,54,67,0.96)] text-gray-900 dark:text-gray-100'

function conversationDotClass(conversation: MessageConversation): string {
  const tier = getConversationLastMessageTier(conversation)
  if (tier === 'organization') return ORG_CHAT_SILVER_DOT_CLASS
  if (tier === 'premium') return 'bg-[var(--moh-premium)] text-white'
  if (tier === 'verified') return 'bg-[var(--moh-verified)] text-white'
  return 'bg-gray-700 text-white dark:bg-white dark:text-black'
}

function conversationUnreadHighlightClass(conversation: MessageConversation): string {
  const tier = getConversationLastMessageTier(conversation)
  if (tier === 'organization') return ORG_CHAT_SILVER_UNREAD_CLASS
  if (tier === 'premium') return 'bg-[rgba(var(--moh-premium-rgb),0.06)] dark:bg-[rgba(var(--moh-premium-rgb),0.09)]'
  if (tier === 'verified') {
    return 'bg-[rgba(var(--moh-verified-rgb),0.06)] dark:bg-[rgba(var(--moh-verified-rgb),0.09)]'
  }
  return 'bg-gray-100/40 dark:bg-white/6'
}

function bubbleClass(m: Message) {
  const isMe = Boolean(m.sender.id && m.sender.id === me.value?.id)

  // Tier color always corresponds to the sender's tier.
  const tier = userColorTier(m.sender as any)

  if (isMe) {
    if (tier === 'organization') return ORG_CHAT_SILVER_FILLED_BUBBLE_CLASS
    if (tier === 'premium') return 'bg-[var(--moh-premium)] text-white'
    if (tier === 'verified') return 'bg-[var(--moh-verified)] text-white'
    return 'bg-gray-100 text-gray-800 dark:bg-zinc-900 dark:text-gray-200'
  }

  // Incoming: outlined bubble (X-like).
  if (tier === 'organization') return ORG_CHAT_SILVER_OUTLINE_BUBBLE_CLASS
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
    const res = await apiFetch<MessageConversationWithTone[]>('/messages/conversations', {
      query: { tab, cursor: cursor || undefined },
    })
    const list = res.data ?? []
    if (cursor) conversations.value[tab] = [...conversations.value[tab], ...list]
    else conversations.value[tab] = list
    nextCursorByTab.value = { ...nextCursorByTab.value, [tab]: res.pagination?.nextCursor ?? null }
  } finally {
    listLoadingByTab.value = { ...listLoadingByTab.value, [tab]: false }
  }
}

let selectConversationReqSeq = 0
let loadOlderReqSeq = 0

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
  const reqSeq = ++selectConversationReqSeq
  clearMessagesPaneTimer()
  dividerEls.clear()
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
  // If an older-messages request is in flight, ensure a thread switch doesn't get blocked by it.
  loadingOlder.value = false
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
    )
    // If the user switched threads mid-request, ignore this response.
    if (reqSeq !== selectConversationReqSeq || selectedConversationId.value !== id) return
    const list = res.data?.messages ?? []
    messages.value = [...list].reverse()
    messagesNextCursor.value = res.pagination?.nextCursor ?? null
    // Patch `isBlockedWith` from the conversation detail into the list row.
    if (typeof res.data?.conversation?.isBlockedWith === 'boolean') {
      updateConversationIsBlockedWith(id, res.data.conversation.isBlockedWith)
    }
    try {
      await apiFetch('/messages/conversations/' + id + '/mark-read', { method: 'POST' })
      // If the user switched threads mid-request, don't mutate list state.
      if (reqSeq !== selectConversationReqSeq || selectedConversationId.value !== id) return
      updateConversationUnread(id, 0)
    } catch {
      // Non-fatal: keep showing messages even if mark-read fails.
    }
    messagesReady.value = true
    messagesLoading.value = false
    // If the user switched threads mid-request, don't mount the wrong scroller.
    if (selectedChatKey.value === id) {
      revealMessagesPaneAfterFade(id)
    }
  } finally {
    // Only finalize loading flags for the latest request.
    if (reqSeq === selectConversationReqSeq) {
      messagesLoading.value = false
      if (!messagesReady.value) messagesReady.value = true
    }
  }
}

async function clearSelection(opts?: { replace?: boolean; preserveDraft?: boolean }) {
  // Invalidate any in-flight selection request so late responses can't mutate state.
  selectConversationReqSeq++
  loadingOlder.value = false
  clearMessagesPaneTimer()
  dividerEls.clear()
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
  replyToMessage.value = null
  messagesLoading.value = false
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
    void clearSelection({ replace: true })
  }
}

async function loadOlderMessages() {
  if (!selectedConversationId.value || !messagesNextCursor.value || loadingOlder.value) return
  const reqSeq = ++loadOlderReqSeq
  const conversationId = selectedConversationId.value
  const cursor = messagesNextCursor.value
  loadingOlder.value = true
  try {
    const res = await apiFetch<Message[]>(`/messages/conversations/${conversationId}/messages`, {
      query: { cursor, limit: 50 },
    })
    // If the user switched threads (or another newer older-messages request ran), ignore this response.
    if (reqSeq !== loadOlderReqSeq || selectedConversationId.value !== conversationId) return
    const list = res.data ?? []
    const ordered = [...list].reverse()
    messages.value = [...ordered, ...messages.value]
    messagesNextCursor.value = res.pagination?.nextCursor ?? null
  } finally {
    if (reqSeq === loadOlderReqSeq) loadingOlder.value = false
  }
}

function updateConversationParticipantRead(conversationId: string, userId: string, lastReadAt: string) {
  patchConversation(conversationId, (c) => ({
    ...c,
    participants: c.participants.map((p) =>
      p.user.id === userId ? { ...p, lastReadAt } : p,
    ),
  }))
}

function updateConversationIsBlockedWith(conversationId: string, isBlockedWith: boolean) {
  patchConversation(conversationId, (c) => ({ ...c, isBlockedWith }))
}

function updateConversationUnread(conversationId: string, unreadCount: number) {
  patchConversation(conversationId, (c) => ({
    ...c,
    unreadCount,
    // Clear the unread tone when the conversation is marked read.
    ...(unreadCount <= 0 ? { unreadTone: undefined } : {}),
  }))
}

function updateConversationForMessage(message: Message) {
  const unreadInc = message.sender.id === me.value?.id ? 0 : 1
  const incomingTier = getMessageTier(message)
  const found = patchConversation(message.conversationId, (existing) => {
    const isUnreadIncoming = unreadInc === 1 && selectedConversationId.value !== message.conversationId
    const updated: MessageConversationWithTone = {
      ...existing,
      lastMessageAt: message.createdAt,
      updatedAt: message.createdAt,
      lastMessage: { id: message.id, body: message.body, createdAt: message.createdAt, senderId: message.sender.id },
      unreadCount: selectedConversationId.value === message.conversationId ? 0 : existing.unreadCount + unreadInc,
    }
    if (isUnreadIncoming) updated.unreadTone = incomingTier
    return updated
  }, { moveToTop: true })
  if (!found) void refreshAllConversationTabs()
}

async function sendCurrentMessage() {
  const hasText = composerText.value.trim().length > 0
  const hasMedia = (dmComposerRef.value?.getMedia?.() ?? []).length > 0
  if ((!hasText && !hasMedia) || sending.value) return
  sendError.value = null
  sending.value = true
  try {
    if (!selectedConversationId.value && isDraftChat.value) {
      await sendFirstMessage()
    } else {
      await sendMessage()
    }
  } finally {
    sending.value = false
  }
}

/** Draft path: creates the conversation and sends the first message. */
async function sendFirstMessage() {
  if (!viewerCanStartChats.value) {
    startChatInfoVisible.value = true
    return
  }
  const body = composerText.value
  const mediaPayload = dmComposerRef.value?.getMedia?.() ?? []
  try {
    const res = await apiFetchData<CreateMessageConversationResponse['data']>('/messages/conversations', {
      method: 'POST',
      body: {
        user_ids: draftRecipients.value.map((u) => u.id),
        title: undefined,
        body,
        ...(mediaPayload.length > 0 ? { media: mediaPayload } : {}),
      },
    })
    composerText.value = ''
    dmComposerRef.value?.clearMedia?.()
    await refreshAllConversationTabs()
    const conversationId = res?.conversationId
    if (conversationId) {
      const inPrimary = conversations.value.primary.some((c) => c.id === conversationId)
      const inRequests = conversations.value.requests.some((c) => c.id === conversationId)
      activeTab.value = inRequests && !inPrimary ? 'requests' : 'primary'
      await selectConversation(conversationId, { replace: true })
    }
  } catch (e) {
    sendError.value = getApiErrorMessage(e) || 'Failed to send message.'
  }
}

/** Normal send path: optimistically adds the message and reconciles with the server response. */
async function sendMessage() {
  // Snapshot the conversation ID now — the user could switch threads while the request is in flight.
  const conversationId = selectedConversationId.value
  if (!conversationId) return
  const my = me.value
  if (!my) return

  const body = composerText.value
  const mediaPayload = dmComposerRef.value?.getMedia?.() ?? []
  let localId: string | null = null
  try {
    try { emitMessagesTyping(conversationId, false) } catch { /* ignore */ }

    // Add the optimistic row.
    localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticSender: MessageUser = {
      id: my.id,
      username: my.username ?? null,
      name: my.name ?? null,
      premium: Boolean(my.premium),
      premiumPlus: Boolean(my.premiumPlus),
      isOrganization: Boolean((my as any).isOrganization),
      stewardBadgeEnabled: my.stewardBadgeEnabled ?? true,
      verifiedStatus: (my.verifiedStatus ?? 'none') as 'none' | 'identity' | 'manual',
      avatarUrl: my.avatarUrl ?? null,
    }
    const replySnippet = replyToMessage.value
      ? { id: replyToMessage.value.id, senderUsername: replyToMessage.value.sender.username, bodyPreview: replyToMessage.value.body.slice(0, 200) }
      : null
    const capturedReplyToId = replyToMessage.value?.id ?? null
    messages.value = [
      ...messages.value,
      { id: localId, createdAt: new Date().toISOString(), body, conversationId, sender: optimisticSender, reactions: [], deletedForMe: false, replyTo: replySnippet, media: [], __clientKey: localId } as ChatMessage,
    ]
    sendingMessageIds.value = new Set([...sendingMessageIds.value, localId])
    composerText.value = ''
    dmComposerRef.value?.clearMedia?.()
    replyToMessage.value = null
    await nextTick()
    scrollToBottom('smooth')

    const res = await apiFetchData<SendMessageResponse['data']>(
      `/messages/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: {
          body,
          ...(capturedReplyToId ? { replyToId: capturedReplyToId } : {}),
          ...(mediaPayload.length > 0 ? { media: mediaPayload } : {}),
        },
      },
    )

    // Guard: user switched conversations while this was in flight — remove the stale optimistic row.
    if (selectedConversationId.value !== conversationId) {
      messages.value = messages.value.filter((m) => m.id !== localId)
      clearSendingId(localId)
      return
    }

    const msg = res?.message
    if (msg) {
      // Replace the optimistic row in-place (stable key), or append if it was already reconciled away.
      if (!mergeServerMessageIntoOptimistic(localId, msg)) {
        if (!messages.value.some((m) => m.id === msg.id)) {
          messages.value = [...messages.value, msg]
          markMessageAnimated(msg.id)
        }
      }
      clearSendingId(localId)
      updateConversationForMessage(msg)
      await nextTick()
      scrollToBottom('smooth')
      resetPendingNew()
    } else {
      // API returned no message — remove the optimistic row and restore the composer.
      messages.value = messages.value.filter((m) => m.id !== localId)
      clearSendingId(localId)
      composerText.value = body
    }

    if (selectedConversation.value?.viewerStatus === 'pending') {
      await refreshAllConversationTabs()
    }
  } catch (e) {
    if (localId) {
      messages.value = messages.value.filter((m) => m.id !== localId)
      clearSendingId(localId)
    }
    if (body && !composerText.value.trim()) composerText.value = body
    sendError.value = getApiErrorMessage(e) || 'Failed to send message.'
  }
}

// ─── Message action handlers ──────────────────────────────────────────────────

function handleReply(message: Message) {
  replyToMessage.value = message
  nextTick(() => dmComposerRef.value?.focus?.())
}

function handleInfo(message: Message) {
  infoMessage.value = message
  infoModalVisible.value = true
}

async function handleReact(message: Message, reactionId: string) {
  const conversationId = message.conversationId
  const existingGroup = message.reactions?.find((r) => r.reactionId === reactionId)
  const isToggleOff = existingGroup?.reactedByMe

  // Optimistic update
  const idx = messages.value.findIndex((m) => m.id === message.id)
  if (idx !== -1) {
    const msg = messages.value[idx]!
    let reactions = [...(msg.reactions ?? [])]
    if (isToggleOff) {
      reactions = reactions
        .map((r) => r.reactionId === reactionId
          ? { ...r, count: r.count - 1, reactedByMe: false, reactors: r.reactors.filter((reactor) => reactor.id !== me.value?.id) }
          : r,
        )
        .filter((r) => r.count > 0)
    } else {
      const existing = reactions.find((r) => r.reactionId === reactionId)
      if (existing) {
        reactions = reactions.map((r) => r.reactionId === reactionId
          ? { ...r, count: r.count + 1, reactedByMe: true, reactors: [...r.reactors, { id: me.value?.id ?? '', username: me.value?.username ?? null, avatarUrl: me.value?.avatarUrl ?? null }] }
          : r,
        )
      } else {
        const reaction = availableReactions.value.find((r) => r.id === reactionId)
        if (reaction) {
          reactions = [...reactions, { reactionId, emoji: reaction.emoji, count: 1, reactedByMe: true, reactors: [{ id: me.value?.id ?? '', username: me.value?.username ?? null, avatarUrl: me.value?.avatarUrl ?? null }] }]
        }
      }
    }
    messages.value = [
      ...messages.value.slice(0, idx),
      { ...msg, reactions },
      ...messages.value.slice(idx + 1),
    ]
  }

  try {
    if (isToggleOff) {
      await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}/reactions/${reactionId}`, { method: 'DELETE' })
    } else {
      await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}/reactions`, { method: 'POST', body: { reactionId } })
    }
  } catch {
    // Revert optimistic update on failure by re-fetching is too complex; the socket event will re-sync.
  }
}

async function handleDeleteForMe(message: Message) {
  const conversationId = message.conversationId
  const idx = messages.value.findIndex((m) => m.id === message.id)
  if (idx !== -1) {
    const msg = messages.value[idx]!
    messages.value = [
      ...messages.value.slice(0, idx),
      { ...msg, deletedForMe: true },
      ...messages.value.slice(idx + 1),
    ]
  }
  try {
    await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}`, { method: 'DELETE' })
  } catch {
    // Revert on failure
    if (idx !== -1) {
      const msg = messages.value[idx]
      if (msg) {
        messages.value = [
          ...messages.value.slice(0, idx),
          { ...msg, deletedForMe: false },
          ...messages.value.slice(idx + 1),
        ]
      }
    }
  }
}

async function handleRestore(message: Message) {
  const conversationId = message.conversationId
  const idx = messages.value.findIndex((m) => m.id === message.id)
  if (idx !== -1) {
    const msg = messages.value[idx]!
    messages.value = [
      ...messages.value.slice(0, idx),
      { ...msg, deletedForMe: false },
      ...messages.value.slice(idx + 1),
    ]
  }
  try {
    await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}/restore`, { method: 'POST' })
  } catch {
    // Revert on failure
    if (idx !== -1) {
      const msg = messages.value[idx]
      if (msg) {
        messages.value = [
          ...messages.value.slice(0, idx),
          { ...msg, deletedForMe: true },
          ...messages.value.slice(idx + 1),
        ]
      }
    }
  }
}

function handleScrollToReply(messageId: string) {
  const scroller = messagesScroller.value
  const el = scroller?.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // Overlay that bleeds 16px beyond the row on each side (compensates for the px-4
  // padding on the ChatMessageList container) so the highlight goes edge to edge.
  const overlay = document.createElement('div')
  overlay.style.cssText = [
    'position: absolute',
    'inset: 0',
    'left: -1rem',
    'right: -1rem',
    'pointer-events: none',
    'z-index: 0',
  ].join('; ')
  el.appendChild(overlay)

  overlay.animate(
    [
      { backgroundColor: 'transparent', offset: 0 },
      { backgroundColor: 'color-mix(in srgb, var(--p-primary-color) 14%, transparent)', offset: 0.25 },
      { backgroundColor: 'color-mix(in srgb, var(--p-primary-color) 14%, transparent)', offset: 0.65 },
      { backgroundColor: 'transparent', offset: 1 },
    ],
    { duration: 1800, easing: 'ease-in-out', fill: 'none' },
  ).finished.then(() => overlay.remove())
}

// ─── End message action handlers ──────────────────────────────────────────────

async function acceptSelectedConversation() {
  if (!selectedConversationId.value) return
  await apiFetch(`/messages/conversations/${selectedConversationId.value}/accept`, { method: 'POST' })
  await refreshAllConversationTabs()
}

function removeConversationFromList(conversationId: string) {
  for (const tab of ['primary', 'requests'] as const) {
    const idx = conversations.value[tab].findIndex((c) => c.id === conversationId)
    if (idx !== -1) conversations.value[tab].splice(idx, 1)
  }
}

async function deleteSelectedConversation() {
  const id = selectedConversationId.value
  if (!id) return
  removeConversationFromList(id)
  await clearSelection({ replace: true })
  await apiFetch(`/messages/conversations/${id}`, { method: 'DELETE' }).catch(() => {
    // Non-fatal: list state is already correct locally; server will eventually sync.
  })
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


let recipientSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(recipientQuery, (val) => {
  recipientError.value = null
  if (recipientSearchTimer) clearTimeout(recipientSearchTimer)
  // Strip a leading @ so typing "@jay" works the same as "jay".
  const q = val.trim().replace(/^@+/, '')
  if (!q) {
    recipientResults.value = []
    return
  }
  recipientSearchTimer = setTimeout(async () => {
    recipientLoading.value = true
    try {
      const res = await apiFetchData<FollowListUser[]>('/search', {
        query: { type: 'users', q, limit: 8 },
      })
      const filtered = (res ?? [])
        .filter((u) => u.id !== me.value?.id)
        .filter((u) => userColorTier(u) !== 'normal')
      recipientResults.value = filtered
    } catch (e) {
      recipientError.value = getApiErrorMessage(e) || 'Failed to search users.'
    } finally {
      recipientLoading.value = false
    }
  }, 250)
})

onBeforeUnmount(() => {
  if (recipientSearchTimer) {
    clearTimeout(recipientSearchTimer)
    recipientSearchTimer = null
  }
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

function recipientTagStyle(u: FollowListUser): Record<string, string> {
  const tier = userColorTier(u)
  if (tier === 'verified')     return { background: 'var(--moh-verified-soft)',  color: 'var(--moh-verified)' }
  if (tier === 'premium')      return { background: 'var(--moh-premium-soft)',   color: 'var(--moh-premium)' }
  if (tier === 'organization') return { background: 'var(--moh-org-soft)',        color: 'var(--moh-org)' }
  return { background: 'rgba(128,128,128,0.12)', color: 'inherit' }
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

function normalizeToUsernameParam(val: unknown): string | null {
  const u = typeof val === 'string' ? val.trim() : ''
  return u ? u : null
}

function mapPreviewToFollowListUser(preview: UserPreview): FollowListUser {
  return {
    id: preview.id,
    username: preview.username,
    name: preview.name,
    premium: Boolean(preview.premium),
    premiumPlus: Boolean(preview.premiumPlus),
    isOrganization: Boolean(preview.isOrganization),
    stewardBadgeEnabled: Boolean(preview.stewardBadgeEnabled ?? true),
    verifiedStatus: preview.verifiedStatus ?? 'none',
    avatarUrl: preview.avatarUrl ?? null,
    relationship: preview.relationship,
  }
}

async function clearToQueryParam() {
  const q = { ...route.query } as Record<string, any>
  if (!('to' in q)) return
  delete q.to
  await router.replace({ query: q })
}

async function openDraftChatWithRecipient(recipient: FollowListUser) {
  draftRecipients.value = [recipient]
  // Clear any selected existing chat and show draft pane.
  await clearSelection({ replace: true, preserveDraft: true })
  selectedChatKey.value = 'draft'
  messagesReady.value = true
  animateMessageList.value = false
  messagesPaneState.value = 'ready'
  renderedChatKey.value = 'draft'
}

async function openChatToUsername(username: string) {
  const u = (username ?? '').trim()
  if (!u) return

  await ensureLoaded().catch(() => null)

  // If user can't use chat at all, bail (screen already shows verify gate).
  if (!viewerIsVerified.value && !viewerIsPremium.value) {
    return
  }

  try {
    const preview = await apiFetchData<UserPreview>(`/users/${encodeURIComponent(u)}/preview`, { method: 'GET' })
    if (!preview?.id) {
      return
    }
    const recipient = mapPreviewToFollowListUser(preview)
    const targetIsVerified = userColorTier(preview) !== 'normal'

    const lookup = await apiFetchData<LookupMessageConversationResponse['data']>('/messages/lookup', {
      method: 'POST',
      body: { user_ids: [recipient.id] },
    })
    const conversationId = lookup?.conversationId ?? null
    if (conversationId) {
      // Ensure convo exists in lists (selectConversation doesn't upsert into lists).
      await refreshAllConversationTabs()
      // Set `c` and remove `to` in a single URL update (avoid the extra jump).
      const nextQuery = { ...(route.query as Record<string, any>), c: conversationId } as Record<string, any>
      delete nextQuery['to']
      await router.replace({ query: nextQuery })
      await selectConversation(conversationId, { replace: true })
      return
    }

    // No existing chat: don't allow starting a chat with an unverified user.
    if (!targetIsVerified) return

    await openDraftChatWithRecipient(recipient)
  } catch {
    // Non-fatal: ignore
  }
}

// Handle `/chat?to=<username>` changes while already on /chat.
// (Without this, clicking “Send message” from within chat only updates the URL.)
const lastHandledToUsername = ref<string | null>(null)
watch(
  () => normalizeToUsernameParam(route.query.to),
  (toUsername) => {
    if (!toUsername) return
    if (toUsername === lastHandledToUsername.value) return
    lastHandledToUsername.value = toUsername
    void openChatToUsername(toUsername)
  },
)

async function blockDirectUser() {
  const convo = selectedConversation.value
  if (!convo || convo.type !== 'direct') return
  const other = getDirectUser(convo)
  if (!other?.id) return
  await blockState.blockUser(other.id)
  await refreshAllConversationTabs()
  await clearSelection({ replace: true })
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
  onReaction: (payload: { conversationId?: string; message?: unknown }) => {
    const msg = payload?.message as Message | undefined
    if (!msg?.id) return
    if (selectedConversationId.value !== msg.conversationId) return
    // Update the reactions on the existing message in-place.
    const idx = messages.value.findIndex((m) => m.id === msg.id)
    if (idx !== -1) {
      const existing = messages.value[idx]!
      messages.value = [
        ...messages.value.slice(0, idx),
        { ...existing, reactions: msg.reactions ?? [] },
        ...messages.value.slice(idx + 1),
      ]
    }
    // Also sync the info modal if it's open for this message.
    if (infoMessage.value?.id === msg.id) {
      infoMessage.value = { ...infoMessage.value, reactions: msg.reactions ?? [] }
    }
  },
  onMessage: (payload: { conversationId?: string; message?: unknown }) => {
    const msg = payload?.message as Message | undefined
    if (!msg?.conversationId) return
    updateConversationForMessage(msg)
    if (selectedConversationId.value === msg.conversationId) {
      const shouldStick = isAtBottom()
      atBottom.value = shouldStick
      // If this is our own sent message, prefer reconciling it into an optimistic local row.
      const reconciled = reconcileOptimisticSend(msg)
      const exists = messages.value.some((m) => m.id === msg.id)
      if (!exists) {
        messages.value = [...messages.value, msg]
        // Don't animate our own message if reconciliation failed but we still have optimistic rows
        // in flight — the API response will merge/deduplicate shortly, avoiding a double-enter flash.
        const myOwnUnreconciled = !reconciled && msg.sender.id === me.value?.id && sendingMessageIds.value.size > 0
        if (!myOwnUnreconciled) {
          markMessageAnimated(msg.id)
        }
      }
      if (shouldStick) {
        void nextTick().then(() => {
          // If the viewer is already at bottom, keep it pinned without a smooth animation
          // (smooth scrolling can briefly toggle `atBottom` and flash the button).
          scrollToBottom('auto')
          // One more frame to handle any layout updates (e.g. typing row enter/leave).
          requestAnimationFrame(() => scrollToBottom('auto'))
        })
      } else if (!exists && msg.sender.id !== me.value?.id) {
        pendingNewCount.value += 1
        setPendingTierFromIncoming(msg)
      }
      // Only mark read when the user is actually at the bottom (i.e. they can see new messages).
      // If they're scrolled up, keep messages "unread" and preserve the pending count until they return to bottom.
      const isIncoming = msg.sender.id !== me.value?.id
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && shouldStick) {
        // Prevent transient badge flicker: server may emit an unread bump before our mark-read is processed.
        if (isIncoming) suppressMessageUnreadBumpsForMs(900)
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

    if (payload.userId && payload.userId !== me.value?.id) {
      // Another participant read this conversation — update their lastReadAt so
      // double-checkmarks and read avatars update in real-time.
      if (payload.lastReadAt) {
        updateConversationParticipantRead(convoId, payload.userId, payload.lastReadAt)
      }
      return
    }

    // Self event: another tab/device marked this conversation read.
    updateConversationUnread(convoId, 0)
    if (selectedConversationId.value === convoId) {
      if (atBottom.value) pendingNewCount.value = 0
    }
  },
}

onMounted(() => {
  try {
    prefersReducedMotion.value = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
  } catch {
    // ignore
  }
  ;(async () => {
    // Ensure auth is loaded before checking verified status — avoids missing the early-return
    // when the auth composable hasn't resolved yet at mount time.
    try { await ensureLoaded() } catch { /* ignore */ }

    if (!viewerIsVerified.value && !viewerIsPremium.value) return

    addMessagesCallback(messageCallback)
    emitMessagesScreen(true)

    // Pre-fetch allowed reactions (used by the reaction picker)
    apiFetchData<MessageReaction[]>('/messages/reactions').then((reactions) => {
      availableReactions.value = reactions ?? []
    }).catch(() => { /* ignore */ })

    await fetchConversations('primary', { forceRefresh: true }).catch(() => { /* ignore */ })

    const toUsername = normalizeToUsernameParam(route.query.to)
    if (toUsername) {
      try { await openChatToUsername(toUsername) } catch { /* ignore */ }
    }
    if (selectedConversationId.value) {
      try { await selectConversation(selectedConversationId.value, { replace: true }) } catch { /* ignore */ }
    }
    revealChatScreenAfterFade()

    // Fetch requests tab after revealing so the screen appears quickly.
    await fetchConversations('requests', { forceRefresh: true }).catch(() => { /* ignore */ })

    if (selectedConversationId.value) {
      const inPrimary = conversations.value.primary.some((c) => c.id === selectedConversationId.value)
      const inRequests = conversations.value.requests.some((c) => c.id === selectedConversationId.value)
      if (inRequests && !inPrimary) activeTab.value = 'requests'
    } else if (conversations.value.primary.length === 0 && conversations.value.requests.length > 0) {
      activeTab.value = 'requests'
    }

    // Ensure screen reveals even if everything above failed.
    revealChatScreenAfterFade()
  })()
})

onBeforeUnmount(() => {
  clearChatBootTimer()
  clearMessagesPaneTimer()
  removeMessagesCallback(messageCallback)
  emitMessagesScreen(false)
  for (const t of recentAnimatedTimers.values()) clearTimeout(t)
  recentAnimatedTimers.clear()
})

watch(isSocketConnected, (connected) => {
  if (!viewerIsVerified.value && !viewerIsPremium.value) return
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
    if (!viewerIsVerified.value && !viewerIsPremium.value) return
    // Keep focus on non-mobile layouts; when the tab bar is visible, avoid opening the keyboard.
    if (isTabBarMode.value) return
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

watch(
  () => chatBootState.value,
  (state) => {
    if (!import.meta.client) return
    if (state !== 'ready') return
    if (!renderedChatKey.value) return
    // Deep-link/refresh path can set renderedChatKey before the chat shell mounts.
    // Re-apply initial scroller snap when the shell becomes ready.
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

