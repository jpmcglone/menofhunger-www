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
                'ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold align-middle tabular-nums',
                badgeToneClass,
              ]"
            >
              {{ requestsBadgeText }}
            </span>
          </button>
        </div>

        <!-- Search input -->
        <div class="mt-2 relative">
          <Icon name="tabler:search" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none text-sm" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search chats or messages…"
            class="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-8 text-sm placeholder-gray-400 outline-none focus:border-gray-400 focus:ring-0 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder-gray-500 dark:focus:border-zinc-500"
          >
          <Icon
            v-if="searchLoading"
            name="tabler:loader-2"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 animate-spin text-sm"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>

    <!--
      Pinned row(s) above the regular conversation list. Currently used for the
      "Talk to Marv" entry, which gets its own premium-styled surface and is
      always visible at the top regardless of search/scroll state. Kept as a
      slot so chat.vue owns marv state without ChatConversationList knowing
      about marv at all.
    -->
    <div v-if="$slots.pinned && activeTab === 'primary'" class="border-b moh-border">
      <slot name="pinned" />
    </div>

    <div v-if="listLoading" class="px-4 pt-2 pb-4 text-sm text-gray-500 dark:text-gray-400">
      Loading…
    </div>

    <div v-else-if="displayList.length === 0" class="px-4 pt-2 pb-4 text-sm text-gray-500 dark:text-gray-400">
      <template v-if="searchEmptyMessage">{{ searchEmptyMessage }}</template>
      <template v-else>{{ activeTab === 'requests' ? 'No chat requests yet.' : 'No chats yet.' }}</template>
    </div>

    <!--
      TransitionGroup gives FLIP `move` transitions when socket events reorder
      conversations (e.g. new message bubbles a thread to the top). Keys MUST
      stay on stable conversation ids so Vue reuses row state and only animates
      position. Enter/leave are kept short in CSS; the important part is
      `.moh-chat-row-move`. Users with `prefers-reduced-motion` get no list
      motion (see `main.css`).
    -->
    <TransitionGroup
      v-else
      name="moh-chat-row"
      tag="div"
      class="divide-y divide-gray-200 dark:divide-zinc-800"
    >
      <NuxtLink
        v-for="c in displayList"
        :key="c.id"
        :ref="bindPresenceRow(c)"
        :to="conversationPath(c.id)"
        class="block w-full text-left"
        @click="onConversationClick(c, $event)"
      >
        <div
          :class="[
            'moh-chat-row-surface w-full px-4 py-3 transition-colors',
            selectedConversationId === c.id
              ? 'moh-pane-row-active'
              : 'hover:bg-gray-50 dark:hover:bg-zinc-900',
            c.unreadCount > 0 && selectedConversationId !== c.id ? conversationUnreadHighlightClass(c) : '',
          ]"
        >
          <div class="flex items-center gap-3">
            <div v-if="c.type === 'direct'">
              <AppUserAvatar :user="getDirectUserOverlay(c)" size-class="h-10 w-10" />
            </div>
            <div
              v-else-if="c.type === 'crew_wall'"
              class="relative h-10 w-10 shrink-0 overflow-hidden bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-gray-300"
              :class="crewAvatarRound"
            >
              <img
                v-if="c.crew?.avatarUrl"
                :src="c.crew.avatarUrl"
                :alt="c.crew.name ?? 'Crew avatar'"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center">
                <Icon name="tabler:shield-check" class="text-sm" aria-hidden="true" />
              </div>
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
                  <span
                    v-if="c.type === 'crew_wall'"
                    class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                    title="Crew wall"
                  >
                    <Icon name="tabler:shield-check" class="text-[10px]" aria-hidden="true" />
                    Crew
                  </span>
                  <AppVerifiedBadge
                    v-if="c.type === 'direct' && getDirectUserOverlay(c)"
                    :status="getDirectUserOverlay(c)!.verifiedStatus"
                    :premium="Boolean(getDirectUserOverlay(c)!.premium)"
                    :premium-plus="Boolean(getDirectUserOverlay(c)!.premiumPlus)"
                    :is-organization="Boolean(getDirectUserOverlay(c)!.isOrganization)"
                    :steward-badge-enabled="getDirectUserOverlay(c)!.stewardBadgeEnabled ?? true"
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
                      <span class="ml-1">{{ typingUsersByConversationId[c.id]![0]!.status === 'thinking' ? 'is thinking…' : 'is typing…' }}</span>
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
                  <div v-else-if="c.matchedMessage" :key="`match-${c.id}`" class="truncate italic text-gray-500 dark:text-gray-400">
                    "{{ c.matchedMessage.body.slice(0, 80) }}"
                  </div>
                  <div v-else :key="`preview-${c.id}`" class="truncate">
                    {{ getConversationPreview(c) }}
                  </div>
                </Transition>
              </div>
            </div>
            <!-- Muted indicator -->
            <Icon
              v-if="c.isMuted"
              name="tabler:bell-off"
              class="shrink-0 text-xs text-gray-400 dark:text-gray-500"
              aria-label="Muted"
            />
            <!-- Keep wrapper mounted so removal animates (fade + slide/shrink), and siblings shift smoothly. -->
            <span
              class="moh-chat-row-badge-wrap overflow-hidden transition-[max-width,opacity,transform,margin-left] duration-180 ease-out"
              :class="c.unreadCount > 0 ? 'ml-2 max-w-[3.25rem] opacity-100 translate-x-0' : 'ml-0 max-w-0 opacity-0 -translate-x-1'"
              aria-hidden="true"
            >
              <span
                v-if="c.unreadCount > 0"
                class="inline-flex min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] justify-center text-center tabular-nums"
                :class="conversationDotClass(c)"
                aria-label="Unread messages"
              >
                <AppAnimatedCount :value="c.unreadCount" :format="(n) => (n > 99 ? '99+' : String(n))" />
              </span>
            </span>
          </div>
        </div>
      </NuxtLink>

      <div v-if="nextCursor" key="load-more" class="px-4 py-3">
        <Button label="Load more" text size="small" severity="secondary" :loading="loadingMore" @click="emit('load-more')" />
      </div>
    </TransitionGroup>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PropType } from 'vue'
import type { MessageConversation, MessageUser } from '~/types/api'
import type { TypingUserDisplay } from '~/composables/chat/useChatTyping'
import { useUsersStore } from '~/composables/useUsersStore'
import { useViewportIdsObserver } from '~/composables/chat/useViewportIdsObserver'
import { crewAvatarRoundClass } from '~/utils/avatar-rounding'

const crewAvatarRound = crewAvatarRoundClass()

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
  /** API search results — non-null when the parent has returned results for the current query. */
  searchResults: { type: Array as PropType<MessageConversation[] | null>, default: null },
  /** True while the API search is in flight. */
  searchLoading: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'select-to-message', conversationId: string, messageId: string): void
  (e: 'set-tab', tab: 'primary' | 'requests'): void
  (e: 'open-new'): void
  (e: 'open-blocks'): void
  (e: 'load-more'): void
  (e: 'search-query', q: string): void
  /** Fires whenever a direct conversation row enters/leaves the viewport.
   *  Parent uses this to scope presence subscriptions to visible rows only,
   *  instead of subscribing to every direct partner in the list eagerly. */
  (e: 'presence-visible', userId: string, visible: boolean): void
}>()

const searchQuery = ref('')

watch(searchQuery, (q) => emit('search-query', q))

const displayList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.activeList
  // Only use API results — no client-side filter (avoids "No results" flicker before API returns).
  if (props.searchResults !== null) return props.searchResults
  return []
})

const searchEmptyMessage = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return null
  if (props.searchResults === null) return 'Searching…'
  return `No chats matching "${q}".`
})

const usersStore = useUsersStore()
function getDirectUserOverlay(c: MessageConversation): MessageUser | null {
  const base = props.getDirectUser(c)
  if (!base?.id) return base
  return usersStore.overlay(base as any) as any
}

function conversationPath(id: string): string {
  return `/chat?c=${encodeURIComponent(id)}`
}

function onConversationClick(c: MessageConversation, event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  searchQuery.value = ''
  if (c.matchedMessage) {
    emit('select-to-message', c.id, c.matchedMessage.id)
  } else {
    emit('select', c.id)
  }
}

// --- Presence visibility tracking -------------------------------------------
//
// Previously the chat page eagerly subscribed presence interest for EVERY
// direct conversation partner the user had on first paint (~80 socket emits +
// an HTTP fan-out before the page was even interactive). Now we only emit
// `presence-visible(userId, visible)` for rows actually in the viewport, and
// the parent (chat.vue) refcounts userIds and talks to the gateway from
// there.
//
// The IntersectionObserver bookkeeping lives in `useViewportIdsObserver`,
// keyed by conversation id. We map convoId → partner userId at emit time so
// crew/group rows (which have no single "partner") are silently skipped.

const partnerUserIdByConvo = new Map<string, string | null>()

const visibilityObserver = useViewportIdsObserver({
  rootMargin: '100px 0px',
  onVisible: (convoId, visible) => {
    const userId = partnerUserIdByConvo.get(convoId)
    if (!userId) return
    emit('presence-visible', userId, visible)
  },
})

/**
 * Template-side binder: keeps `partnerUserIdByConvo` synced for the row and
 * returns the stable per-row `:ref` from the observer. Vue dedupes binding
 * by function reference, so the same row mounted across renders won't
 * thrash observe/unobserve.
 */
function bindPresenceRow(c: MessageConversation): (el: unknown) => void {
  const userId = c.type === 'direct' ? (props.getDirectUser(c)?.id ?? null) : null
  partnerUserIdByConvo.set(c.id, userId)
  return visibilityObserver.bindRow(c.id)
}
</script>
