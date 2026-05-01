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
      class="sticky -top-4 z-10 flex items-center py-1.5 sm:py-2 pointer-events-none -mx-4 px-4 backdrop-blur-sm"
      style="position: sticky;"
    >
      <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
      <div
        class="mx-3 shrink-0 rounded-full px-2 text-[11px] font-semibold text-gray-500 shadow-sm dark:text-gray-400"
        style="background: color-mix(in srgb, var(--moh-surface-2) 72%, transparent); border: 1px solid var(--moh-border-subtle);"
      >
        {{ stickyDividerLabel }}
      </div>
      <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
    </div>

    <!--
      Virtualized message list. The outer div is height-stable (`totalSize`);
      only the rows currently visible (+ a small overscan buffer) are mounted.
      Each row is absolutely positioned at its measured offset, so the parent
      scroll container's `scrollTop` / `scrollHeight` semantics still work
      cleanly — useChatScroll's bottom-anchoring + stickToBottom logic is
      unchanged.

      We also dropped TransitionGroup: with virtualization, off-screen rows
      have no DOM, so FLIP measurement is meaningless. The newest message's
      enter animation is driven by the `recentAnimatedMessageIds` set + the
      `moh-chat-item-enter` class on the row itself.
    -->
    <div :style="{ height: totalSize + 'px', width: '100%', position: 'relative' }">
      <div
        v-for="virtualRow in virtualItems"
        :key="String(virtualRow.key)"
        :data-virtual-row-index="virtualRow.index"
        :ref="measureRow"
        :style="{
          position: 'absolute',
          top: '0px',
          left: '0px',
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`,
          paddingTop: '6px',
          paddingBottom: '6px',
        }"
      >
        <ChatMessageListRow
          :item="messagesWithDividers[virtualRow.index]!"
          :animate-rows="animateRows"
          :recent-animated-message-ids="recentAnimatedMessageIds"
          :sending-message-ids="sendingMessageIds"
          :latest-my-message-id="latestMyMessageId"
          :is-latest-my-message-read="isLatestMyMessageRead"
          :is-group-chat="isGroupChat"
          :me-id="meId"
          :hovered-id="hoveredId"
          :chat-hide-thumbs="chatHideThumbs"
          :loaded-media-ids="loadedMediaIds"
          :jump-target-message-id="jumpTargetMessageId"
          :read-indicators="getReadIndicatorsFor(messagesWithDividers[virtualRow.index]!)"
          :should-show-message-meta="shouldShowMessageMeta(messagesWithDividers[virtualRow.index]!, virtualRow.index)"
          :format-message-time="formatMessageTime"
          :format-message-time-full="formatMessageTimeFull"
          :bubble-shape-class="bubbleShapeClass"
          :bubble-class="bubbleClass"
          :register-divider-el="registerDividerEl"
          :should-show-incoming-avatar="shouldShowIncomingAvatar"
          :go-to-profile="goToProfile"
          :sender-overlay="senderOverlay"
          @mouseenter="(id: string) => (hoveredId = id)"
          @mouseleave="onRowLeave"
          @reply-snippet-click="(id: string) => emit('scroll-to-reply', id)"
          @open-media="openMessageMedia"
          @open-reaction-picker="openReactionPicker"
          @open-menu="openMenu"
          @react="(message: Message, reactionId: string) => emit('react', message, reactionId)"
          @restore="(message: Message) => emit('restore', message)"
        />
      </div>
    </div>

    <!-- Shared popovers (one instance, repositioned on open) -->
    <AppChatReactionPicker
      ref="reactionPickerRef"
      :reactions="availableReactions"
      :active-reaction-ids="activeReactionIds"
      @select="onReactionSelect"
    />

    <AppChatMessageMenu
      ref="messageMenuRef"
      :message="menuMessage"
      :viewer-user-id="props.meId"
      @reply="emit('reply', $event)"
      @copy="onCopy"
      @info="emit('info', $event)"
      @edit="emit('edit', $event)"
      @delete="emit('delete-for-me', $event)"
      @delete-for-all="emit('delete-for-all', $event)"
      @restore="emit('restore', $event)"
    />

    <!-- Load newer button (shown when viewing historical messages) -->
    <div v-if="messagesNewerCursor" class="pt-2 pb-1">
      <Button label="Load newer" text size="small" severity="secondary" :loading="loadingNewer" @click="emit('load-newer')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance, PropType } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { Message, MessageMedia, MessageUser, MessageReaction, MessageParticipant } from '~/types/api'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'
import { useUsersStore } from '~/composables/useUsersStore'
// Sibling file — explicit import because Nuxt registers `~/components/app/chat/*`
// as `App*` prefixed names (`AppChatMessageListRow`), which does not satisfy
// the `<ChatMessageListRow>` tag Vue looks up at runtime.
import ChatMessageListRow from './ChatMessageListRow.vue'

const toast = useAppToast()
const colorMode = useColorMode()
const viewer = useImageLightbox()
const chatHideThumbs = computed(() => viewer.kind.value === 'media' && viewer.hideOrigin.value)

// Track which media IDs have finished loading so we can fade them in without
// layout shift. reactive(Set) lets Vue track .has() calls reactively.
const loadedMediaIds = reactive(new Set<string>())

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
  bubbleShapeClass: { type: Function as PropType<(message: Message) => string>, required: true },
  bubbleClass: { type: Function as PropType<(m: Message) => string>, required: true },
  registerDividerEl: { type: Function as PropType<(dayKey: string, label: string, el: unknown) => void>, required: true },
  shouldShowIncomingAvatar: { type: Function as PropType<(m: Message, index: number) => boolean>, required: true },
  goToProfile: { type: Function as PropType<(u: MessageUser | null | undefined) => void>, required: true },
  availableReactions: { type: Array as PropType<MessageReaction[]>, required: false, default: () => [] },
  participants: { type: Array as PropType<MessageParticipant[]>, required: false, default: () => [] },
  /** Message ID to highlight (jump target from search). */
  jumpTargetMessageId: { type: [String, null] as PropType<string | null>, required: false, default: null },
  messagesNewerCursor: { type: [String, null] as PropType<string | null>, required: false, default: null },
  loadingNewer: { type: Boolean, required: false, default: false },
  /**
   * The scroll container that wraps this list. Required for virtualization —
   * the virtualizer attaches its scroll listener and ResizeObserver here.
   * Provided as a reactive ref from the parent so the virtualizer can pick
   * it up the moment the parent's `<div ref="messagesScroller">` mounts.
   */
  scrollerEl: { type: [Object, null] as PropType<HTMLElement | null>, required: false, default: null },
})

// ─── Virtualizer ─────────────────────────────────────────────────────────────
// Render only the rows currently visible (+ a small overscan buffer). For
// long chats this drops the active DOM node count from O(history) to ~10–20
// and removes the per-message ResizeObserver / per-message RichBody side-
// effect cost.

const ESTIMATED_ROW_PX = 72
const OVERSCAN_ROWS = 5

const virtualizer = useVirtualizer({
  // Reactive accessors — the virtualizer re-derives when these change.
  get count() {
    return props.messagesWithDividers.length
  },
  getScrollElement: () => props.scrollerEl ?? null,
  estimateSize: () => ESTIMATED_ROW_PX,
  overscan: OVERSCAN_ROWS,
  // Stable per-row keys so re-orders / inserts reuse measurements.
  getItemKey: (index) => props.messagesWithDividers[index]?.key ?? index,
  indexAttribute: 'data-virtual-row-index',
})

const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

/**
 * Ref callback applied to every visible row; lets the virtualizer measure the
 * real height. Vue's template `:ref` invokes this with `Element | ComponentPublicInstance | null`.
 */
function measureRow(el: Element | ComponentPublicInstance | null) {
  if (!el) return
  if (!(el instanceof Element)) return
  virtualizer.value.measureElement(el)
}

/**
 * Imperative scroll-to-message helper. Used by the parent for jump-to-reply
 * (search result, replied-to message). With virtualization the off-screen row
 * may not exist in the DOM, so we ask the virtualizer to bring it into range
 * first; the parent's existing flash-highlight then fires once the row mounts.
 */
function scrollToMessageId(messageId: string, opts?: { align?: 'start' | 'center' | 'end' | 'auto' }) {
  if (!messageId) return false
  const idx = props.messagesWithDividers.findIndex(
    (it) => it.type === 'message' && it.message.id === messageId,
  )
  if (idx < 0) return false
  virtualizer.value.scrollToIndex(idx, { align: opts?.align ?? 'center' })
  return true
}

defineExpose({ scrollToMessageId })

const CLUSTER_GAP_MS = 5 * 60 * 1000
const usersStore = useUsersStore()

const hoveredId = ref<string | null>(null)
const reactionPickerRef = ref<{ toggle: (e: Event) => void; hide: () => void } | null>(null)
const messageMenuRef = ref<{ toggle: (e: Event) => void; hide: () => void } | null>(null)
const pickerMessage = ref<Message | null>(null)
const menuMessage = ref<Message | null>(null)

const activeReactionIds = computed<Set<string>>(() => {
  if (!pickerMessage.value?.reactions) return new Set()
  return new Set(pickerMessage.value.reactions.filter((r) => r.reactedByMe).map((r) => r.reactionId))
})

// For each participant, find the latest message they've read and map it.
// O(m + p log p): pre-sort participants by lastReadAt, walk message items
// once, and assign each participant to the last message <= their lastReadAt
// via a 2-pointer sweep. DM chats short-circuit since read indicators are
// only rendered for group/crew chats anyway.
const readIndicatorsByMessageId = computed(() => {
  const map = new Map<string, MessageParticipant[]>()
  if (!props.isGroupChat) return map
  if (!props.participants.length) return map

  type Indexed = { participant: MessageParticipant; lastReadMs: number }
  const sortedParticipants: Indexed[] = []
  for (const participant of props.participants) {
    if (!participant.lastReadAt) continue
    const lastReadMs = Date.parse(participant.lastReadAt)
    if (!Number.isFinite(lastReadMs)) continue
    sortedParticipants.push({ participant, lastReadMs })
  }
  if (sortedParticipants.length === 0) return map
  sortedParticipants.sort((a, b) => a.lastReadMs - b.lastReadMs)

  let pIdx = 0
  let lastEligibleId: string | null = null
  let lastEligibleSenderId: string | null = null
  const attach = (msgId: string, msgSenderId: string | null, p: MessageParticipant) => {
    if (p.user.id === msgSenderId) return
    const existing = map.get(msgId)
    if (existing) existing.push(p)
    else map.set(msgId, [p])
  }
  for (const item of props.messagesWithDividers) {
    if (item.type !== 'message') continue
    const ms = item.createdAtMs
    while (pIdx < sortedParticipants.length && sortedParticipants[pIdx]!.lastReadMs < ms) {
      if (lastEligibleId) {
        attach(lastEligibleId, lastEligibleSenderId, sortedParticipants[pIdx]!.participant)
      }
      pIdx++
    }
    lastEligibleId = item.message.id
    lastEligibleSenderId = item.message.sender.id ?? null
  }
  while (pIdx < sortedParticipants.length) {
    if (lastEligibleId) {
      attach(lastEligibleId, lastEligibleSenderId, sortedParticipants[pIdx]!.participant)
    }
    pIdx++
  }

  return map
})

const isLatestMyMessageRead = computed(() => {
  if (!props.latestMyMessageId || !props.participants.length) return false
  const latestMsgItem = props.messagesWithDividers.find(
    (i): i is Extract<ChatListItem, { type: 'message' }> =>
      i.type === 'message' && i.message.id === props.latestMyMessageId,
  )
  if (!latestMsgItem) return false
  const latestMsgMs = latestMsgItem.createdAtMs
  return props.participants.some((p) => !!p.lastReadAt && Date.parse(p.lastReadAt) >= latestMsgMs)
})

function getReadIndicatorsFor(item: ChatListItem): MessageParticipant[] | null {
  if (item.type !== 'message') return null
  return readIndicatorsByMessageId.value.get(item.message.id) ?? null
}

function onRowLeave(id: string) {
  if (hoveredId.value === id) hoveredId.value = null
}

function openMessageMedia(e: MouseEvent, mediaList: MessageMedia[], clicked: MessageMedia) {
  const items = mediaList.map((m) => ({
    url: m.url ?? '',
    kind: m.kind === 'video' ? ('video' as const) : ('image' as const),
    posterUrl: m.thumbnailUrl ?? null,
    durationSeconds: m.durationSeconds ?? null,
    width: m.width ?? null,
    height: m.height ?? null,
  }))
  const idx = Math.max(0, mediaList.indexOf(clicked))
  void viewer.openGalleryFromMediaItems(e, items, idx, 'Media', { mediaStartMode: 'fitAnchored' })
}

function openReactionPicker(event: Event, message: Message) {
  messageMenuRef.value?.hide()
  pickerMessage.value = message
  reactionPickerRef.value?.toggle(event)
}

function openMenu(event: Event, message: Message) {
  reactionPickerRef.value?.hide()
  menuMessage.value = message
  messageMenuRef.value?.toggle(event)
}

function onReactionSelect(reactionId: string) {
  if (!pickerMessage.value) return
  emit('react', pickerMessage.value, reactionId)
}

async function onCopy(message: Message) {
  try {
    await navigator.clipboard.writeText(message.body)
  } catch {
    // Fallback for environments where clipboard API is unavailable.
    const ta = document.createElement('textarea')
    ta.value = message.body
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  const isDark = colorMode.value === 'dark'
  toast.push({
    title: 'Copied',
    color: isDark ? '#F3F4F6' : '#111827',
    durationMs: 1400,
  })
}

function senderOverlay(u: MessageUser | null | undefined): MessageUser | null {
  if (!u?.id) return u ?? null
  return usersStore.overlay(u as any) as any
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

  const curMs = item.createdAtMs
  const prevSameSender =
    prevItem?.type === 'message' && prevItem.message.sender.id === cur.sender.id

  if (prevSameSender && prevItem.type === 'message') {
    const prevMs = prevItem.createdAtMs
    if (curMs > prevMs && curMs - prevMs > CLUSTER_GAP_MS) return true
  }

  if (!nextItem || nextItem.type !== 'message') return true
  if (nextItem.message.sender.id !== cur.sender.id) return true

  const nextMs = nextItem.createdAtMs
  if (nextMs > curMs && nextMs - curMs > CLUSTER_GAP_MS) return true

  return false
}

const emit = defineEmits<{
  (e: 'load-older'): void
  (e: 'load-newer'): void
  (e: 'react', message: Message, reactionId: string): void
  (e: 'reply', message: Message): void
  (e: 'info', message: Message): void
  (e: 'edit', message: Message): void
  (e: 'delete-for-me', message: Message): void
  (e: 'delete-for-all', message: Message): void
  (e: 'restore', message: Message): void
  (e: 'scroll-to-reply', messageId: string): void
}>()
</script>
