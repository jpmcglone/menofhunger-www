<template>
  <div class="min-w-0 max-w-full">
    <p class="whitespace-pre-wrap break-words">
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

    <!-- MoH internal link — branded card, navigates in-app -->
    <NuxtLink
      v-if="showLinkPreview && isMohInternalLink && mohInternalPath"
      :to="mohInternalPath"
      class="group mt-2 flex min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-lg border border-current/20 bg-black/5 p-2 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
      aria-label="Open page"
      @click.stop
    >
      <div class="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-current/10" aria-hidden="true">
        <img :src="logoLight" class="h-full w-full object-cover dark:hidden" alt="" loading="lazy" />
        <img :src="logoDark" class="h-full w-full object-cover hidden dark:block" alt="" loading="lazy" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="line-clamp-2 break-words text-[12px] font-semibold leading-4">
          {{ linkMeta?.title || 'Men of Hunger' }}
        </div>
        <div v-if="linkMeta?.description" class="line-clamp-2 break-words text-[11px] opacity-80">
          {{ linkMeta.description }}
        </div>
        <div class="text-[10px] opacity-70">menofhunger.com</div>
      </div>
    </NuxtLink>

    <!-- Generic external link preview -->
    <a
      v-else-if="showLinkPreview"
      :href="previewLink || undefined"
      target="_blank"
      rel="noopener noreferrer"
      class="group mt-2 block w-full max-w-full overflow-hidden rounded-lg border border-current/20 bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
      aria-label="Open link"
      @click.stop
    >
      <div class="flex min-w-0 max-w-full gap-2.5 p-2">
        <div
          v-if="linkMeta?.imageUrl"
          class="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black/10 dark:bg-white/10"
          aria-hidden="true"
        >
          <img :src="linkMeta.imageUrl" class="h-full w-full object-cover" alt="" loading="lazy">
        </div>
        <div class="min-w-0 flex-1">
          <div class="line-clamp-2 break-words text-[12px] font-semibold leading-4">
            {{ linkMeta?.title || previewLinkHost || 'Link' }}
          </div>
          <div v-if="linkMeta?.description" class="line-clamp-2 break-words text-[11px] opacity-80">
            {{ linkMeta.description }}
          </div>
          <div class="break-all text-[10px] opacity-70">
            {{ previewLinkDisplay }}
          </div>
        </div>
        <div class="shrink-0 opacity-60" aria-hidden="true">
          <Icon name="tabler:external-link" class="text-[11px]" aria-hidden="true" />
        </div>
      </div>
    </a>

    <!-- Post embed — same component as posts, viewport-gated via enabled prop -->
    <div v-if="embeddedPostId" @click.stop>
      <AppEmbeddedPostPreview :post-id="embeddedPostId" :enabled="true" />
    </div>

    <!-- Article embed -->
    <div v-if="embeddedArticleId && embeddedArticle" @click.stop>
      <AppArticleShareCard :article="embeddedArticle" />
    </div>

    <!-- Space preview — compact single-line variant for chat bubbles -->
    <template v-if="embeddedSpaceId">
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
      <div v-else class="mt-2 overflow-hidden rounded-lg border border-current/20 bg-black/20" @click.stop>
        <AppSpaceRow :space="embeddedSpace" compact />
      </div>
    </template>

    <!-- User profile link → compact user card -->
    <div v-if="embeddedUsername" @click.stop>
      <AppUserLinkCard :username="embeddedUsername" />
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
import { extractLinksFromText, safeUrlDisplay, safeUrlHostname, isMohUrl, mohUrlPath, extractMohPostId, extractMohArticleId, extractMohSpaceId, extractMohUsername } from '~/utils/link-utils'
import logoLight from '~/assets/images/logo-white-bg-small.png'
import logoDark from '~/assets/images/logo-black-bg-small.png'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'
import { stableListKey } from '~/utils/stable-list-key'

import { HASHTAG_IN_TEXT_DISPLAY_RE } from '~/utils/hashtag-autocomplete'
import { userTierColorVar } from '~/utils/user-tier'
import type { UserColorTier } from '~/utils/user-tier'
import type { ArticleSharePreview } from '~/types/api'

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
  embeddedArticleId,
  (articleId, _old, onCleanup) => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    onCleanup(() => {
      cancelled = true
      if (timer) clearTimeout(timer)
    })
    if (!articleId) return
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
    if (u && extractMohSpaceId(u)) return u
  }
  return null
})
const embeddedSpaceId = computed(() => (embeddedSpaceLink.value ? extractMohSpaceId(embeddedSpaceLink.value) : null))

const { loadedOnce: spacesLoadedOnce, loadSpaces, getById: getSpaceById } = useSpaces()
const embeddedSpace = computed(() => (embeddedSpaceId.value ? getSpaceById(embeddedSpaceId.value) : null))

watchEffect(() => {
  if (!embeddedSpaceId.value || spacesLoadedOnce.value) return
  void loadSpaces()
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
    if (extractMohSpaceId(u)) continue
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
  Boolean(previewLink.value && !embeddedSpaceId.value && !embeddedPostId.value && !embeddedArticleId.value && !embeddedUsername.value),
)
const previewLinkHost = computed(() => (previewLink.value ? safeUrlHostname(previewLink.value) : null))
const previewLinkDisplay = computed(() => (previewLink.value ? safeUrlDisplay(previewLink.value) : ''))
const isMohInternalLink = computed(() => Boolean(previewLink.value && isMohUrl(previewLink.value)))
const mohInternalPath = computed(() => (previewLink.value ? mohUrlPath(previewLink.value) : null))

const displayBodySegments = computed<TextSegment[]>(() => {
  const input = (displayBody.value ?? '').toString()
  if (!input) return [{ kind: 'text', text: '' }]

  type RangedMatch = { start: number; end: number; seg: TextSegment }
  const allMatches: RangedMatch[] = []

  // Link matches
  const linkMatches = _linkify.match(input) ?? []
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

function bodySegmentKey(seg: TextSegment, idx: number): string {
  if (seg.kind === 'link') return stableListKey('link', seg.href, seg.text, idx)
  if (seg.kind === 'mention') return stableListKey('mention', seg.username, seg.text, idx)
  if (seg.kind === 'hashtag') return stableListKey('hashtag', seg.tag, seg.text, idx)
  return stableListKey('text', seg.text, idx)
}

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
