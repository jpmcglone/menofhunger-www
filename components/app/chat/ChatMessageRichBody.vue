<template>
  <div
    ref="rootEl"
    :class="mediaPreviewHref ? 'w-80 max-w-full' : 'min-w-0 max-w-full'"
  >
    <p v-if="hasDisplayText" class="whitespace-pre-wrap break-words">
      <template v-for="(seg, idx) in displayBodySegments" :key="bodySegmentKey(seg, idx)">
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
          :style="{ color: userTierColorVar(tierForUsername(seg.username!)) ?? 'var(--p-primary-color)' }"
          @mouseenter="(e: MouseEvent) => onMentionEnter(e, seg.username!)"
          @mousemove="onMentionMove"
          @mouseleave="onMentionLeave"
          @click.stop
        >{{ seg.text }}</NuxtLink>
        <AppGroupsGroupMention v-else-if="seg.kind === 'group'" :slug="seg.slug" :text="seg.text" />
        <span
          v-else-if="seg.kind === 'broadcast'"
          class="rounded bg-[var(--moh-surface-2)] px-1 font-bold text-[var(--p-primary-color)]"
        >{{ seg.text }}</span>
        <span
          v-else-if="seg.kind === 'mention'"
          class="font-bold opacity-60"
        >{{ seg.text }}</span>
        <NuxtLink
          v-else-if="seg.kind === 'hashtag'"
          :to="{ path: '/explore', query: { q: `#${seg.tag}` } }"
          class="font-medium hover:underline underline-offset-2"
          :style="{ color: hashtagColor }"
          @click.stop
        >{{ seg.text }}</NuxtLink>
        <NuxtLink
          v-else-if="seg.kind === 'cashtag'"
          :to="{ path: '/explore', query: { q: `$${seg.symbol}` } }"
          class="moh-cashtag font-medium hover:underline underline-offset-2"
          :style="{ color: hashtagColor }"
          @click.stop
        >{{ seg.text }}</NuxtLink>
        <span v-else>{{ seg.text }}</span>
      </template><slot v-if="!hasBlockPreview" name="tail" /></p>

    <!-- MoH internal link — branded card, navigates in-app -->
    <AppChannelsDismissablePreview
      v-if="everVisible && showLinkPreview && previewLink"
      :dismissible="dismissiblePreviews"
      @dismiss="emit('dismiss-preview', previewLink)"
    >
      <AppFeatureLinkPreview
        v-if="isMohInternalLink && mohInternalPath"
        :path="mohInternalPath"
        :metadata="linkMeta"
        class="mt-2"
      />

      <AppChatMediaLinkChatCard
        v-else-if="mediaPreviewHref"
        :href="mediaPreviewHref"
        :enabled="everVisible"
      />

      <AppXPostPreviewCard
        v-else-if="xPostMeta"
        :post="xPostMeta"
        :href="previewLink"
        compact
        class="mt-2"
      />

      <AppWebsitePreviewCard
        v-else
        class="mt-2"
        :href="previewLink"
        :title="genericPreviewTitle"
        :source-label="previewSourceLine"
        :description="linkMeta?.description"
        :image-url="linkMeta?.imageUrl"
      />
    </AppChannelsDismissablePreview>

    <!-- Post embed — same component as posts, viewport-gated via enabled prop -->
    <div v-if="everVisible && embeddedPostId && embeddedPostLink" @click.stop>
      <AppChannelsDismissablePreview :dismissible="dismissiblePreviews" @dismiss="emit('dismiss-preview', embeddedPostLink)">
        <AppEmbeddedPostPreview :post-id="embeddedPostId" :enabled="true" />
      </AppChannelsDismissablePreview>
    </div>

    <!-- Article embed -->
    <div v-if="everVisible && embeddedArticleId && embeddedArticle && embeddedArticleLink" @click.stop>
      <AppChannelsDismissablePreview :dismissible="dismissiblePreviews" @dismiss="emit('dismiss-preview', embeddedArticleLink)">
        <AppArticleShareCard :article="embeddedArticle" />
      </AppChannelsDismissablePreview>
    </div>

    <!-- Space preview — compact single-line variant for chat bubbles -->
    <template v-if="everVisible && hasEmbeddedSpace">
      <!-- Skeleton while the space store is loading -->
      <div
        v-if="!embeddedSpace"
        class="mt-2 overflow-hidden rounded-lg border border-current/20 bg-black/10 dark:bg-white/5 animate-pulse"
        aria-hidden="true"
        @click.stop
      >
        <div class="flex items-center gap-2.5 px-3 py-1.5">
          <div class="h-5 w-5 shrink-0 rounded-full bg-current/20" />
          <div class="flex-1 space-y-1">
            <div class="h-2.5 w-2/5 rounded bg-current/20" />
            <div class="h-2 w-1/3 rounded bg-current/20" />
          </div>
        </div>
      </div>
      <!-- Resolved space -->
      <AppChannelsDismissablePreview v-else :dismissible="dismissiblePreviews && !!embeddedSpaceLink" @dismiss="embeddedSpaceLink && emit('dismiss-preview', embeddedSpaceLink)">
        <div class="mt-2 overflow-hidden rounded-lg border border-current/20 bg-black/20" @click.stop>
          <AppSpaceRow :space="embeddedSpace" compact />
        </div>
      </AppChannelsDismissablePreview>
    </template>

    <!-- User profile link → compact user card -->
    <div v-if="everVisible && embeddedUsername && embeddedUserLink" @click.stop>
      <AppChannelsDismissablePreview :dismissible="dismissiblePreviews" @dismiss="emit('dismiss-preview', embeddedUserLink)">
        <AppUserLinkCard :username="embeddedUsername" />
      </AppChannelsDismissablePreview>
    </div>

    <div v-if="hasBlockPreview">
      <slot name="tail" />
    </div>
  </div>
</template>

<script lang="ts">
// Module-level singleton — shared across all ChatMessageRichBody instances so
// the expensive LinkifyIt regex compilation only happens once per page load
// rather than once per mounted message row.
import LinkifyIt from 'linkify-it'
const _linkify = new LinkifyIt()
</script>

<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core'
import { extractLinksFromText, safeUrlHostname, previewSourceLabel, isMohUrl, mohUrlPath, extractMohPostId, extractMohArticleId, extractMohSpaceId, extractMohSpaceUsername, isMohSpaceLink, extractMohUsername, isXPostUrl, parseMediaPreviewUrl } from '~/utils/link-utils'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'
import { stableListKey } from '~/utils/stable-list-key'

import { GROUP_MENTION_IN_TEXT_DISPLAY_RE } from '~/utils/mention-autocomplete'
import { HASHTAG_IN_TEXT_DISPLAY_RE } from '~/utils/hashtag-autocomplete'
import { CASHTAG_IN_TEXT_DISPLAY_RE } from '~/utils/cashtag-autocomplete'
import { userTierColorVar } from '~/utils/user-tier'
import type { UserColorTier } from '~/utils/user-tier'
import type { ArticleSharePreview } from '~/types/api'

// Stable public paths (not `~/assets` imports) so the URL is identical on
// server and client — avoids the Vite dev `?t=<timestamp>` hydration mismatch.

type TextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string }
  | { kind: 'mention'; text: string; username: string; isKnown: boolean }
  | { kind: 'broadcast'; text: string }
  | { kind: 'group'; text: string; slug: string }
  | { kind: 'hashtag'; text: string; tag: string }
  | { kind: 'cashtag'; text: string; symbol: string }

const MENTION_RE = /@([a-zA-Z0-9_]+)/g

const props = defineProps<{
  body: string
  /** Sender's tier — hashtags are colored to match the sender. */
  senderTier?: UserColorTier
  /** Link URLs whose rich previews the author removed. */
  hiddenPreviews?: string[]
  /** Show a remove control on each preview (the message author in channels). */
  dismissiblePreviews?: boolean
}>()
const emit = defineEmits<{ 'dismiss-preview': [url: string] }>()

const { validSet, tierForUsername, validateMentionsInBody } = useValidatedChatUsernames()

// ── Viewport gating ─────────────────────────────────────────────────────────
// Heavy per-message side effects (mention validation HTTP calls, link metadata
// fetches, article/space/post embed mounting) only fire once this row has been
// near the viewport. This collapses the mount-time burst from "every message
// in the chat" to "the ~10 messages currently on screen".
const rootEl = ref<HTMLElement | null>(null)
const visible = useElementVisibility(rootEl, { rootMargin: '600px' })
const everVisible = ref(false)
watch(visible, (v) => { if (v) everVisible.value = true }, { immediate: true })

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

// Trigger background validation for any @mentions in this message — only once
// the row has been near the viewport.
watch(
  [() => props.body, everVisible],
  ([body, v]) => {
    if (!v || !body) return
    validateMentionsInBody(body, validSet.value)
  },
  { immediate: true },
)

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const capturedLinks = computed(() => {
  const hidden = new Set(props.hiddenPreviews ?? [])
  return extractLinksFromText((props.body ?? '').toString()).filter(url => !hidden.has(url))
})

// ── Embedded special content ─────────────────────────────────────────────────

const embeddedPostLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && extractMohPostId(u)) return u
  }
  return null
})
const embeddedPostId = computed(() => (embeddedPostLink.value ? extractMohPostId(embeddedPostLink.value) : null))

const embeddedArticleLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && extractMohArticleId(u)) return u
  }
  return null
})
const embeddedArticleId = computed(() => (embeddedArticleLink.value ? extractMohArticleId(embeddedArticleLink.value) : null))
const embeddedArticle = ref<ArticleSharePreview | null>(null)

const { apiFetchData } = useApiClient()
const DWELL_MS = 400

watch(
  [embeddedArticleId, everVisible],
  ([articleId, v], _old, onCleanup) => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    onCleanup(() => {
      cancelled = true
      if (timer) clearTimeout(timer)
    })
    if (!v || !articleId) return
    if (embeddedArticle.value?.id === articleId) return
    embeddedArticle.value = null
    timer = setTimeout(async () => {
      if (cancelled) return
      try {
        const res = await apiFetchData<ArticleSharePreview>(`/articles/${articleId}`)
        if (!cancelled) embeddedArticle.value = res ?? null
      } catch {
        if (!cancelled) embeddedArticle.value = null
      }
    }, DWELL_MS)
  },
  { immediate: true },
)

const embeddedSpaceLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && isMohSpaceLink(u)) return u
  }
  return null
})
const embeddedSpaceId = computed(() => (embeddedSpaceLink.value ? extractMohSpaceId(embeddedSpaceLink.value) : null))
const embeddedSpaceUsername = computed(() => (embeddedSpaceLink.value ? extractMohSpaceUsername(embeddedSpaceLink.value) : null))
const hasEmbeddedSpace = computed(() => Boolean(embeddedSpaceId.value || embeddedSpaceUsername.value))

const {
  getById: getSpaceById,
  getByOwnerUsername: getSpaceByOwnerUsername,
  fetchSpaceById,
  fetchSpaceByUsername,
} = useSpaces()
const embeddedSpace = computed(() => {
  if (embeddedSpaceId.value) return getSpaceById(embeddedSpaceId.value)
  if (embeddedSpaceUsername.value) return getSpaceByOwnerUsername(embeddedSpaceUsername.value)
  return null
})

watchEffect(() => {
  if (!everVisible.value) return
  if ((!embeddedSpaceId.value && !embeddedSpaceUsername.value) || embeddedSpace.value) return
  if (embeddedSpaceId.value) {
    void fetchSpaceById(embeddedSpaceId.value)
  } else if (embeddedSpaceUsername.value) {
    void fetchSpaceByUsername(embeddedSpaceUsername.value)
  }
})

const embeddedUserLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && extractMohUsername(u)) return u
  }
  return null
})
const embeddedUsername = computed(() => (embeddedUserLink.value ? extractMohUsername(embeddedUserLink.value) : null))

// ── Generic / branded fallback preview ──────────────────────────────────────

const previewLink = computed(() => {
  const xs = capturedLinks.value
  // All specially-handled MoH content gets its own widget — skip those here.
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (!u) continue
    if (extractMohPostId(u)) continue
    if (extractMohArticleId(u)) continue
    if (isMohSpaceLink(u)) continue
    if (extractMohUsername(u)) continue
    return u
  }
  return null
})

// Strip the embedded special link from the displayed body so it isn't shown as raw text.
const embeddedSpecialLink = computed(
  () => embeddedSpaceLink.value ?? embeddedPostLink.value ?? embeddedArticleLink.value ?? embeddedUserLink.value ?? previewLink.value,
)

const displayBody = computed(() => {
  const input = (props.body ?? '').toString()
  const last = (embeddedSpecialLink.value ?? '').trim()
  if (!last) return input
  const re = new RegExp(String.raw`(?:\s*)${escapeRegExp(last)}\s*$`)
  if (!re.test(input)) return input
  return input.replace(re, '').replace(/\s+$/, '')
})

const showLinkPreview = computed(() =>
  Boolean(previewLink.value && !hasEmbeddedSpace.value && !embeddedPostId.value && !embeddedArticleId.value && !embeddedUsername.value),
)
const previewLinkHost = computed(() => (previewLink.value ? safeUrlHostname(previewLink.value) : null))
const previewSourceLine = computed(() => (previewLink.value ? previewSourceLabel(previewLink.value) : 'From link'))
const genericPreviewTitle = computed(() => {
  const title = (linkMeta.value?.title ?? '').trim()
  if (title) return title
  return (previewLinkHost.value ?? '').replace(/^www\./i, '') || 'Link'
})
const isMohInternalLink = computed(() => Boolean(previewLink.value && isMohUrl(previewLink.value)))
const mohInternalPath = computed(() => (previewLink.value ? mohUrlPath(previewLink.value) : null))
const mediaPreviewHref = computed(() => {
  const url = previewLink.value
  if (!url || !parseMediaPreviewUrl(url)) return null
  return url
})

const hasDisplayText = computed(() => Boolean(displayBody.value.trim()))
const hasBlockPreview = computed(() => {
  if (showLinkPreview.value) return true
  if (embeddedPostId.value || embeddedArticleId.value || hasEmbeddedSpace.value || embeddedUsername.value) {
    return true
  }
  return false
})

const displayBodySegments = computed<TextSegment[]>(() => {
  const input = (displayBody.value ?? '').toString()
  if (!input) return [{ kind: 'text', text: '' }]

  type RangedMatch = { start: number; end: number; seg: TextSegment }
  const allMatches: RangedMatch[] = []

  // Link matches
  const linkMatches = _linkify.match(input) ?? []
  for (const m of linkMatches) {
    const start = typeof m.index === 'number' ? m.index : -1
    const end = typeof m.lastIndex === 'number' ? m.lastIndex : -1
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
      if (/^(everyone|here)$/i.test(username)) { allMatches.push({ start, end, seg: { kind: 'broadcast', text: m[0] } }); continue }
      allMatches.push({ start, end, seg: { kind: 'mention', text: m[0], username, isKnown } })
    }
  }

  const groupRe = new RegExp(GROUP_MENTION_IN_TEXT_DISPLAY_RE.source, 'g')
  for (const m of input.matchAll(groupRe)) {
    const start = m.index!
    const end = start + m[0].length
    const overlaps = allMatches.some((rm) => start < rm.end && end > rm.start)
    if (!overlaps) allMatches.push({ start, end, seg: { kind: 'group', text: m[0], slug: m[1]!.toLowerCase() } })
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

  // Cashtag matches (skip ranges already claimed)
  const cashRe = new RegExp(CASHTAG_IN_TEXT_DISPLAY_RE.source, 'g')
  for (const m of input.matchAll(cashRe)) {
    const start = m.index!
    const end = start + m[0].length
    const symbol = (m[1]!).toUpperCase()
    const overlaps = allMatches.some((rm) => start < rm.end && end > rm.start)
    if (!overlaps) {
      allMatches.push({ start, end, seg: { kind: 'cashtag', text: m[0], symbol } })
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

function bodySegmentKey(seg: TextSegment, idx: number): string {
  if (seg.kind === 'link') return stableListKey('link', seg.href, seg.text, idx)
  if (seg.kind === 'mention') return stableListKey('mention', seg.username, seg.text, idx)
  if (seg.kind === 'group') return stableListKey('group', seg.slug, seg.text, idx)
  if (seg.kind === 'hashtag') return stableListKey('hashtag', seg.tag, seg.text, idx)
  if (seg.kind === 'cashtag') return stableListKey('cashtag', seg.symbol, seg.text, idx)
  return stableListKey('text', seg.text, idx)
}

const linkMeta = ref<LinkMetadata | null>(null)
watch(
  [previewLink, everVisible],
  async ([url, v]) => {
    linkMeta.value = null
    if (!import.meta.client) return
    if (!v || !url) return
    // Media cards fetch their own posters (YouTube oEmbed, Rumble metadata, …).
    if (parseMediaPreviewUrl(url)) return
    linkMeta.value = await getLinkMetadata(url)
  },
  { immediate: true },
)

const xPostMeta = computed(() => {
  if (!previewLink.value || !isXPostUrl(previewLink.value)) return null
  return linkMeta.value?.socialPost?.platform === 'x' ? linkMeta.value.socialPost : null
})

</script>
