<template>
  <div v-if="message.kind === 'system'" class="py-1.5">
    <div class="max-w-full text-left text-[11px] text-gray-400 dark:text-gray-500">
      <template v-if="systemUsername">
        <button
          type="button"
          class="bg-transparent p-0 m-0 border-0 font-semibold hover:underline underline-offset-2 cursor-pointer"
          @click="onUsernameActivate(systemUsername)"
          @mouseenter="onSystemEnter"
          @mousemove="onSystemMove"
          @mouseleave="onSystemLeave"
        >
          @{{ systemUsername }}
        </button>
      </template>
      <span v-else class="font-semibold">Someone</span>
      <span class="ml-1">has {{ systemVerbPhrase }} the chat</span>
    </div>
  </div>
  <div
    v-else
    :data-message-id="message.id"
    class="group/row relative text-sm leading-5"
    :class="containerClass"
    :style="containerStyle"
  >
    <div
      v-if="message.kind === 'user' && (message.replyTo || message.replyToId)"
      class="mb-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400"
      :class="[
        isMine ? 'moh-bg' : 'bg-gray-100/80 dark:bg-zinc-800/80',
        message.replyTo ? 'cursor-pointer' : 'cursor-default',
      ]"
      @click="onReplySnippetClick"
    >
      <Icon name="tabler:corner-up-right" size="12" class="shrink-0" aria-hidden="true" />
      <div v-if="message.replyTo" class="min-w-0 flex-1 overflow-hidden">
        <span class="font-semibold mr-1">{{ message.replyTo.senderUsername ? `@${message.replyTo.senderUsername}` : 'Unknown' }}</span>
        <span class="break-words">{{ message.replyTo.bodyPreview }}</span>
      </div>
      <span v-else>Reply</span>
    </div>
    <div class="flex items-center gap-1">
      <div class="min-w-0 flex-1">
    <template v-if="username">
      <button
        type="button"
        class="bg-transparent p-0 m-0 border-0 font-semibold hover:underline underline-offset-2 cursor-pointer"
        :class="usernameClass"
        @click="onUsernameActivate(username)"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        {{ displayUsername }}
      </button>
    </template>
    <span v-else class="font-semibold" :class="usernameClass">
      {{ displayUsername }}
    </span>
    <span class="mx-1 text-gray-500 dark:text-gray-400">:</span>
    <!-- Redacted body when sender is blocked; click to toggle reveal -->
    <span v-if="isBodyRedacted && !redactRevealed" class="inline-flex items-center gap-1">
      <button
        type="button"
        class="inline-block rounded px-1 text-xs select-none bg-zinc-900 text-zinc-900 cursor-pointer hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
        title="Message from a blocked user. Click to reveal."
        @click="redactRevealed = true"
      >
        &nbsp;{{ redactPlaceholder }}&nbsp;
      </button>
      <span class="text-[10px] text-zinc-600 cursor-default">(blocked)</span>
    </span>
    <span v-else class="text-gray-900 dark:text-gray-100 break-words">
      <template v-for="seg in bodySegments" :key="seg.key">
        <NuxtLink
          v-if="seg.type === 'url' && internalPathFor(seg.href)"
          :to="internalPathFor(seg.href)!"
          class="underline decoration-current/35 underline-offset-2 hover:decoration-current"
          @click.stop
          @mouseenter="(e) => onLinkEnter(seg.href, e)"
          @mousemove="onLinkMove"
          @mouseleave="onLinkLeave"
        >{{ seg.text }}</NuxtLink>
        <a
          v-else-if="seg.type === 'url'"
          :href="seg.href"
          target="_blank"
          rel="noopener noreferrer"
          class="underline decoration-current/35 underline-offset-2 hover:decoration-current"
          @click.stop
          @mouseenter="(e) => onLinkEnter(seg.href, e)"
          @mousemove="onLinkMove"
          @mouseleave="onLinkLeave"
        >{{ seg.text }}</a>
        <button
          v-else-if="seg.type === 'mention'"
          type="button"
          class="bg-transparent p-0 m-0 border-0 font-semibold hover:underline underline-offset-2 cursor-pointer"
          :class="mentionExtraClass(seg.username!)"
          :style="mentionStyle(seg.username!)"
          @click="onUsernameActivate(seg.username!)"
          @mouseenter="(e) => onMentionEnter(e, seg.username!)"
          @mousemove="onMentionMove"
          @mouseleave="onMentionLeave"
        >@{{ seg.username }}</button>
        <NuxtLink
          v-else-if="seg.type === 'hashtag'"
          :to="{ path: '/explore', query: { q: `#${seg.tag}` } }"
          class="font-medium hover:underline underline-offset-2"
          :style="{ color: hashtagColor }"
          @click.stop
        >{{ seg.text }}</NuxtLink>
        <NuxtLink
          v-else-if="seg.type === 'cashtag'"
          :to="{ path: '/explore', query: { q: `$${seg.symbol}` } }"
          class="moh-cashtag font-medium hover:underline underline-offset-2"
          :style="{ color: hashtagColor }"
          @click.stop
        >{{ seg.text }}</NuxtLink>
        <span v-else>{{ seg.text }}</span>
      </template>
    </span>
      </div>
      <div
        class="flex shrink-0 items-center gap-0.5 opacity-40 sm:opacity-0 sm:group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity"
      >
        <button
          type="button"
          title="React"
          aria-label="Add reaction"
          class="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
          @click.stop="emit('open-reaction-picker', $event)"
        >
          <Icon name="tabler:mood-smile" size="13" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Reply"
          aria-label="Reply"
          class="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
          @click.stop="emit('reply')"
        >
          <Icon name="tabler:corner-up-right" size="13" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div v-if="messageMedia.length > 0" class="mt-1">
      <img
        v-for="(m, idx) in messageMedia"
        :key="idx"
        :src="m.url"
        :alt="m.alt ?? ''"
        :width="m.width ?? undefined"
        :height="m.height ?? undefined"
        loading="lazy"
        class="block rounded-lg max-w-[280px] max-h-[200px] object-contain object-left"
      />
    </div>
    <div
      v-if="message.kind === 'user' && message.reactions?.length"
      class="mt-0.5 flex flex-wrap gap-1"
    >
      <button
        v-for="group in message.reactions"
        :key="group.reactionId"
        type="button"
        :title="group.reactors.map((r) => r.username || r.id).join(', ')"
        :class="[
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-colors',
          group.reactedByMe
            ? 'border-[var(--p-primary-color)] bg-[var(--p-primary-color)]/10 text-[var(--p-primary-color)]'
            : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300',
        ]"
        @click.stop="emit('react', group.reactionId)"
      >
        <span>{{ group.emoji }}</span>
        <span class="font-semibold tabular-nums">{{ group.count }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SpaceChatMediaItem, SpaceChatMessage } from '~/types/api'
import { ownMessageTintStyle, userColorTier, userTierColorVar, userTierTextClass } from '~/utils/user-tier'
import { HASHTAG_IN_TEXT_DISPLAY_RE } from '~/utils/hashtag-autocomplete'
import { CASHTAG_IN_TEXT_DISPLAY_RE } from '~/utils/cashtag-autocomplete'
import { isMohUrl, matchLinksInText, mohUrlPath } from '~/utils/link-utils'

type BodySegment =
  | { key: string; type: 'text'; text: string; username?: undefined; tag?: undefined; symbol?: undefined; href?: undefined }
  | { key: string; type: 'mention'; username: string; text?: undefined; tag?: undefined; symbol?: undefined; href?: undefined }
  | { key: string; type: 'hashtag'; tag: string; text: string; username?: undefined; symbol?: undefined; href?: undefined }
  | { key: string; type: 'cashtag'; symbol: string; text: string; username?: undefined; tag?: undefined; href?: undefined }
  | { key: string; type: 'url'; text: string; href: string; username?: undefined; tag?: undefined; symbol?: undefined }

const props = defineProps<{
  message: SpaceChatMessage
  knownUsernames?: Set<string>
}>()

const emit = defineEmits<{
  reply: []
  react: [reactionId: string]
  'open-reaction-picker': [event: Event]
  'reply-snippet-click': [messageId: string]
  mention: [username: string]
}>()

function onUsernameActivate(uname: string) {
  const next = uname.trim()
  if (!next) return
  emit('mention', next)
}

function onReplySnippetClick() {
  if (props.message.kind !== 'user' || !props.message.replyTo?.id) return
  emit('reply-snippet-click', props.message.replyTo.id)
}

const { user: me } = useAuth()
const blockState = useBlockState()

const isMine = computed(() => {
  const myId = String(me.value?.id ?? '').trim()
  const senderId = String(props.message?.sender?.id ?? '').trim()
  return Boolean(myId && senderId && myId === senderId)
})

const messageMedia = computed<SpaceChatMediaItem[]>(() => {
  if (props.message.kind !== 'user') return []
  return (props.message as any).media ?? []
})

// Redaction: block either direction hides the message body by default.
const senderId = computed(() => (props.message?.sender?.id ?? '').trim() || null)
const isBodyRedacted = computed(() => {
  if (isMine.value || !senderId.value) return false
  return blockState.isBlockedByMe(senderId.value)
})
const redactRevealed = ref(false)
const redactPlaceholder = computed(() => {
  const body = props.message.body ?? ''
  // Show a fixed-width block roughly proportional to message length.
  const len = Math.max(8, Math.min(body.length, 30))
  return '\u2588'.repeat(len)
})

// Reset reveal state when message changes.
watch(senderId, () => { redactRevealed.value = false })

const username = computed(() => (props.message?.sender?.username ?? '').trim() || null)
const displayUsername = computed(() => username.value ?? 'User')

const senderTier = computed(() => userColorTier(props.message?.sender as any))
const usernameClass = computed(() => {
  return userTierTextClass(senderTier.value, { fallback: 'text-gray-900 dark:text-gray-100' })
})

const hasReply = computed(() =>
  props.message.kind === 'user' && Boolean(props.message.replyTo || props.message.replyToId),
)
const hasReactions = computed(() =>
  props.message.kind === 'user' && Boolean(props.message.reactions?.length),
)
const hasExtras = computed(() =>
  hasReply.value || hasReactions.value || messageMedia.value.length > 0,
)

const containerClass = computed(() => {
  // Reply chips and reaction pills need a padded group so they read as one message,
  // not as a stray footer on the line above.
  if (isMine.value) {
    return hasExtras.value ? 'rounded-lg px-2 py-1.5 -mx-2' : 'rounded-lg px-2 py-0.5 -mx-2'
  }
  return hasExtras.value ? 'rounded-lg px-2 py-1.5 -mx-2' : ''
})

const containerStyle = computed<Record<string, string> | undefined>(() => {
  if (!isMine.value) return undefined
  return ownMessageTintStyle(senderTier.value)
})

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: computed(() => username.value ?? ''),
})

// Body parsing: mentions + hashtags.
const bodySegments = computed<BodySegment[]>(() => {
  if (props.message.kind !== 'user') return []
  const body = props.message.body ?? ''
  const known = props.knownUsernames ?? new Set<string>()

  type RangedMatch = { start: number; end: number; seg: BodySegment }
  const matches: RangedMatch[] = []
  let i = 0

  // URLs first so @mentions inside a URL (e.g. x.com/@user) stay part of the link.
  for (const m of matchLinksInText(body)) {
    matches.push({ start: m.start, end: m.end, seg: { key: `u-${i++}`, type: 'url', text: m.text, href: m.href } })
  }

  // Mention matches (skip ranges already claimed by a link)
  const mentionRe = /@([a-zA-Z0-9_]+)/g
  for (const m of body.matchAll(mentionRe)) {
    const start = m.index!
    const end = start + m[0].length
    const uname = m[1]!
    const overlaps = matches.some((rm) => start < rm.end && end > rm.start)
    if (!overlaps && known.has(uname.toLowerCase())) {
      matches.push({ start, end, seg: { key: `m-${i++}`, type: 'mention', username: uname } })
    }
  }

  // Hashtag matches (skip ranges already claimed by a mention)
  const hashRe = new RegExp(HASHTAG_IN_TEXT_DISPLAY_RE.source, 'g')
  for (const m of body.matchAll(hashRe)) {
    const start = m.index!
    const end = start + m[0].length
    const tag = m[1]!
    const overlaps = matches.some((rm) => start < rm.end && end > rm.start)
    if (!overlaps) {
      matches.push({ start, end, seg: { key: `h-${i++}`, type: 'hashtag', tag, text: m[0] } })
    }
  }

  // Cashtag matches (skip ranges already claimed)
  const cashRe = new RegExp(CASHTAG_IN_TEXT_DISPLAY_RE.source, 'g')
  for (const m of body.matchAll(cashRe)) {
    const start = m.index!
    const end = start + m[0].length
    const symbol = (m[1]!).toUpperCase()
    const overlaps = matches.some((rm) => start < rm.end && end > rm.start)
    if (!overlaps) {
      matches.push({ start, end, seg: { key: `c-${i++}`, type: 'cashtag', symbol, text: m[0] } })
    }
  }

  matches.sort((a, b) => a.start - b.start)

  const parts: BodySegment[] = []
  let cursor = 0
  for (const { start, end, seg } of matches) {
    if (start > cursor) parts.push({ key: `t-${i++}`, type: 'text', text: body.slice(cursor, start) })
    parts.push(seg)
    cursor = end
  }
  if (cursor < body.length) parts.push({ key: `t-${i++}`, type: 'text', text: body.slice(cursor) })
  return parts.length ? parts : [{ key: 't-0', type: 'text', text: body }]
})

const { tierForUsername } = useValidatedChatUsernames()
const myUsername = computed(() => (me.value?.username ?? '').toLowerCase())
const myTier = computed(() => userColorTier(me.value as any))
const myTierColor = computed(() => userTierColorVar(myTier.value) ?? 'var(--p-primary-color)')

function mentionExtraClass(uname: string): string {
  const lower = uname.toLowerCase()
  if (lower === myUsername.value) return 'rounded px-0.5'
  return ''
}

function mentionStyle(uname: string): Record<string, string> {
  const lower = uname.toLowerCase()
  if (lower === myUsername.value) {
    return {
      color: myTierColor.value,
      backgroundColor: `color-mix(in srgb, ${myTierColor.value} 12%, transparent)`,
    }
  }
  const tier = tierForUsername(lower)
  const tierColor = userTierColorVar(tier)
  return { color: tierColor ?? 'var(--p-primary-color)' }
}

const hashtagColor = computed(() => userTierColorVar(senderTier.value) ?? 'var(--p-primary-color)')

const { onEnter: onLinkEnter, onMove: onLinkMove, onLeave: onLinkLeave } = useLinkPreviewTrigger()

function internalPathFor(href: string): string | null {
  if (!isMohUrl(href)) return null
  return mohUrlPath(href)
}

const hoveredMention = ref('')
const { onEnter: _onMentionEnterRaw, onMove: onMentionMove, onLeave: _onMentionLeaveRaw } = useUserPreviewTrigger({
  username: computed(() => hoveredMention.value),
})
function onMentionEnter(e: MouseEvent, uname: string) {
  hoveredMention.value = uname
  _onMentionEnterRaw(e)
}
function onMentionLeave(_e: MouseEvent) {
  _onMentionLeaveRaw()
  hoveredMention.value = ''
}

const systemUsername = computed(() => {
  if (props.message.kind !== 'system') return null
  return (props.message.system?.username ?? '').trim() || null
})
const systemVerbPhrase = computed(() => {
  if (props.message.kind !== 'system') return 'joined'
  const first = props.message.system?.firstEvent
  const last = props.message.system?.lastEvent
  const firstWord = first === 'leave' ? 'left' : 'joined'
  const lastWord = last === 'leave' ? 'left' : 'joined'
  return firstWord === lastWord ? firstWord : `${firstWord} and ${lastWord}`
})

const { onEnter: onSystemEnter, onMove: onSystemMove, onLeave: onSystemLeave } = useUserPreviewTrigger({
  username: computed(() => systemUsername.value ?? ''),
})
</script>

