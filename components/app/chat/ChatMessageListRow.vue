<template>
  <!-- Day divider -->
  <div
    v-if="dividerItem"
    :ref="(el) => registerDividerEl(dividerItem!.dayKey, dividerItem!.label, el)"
    class="relative flex items-center py-1.5 sm:py-2"
  >
    <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
    <div class="mx-3 shrink-0 rounded-full bg-white px-2 text-[11px] font-semibold text-gray-500 shadow-sm dark:bg-zinc-900 dark:text-gray-400">
      {{ dividerItem.label }}
    </div>
    <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
  </div>

  <!-- Message row -->
  <div
    v-else-if="messageItem"
    :data-message-id="messageItem.message.id"
    :class="[
      animateRows && recentAnimatedMessageIds.has(messageItem.key) ? 'moh-chat-item-enter' : '',
      'group relative flex w-full items-end gap-1',
      messageItem.message.sender.id === meId ? 'justify-end' : 'justify-start',
      isGroupChat && messageItem.message.sender.id !== meId ? 'pl-10' : '',
      messageItem.message.id === jumpTargetMessageId ? 'moh-jump-target' : '',
    ]"
    @mouseenter="emit('mouseenter', messageItem.message.id)"
    @mouseleave="emit('mouseleave', messageItem.message.id)"
  >
    <!-- Avatar (incoming) -->
    <NuxtLink
      v-if="shouldShowIncomingAvatar(messageItem.message, messageItem.index) && messageItem.message.sender.username"
      :to="`/u/${encodeURIComponent(messageItem.message.sender.username)}`"
      class="absolute left-0 bottom-0 translate-y-[-6px] rounded-full cursor-pointer transition-opacity hover:opacity-90"
      :aria-label="messageItem.message.sender.username ? `View @${messageItem.message.sender.username}` : 'View profile'"
    >
      <AppUserAvatar :user="senderOverlay(messageItem.message.sender)" size-class="h-7 w-7" />
    </NuxtLink>
    <button
      v-else-if="shouldShowIncomingAvatar(messageItem.message, messageItem.index)"
      type="button"
      class="absolute left-0 bottom-0 translate-y-[-6px] rounded-full cursor-pointer transition-opacity hover:opacity-90"
      aria-label="View profile"
      @click="goToProfile(messageItem.message.sender)"
    >
      <AppUserAvatar :user="senderOverlay(messageItem.message.sender)" size-class="h-7 w-7" />
    </button>

    <!-- Reply snippet + (action bar + bubble) + reactions, all stacked -->
    <div
      class="flex flex-col gap-1"
      :class="messageItem.message.sender.id === meId ? 'items-end' : 'items-start'"
      style="max-width: 85%;"
    >
      <!-- Reply snippet -->
      <div
        v-if="messageItem.message.replyTo"
        :class="[
          'flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs opacity-75 cursor-pointer w-full',
          messageItem.message.sender.id === meId
            ? 'bg-black/10 dark:bg-white/10 text-current'
            : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400',
        ]"
        @click="emit('reply-snippet-click', messageItem.message.replyTo.id)"
      >
        <Icon name="tabler:corner-up-right" size="12" class="shrink-0" aria-hidden="true" />
        <div class="min-w-0 flex-1 overflow-hidden">
          <span class="font-semibold mr-1">{{ messageItem.message.replyTo.senderUsername ? `@${messageItem.message.replyTo.senderUsername}` : 'Unknown' }}</span><span
            class="break-words"
            style="display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line;"
          >{{ collapseBlankLines(messageItem.message.replyTo.bodyPreview) }}</span>
        </div>
        <img
          v-if="messageItem.message.replyTo.mediaThumbnailUrl"
          :src="messageItem.message.replyTo.mediaThumbnailUrl"
          class="shrink-0 h-9 w-9 rounded-md object-cover"
          aria-hidden="true"
        />
      </div>

      <!-- Media bubbles -->
      <template v-if="messageItem.message.media?.length && !messageItem.message.deletedForMe && !messageItem.message.deletedForAll">
        <div
          v-for="media in messageItem.message.media"
          :key="media.id"
          class="relative overflow-hidden rounded-2xl bg-gray-200 dark:bg-zinc-800"
        >
          <button
            v-if="media.kind === 'video'"
            type="button"
            class="moh-tap relative block focus:outline-none cursor-zoom-in max-h-[320px] max-w-[260px] w-full"
            :style="{ aspectRatio: media.width && media.height ? `${media.width}/${media.height}` : '16/9' }"
            aria-label="View video"
            @click.stop="(e) => emit('open-media', e, messageItem!.message.media!, media)"
          >
            <img
              v-if="media.thumbnailUrl"
              :src="media.thumbnailUrl"
              class="block h-full w-full object-cover transition-opacity duration-300"
              :class="{ 'opacity-0': chatHideThumbs || !loadedMediaIds.has(`thumb-${media.id}`) }"
              loading="lazy"
              aria-hidden="true"
              @load="loadedMediaIds.add(`thumb-${media.id}`)"
            />
            <div v-else class="absolute inset-0 bg-gray-900" aria-hidden="true" />
            <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20" aria-hidden="true">
              <Icon name="tabler:player-play-filled" class="text-3xl text-white drop-shadow" />
            </div>
          </button>
          <button
            v-else
            type="button"
            class="moh-tap relative block focus:outline-none cursor-zoom-in max-h-[320px] max-w-[260px] w-full"
            :style="{ aspectRatio: media.width && media.height ? `${media.width}/${media.height}` : '1/1' }"
            aria-label="View image"
            @click.stop="(e) => emit('open-media', e, messageItem!.message.media!, media)"
          >
            <img
              :src="media.url"
              :alt="media.alt ?? ''"
              class="block h-full w-full object-cover transition-opacity duration-300"
              :class="{ 'opacity-0': chatHideThumbs || !loadedMediaIds.has(media.id) }"
              loading="lazy"
              @load="loadedMediaIds.add(media.id)"
            />
          </button>

          <!-- Timestamp overlay — only when media-only (no text body) -->
          <div
            v-if="!showTextBubble && shouldShowMessageMeta"
            class="absolute bottom-1.5 right-2 inline-flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap backdrop-blur-sm tabular-nums"
          >
            <time :datetime="messageItem.message.createdAt" :title="formatMessageTimeFull(messageItem.message.createdAt)">
              {{ formatMessageTime(messageItem.message.createdAt) }}
            </time>
            <template v-if="messageItem.message.sender.id === meId">
              <span
                v-if="sendingMessageIds.has(messageItem.message.id)"
                class="inline-block h-[10px] w-[10px] rounded-full border border-current border-t-transparent opacity-70 animate-spin"
                aria-label="Sending"
              />
              <Icon
                v-else-if="latestMyMessageId && messageItem.message.id === latestMyMessageId"
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

      <!-- Bubble/action row -->
      <div v-if="showTextBubble" class="flex items-end gap-1">
        <!-- Action bar — LEFT (outgoing) -->
        <div
          v-if="messageItem.message.sender.id === meId"
          :class="[
            'flex shrink-0 items-center gap-0.5 transition-opacity duration-150',
            hoveredId === messageItem.message.id ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ]"
        >
          <button
            type="button"
            title="More options"
            aria-label="More options"
            class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            @click.stop="emit('open-menu', $event, messageItem!.message)"
          >
            <Icon name="tabler:dots" size="14" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="React"
            aria-label="Add reaction"
            class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            @click.stop="emit('open-reaction-picker', $event, messageItem!.message)"
          >
            <Icon name="tabler:mood-smile" size="14" aria-hidden="true" />
          </button>
        </div>

        <!-- Anchor / actions align to text bubble -->
        <div
          class="flex min-w-0 max-w-full flex-col gap-1.5 text-sm"
          :class="messageItem.message.sender.id === meId ? 'items-end' : 'items-start'"
        >
          <!-- Text bubble -->
          <div
            v-if="showTextBubble"
            :class="[
              (messageItem.message.deletedForMe || messageItem.message.deletedForAll)
                ? 'max-w-full min-w-0 px-3 py-2 italic opacity-60 border border-dashed border-gray-300 dark:border-zinc-600 text-gray-500 dark:text-gray-400 bg-transparent ' + bubbleShapeClass(messageItem.message)
                : 'max-w-full min-w-0 ' + bubbleShapeClass(messageItem.message) + ' ' + bubbleClass(messageItem.message),
            ]"
          >
            <div class="space-y-1 px-0">
              <!-- Deleted for all -->
              <div v-if="messageItem.message.deletedForAll" class="text-xs">
                <span>This message was deleted for everyone</span>
              </div>

              <!-- Deleted for me -->
              <div v-else-if="messageItem.message.deletedForMe" class="flex items-center justify-between gap-2 text-xs">
                <span>This message was deleted</span>
                <button
                  type="button"
                  class="shrink-0 underline hover:no-underline"
                  @click.stop="emit('restore', messageItem!.message)"
                >
                  Undo
                </button>
              </div>

              <!-- Normal body -->
              <AppChatMessageRichBody
                v-else
                :body="messageItem.message.body"
                :sender-tier="userColorTier(messageItem.message.sender as any)"
                :on-colored-background="messageItem.message.sender.id === meId && userColorTier(messageItem.message.sender as any) !== 'normal'"
              />

              <!-- Timestamp (when there's a text bubble) -->
              <div
                v-if="shouldShowMessageMeta"
                class="flex justify-end"
              >
                <div class="inline-flex items-center gap-1 text-xs opacity-75 whitespace-nowrap tabular-nums">
                  <span v-if="messageItem.message.editedAt && !messageItem.message.deletedForAll" class="italic">edited</span>
                  <time
                    :datetime="messageItem.message.createdAt"
                    :title="formatMessageTimeFull(messageItem.message.createdAt)"
                  >
                    {{ formatMessageTime(messageItem.message.createdAt) }}
                  </time>
                  <template v-if="messageItem.message.sender.id === meId">
                    <span
                      v-if="sendingMessageIds.has(messageItem.message.id)"
                      class="inline-block h-[10px] w-[10px] rounded-full border border-current border-t-transparent opacity-70 animate-spin"
                      aria-label="Sending"
                    />
                    <Icon
                      v-else-if="latestMyMessageId && messageItem.message.id === latestMyMessageId"
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
          v-if="messageItem.message.sender.id !== meId"
          :class="[
            'flex shrink-0 items-center gap-0.5 transition-opacity duration-150',
            hoveredId === messageItem.message.id ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ]"
        >
          <button
            type="button"
            title="React"
            aria-label="Add reaction"
            class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            @click.stop="emit('open-reaction-picker', $event, messageItem!.message)"
          >
            <Icon name="tabler:mood-smile" size="14" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="More options"
            aria-label="More options"
            class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            @click.stop="emit('open-menu', $event, messageItem!.message)"
          >
            <Icon name="tabler:dots" size="14" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Reactions row -->
      <div
        v-if="messageItem.message.reactions?.length"
        class="flex flex-wrap gap-1"
      >
        <button
          v-for="group in messageItem.message.reactions"
          :key="group.reactionId"
          type="button"
          :title="group.reactors.map((r: { username: string | null; id: string }) => r.username || r.id).join(', ')"
          :class="[
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-[border-color,background-color,color] duration-150 ease-out',
            group.reactedByMe
              ? 'border-[var(--p-primary-color)] bg-[var(--p-primary-color)] bg-opacity-10 text-[var(--p-primary-color)]'
              : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-zinc-600',
          ]"
          @click.stop="emit('react', messageItem!.message, group.reactionId)"
        >
          <span>{{ group.emoji }}</span>
          <span class="font-semibold tabular-nums">{{ group.count }}</span>
        </button>
      </div>

      <!-- Read avatars (group chats only) -->
      <div
        v-if="isGroupChat && (readIndicators?.length ?? 0) > 0"
        :class="['flex gap-0.5', messageItem.message.sender.id === meId ? 'justify-end' : 'justify-start']"
      >
        <template
          v-for="participant in (readIndicators ?? [])"
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
              :enable-preview="true"
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
              :enable-preview="true"
            />
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { Message, MessageMedia, MessageUser, MessageParticipant } from '~/types/api'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'
import { userColorTier } from '~/utils/user-tier'

const props = defineProps({
  /** The flat list item — divider or message. */
  item: { type: Object as PropType<ChatListItem>, required: true },
  /** Whether to apply the per-row enter animation. */
  animateRows: { type: Boolean, required: true },
  /** Set of message keys whose enter animation should fire. */
  recentAnimatedMessageIds: { type: Object as PropType<Set<string>>, required: true },
  /** Set of message ids that are still optimistically sending. */
  sendingMessageIds: { type: Object as PropType<Set<string>>, required: true },
  latestMyMessageId: { type: [String, null] as PropType<string | null>, required: true },
  isLatestMyMessageRead: { type: Boolean, required: true },
  isGroupChat: { type: Boolean, required: true },
  meId: { type: [String, null] as PropType<string | null>, required: true },
  hoveredId: { type: [String, null] as PropType<string | null>, required: true },
  chatHideThumbs: { type: Boolean, required: true },
  /** Reactive Set of media ids that have finished loading. */
  loadedMediaIds: { type: Object as PropType<Set<string>>, required: true },
  jumpTargetMessageId: { type: [String, null] as PropType<string | null>, required: true },
  /** Pre-resolved read indicators for THIS message (or null if none). */
  readIndicators: { type: [Array, null] as PropType<MessageParticipant[] | null>, required: true },
  /** Pre-computed bool: whether to render the timestamp/meta row for this message. */
  shouldShowMessageMeta: { type: Boolean, required: true },
  formatMessageTime: { type: Function as PropType<(iso: string) => string>, required: true },
  formatMessageTimeFull: { type: Function as PropType<(iso: string) => string>, required: true },
  bubbleShapeClass: { type: Function as PropType<(message: Message) => string>, required: true },
  bubbleClass: { type: Function as PropType<(m: Message) => string>, required: true },
  registerDividerEl: { type: Function as PropType<(dayKey: string, label: string, el: unknown) => void>, required: true },
  shouldShowIncomingAvatar: { type: Function as PropType<(m: Message, index: number) => boolean>, required: true },
  goToProfile: { type: Function as PropType<(u: MessageUser | null | undefined) => void>, required: true },
  senderOverlay: { type: Function as PropType<(u: MessageUser | null | undefined) => MessageUser | null>, required: true },
})

const emit = defineEmits<{
  (e: 'mouseenter', messageId: string): void
  (e: 'mouseleave', messageId: string): void
  (e: 'reply-snippet-click', replyToMessageId: string): void
  (e: 'open-media', event: MouseEvent, mediaList: MessageMedia[], clicked: MessageMedia): void
  (e: 'open-reaction-picker', event: Event, message: Message): void
  (e: 'open-menu', event: Event, message: Message): void
  (e: 'react', message: Message, reactionId: string): void
  (e: 'restore', message: Message): void
}>()

// Narrow the discriminated union once per render so the template doesn't have
// to repeat type guards or use `as` casts at every read site.
type ChatListDivider = Extract<ChatListItem, { type: 'divider' }>
type ChatListMessage = Extract<ChatListItem, { type: 'message' }>
const dividerItem = computed<ChatListDivider | null>(() =>
  props.item.type === 'divider' ? (props.item as ChatListDivider) : null,
)
const messageItem = computed<ChatListMessage | null>(() =>
  props.item.type === 'message' ? (props.item as ChatListMessage) : null,
)

function collapseBlankLines(text: string): string {
  return text.split('\n').filter((line) => line.trim() !== '').join('\n')
}

function computeHasTextBubble(message: Message): boolean {
  return Boolean(message.deletedForMe || message.deletedForAll || (message.body ?? '').trim())
}

// Computed once per render — referenced from multiple template branches
// (timestamp overlay on media-only rows + the bubble itself).
const showTextBubble = computed(() => {
  const m = messageItem.value
  return m ? computeHasTextBubble(m.message) : false
})
</script>

<style scoped>
.moh-jump-target {
  animation: moh-jump-flash 2.5s ease forwards;
  border-radius: 0.5rem;
}

@keyframes moh-jump-flash {
  0%   { background-color: color-mix(in srgb, var(--p-primary-500) 22%, transparent); }
  30%  { background-color: color-mix(in srgb, var(--p-primary-500) 22%, transparent); }
  100% { background-color: transparent; }
}
</style>
