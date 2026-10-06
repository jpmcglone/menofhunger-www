<template>
  <article ref="row" :aria-busy="status === 'sending'" class="channel-message group relative px-4 hover:bg-[var(--moh-surface-1)] focus-within:bg-[var(--moh-surface-1)]" :class="grouped ? 'py-1' : 'pt-4 pb-2'" tabindex="0" :aria-label="`${message.sender.name ?? message.sender.username ?? 'Member'}: ${message.deletedForAll ? 'Message deleted' : message.body}`" @contextmenu.prevent="showActions" @keydown.shift.f10.prevent="showActions" @pointerdown="startPress" @pointerup="cancelPress" @pointercancel="cancelPress" @pointermove="cancelMoved">
    <div class="flex items-start gap-3">
      <div class="relative w-8 shrink-0">
        <span v-if="deleted" class="flex size-8 items-center justify-center rounded-lg border border-dashed moh-border moh-text-soft" aria-hidden="true"><Icon name="tabler:trash" class="size-4" /></span>
        <AppUserAvatar v-else-if="!grouped" :user="message.sender" size-class="size-8" />
        <NuxtLink v-else-if="permalink" :to="permalink" class="moh-focus absolute -inset-x-2 top-0 hidden h-6 items-center justify-center whitespace-nowrap text-[10px] leading-none moh-text-muted hover:underline group-hover:flex group-focus-within:flex" :aria-label="`Link to message sent at ${time}`"><time :datetime="message.createdAt">{{ time }}</time></NuxtLink>
      </div>
      <div class="min-w-0 flex-1">
        <div v-if="!grouped && !deleted" class="mb-1 flex items-baseline gap-2"><NuxtLink v-if="message.sender.username" :to="`/u/${message.sender.username}`" class="font-semibold hover:underline" :style="senderColor ? { color: senderColor } : undefined" @mouseenter="preview.onEnter(message.sender.username, $event)" @mousemove="preview.onMove" @mouseleave="preview.onLeave">{{ message.sender.name ?? message.sender.username }}</NuxtLink><strong v-else>Member</strong><NuxtLink v-if="permalink" :to="permalink" class="moh-focus text-xs moh-text-muted hover:underline" :aria-label="`Link to message sent at ${time}`"><time :datetime="message.createdAt">{{ time }}</time></NuxtLink><time v-else class="text-xs moh-text-muted" :datetime="message.createdAt">{{ time }}</time><Icon v-if="message.pinned" name="tabler:pin" aria-label="Pinned" /></div>
        <div v-if="deleted" class="py-0.5"><p class="text-[15px] font-medium moh-text-muted">Message deleted</p><p v-if="message.replyCount" class="text-xs moh-text-soft">The {{ message.replyCount === 1 ? 'reply' : 'replies' }} below {{ message.replyCount === 1 ? 'is' : 'are' }} still here.</p></div>
        <template v-else><div class="transition-opacity duration-700 ease-out motion-reduce:transition-none" :class="dimmed ? 'opacity-60' : ''"><AppChatMessageRichBody v-if="message.body" :body="message.body" :sender-tier="senderTier" :hidden-previews="message.hiddenPreviews" :dismissible-previews="isOwn && !status" class="break-words text-[15px] leading-relaxed" @dismiss-preview="emit('hide-preview', $event)" /><slot name="media" /><div v-if="message.media?.length" class="mt-1 grid max-w-xl gap-2" :class="message.media.length > 1 ? 'grid-cols-2' : ''"><AppChannelsProtectedMedia v-for="media in message.media" :key="media.id" :media="media" /></div></div><span v-if="message.editedAt" class="text-xs moh-text-muted">Edited</span>
          <div v-if="message.reactions?.length" class="mt-1 flex flex-wrap gap-1"><button v-for="reaction in message.reactions" :key="reaction.reactionId" type="button" class="moh-focus inline-flex min-h-8 items-center gap-1 rounded-full border moh-border px-2 text-sm leading-none tabular-nums" :class="reaction.reactedByMe ? 'bg-[var(--moh-surface-2)]' : ''" :aria-pressed="reaction.reactedByMe" :disabled="!canReact" @click="emit('react', reaction.reactionId)"><span aria-hidden="true">{{ reaction.emoji }}</span>{{ reaction.count }}</button></div>
        </template>
        <slot name="failed" />
        <button v-if="!hideReplies && message.replyCount" type="button" class="moh-focus text-sm moh-text-muted" :class="deleted ? 'mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border moh-border bg-[var(--moh-surface-1)] px-3 hover:bg-[var(--moh-surface-2)]' : 'min-h-11 hover:underline'" @click="emit('reply')"><span class="font-medium">{{ message.replyCount }} {{ message.replyCount === 1 ? 'reply' : 'replies' }}</span><span v-if="lastReply" :class="deleted ? 'text-xs moh-text-soft' : ''">{{ deleted ? '' : ' · ' }}Last reply {{ lastReply }}</span><Icon v-if="deleted" name="tabler:chevron-right" class="size-3.5 moh-text-soft" aria-hidden="true" /></button>
      </div>
      <div v-if="receiptStatus" class="flex flex-col justify-end self-stretch pb-0.5"><AppChannelsReceipt :status="receiptStatus" :read-count="message.receipt?.readCount" :recipient-count="message.receipt?.recipientCount" :expanded="expanded" /></div>
    </div>
    <button v-if="!status && !deleted" type="button" class="touch-message-more moh-focus absolute right-1 top-1 size-11" aria-label="More message actions" @click="showActions"><Icon name="tabler:dots-vertical" /></button>
    <div v-if="!status && !deleted" class="message-toolbar absolute right-3 top-0 flex rounded-xl border moh-border moh-surface shadow-sm">
      <template v-if="canReact && !message.deletedForAll"><button v-for="reaction in quick" :key="reaction.id" type="button" class="moh-focus size-11" :aria-label="reaction.label" @click="emit('react', reaction.id)">{{ reaction.emoji }}</button><button type="button" class="moh-focus size-11" aria-label="Choose reaction" @click="reactionPicker?.toggle($event)"><Icon name="tabler:mood-plus" /></button></template>
      <button type="button" class="moh-focus size-11" aria-label="Reply in thread" @click="emit('reply')"><Icon name="tabler:message-reply" /></button>
      <button type="button" class="moh-focus size-11" aria-label="More message actions" @click="showMore"><Icon name="tabler:dots-vertical" /></button>
    </div>
    <Popover ref="menu" @hide="restoreFocus"><AppInteractionsActionList :actions="actions.filter(action => action.id !== 'reply')" @select="menu?.hide()" /></Popover>
    <AppChatReactionPicker ref="reactionPicker" :reactions="reactions" :active-reaction-ids="new Set(message.reactions?.filter(item => item.reactedByMe).map(item => item.reactionId))" @select="emit('react', $event)" />
    <Dialog v-model:visible="touchOpen" modal header="Message actions" class="w-full max-w-lg" @hide="restoreFocus">
      <blockquote class="mb-3 rounded-lg border moh-border p-3 text-sm"><strong>{{ message.sender.name ?? message.sender.username }}</strong><p class="mt-1 line-clamp-5 whitespace-pre-wrap">{{ message.deletedForAll ? 'Message deleted' : message.body }}</p></blockquote>
      <div v-if="canReact && !message.deletedForAll" class="flex flex-wrap border-b moh-border pb-2"><button v-for="reaction in reactions" :key="reaction.id" class="moh-focus size-11 text-xl" type="button" :aria-label="reaction.label" @click="emit('react', reaction.id); touchOpen = false">{{ reaction.emoji }}</button></div>
      <AppInteractionsActionList :actions="actions" @select="touchOpen = false" />
    </Dialog>
  </article>
</template>
<script setup lang="ts">
import type { ChannelMessage, MessageReaction } from '~/types/api'
import type { SurfaceAction } from '~/utils/surface-actions'
import type { RouteLocationRaw } from 'vue-router'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'
const props = defineProps<{
  message: ChannelMessage; hideReplies?: boolean; grouped: boolean; canReact: boolean; actions: SurfaceAction[]; reactions: MessageReaction[]
  /** An unconfirmed own message. It renders exactly like a delivered one; only the receipt and a slight fade differ. */
  status?: 'sending' | 'failed'
  /** The viewer's newest own message spells its receipt out; older ones show icon and count. */
  latestOwn?: boolean
  /** Confirmed moments ago in this session: keep the "Sent" label visible briefly. */
  fresh?: boolean
  /** Route to this message. The time links here so a message can be shared and selected. */
  permalink?: RouteLocationRaw
}>()
const emit = defineEmits<{ react: [id: string]; reply: []; 'hide-preview': [url: string] }>()
const { user: viewer } = useAuth()
const isOwn = computed(() => !!viewer.value && props.message.sender.id === viewer.value.id)
// A just-delivered own message eases from "sending" to "sent" instead of snapping, so the handoff is readable.
const SETTLE_MS = 900
const settling = ref(!!props.fresh && !props.status)
let settleTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { if (settling.value) settleTimer = setTimeout(() => { settling.value = false }, SETTLE_MS) })
onBeforeUnmount(() => clearTimeout(settleTimer))
const dimmed = computed(() => props.status === 'sending' || settling.value)
const receiptStatus = computed(() => {
  if (props.status) return props.status
  if (settling.value) return 'sending' as const
  if (!props.message.receipt || props.message.deletedForAll) return null
  return props.message.receipt.readCount > 0 ? 'read' as const : 'sent' as const
})
const senderTier = computed(() => userColorTier(props.message.sender as Parameters<typeof userColorTier>[0]))
const senderColor = computed(() => userTierColorVar(senderTier.value))
const preview = useUserPreviewMultiTrigger()
const deleted = computed(() => props.message.deletedForAll)
const expanded = computed(() => !!props.latestOwn || !!props.fresh || props.status === 'sending' || settling.value)
const row = ref<HTMLElement | null>(null)
const menu = ref<{ toggle: (event: Event) => void; hide: () => void } | null>(null)
const reactionPicker = ref<{ toggle: (event: Event) => void } | null>(null)
const touchOpen = ref(false)
const quick = computed(() => props.reactions.filter(reaction => ['check', 'eyes', 'raised_hands'].includes(reaction.id)))
const time = computed(() => new Date(props.message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
const lastReply = computed(() => props.message.lastReplyAt ? new Date(props.message.lastReplyAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')
let origin: HTMLElement | null = null
let press: ReturnType<typeof setTimeout> | undefined
let point = { x: 0, y: 0 }
function restoreFocus() { origin?.focus(); origin = null }
function showActions() { if (deleted.value) return; origin = document.activeElement instanceof HTMLElement ? document.activeElement : row.value; touchOpen.value = true }
function showMore(event: MouseEvent) { origin = event.currentTarget as HTMLElement; menu.value?.toggle(event) }
function startPress(event: PointerEvent) {
  if (event.pointerType === 'mouse' || (event.target as HTMLElement).closest('a,button,video,audio')) return
  point = { x: event.clientX, y: event.clientY }
  press = setTimeout(showActions, 500)
}
function cancelPress() { clearTimeout(press) }
function cancelMoved(event: PointerEvent) { if (Math.hypot(event.clientX - point.x, event.clientY - point.y) > 8) cancelPress() }
onBeforeUnmount(cancelPress)
</script>
<style scoped>
.touch-message-more { display: none; }
.message-toolbar { opacity: 0; pointer-events: none; }
.channel-message:hover .message-toolbar,
.channel-message:focus-within .message-toolbar { opacity: 1; pointer-events: auto; }
@media (hover: none) {
  .message-toolbar { display: none; }
  .touch-message-more { display: block; }
  .channel-message { padding-right: 52px; }
}
</style>
