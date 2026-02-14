<template>
  <p class="mt-0.5 whitespace-pre-wrap break-words moh-text">
    <template v-for="(seg, idx) in displayBodySegments" :key="idx">
      <a
        v-if="seg.href"
        :href="seg.href"
        target="_blank"
        rel="noopener noreferrer"
        class="underline decoration-gray-300 underline-offset-2 hover:decoration-gray-500 dark:decoration-zinc-700 dark:hover:decoration-zinc-500"
        @click.stop
      >
        {{ seg.text }}
      </a>
      <NuxtLink
        v-else-if="seg.mentionUsername"
        :to="`/u/${encodeURIComponent(seg.mentionUsername)}`"
        :class="mentionLinkClass(seg.mentionTier)"
        :style="mentionTierToStyle(seg.mentionTier)"
        @click.stop
        @mouseenter="(e) => onMentionEnter(seg.mentionUsername!, e)"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        {{ seg.text }}
      </NuxtLink>
      <NuxtLink
        v-else-if="seg.hashtagTag"
        :to="{ path: '/explore', query: { q: `#${seg.hashtagTag}` } }"
        :class="hashtagLinkClass(seg.hashtagTier)"
        :style="mentionTierToStyle(seg.hashtagTier)"
        @click.stop
      >
        {{ seg.text }}
      </NuxtLink>
      <span v-else>{{ seg.text }}</span>
    </template>
  </p>
</template>

<script setup lang="ts">
import LinkifyIt from 'linkify-it'
import { siteConfig } from '~/config/site'
import { extractLinksFromText } from '~/utils/link-utils'
import { splitTextByMentionsDisplay } from '~/utils/mention-autocomplete'
import { splitTextByHashtagsDisplay } from '~/utils/hashtag-autocomplete'
import { mentionTierToStyle } from '~/utils/mention-tier-style'
import { tierFromMentionUser } from '~/composables/useMentionAutocomplete'

type MentionTier = 'normal' | 'verified' | 'premium' | 'organization'
type TextSegment = { text: string; href?: string; mentionUsername?: string; mentionTier?: MentionTier; hashtagTag?: string; hashtagTier?: MentionTier }

const props = defineProps<{
  body: string
  hasMedia: boolean
  /** Usernames from post.mentions; @username in body that match (case-insensitive) become profile links. */
  mentions?: Array<{ id: string; username: string; verifiedStatus?: string; premium?: boolean; isOrganization?: boolean }>
  visibility?: import('~/types/api').PostVisibility
}>()

const pop = useUserPreviewPopover()
const { onMove, onLeave } = useUserPreviewTrigger({ username: '' })
function onMentionEnter(u: string, e: MouseEvent) {
  const username = (u ?? '').trim()
  if (!username) return
  pop.onTriggerEnter({ username, event: e })
}

function mentionLinkClass(tier: MentionTier | undefined): string {
  // Keep Tailwind classes static-ish; use inline style for tier color
  // so Tailwind doesn't need to detect dynamic class strings.
  return 'font-semibold no-underline hover:underline'
}

function hashtagLinkClass(tier: MentionTier | undefined): string {
  void tier
  return 'font-medium no-underline hover:underline'
}

const postTier = computed<MentionTier>(() => {
  const v = props.visibility
  if (v === 'premiumOnly') return 'premium'
  if (v === 'verifiedOnly') return 'verified'
  return 'normal'
})

const linkify = new LinkifyIt()
const hasMedia = computed(() => Boolean(props.hasMedia))

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isLocalHost(host: string, expected: string) {
  const h = (host ?? '').trim().toLowerCase()
  const e = (expected ?? '').trim().toLowerCase()
  if (!h || !e) return false
  return h === e || h === `www.${e}`
}

function tryExtractLocalPostId(url: string): string | null {
  const raw = (url ?? '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null

    const allowedHosts = new Set<string>()
    try {
      const fromCfg = new URL(siteConfig.url)
      if (fromCfg.hostname) allowedHosts.add(fromCfg.hostname.toLowerCase())
    } catch {
      // ignore
    }
    if (import.meta.client) {
      const h = window.location.hostname
      if (h) allowedHosts.add(h.toLowerCase())
    }

    const host = u.hostname.toLowerCase()
    const ok = Array.from(allowedHosts).some((a) => isLocalHost(host, a))
    if (!ok) return null

    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    if (parts[0] !== 'p') return null
    const id = (parts[1] ?? '').trim()
    return id || null
  } catch {
    return null
  }
}

const capturedLinks = computed(() => extractLinksFromText((props.body ?? '').toString()))

const embeddedPostLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && tryExtractLocalPostId(u)) return u
  }
  return null
})

const previewLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (!u) continue
    if (tryExtractLocalPostId(u)) continue
    return u
  }
  return null
})

const tailLinkToStrip = computed(() => {
  const xs = capturedLinks.value
  const last = xs.length ? xs[xs.length - 1] : null
  if (!last) return null
  if (embeddedPostLink.value && last === embeddedPostLink.value) return embeddedPostLink.value
  if (previewLink.value && last === previewLink.value && !hasMedia.value) return previewLink.value
  return null
})

const displayBody = computed(() => {
  let body = (props.body ?? '').toString()

  // If we are rendering an embedded local post preview, avoid showing the raw URL in the body
  // when it appears as its own standalone line. (Prevents "URL + preview" duplication.)
  const embedded = (embeddedPostLink.value ?? '').trim()
  if (embedded) {
    const reStandaloneLine = new RegExp(String.raw`(^|\n)[ \t]*${escapeRegExp(embedded)}[ \t]*(?=\n|$)`, 'g')
    if (reStandaloneLine.test(body)) {
      body = body
        .replace(reStandaloneLine, '$1')
        // tidy up whitespace after removing the line
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/, '')
    }
  }

  const last = (tailLinkToStrip.value ?? '').trim()
  if (!last) return body

  // If the last link is literally the last thing in the post (ignoring trailing whitespace),
  // omit it from the rendered body. We still render the preview/embed below.
  const re = new RegExp(String.raw`(?:\s*)${escapeRegExp(last)}\s*$`)
  if (!re.test(body)) return body
  return body.replace(re, '').replace(/\s+$/, '')
})

const mentionByUsernameLower = computed(() => {
  const list = props.mentions ?? []
  const map = new Map<string, { username: string; tier: MentionTier }>()
  for (const m of list) {
    const lower = m.username?.toLowerCase()
    if (!lower) continue
    const tier: MentionTier = tierFromMentionUser(m)
    map.set(lower, { username: m.username, tier })
  }
  return map
})

function splitByMentions(text: string): TextSegment[] {
  const mentionMap = mentionByUsernameLower.value
  const base = splitTextByMentionsDisplay(text)
  const out: TextSegment[] = []
  for (const seg of base) {
    const m = seg.mention
    if (m) {
      const entry = mentionMap.get(m.usernameLower)
      if (entry) {
        out.push({ text: seg.text, mentionUsername: entry.username, mentionTier: entry.tier })
        continue
      }
    }
    // Plain text: further split by hashtags.
    const hs = splitTextByHashtagsDisplay(seg.text)
    for (const hseg of hs) {
      const h = hseg.hashtag
      if (!h) out.push({ text: hseg.text })
      else out.push({ text: hseg.text, hashtagTag: h.tagLower, hashtagTier: postTier.value })
    }
  }
  return out
}

const displayBodySegments = computed<TextSegment[]>(() => {
  const input = (displayBody.value ?? '').toString()
  if (!input) return [{ text: '' }]

  const matches = linkify.match(input) ?? []
  if (!matches.length) {
    return splitByMentions(input)
  }

  const out: TextSegment[] = []
  let cursor = 0

  for (const m of matches) {
    const start = typeof (m as any).index === 'number' ? ((m as any).index as number) : -1
    const end = typeof (m as any).lastIndex === 'number' ? ((m as any).lastIndex as number) : -1
    if (start < 0 || end < 0 || end <= start) continue
    if (start > cursor) {
      const plain = input.slice(cursor, start)
      out.push(...splitByMentions(plain))
    }

    const text = input.slice(start, end)
    const href = (m.url ?? '').trim()
    if (href && /^https?:\/\//i.test(href)) {
      out.push({ text, href })
    } else {
      out.push(...splitByMentions(text))
    }

    cursor = end
  }

  if (cursor < input.length) {
    out.push(...splitByMentions(input.slice(cursor)))
  }
  return out.length ? out : [{ text: input }]
})
</script>

