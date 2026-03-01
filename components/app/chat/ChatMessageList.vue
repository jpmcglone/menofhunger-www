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

    <TransitionGroup :name="animateRows ? 'moh-chat-list' : ''" :css="animateRows" tag="div" class="space-y-3">
      <template v-for="(item, listIndex) in messagesWithDividers" :key="item.key">
        <div
          v-if="item.type === 'divider'"
          :ref="(el) => registerDividerEl(item.dayKey, item.label, el)"
          class="relative flex items-center py-1.5 sm:py-2"
        >
          <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
          <div class="mx-3 shrink-0 rounded-full bg-white px-2 text-[11px] font-semibold text-gray-500 shadow-sm dark:bg-zinc-900 dark:text-gray-400">
            {{ item.label }}
          </div>
          <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
        </div>

        <!-- Message row -->
        <div
          v-else
          :data-message-id="item.message.id"
          :class="[
            animateRows && recentAnimatedMessageIds.has(item.key) ? 'moh-chat-item-enter' : '',
            'group relative flex w-full items-end gap-1',
            item.message.sender.id === meId ? 'justify-end' : 'justify-start',
            isGroupChat && item.message.sender.id !== meId ? 'pl-10' : ''
          ]"
          @mouseenter="hoveredId = item.message.id"
          @mouseleave="onRowLeave(item.message.id)"
        >
          <!-- Avatar (incoming) -->
          <NuxtLink
            v-if="shouldShowIncomingAvatar(item.message, item.index) && item.message.sender.username"
            :to="`/u/${encodeURIComponent(item.message.sender.username)}`"
            class="absolute left-0 bottom-0 translate-y-[-6px] rounded-full cursor-pointer transition-opacity hover:opacity-90"
            :aria-label="item.message.sender.username ? `View @${item.message.sender.username}` : 'View profile'"
          >
            <AppUserAvatar :user="senderOverlay(item.message.sender)" size-class="h-7 w-7" />
          </NuxtLink>
          <button
            v-else-if="shouldShowIncomingAvatar(item.message, item.index)"
            type="button"
            class="absolute left-0 bottom-0 translate-y-[-6px] rounded-full cursor-pointer transition-opacity hover:opacity-90"
            aria-label="View profile"
            @click="goToProfile(item.message.sender)"
          >
            <AppUserAvatar :user="senderOverlay(item.message.sender)" size-class="h-7 w-7" />
          </button>

          <!-- Reply snippet + (action bar + bubble) + reactions, all stacked -->
          <div
            class="flex flex-col gap-1"
            :class="item.message.sender.id === meId ? 'items-end' : 'items-start'"
            style="max-width: 85%;"
          >
            <!-- Reply snippet (above bubble) -->
            <div
              v-if="item.message.replyTo"
              :class="[
                'flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs opacity-75 cursor-pointer w-full',
                item.message.sender.id === meId
                  ? 'bg-black/10 dark:bg-white/10 text-current'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400',
              ]"
              @click="emit('scroll-to-reply', item.message.replyTo.id)"
            >
              <Icon name="tabler:corner-up-right" size="12" class="shrink-0" aria-hidden="true" />
              <div class="min-w-0 flex-1 overflow-hidden">
                <span class="font-semibold mr-1">{{ item.message.replyTo.senderUsername ? `@${item.message.replyTo.senderUsername}` : 'Unknown' }}</span><span
                  class="break-words"
                  style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line;"
                >{{ collapseBlankLines(item.message.replyTo.bodyPreview) }}</span>
              </div>
              <!-- Media thumbnail from the replied-to message -->
              <img
                v-if="item.message.replyTo.mediaThumbnailUrl"
                :src="item.message.replyTo.mediaThumbnailUrl"
                class="shrink-0 h-9 w-9 rounded-md object-cover"
                aria-hidden="true"
              />
            </div>

            <!-- Bubble row: action bar LEFT + stacked bubbles + action bar RIGHT -->
            <div class="flex items-end gap-1">
              <!-- Action bar — LEFT (outgoing) -->
              <div
                v-if="item.message.sender.id === meId"
                :class="[
                  'flex shrink-0 items-center gap-0.5 transition-opacity duration-150',
                  hoveredId === item.message.id ? 'opacity-100' : 'opacity-0 pointer-events-none',
                ]"
              >
                <button
                  type="button"
                  title="More options"
                  aria-label="More options"
                  class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                  @click.stop="openMenu($event, item.message)"
                >
                  <Icon name="tabler:dots" size="14" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="React"
                  aria-label="Add reaction"
                  class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                  @click.stop="openReactionPicker($event, item.message)"
                >
                  <Icon name="tabler:mood-smile" size="14" aria-hidden="true" />
                </button>
              </div>

              <!-- Stacked bubbles wrapper (ref for reaction picker anchor) -->
              <div
                :ref="(el) => registerBubbleEl(item.key, el)"
                class="flex flex-col gap-1.5 text-sm"
                :class="item.message.sender.id === meId ? 'items-end' : 'items-start'"
              >
                <!-- ① Media bubble (own rounded card, above text) -->
                <template v-if="item.message.media?.length && !item.message.deletedForMe">
                  <div
                    v-for="media in item.message.media"
                    :key="media.id"
                    class="relative overflow-hidden rounded-2xl"
                  >
                    <!-- Video: poster + play icon, opens in lightbox -->
                    <button
                      v-if="media.kind === 'video'"
                      type="button"
                      class="moh-tap relative block focus:outline-none cursor-zoom-in max-h-[320px] max-w-[260px] w-full"
                      :style="{ aspectRatio: media.width && media.height ? `${media.width}/${media.height}` : '16/9' }"
                      aria-label="View video"
                      @click.stop="(e) => openMessageMedia(e, item.message.media!, media)"
                    >
                      <img
                        v-if="media.thumbnailUrl"
                        :src="media.thumbnailUrl"
                        class="block h-full w-full object-cover transition-opacity duration-150"
                        :class="{ 'opacity-0': chatHideThumbs }"
                        loading="lazy"
                        aria-hidden="true"
                      />
                      <div v-else class="absolute inset-0 bg-gray-900" aria-hidden="true" />
                      <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20" aria-hidden="true">
                        <Icon name="tabler:player-play-filled" class="text-3xl text-white drop-shadow" />
                      </div>
                    </button>
                    <!-- Image / GIF: opens in lightbox -->
                    <button
                      v-else
                      type="button"
                      class="moh-tap relative block focus:outline-none cursor-zoom-in max-h-[320px] max-w-[260px] w-full"
                      :style="{ aspectRatio: media.width && media.height ? `${media.width}/${media.height}` : '1/1' }"
                      aria-label="View image"
                      @click.stop="(e) => openMessageMedia(e, item.message.media!, media)"
                    >
                      <img
                        :src="media.url"
                        :alt="media.alt ?? ''"
                        class="block h-full w-full object-cover transition-opacity duration-150"
                        :class="{ 'opacity-0': chatHideThumbs }"
                        loading="lazy"
                      />
                    </button>

                    <!-- Timestamp overlay — only when media-only (no text body) -->
                    <div
                      v-if="!item.message.body.trim() && shouldShowMessageMeta(item, listIndex)"
                      class="absolute bottom-1.5 right-2 inline-flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap backdrop-blur-sm"
                    >
                      <time :datetime="item.message.createdAt" :title="formatMessageTimeFull(item.message.createdAt)">
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
                          :name="isLatestMyMessageRead ? 'tabler:checks' : 'tabler:circle-check'"
                          size="10"
                          :class="['translate-y-[0.5px]', isLatestMyMessageRead ? 'text-blue-400 opacity-90' : 'opacity-60']"
                          :aria-label="isLatestMyMessageRead ? 'Read' : 'Sent'"
                          aria-hidden="true"
                        />
                      </template>
                    </div>
                  </div>
                </template>

                <!-- ② Text bubble (only when there's body text, or message is deleted) -->
                <div
                  v-if="item.message.deletedForMe || item.message.body.trim()"
                  :class="[
                    item.message.deletedForMe
                      ? 'px-3 py-2 italic opacity-60 border border-dashed border-gray-300 dark:border-zinc-600 text-gray-500 dark:text-gray-400 bg-transparent ' + bubbleShapeClass(item.key)
                      : bubbleShapeClass(item.key) + ' ' + bubbleClass(item.message),
                  ]"
                >
                  <div class="space-y-1 px-0">
                    <!-- Deleted state -->
                    <div v-if="item.message.deletedForMe" class="flex items-center justify-between gap-2 text-xs">
                      <span>This message was deleted</span>
                      <button
                        type="button"
                        class="shrink-0 underline hover:no-underline"
                        @click.stop="emit('restore', item.message)"
                      >
                        Undo
                      </button>
                    </div>

                    <!-- Normal body -->
                    <AppChatMessageRichBody
                      v-else
                      :body="item.message.body"
                      :sender-tier="userColorTier(item.message.sender as any)"
                      :on-colored-background="item.message.sender.id === meId && userColorTier(item.message.sender as any) !== 'normal'"
                    />

                    <!-- Timestamp (shown here when there's a text bubble) -->
                    <div
                      v-if="shouldShowMessageMeta(item, listIndex)"
                      class="flex justify-end"
                    >
                      <div class="inline-flex items-center gap-1 text-xs opacity-75 whitespace-nowrap">
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
                            :name="isLatestMyMessageRead ? 'tabler:checks' : 'tabler:circle-check'"
                            size="10"
                            :class="['translate-y-[0.5px]', isLatestMyMessageRead ? 'text-blue-400 opacity-90' : 'opacity-60']"
                            :aria-label="isLatestMyMessageRead ? 'Read' : 'Sent'"
                            aria-hidden="true"
                          />
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action bar — RIGHT (incoming) -->
              <div
                v-if="item.message.sender.id !== meId"
                :class="[
                  'flex shrink-0 items-center gap-0.5 transition-opacity duration-150',
                  hoveredId === item.message.id ? 'opacity-100' : 'opacity-0 pointer-events-none',
                ]"
              >
                <button
                  type="button"
                  title="React"
                  aria-label="Add reaction"
                  class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                  @click.stop="openReactionPicker($event, item.message)"
                >
                  <Icon name="tabler:mood-smile" size="14" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="More options"
                  aria-label="More options"
                  class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                  @click.stop="openMenu($event, item.message)"
                >
                  <Icon name="tabler:dots" size="14" aria-hidden="true" />
                </button>
              </div>
            </div>

            <!-- Reactions row -->
            <div
              v-if="item.message.reactions?.length"
              class="flex flex-wrap gap-1"
            >
              <button
                v-for="group in item.message.reactions"
                :key="group.reactionId"
                type="button"
                :title="group.reactors.map(r => r.username || r.id).join(', ')"
                :class="[
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-all',
                  group.reactedByMe
                    ? 'border-[var(--p-primary-color)] bg-[var(--p-primary-color)] bg-opacity-10 text-[var(--p-primary-color)]'
                    : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-zinc-600',
                ]"
                @click.stop="emit('react', item.message, group.reactionId)"
              >
                <span>{{ group.emoji }}</span>
                <span class="font-semibold">{{ group.count }}</span>
              </button>
            </div>

            <!-- Read avatars (group chats only, shown on the message each participant last read) -->
            <div
              v-if="isGroupChat && (readIndicatorsByMessageId.get(item.message.id) ?? []).filter(p => p.user.id !== item.message.sender.id).length"
              :class="['flex gap-0.5', item.message.sender.id === meId ? 'justify-end' : 'justify-start']"
            >
              <template
                v-for="participant in (readIndicatorsByMessageId.get(item.message.id) ?? []).filter(p => p.user.id !== item.message.sender.id)"
                :key="participant.user.id"
              >
                <NuxtLink
                  v-if="participant.user.username"
                  :to="`/u/${encodeURIComponent(participant.user.username)}`"
                  :title="`Read by @${participant.user.username}`"
                  class="block rounded-full transition-opacity hover:opacity-75"
                >
                  <AppUserAvatar
                    :user="senderOverlay(participant.user)"
                    size-class="h-[14px] w-[14px]"
                    :show-presence="false"
                    :enable-preview="false"
                  />
                </NuxtLink>
                <button
                  v-else
                  type="button"
                  :title="`Read by ${participant.user.id}`"
                  class="block rounded-full transition-opacity hover:opacity-75 cursor-pointer"
                  @click="goToProfile(participant.user)"
                >
                  <AppUserAvatar
                    :user="senderOverlay(participant.user)"
                    size-class="h-[14px] w-[14px]"
                    :show-presence="false"
                    :enable-preview="false"
                  />
                </button>
              </template>
            </div>
          </div>
        </div>
      </template>
    </TransitionGroup>

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
      @reply="emit('reply', $event)"
      @copy="onCopy"
      @info="emit('info', $event)"
      @delete="emit('delete-for-me', $event)"
      @restore="emit('restore', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { Message, MessageMedia, MessageUser, MessageReaction, MessageParticipant } from '~/types/api'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'
import { useUsersStore } from '~/composables/useUsersStore'
import { userColorTier } from '~/utils/user-tier'

const toast = useAppToast()
const colorMode = useColorMode()
const viewer = useImageLightbox()
const chatHideThumbs = computed(() => viewer.kind.value === 'media' && viewer.hideOrigin.value)

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
  availableReactions: { type: Array as PropType<MessageReaction[]>, required: false, default: () => [] },
  participants: { type: Array as PropType<MessageParticipant[]>, required: false, default: () => [] },
})

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

// For each participant, find the latest message they've read and map it
const readIndicatorsByMessageId = computed(() => {
  const map = new Map<string, MessageParticipant[]>()
  if (!props.participants.length) return map

  const messageItems = props.messagesWithDividers.filter(
    (item): item is Extract<ChatListItem, { type: 'message' }> => item.type === 'message',
  )

  for (const participant of props.participants) {
    if (!participant.lastReadAt) continue
    const lastReadMs = Date.parse(participant.lastReadAt)
    if (!Number.isFinite(lastReadMs)) continue

    // Messages are oldest-first; find the latest one at or before lastReadAt
    let lastReadMsgId: string | null = null
    for (const item of messageItems) {
      if (parseMs(item.message.createdAt) <= lastReadMs) {
        lastReadMsgId = item.message.id
      } else {
        break
      }
    }

    if (lastReadMsgId) {
      const existing = map.get(lastReadMsgId) ?? []
      map.set(lastReadMsgId, [...existing, participant])
    }
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
  const latestMsgMs = parseMs(latestMsgItem.message.createdAt)
  return props.participants.some((p) => !!p.lastReadAt && Date.parse(p.lastReadAt) >= latestMsgMs)
})

function collapseBlankLines(text: string): string {
  return text.split('\n').filter((line) => line.trim() !== '').join('\n')
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

  if (prevSameSender) {
    const prevMs = parseMs(prevItem.message.createdAt)
    if (curMs > prevMs && curMs - prevMs > CLUSTER_GAP_MS) return true
  }

  if (!nextItem || nextItem.type !== 'message') return true
  if (nextItem.message.sender.id !== cur.sender.id) return true

  const nextMs = parseMs(nextItem.message.createdAt)
  if (nextMs > curMs && nextMs - curMs > CLUSTER_GAP_MS) return true

  return false
}

const emit = defineEmits<{
  (e: 'load-older'): void
  (e: 'react', message: Message, reactionId: string): void
  (e: 'reply', message: Message): void
  (e: 'info', message: Message): void
  (e: 'delete-for-me', message: Message): void
  (e: 'restore', message: Message): void
  (e: 'scroll-to-reply', messageId: string): void
}>()
</script>
