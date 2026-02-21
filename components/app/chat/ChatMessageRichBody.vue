<template>
  <div class="min-w-0">
    <p class="whitespace-pre-wrap break-words">
      <template v-for="(seg, idx) in displayBodySegments" :key="idx">
        <a
          v-if="seg.kind === 'link'"
          :href="seg.href"
          target="_blank"
          rel="noopener noreferrer"
          class="underline decoration-current/35 underline-offset-2 hover:decoration-current"
          @click.stop
        >
          {{ seg.text }}
        </a>
        <NuxtLink
          v-else-if="seg.kind === 'mention' && seg.isKnown"
          :to="`/u/${seg.username}`"
          class="font-bold hover:underline"
          :class="onColoredBackground ? 'text-white' : ''"
          :style="onColoredBackground ? undefined : { color: userTierColorVar(tierForUsername(seg.username!)) ?? 'var(--p-primary-color)' }"
          @mouseenter="(e: MouseEvent) => onMentionEnter(e, seg.username!)"
          @mousemove="onMentionMove"
          @mouseleave="onMentionLeave"
          @click.stop
        >{{ seg.text }}</NuxtLink>
        <span
          v-else-if="seg.kind === 'mention'"
          class="font-bold"
          :class="onColoredBackground ? 'opacity-70' : 'opacity-60'"
        >{{ seg.text }}</span>
        <NuxtLink
          v-else-if="seg.kind === 'hashtag'"
          :to="{ path: '/explore', query: { q: `#${seg.tag}` } }"
          class="font-medium hover:underline underline-offset-2"
          :class="onColoredBackground ? 'text-white' : ''"
          :style="onColoredBackground ? undefined : { color: hashtagColor }"
          @click.stop
        >{{ seg.text }}</NuxtLink>
        <span v-else>{{ seg.text }}</span>
      </template>
    </p>

    <a
      v-if="showLinkPreview"
      :href="previewLink || undefined"
      target="_blank"
      rel="noopener noreferrer"
      class="group mt-2 block overflow-hidden rounded-lg border border-current/20 bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
      aria-label="Open link"
      @click.stop
    >
      <div class="flex gap-2.5 p-2">
        <div
          v-if="linkMeta?.imageUrl"
          class="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black/10 dark:bg-white/10"
          aria-hidden="true"
        >
          <img :src="linkMeta.imageUrl" class="h-full w-full object-cover" alt="" loading="lazy">
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[12px] font-semibold">
            {{ linkMeta?.title || previewLinkHost || 'Link' }}
          </div>
          <div v-if="linkMeta?.description" class="truncate text-[11px] opacity-80">
            {{ linkMeta.description }}
          </div>
          <div class="truncate text-[10px] opacity-70">
            {{ previewLinkDisplay }}
          </div>
        </div>
        <div class="shrink-0 opacity-60" aria-hidden="true">
          <Icon name="tabler:external-link" class="text-[11px]" aria-hidden="true" />
        </div>
      </div>
    </a>
  </div>
</template>

<script setup lang="ts">
import LinkifyIt from 'linkify-it'
import { extractLinksFromText, safeUrlDisplay, safeUrlHostname } from '~/utils/link-utils'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'

import { HASHTAG_IN_TEXT_DISPLAY_RE } from '~/utils/hashtag-autocomplete'
import { userTierColorVar } from '~/utils/user-tier'
import type { UserColorTier } from '~/utils/user-tier'

type TextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string }
  | { kind: 'mention'; text: string; username: string; isKnown: boolean }
  | { kind: 'hashtag'; text: string; tag: string }

const MENTION_RE = /@([a-zA-Z0-9_]+)/g

const props = defineProps<{
  body: string
  /**
   * True when the bubble this text sits inside has a solid colored background.
   * Mentions and hashtags render as bold white to stay visible.
   */
  onColoredBackground?: boolean
  /** Sender's tier — hashtags are colored to match the sender. */
  senderTier?: UserColorTier
}>()

const linkify = new LinkifyIt()

const { validSet, tierForUsername, validateMentionsInBody } = useValidatedChatUsernames()

// Hover preview
const hoveredMention = ref('')
const { onEnter: _onMentionEnterRaw, onMove: onMentionMove, onLeave: _onMentionLeaveRaw } = useUserPreviewTrigger({
  username: computed(() => hoveredMention.value),
})
function onMentionEnter(e: MouseEvent, username: string) {
  hoveredMention.value = username
  _onMentionEnterRaw(e)
}
function onMentionLeave() {
  hoveredMention.value = ''
  _onMentionLeaveRaw()
}

const hashtagColor = computed(() => userTierColorVar(props.senderTier ?? 'normal') ?? 'var(--p-primary-color)')

// Trigger background validation for any @mentions in this message.
watch(() => props.body, (body) => {
  if (body) validateMentionsInBody(body, validSet.value)
}, { immediate: true })

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const capturedLinks = computed(() => extractLinksFromText((props.body ?? '').toString()))

const previewLink = computed(() => {
  const xs = capturedLinks.value
  return xs.length ? xs[xs.length - 1] ?? null : null
})

const displayBody = computed(() => {
  const input = (props.body ?? '').toString()
  const last = (previewLink.value ?? '').trim()
  if (!last) return input
  const re = new RegExp(String.raw`(?:\s*)${escapeRegExp(last)}\s*$`)
  if (!re.test(input)) return input
  return input.replace(re, '').replace(/\s+$/, '')
})

const showLinkPreview = computed(() => Boolean(previewLink.value))
const previewLinkHost = computed(() => (previewLink.value ? safeUrlHostname(previewLink.value) : null))
const previewLinkDisplay = computed(() => (previewLink.value ? safeUrlDisplay(previewLink.value) : ''))

const displayBodySegments = computed<TextSegment[]>(() => {
  const input = (displayBody.value ?? '').toString()
  if (!input) return [{ kind: 'text', text: '' }]

  type RangedMatch = { start: number; end: number; seg: TextSegment }
  const allMatches: RangedMatch[] = []

  // Link matches
  const linkMatches = linkify.match(input) ?? []
  for (const m of linkMatches) {
    const start = typeof (m as any).index === 'number' ? ((m as any).index as number) : -1
    const end = typeof (m as any).lastIndex === 'number' ? ((m as any).lastIndex as number) : -1
    if (start < 0 || end <= start) continue
    const text = input.slice(start, end)
    const href = (m.url ?? '').trim()
    if (href && /^https?:\/\//i.test(href)) {
      allMatches.push({ start, end, seg: { kind: 'link', text, href } })
    }
  }

  // Mention matches (skip ranges already claimed by a link)
  for (const m of input.matchAll(MENTION_RE)) {
    const start = m.index!
    const end = start + m[0].length
    const username = m[1]!
    const overlaps = allMatches.some((lm) => start < lm.end && end > lm.start)
    if (!overlaps) {
      const isKnown = validSet.value.has(username.toLowerCase())
      allMatches.push({ start, end, seg: { kind: 'mention', text: m[0], username, isKnown } })
    }
  }

  // Hashtag matches (skip ranges already claimed)
  const hashRe = new RegExp(HASHTAG_IN_TEXT_DISPLAY_RE.source, 'g')
  for (const m of input.matchAll(hashRe)) {
    const start = m.index!
    const end = start + m[0].length
    const tag = m[1]!
    const overlaps = allMatches.some((rm) => start < rm.end && end > rm.start)
    if (!overlaps) {
      allMatches.push({ start, end, seg: { kind: 'hashtag', text: m[0], tag } })
    }
  }

  allMatches.sort((a, b) => a.start - b.start)

  const out: TextSegment[] = []
  let cursor = 0
  for (const { start, end, seg } of allMatches) {
    if (start > cursor) out.push({ kind: 'text', text: input.slice(cursor, start) })
    out.push(seg)
    cursor = end
  }
  if (cursor < input.length) out.push({ kind: 'text', text: input.slice(cursor) })
  return out.length ? out : [{ kind: 'text', text: input }]
})

const linkMeta = ref<LinkMetadata | null>(null)
watch(
  previewLink,
  async (url) => {
    linkMeta.value = null
    if (!import.meta.client) return
    if (!url) return
    linkMeta.value = await getLinkMetadata(url)
  },
  { immediate: true },
)
</script>
