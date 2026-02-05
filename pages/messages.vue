<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid min-h-0 flex-1" :class="isTinyViewport ? 'grid-cols-1' : ''" :style="gridStyle">
      <!-- Left column: thread list -->
      <section
        v-if="showListPane"
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
                <Button label="New" icon="pi pi-plus" size="small" severity="secondary" @click="openNewDialog" />
                <Button label="Blocked" icon="pi pi-ban" size="small" text severity="secondary" @click="openBlocksDialog" />
              </div>
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
                @click="setTab('primary')"
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
                @click="setTab('requests')"
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

        <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
          <button
            v-for="c in activeList"
            :key="c.id"
            type="button"
            class="w-full text-left"
            @click="selectConversation(c.id)"
          >
            <div
              :class="[
                'w-full px-4 py-3 transition-colors',
                selectedConversationId === c.id
                  ? 'bg-gray-50 dark:bg-zinc-900'
                  : 'hover:bg-gray-50 dark:hover:bg-zinc-900'
              ]"
            >
              <div class="flex items-center gap-3">
                <div v-if="c.type === 'direct'">
                  <AppUserAvatar :user="getDirectUser(c)" size-class="h-10 w-10" />
                </div>
                <div
                  v-else
                  class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-gray-300"
                >
                  <i class="pi pi-users text-sm" aria-hidden="true" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <div class="font-semibold truncate">{{ getConversationTitle(c) }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatListTime(c.lastMessageAt || c.updatedAt) }}
                    </div>
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {{ getConversationPreview(c) }}
                  </div>
                </div>
                <span v-if="c.unreadCount > 0" class="h-2 w-2 rounded-full bg-[var(--moh-verified)]" />
              </div>
            </div>
          </button>

          <div v-if="nextCursor" class="px-4 py-3">
            <Button label="Load more" text size="small" severity="secondary" :loading="loadingMore" @click="loadMoreConversations" />
          </div>
        </div>
      </section>

      <!-- Right column: chat for selected thread (edge-to-edge column, consistent content margins) -->
      <section v-if="showChatPane" class="h-full overflow-hidden">
        <div class="flex h-full min-h-0 flex-col">
          <div class="shrink-0 border-b border-gray-200 px-4 py-3 dark:border-zinc-800">
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-start gap-2">
                <Button
                  v-if="isTinyViewport && selectedChatKey"
                  icon="pi pi-arrow-left"
                  text
                  severity="secondary"
                  aria-label="Back"
                  @click="clearSelection({ replace: true })"
                />
                <div class="flex items-center gap-3 min-w-0">
                  <AppUserAvatar v-if="headerAvatarUser" :user="headerAvatarUser" size-class="h-10 w-10" />
                  <div class="min-w-0">
                    <div class="font-semibold truncate">
                      {{
                        selectedConversation
                          ? getConversationTitle(selectedConversation)
                        : isDraftChat
                          ? (draftRecipients.length === 1
                              ? (draftRecipients[0]?.name || draftRecipients[0]?.username || 'User')
                            : draftGroupTitle)
                            : 'Select a conversation'
                      }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {{
                        selectedConversation
                          ? getConversationSubtitle(selectedConversation)
                          : isDraftChat
                            ? (draftRecipients.length === 1 ? (draftRecipients[0]?.username ? `@${draftRecipients[0].username}` : 'New chat') : `${draftRecipients.length} recipients`)
                            : 'Pick a conversation from the left.'
                      }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Button icon="pi pi-ellipsis-h" text severity="secondary" />
              </div>
            </div>
          </div>

          <div v-if="selectedChatKey" class="relative flex-1 min-h-0">
            <div
              ref="messagesScroller"
              class="h-full overflow-y-auto py-4"
              @scroll="onMessagesScroll"
            >
            <div v-show="messagesReady" class="w-full px-4">
              <div v-if="messagesLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading chat…</div>
              <div v-else-if="messagesNextCursor" class="pb-2">
                <Button label="Load older" text size="small" severity="secondary" :loading="loadingOlder" @click="loadOlderMessages" />
              </div>
              <div v-else-if="isDraftChat && messages.length === 0" class="py-6 text-sm text-gray-500 dark:text-gray-400">
                Send your first chat to start the conversation.
              </div>

              <TransitionGroup name="moh-chat-list" tag="div" class="space-y-3">
                <div
                  v-for="(m, index) in messages"
                  :key="m.id"
                  :class="[
                    recentAnimatedMessageIds.has(m.id) ? 'moh-chat-item-enter' : '',
                    'relative flex w-full',
                    m.sender.id === me?.id ? 'justify-end' : 'justify-start',
                    isGroupChat && m.sender.id !== me?.id ? 'pl-10' : ''
                  ]"
                >
                  <div v-if="shouldShowIncomingAvatar(m, index)" class="absolute left-0 bottom-0">
                    <AppUserAvatar :user="m.sender" size-class="h-7 w-7" />
                  </div>
                  <div
                    :ref="(el) => registerBubbleEl(m.id, el)"
                    :class="[
                      'max-w-[85%] text-sm',
                      bubbleShapeClass(m.id),
                      bubbleClass(m)
                    ]"
                  >
                    <div class="flex flex-wrap items-end gap-x-2 gap-y-1">
                      <span class="min-w-0 flex-[1_1_auto] whitespace-pre-wrap break-words">{{ m.body }}</span>
                      <time
                        :datetime="m.createdAt"
                        :title="formatMessageTimeFull(m.createdAt)"
                        class="ml-auto shrink-0 text-xs opacity-75 whitespace-nowrap"
                      >
                        {{ formatMessageTime(m.createdAt) }}
                      </time>
                    </div>
                  </div>
                </div>
              </TransitionGroup>
            </div>
            </div>
            <Transition name="moh-fade">
              <button
                v-if="pendingNewCount > 0"
                type="button"
                class="absolute left-1/2 bottom-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg cursor-pointer"
                :class="pendingButtonClass"
                @click="onPendingButtonClick"
              >
                <i class="pi pi-arrow-down text-xs" aria-hidden="true" />
                <span>{{ pendingNewLabel }}</span>
              </button>
            </Transition>
          </div>
          <div v-else class="flex-1" />

          <div v-if="selectedChatKey" class="shrink-0 border-t border-gray-200 px-4 py-2.5 dark:border-zinc-800">
            <div v-if="selectedConversation?.viewerStatus === 'pending'" class="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              This is a chat request. Replying accepts it and moves it to your inbox.
              <div class="mt-2">
                <Button label="Accept" size="small" severity="secondary" @click="acceptSelectedConversation" />
              </div>
            </div>
            <!-- Typing bar: always present (blank when nobody is typing) -->
            <div
              class="mb-2.5 flex min-h-[28px] items-center rounded-lg border border-gray-200 px-3 py-1 text-sm leading-5 text-gray-500 dark:border-zinc-800 dark:text-gray-400"
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
            <AppDmComposer
              v-model="composerText"
              :user="composerUser"
              placeholder="Type a chat…"
              :loading="sending"
              @send="sendCurrentMessage"
            />
          </div>
        </div>
      </section>
    </div>

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
              <i class="pi pi-times" aria-hidden="true" />
            </button>
          </span>
        </div>
        <AppInlineAlert v-if="newConversationError" severity="danger">{{ newConversationError }}</AppInlineAlert>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="newDialogVisible = false" />
        <Button
          label="Start chat"
          icon="pi pi-arrow-right"
          :disabled="!canStartDraft"
          @click="createConversation"
        />
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
  canonicalPath: '/messages',
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
  MessageBlockListItem,
  MessageConversation,
  SendMessageResponse,
  CreateMessageConversationResponse,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const { apiFetch, apiFetchData } = useApiClient()
const route = useRoute()
const router = useRouter()
const { user: me } = useAuth()
const { addInterest, removeInterest, addMessagesCallback, removeMessagesCallback, emitMessagesTyping } = usePresence()
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

const messages = ref<Message[]>([])
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
const messagesReady = ref(false)
const pendingNewCount = ref(0)
const pendingNewTier = ref<'premium' | 'verified' | 'normal'>('normal')

// Track recently-added messages so we can animate them reliably (even if scroll-to-bottom happens same frame).
const recentAnimatedMessageIds = ref<Set<string>>(new Set())
const recentAnimatedTimers = ref<Map<string, ReturnType<typeof setTimeout>>>(new Map())
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

// Bubble shape (pill for single-line, rounded rect for multi-line), measured from DOM.
const bubbleShapeById = ref<Map<string, 'pill' | 'rect'>>(new Map())
const bubbleEls = new Map<string, HTMLElement>()
let bubbleRo: ResizeObserver | null = null

function computeBubbleShapeFor(id: string, el: HTMLElement) {
  const h = Math.max(0, Math.floor(el.getBoundingClientRect().height))
  const current = bubbleShapeById.value.get(id) ?? 'rect'
  // Heuristics based on current styles:
  // - rect uses p-3 (12px top/bottom) + text-sm (~20px line height) => ~44px for 1 line
  // - 2 lines => ~64px. Use hysteresis to avoid flip-flop near boundary.
  const toPillThreshold = 46
  const toRectThreshold = 54
  const next =
    current === 'pill'
      ? (h > toRectThreshold ? 'rect' : 'pill')
      : (h < toPillThreshold ? 'pill' : 'rect')
  if (next === current) return
  const m = new Map(bubbleShapeById.value)
  m.set(id, next)
  bubbleShapeById.value = m
}

function ensureBubbleObserver() {
  if (!import.meta.client) return
  if (bubbleRo) return
  bubbleRo = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement
      const id = el?.dataset?.mohBubbleId
      if (!id) continue
      computeBubbleShapeFor(id, el)
    }
  })
}

function registerBubbleEl(id: string, el: unknown) {
  if (!import.meta.client) return
  const mid = (id ?? '').trim()
  if (!mid) return
  ensureBubbleObserver()
  const prev = bubbleEls.get(mid) ?? null
  if (prev && bubbleRo) {
    bubbleRo.unobserve(prev)
  }
  if (!el || !(el instanceof HTMLElement)) {
    bubbleEls.delete(mid)
    const m = new Map(bubbleShapeById.value)
    m.delete(mid)
    bubbleShapeById.value = m
    return
  }
  const htmlEl = el
  htmlEl.dataset.mohBubbleId = mid
  bubbleEls.set(mid, htmlEl)
  bubbleRo?.observe(htmlEl)
  // Compute once immediately.
  computeBubbleShapeFor(mid, htmlEl)
}

function bubbleShapeClass(id: string) {
  const shape = bubbleShapeById.value.get(id) ?? 'rect'
  // Pill should be a bit tighter vertically and more horizontal padding.
  return shape === 'pill' ? 'rounded-full px-4 py-2' : 'rounded-2xl p-3'
}

// Remote typing indicator (per selected conversation).
const typingByUserId = ref<Map<string, number>>(new Map())
const typingSweepTimer = ref<ReturnType<typeof setInterval> | null>(null)
const TYPING_TTL_MS = 3500
type TypingUserDisplay = {
  userId: string
  username: string
  tier: 'premium' | 'verified' | 'normal'
}

const typingUsersAll = computed<TypingUserDisplay[]>(() => {
  if (!selectedConversationId.value) return []
  const ids = [...typingByUserId.value.keys()].filter((id) => id && id !== me.value?.id)
  if (!ids.length) return []

  const convo = selectedConversation.value
  const result: TypingUserDisplay[] = []
  for (const uid of ids) {
    const p = convo?.participants?.find((pp) => pp.user?.id === uid)
    const u = p?.user
    const username = (u?.username ?? '').trim()
    if (!username) continue
    const tier: TypingUserDisplay['tier'] =
      u?.premium ? 'premium' : u?.verifiedStatus && u.verifiedStatus !== 'none' ? 'verified' : 'normal'
    result.push({ userId: uid, username, tier })
  }
  return result
})

const typingUsersTotalCount = computed(() => typingUsersAll.value.length)
const typingUsersForDisplay = computed(() => typingUsersAll.value.slice(0, 2))

function typingNameClass(u: TypingUserDisplay): string {
  if (u.tier === 'premium') return 'text-[var(--moh-premium)]'
  if (u.tier === 'verified') return 'text-[var(--moh-verified)]'
  return 'text-gray-700 dark:text-gray-200'
}

const newDialogVisible = ref(false)
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
  if (pendingNewTier.value === 'premium') return 'bg-[var(--moh-premium)] text-white'
  if (pendingNewTier.value === 'verified') return 'bg-[var(--moh-verified)] text-white'
  return 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
})

const pendingNewLabel = computed(() => {
  const n = Math.max(0, Math.floor(Number(pendingNewCount.value) || 0))
  return `${n} New ${n === 1 ? 'Message' : 'Messages'}`
})

const { isTinyViewport, showListPane, showDetailPane: showChatPane, gridStyle } = useTwoPaneLayout(selectedChatKey, {
  // Keep list pane <= 1/3 of chat pane (1:3 ratio) on wide screens.
  leftCols: '1fr',
  rightCols: '3fr',
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
  el.scrollTo({ top: el.scrollHeight, behavior })
}

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
  if (isAtBottom()) resetPendingNew()
}

function onPendingButtonClick() {
  scrollToBottom('smooth')
  resetPendingNew()
}

function shouldShowIncomingAvatar(message: Message, index: number) {
  if (!isGroupChat.value) return false
  if (message.sender.id === me.value?.id) return false
  const next = messages.value[index + 1]
  if (!next) return true
  return next.sender.id !== message.sender.id
}

function formatListTime(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatMessageTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDay === 1) {
    return `Yesterday ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  if (diffDay < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMessageTimeFull(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
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

function getConversationSubtitle(conversation: MessageConversation) {
  if (conversation.type === 'group') {
    const names = conversation.participants.map((p) => p.user.name || (p.user.username ? `@${p.user.username}` : 'User'))
    return `${conversation.participants.length} members · ${names.join(', ')}`
  }
  const other = getDirectUser(conversation)
  return other?.username ? `@${other.username}` : 'Chat'
}

function getConversationPreview(conversation: MessageConversation) {
  return conversation.lastMessage?.body || 'No chats yet.'
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
  selectedConversationId.value = id
  selectedChatKey.value = id
  // Leaving draft mode (if any)
  draftRecipients.value = []
  messagesReady.value = false
  resetPendingNew()
  const replace = opts?.replace ?? false
  const currentC = typeof route.query.c === 'string' ? route.query.c : null
  if (currentC !== id) {
    const nextQuery = { ...route.query, c: id }
    if (replace) await router.replace({ query: nextQuery })
    else await router.push({ query: nextQuery })
  }
  messagesLoading.value = true
  typingByUserId.value = new Map()
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
    await nextTick()
    scrollToBottom('auto')
  } finally {
    messagesLoading.value = false
    if (!messagesReady.value) messagesReady.value = true
  }
}

async function clearSelection(opts?: { replace?: boolean; preserveDraft?: boolean }) {
  selectedConversationId.value = null
  selectedChatKey.value = null
  if (!opts?.preserveDraft) {
    draftRecipients.value = []
  }
  messages.value = []
  messagesNextCursor.value = null
  messagesReady.value = false
  resetPendingNew()
  typingByUserId.value = new Map()
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
  sending.value = true
  try {
    // Draft chat: first send creates the conversation.
    if (!selectedConversationId.value && isDraftChat.value) {
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
    // Stop typing immediately when sending.
    try {
      emitMessagesTyping(selectedConversationId.value, false)
    } catch {
      // ignore
    }
    const res = await apiFetchData<SendMessageResponse['data']>(
      `/messages/conversations/${selectedConversationId.value}/messages`,
      {
        method: 'POST',
        body: { body: composerText.value },
      },
    )
    const msg = res?.message
    if (msg) {
      const exists = messages.value.some((m) => m.id === msg.id)
      if (!exists) {
        messages.value = [...messages.value, msg]
        markMessageAnimated(msg.id)
      }
      updateConversationForMessage(msg)
      await nextTick()
      scrollToBottom('smooth')
      resetPendingNew()
    }
    composerText.value = ''
    if (selectedConversation.value?.viewerStatus === 'pending') {
      await fetchConversations('primary', { forceRefresh: true })
      await fetchConversations('requests', { forceRefresh: true })
    }
  } catch (e) {
    // ignore; composer should keep text
  } finally {
    sending.value = false
  }
}

function sweepTypingTtl() {
  const now = Date.now()
  const m = typingByUserId.value
  if (!m.size) return
  let changed = false
  const next = new Map(m)
  for (const [uid, exp] of next.entries()) {
    if (now > exp) {
      next.delete(uid)
      changed = true
    }
  }
  if (changed) typingByUserId.value = next
}

let typingStartTimer: ReturnType<typeof setTimeout> | null = null
let typingStopTimer: ReturnType<typeof setTimeout> | null = null
watch(
  [composerText, selectedConversationId],
  ([text, convoId], [prevText, prevConvoId]) => {
    // Conversation switched: ensure we stop typing in the old one.
    if (prevConvoId && prevConvoId !== convoId) {
      if (typingStartTimer) clearTimeout(typingStartTimer)
      if (typingStopTimer) clearTimeout(typingStopTimer)
      typingStartTimer = null
      typingStopTimer = null
      try {
        emitMessagesTyping(prevConvoId, false)
      } catch {
        // ignore
      }
      return
    }
    if (!convoId) return

    const has = Boolean((text ?? '').trim().length > 0)
    // If user cleared input, stop typing quickly.
    if (!has) {
      if (typingStartTimer) clearTimeout(typingStartTimer)
      typingStartTimer = null
      if (typingStopTimer) clearTimeout(typingStopTimer)
      typingStopTimer = setTimeout(() => {
        typingStopTimer = null
        emitMessagesTyping(convoId, false)
      }, 120)
      return
    }

    // Debounced "typing: true" emit, then extend stop timer on every keystroke.
    if (!typingStartTimer) {
      typingStartTimer = setTimeout(() => {
        typingStartTimer = null
        emitMessagesTyping(convoId, true)
      }, 220)
    }
    if (typingStopTimer) clearTimeout(typingStopTimer)
    typingStopTimer = setTimeout(() => {
      typingStopTimer = null
      emitMessagesTyping(convoId, false)
    }, 1600)
  },
)

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
    await nextTick()
    scrollToBottom('auto')
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
      const exists = messages.value.some((m) => m.id === msg.id)
      if (!exists) {
        messages.value = [...messages.value, msg]
        markMessageAnimated(msg.id)
      }
      if (shouldStick) {
        void nextTick().then(() => {
          // Use auto to keep the list pinned (no repeated smooth animations).
          scrollToBottom('auto')
          // One more frame to handle any layout updates (e.g. typing row enter/leave).
          requestAnimationFrame(() => scrollToBottom('auto'))
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
    if (!selectedConversationId.value || convoId !== selectedConversationId.value) return
    if (userId === me.value?.id) return
    const now = Date.now()
    const next = new Map(typingByUserId.value)
    if (payload?.typing === false) {
      next.delete(userId)
    } else {
      next.set(userId, now + TYPING_TTL_MS)
    }
    typingByUserId.value = next
  },
}

onMounted(() => {
  addMessagesCallback(messageCallback)
  typingSweepTimer.value = setInterval(sweepTypingTtl, 500)
  void fetchConversations('primary')
  if (selectedConversationId.value) {
    void selectConversation(selectedConversationId.value, { replace: true })
  }
})

onBeforeUnmount(() => {
  removeMessagesCallback(messageCallback)
  for (const t of recentAnimatedTimers.value.values()) clearTimeout(t)
  recentAnimatedTimers.value.clear()
  if (bubbleRo) {
    for (const el of bubbleEls.values()) bubbleRo.unobserve(el)
    bubbleEls.clear()
    bubbleRo.disconnect()
    bubbleRo = null
  }
  if (typingSweepTimer.value) {
    clearInterval(typingSweepTimer.value)
    typingSweepTimer.value = null
  }
  if (typingStartTimer) clearTimeout(typingStartTimer)
  if (typingStopTimer) clearTimeout(typingStopTimer)
})

watch(
  () => route.query.c,
  () => {
    syncSelectedFromRoute()
  },
)
</script>

