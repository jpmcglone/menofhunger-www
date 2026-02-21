<template>
  <div v-if="message.kind === 'system'" class="py-1.5">
    <div class="max-w-full text-left text-[11px] text-gray-400 dark:text-gray-500">
      <template v-if="systemUsername && systemProfilePath">
        <NuxtLink
          :to="systemProfilePath"
          class="font-semibold hover:underline underline-offset-2"
          @mouseenter="onSystemEnter"
          @mousemove="onSystemMove"
          @mouseleave="onSystemLeave"
        >
          @{{ systemUsername }}
        </NuxtLink>
      </template>
      <span v-else class="font-semibold">Someone</span>
      <span class="ml-1">has {{ systemVerbPhrase }} the chat</span>
    </div>
  </div>
  <div v-else class="text-sm leading-5" :class="containerClass" :style="containerStyle">
    <template v-if="profilePath">
      <NuxtLink
        :to="profilePath"
        class="font-semibold hover:underline underline-offset-2"
        :class="usernameClass"
        @mouseenter="onEnter"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        {{ displayUsername }}
      </NuxtLink>
    </template>
    <span v-else class="font-semibold" :class="usernameClass">
      {{ displayUsername }}
    </span>
    <span class="mx-1 text-gray-500 dark:text-gray-400">:</span>
    <span class="text-gray-900 dark:text-gray-100 break-words">
      <template v-for="seg in bodySegments" :key="seg.key">
        <NuxtLink
          v-if="seg.type === 'mention'"
          :to="`/u/${encodeURIComponent(seg.username!)}`"
          class="font-semibold hover:underline underline-offset-2"
          :class="mentionExtraClass(seg.username!)"
          :style="mentionStyle(seg.username!)"
          @mouseenter="(e) => onMentionEnter(e, seg.username!)"
          @mousemove="onMentionMove"
          @mouseleave="onMentionLeave"
        >@{{ seg.username }}</NuxtLink>
        <NuxtLink
          v-else-if="seg.type === 'hashtag'"
          :to="{ path: '/explore', query: { q: `#${seg.tag}` } }"
          class="font-medium hover:underline underline-offset-2"
          :style="{ color: hashtagColor }"
          @click.stop
        >{{ seg.text }}</NuxtLink>
        <span v-else>{{ seg.text }}</span>
      </template>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { SpaceChatMessage } from '~/types/api'
import { userColorTier, userTierColorVar, userTierTextClass } from '~/utils/user-tier'
import { HASHTAG_IN_TEXT_DISPLAY_RE } from '~/utils/hashtag-autocomplete'

type BodySegment =
  | { key: string; type: 'text'; text: string; username?: undefined; tag?: undefined }
  | { key: string; type: 'mention'; username: string; text?: undefined; tag?: undefined }
  | { key: string; type: 'hashtag'; tag: string; text: string; username?: undefined }

const props = defineProps<{
  message: SpaceChatMessage
  knownUsernames?: Set<string>
}>()

const { user: me } = useAuth()

const isMine = computed(() => {
  const myId = String(me.value?.id ?? '').trim()
  const senderId = String(props.message?.sender?.id ?? '').trim()
  return Boolean(myId && senderId && myId === senderId)
})

const username = computed(() => (props.message?.sender?.username ?? '').trim() || null)
const displayUsername = computed(() => username.value ?? 'User')
const profilePath = computed(() => (username.value ? `/u/${encodeURIComponent(username.value)}` : null))

const senderTier = computed(() => userColorTier(props.message?.sender as any))
const usernameClass = computed(() => {
  return userTierTextClass(senderTier.value, { fallback: 'text-gray-900 dark:text-gray-100' })
})

const containerClass = computed(() => {
  if (!isMine.value) return ''
  // Give the highlight some breathing room without changing overall list width.
  return 'rounded-lg px-2 py-1 -mx-2'
})

const containerStyle = computed<Record<string, string> | undefined>(() => {
  if (!isMine.value) return undefined
  const tierVar = userTierColorVar(senderTier.value)
  if (!tierVar) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.14)',
    }
  }
  // Subtle tint using the tier color.
  return {
    backgroundColor: `color-mix(in srgb, ${tierVar} 14%, transparent)`,
  }
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

  // Mention matches
  const mentionRe = /@([a-zA-Z0-9_]+)/g
  for (const m of body.matchAll(mentionRe)) {
    const start = m.index!
    const end = start + m[0].length
    const uname = m[1]!
    if (known.has(uname.toLowerCase())) {
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
const systemProfilePath = computed(() => (systemUsername.value ? `/u/${encodeURIComponent(systemUsername.value)}` : null))
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

