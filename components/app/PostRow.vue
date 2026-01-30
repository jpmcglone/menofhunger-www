<template>
  <div
    ref="rowEl"
    :data-post-id="post.id"
    :class="[
      'border-b px-4 py-4 transition-colors moh-border',
      clickable ? 'cursor-pointer moh-surface-hover dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]' : ''
    ]"
    style="content-visibility: auto; contain-intrinsic-size: 240px;"
    @click="onRowClick"
  >
    <div class="flex gap-3">
      <NuxtLink
        v-if="authorProfilePath"
        :to="authorProfilePath"
        class="group shrink-0"
        :aria-label="`View @${post.author.username} profile`"
      >
        <AppAvatarCircle
          :src="authorAvatarUrl"
          :name="post.author.name"
          :username="post.author.username"
          size-class="h-10 w-10"
          bg-class="moh-surface"
        />
      </NuxtLink>
      <AppAvatarCircle
        v-else
        :src="authorAvatarUrl"
        :name="post.author.name"
        :username="post.author.username"
        size-class="h-10 w-10"
        bg-class="moh-surface"
      />

      <div class="min-w-0 flex-1">
        <div class="relative">
          <div class="min-w-0 pr-10">
            <AppPostHeaderLine
              :display-name="post.author.name || post.author.username || 'User'"
              :username="post.author.username || ''"
              :verified-status="post.author.verifiedStatus"
              :premium="post.author.premium"
              :profile-path="authorProfilePath"
              :post-id="post.id"
              :post-permalink="postPermalink"
              :created-at-short="createdAtShort"
              :created-at-tooltip="createdAtTooltip"
            />
          </div>

          <div class="absolute -right-0.5 -top-0.5 shrink-0">
            <Button
              icon="pi pi-ellipsis-v"
              text
              rounded
              severity="secondary"
              aria-label="More"
              v-tooltip.bottom="moreTooltip"
              @click="toggleMoreMenu"
            />
            <Menu v-if="moreMenuMounted" ref="moreMenuRef" :model="moreMenuItems" popup />
          </div>
        </div>

        <p class="mt-0.5 whitespace-pre-wrap break-words moh-text pr-12">
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
            <span v-else>{{ seg.text }}</span>
          </template>
        </p>

        <AppPostMediaGrid v-if="post.media?.length" :media="post.media" />

        <div v-if="showLinkPreview && rowInView" class="mt-3 pr-12">
          <!-- Video embeds (special cases) -->
          <div
            v-if="youtubeEmbedUrl || isPreviewLinkRumble"
            class="overflow-hidden rounded-xl border moh-border bg-black/5 dark:bg-white/5"
          >
            <!-- YouTube: fixed 16:9. Rumble: use oEmbed dimensions (fallback 854x480). -->
            <div
              class="relative w-full"
              ref="videoBoxEl"
              :style="youtubeEmbedUrl ? undefined : { aspectRatio: rumbleAspectRatio }"
              :class="youtubeEmbedUrl ? 'aspect-video' : ''"
            >
              <img
                v-if="youtubePosterUrl || rumblePosterUrl"
                :src="youtubePosterUrl || rumblePosterUrl || ''"
                class="absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-250"
                :class="desiredVideoSrc && videoIframeLoaded ? 'opacity-0' : 'opacity-90'"
                alt=""
                loading="lazy"
                aria-hidden="true"
              />
              <iframe
                :src="videoIframeSrc"
                class="relative z-10 h-full w-full transition-opacity duration-250"
                :class="desiredVideoSrc && videoIframeLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                title="Embedded video"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                @load="onVideoIframeLoad"
              />
            </div>
          </div>

          <!-- Generic link preview (last link only) -->
          <a
            v-else
            :href="previewLink"
            target="_blank"
            rel="noopener noreferrer"
            class="block overflow-hidden rounded-xl border moh-border transition-colors moh-surface-hover"
            aria-label="Open link"
            @click.stop
          >
            <div class="flex gap-3 p-3">
              <div
                v-if="linkMeta?.imageUrl"
                class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-900"
                aria-hidden="true"
              >
                <img :src="linkMeta.imageUrl" class="h-full w-full object-cover" alt="" loading="lazy" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold moh-text truncate">
                  {{ linkMeta?.title || previewLinkHost || 'Link' }}
                </div>
                <div v-if="linkMeta?.description" class="mt-0.5 text-xs moh-text-muted overflow-hidden text-ellipsis">
                  {{ linkMeta.description }}
                </div>
                <div class="mt-1 text-[11px] moh-text-muted truncate">
                  {{ previewLinkDisplay }}
                </div>
              </div>
              <div class="shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true">
                <i class="pi pi-external-link text-[12px]" />
              </div>
            </div>
          </a>
        </div>

        <AppEmbeddedPostPreview
          v-if="embeddedPostId"
          :post-id="embeddedPostId"
          :enabled="embeddedPreviewEnabled"
        />

        <div v-if="visibilityTag || isPreviewLinkRumble" class="mt-2 flex items-center justify-between gap-3 pr-12">
          <span
            v-if="visibilityTag"
            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border cursor-default"
            :class="visibilityTagClass"
            v-tooltip.bottom="visibilityTooltip"
          >
            <i v-if="post.visibility === 'onlyMe'" class="pi pi-eye-slash mr-1 text-[10px]" aria-hidden="true" />
            {{ visibilityTag }}
          </span>
          <span v-else aria-hidden="true" />

          <a
            v-if="isPreviewLinkRumble && previewLink"
            :href="previewLink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[11px] font-semibold transition-colors"
            style="color: #85c742;"
            aria-label="Open on Rumble"
            @click.stop
          >
            Open on Rumble
          </a>
        </div>

        <div class="mt-3 flex items-center justify-between moh-text-muted">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
              :class="commentClickable ? 'cursor-pointer' : 'cursor-default opacity-60'"
              aria-label="Comment"
              v-tooltip.bottom="commentTooltip"
              @click.stop="onCommentClick"
            >
              <i class="pi pi-comment text-[18px]" aria-hidden="true" />
            </button>

            <div v-if="!isOnlyMe" class="inline-flex items-center">
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                :class="boostClickable ? 'cursor-pointer' : 'cursor-default opacity-60'"
                :aria-label="isBoosted ? 'Remove upvote' : 'Upvote'"
                v-tooltip.bottom="upvoteTooltip"
                @click.stop="onBoostClick"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  aria-hidden="true"
                  :style="isBoosted ? { color: 'var(--p-primary-color)' } : undefined"
                >
                  <!-- Imgur-ish upvote: arrowhead + stem -->
                  <path
                    v-if="isBoosted"
                    fill="currentColor"
                    d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
                  />
                  <path
                    v-else
                    d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <span
                v-if="boostCountLabel"
                class="ml-1 select-none text-xs tabular-nums moh-text-muted"
                aria-hidden="true"
              >
                {{ boostCountLabel }}
              </span>
            </div>
          </div>

          <div v-if="!isOnlyMe" class="relative flex items-center justify-end">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
              :class="bookmarkLoading ? 'cursor-default opacity-60' : 'cursor-pointer'"
              :aria-label="viewerHasBookmarked ? 'Unsave post' : 'Save post'"
              v-tooltip.bottom="bookmarkTooltip"
              @click.stop="onBookmarkClick"
            >
              <i
                :class="viewerHasBookmarked ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
                class="text-[18px]"
                aria-hidden="true"
                :style="viewerHasBookmarked ? { color: 'var(--p-primary-color)' } : undefined"
              />
            </button>

            <Popover ref="bookmarkPopoverRef">
              <div class="w-[min(20rem,calc(100vw-3rem))] p-2">
                <div class="px-2 py-1 text-[11px] font-semibold moh-text-muted">Save to</div>

                <button
                  type="button"
                  class="w-full rounded-lg px-2 py-2 text-left text-sm transition-colors moh-surface-hover"
                  :class="bookmarkLoading ? 'cursor-default opacity-60' : 'cursor-pointer'"
                  @click="saveBookmarkTo(null)"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0 truncate">Unorganized</div>
                    <i v-if="viewerHasBookmarked && viewerBookmarkCollectionId === null" class="pi pi-check text-xs" aria-hidden="true" />
                  </div>
                </button>

                <div v-if="bookmarkCollectionsLoading" class="px-2 py-2 text-xs moh-text-muted">Loading folders…</div>

                <button
                  v-for="c in bookmarkCollections"
                  :key="c.id"
                  type="button"
                  class="w-full rounded-lg px-2 py-2 text-left text-sm transition-colors moh-surface-hover"
                  :class="bookmarkLoading ? 'cursor-default opacity-60' : 'cursor-pointer'"
                  @click="saveBookmarkTo(c.id)"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0 truncate">{{ c.name }}</div>
                    <i
                      v-if="viewerHasBookmarked && viewerBookmarkCollectionId === c.id"
                      class="pi pi-check text-xs"
                      aria-hidden="true"
                    />
                  </div>
                </button>

                <div class="mt-2 border-t moh-border pt-2">
                  <div v-if="!bookmarkCreateOpen" class="px-1">
                    <button
                      type="button"
                      class="w-full rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors moh-surface-hover"
                      @click="bookmarkCreateOpen = true"
                    >
                      <i class="pi pi-plus mr-2 text-xs" aria-hidden="true" />
                      Create folder
                    </button>
                  </div>
                  <div v-else class="flex items-center gap-2 px-1">
                    <InputText
                      v-model="bookmarkCreateName"
                      class="w-full"
                      placeholder="Folder name"
                      @keydown.enter.prevent="createFolderAndSave"
                    />
                    <Button
                      label="Save"
                      size="small"
                      :loading="bookmarkCreating"
                      :disabled="bookmarkCreating || !bookmarkCreateName.trim()"
                      @click="createFolderAndSave"
                    />
                  </div>
                </div>
              </div>
            </Popover>

            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
              :class="canShare ? 'cursor-pointer' : 'cursor-default opacity-60'"
              aria-label="Share"
              v-tooltip.bottom="shareTooltip"
              @click="canShare ? toggleShareMenu($event) : null"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
                <!-- Twitter-ish share: arrow up out of tray -->
                <path
                  d="M12 3v10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                />
                <path
                  d="M7.5 7.5L12 3l4.5 4.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <Menu v-if="shareMenuMounted" ref="shareMenuRef" :model="shareMenuItems" popup />
          </div>
        </div>
      </div>
    </div>
  </div>

  <Dialog
    v-if="deleteConfirmOpen"
    v-model:visible="deleteConfirmOpen"
    modal
    header="Delete post?"
    :draggable="false"
    class="w-[min(28rem,calc(100vw-2rem))]"
  >
    <div class="text-sm moh-text-muted">
      This won’t show up anywhere once deleted.
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text :disabled="deleting" @click="deleteConfirmOpen = false" />
      <Button
        label="Delete"
        icon="pi pi-trash"
        severity="danger"
        :loading="deleting"
        :disabled="deleting"
        @click="deletePost"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import type { MenuItem } from 'primevue/menuitem'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { getApiErrorMessage } from '~/utils/api-error'
import { extractLinksFromText, getYouTubeEmbedUrl, getYouTubePosterUrl, isRumbleUrl, safeUrlDisplay, safeUrlHostname } from '~/utils/link-utils'
import LinkifyIt from 'linkify-it'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'
import type { RumbleEmbedInfo } from '~/utils/rumble-embed'
import { resolveRumbleEmbedInfo } from '~/utils/rumble-embed'
import { useEmbeddedVideoManager } from '~/composables/useEmbeddedVideoManager'
import { useBookmarkCollections } from '~/composables/useBookmarkCollections'

const props = defineProps<{
  post: FeedPost
  clickable?: boolean
}>()
const emit = defineEmits<{
  (e: 'deleted', id: string): void
}>()

const post = computed(() => props.post)
const clickable = computed(() => props.clickable !== false)

// Resource preservation: only do heavy work (metadata fetch + embeds) when the row is near viewport.
const rowEl = ref<HTMLElement | null>(null)
const rowInView = ref(false)
let rowObserver: IntersectionObserver | null = null

onMounted(() => {
  if (!import.meta.client) return
  const el = rowEl.value
  if (!el) return
  rowObserver = new IntersectionObserver(
    (entries) => {
      const e = entries[0]
      if (!e) return
      if (e.isIntersecting) {
        rowInView.value = true
        // One-way: once it's been in view, keep it true.
        rowObserver?.disconnect()
        rowObserver = null
      }
    },
    { root: null, rootMargin: '800px 0px', threshold: 0.01 },
  )
  rowObserver.observe(el)
})

onBeforeUnmount(() => {
  rowObserver?.disconnect()
  rowObserver = null
})
const { user } = useAuth()
const isAuthed = computed(() => Boolean(user.value?.id))
const viewerHasUsername = computed(() => Boolean(user.value?.usernameIsSet))
const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const isSelf = computed(() => Boolean(user.value?.id && user.value.id === post.value.author.id))
const { apiFetchData } = useApiClient()
const { show: showAuthActionModal } = useAuthActionModal()
const boostState = useBoostState()
const bookmarkLoading = ref(false)
const viewerHasBookmarked = ref(Boolean((post.value as any)?.viewerHasBookmarked))
const viewerBookmarkCollectionId = ref<string | null>(((post.value as any)?.viewerBookmarkCollectionId as string | null) ?? null)
const bookmarkPopoverRef = ref<any>(null)
const bookmarkCreateOpen = ref(false)
const bookmarkCreateName = ref('')
const bookmarkCreating = ref(false)

const {
  collections: bookmarkCollections,
  loading: bookmarkCollectionsLoading,
  nameById: bookmarkCollectionNameById,
  ensureLoaded: ensureBookmarkCollectionsLoaded,
  createCollection: createBookmarkCollection,
  bumpCounts: bumpBookmarkCounts,
} = useBookmarkCollections()

const isOnlyMe = computed(() => post.value.visibility === 'onlyMe')
const viewerIsAdmin = computed(() => Boolean(user.value?.siteAdmin))
const viewerCanInteract = computed(() => {
  // Admin viewing someone else's Only-me post should be read-only.
  if (isOnlyMe.value && viewerIsAdmin.value && !isSelf.value) return false
  return true
})
const canBoost = computed(() => {
  // Only-me posts don't need boosts.
  if (isOnlyMe.value) return false
  return viewerCanInteract.value && isAuthed.value && viewerHasUsername.value
})
const canComment = computed(() => viewerCanInteract.value && isAuthed.value && viewerIsVerified.value)
const canShare = computed(() => {
  // Sharing private posts is confusing; keep it read-only.
  if (isOnlyMe.value) return false
  return viewerCanInteract.value
})

const upvoteTooltip = computed(() => {
  if (isOnlyMe.value) return tinyTooltip('Boosts are not available for Only me posts')
  if (!viewerCanInteract.value) return tinyTooltip('Boost')
  if (!isAuthed.value) return tinyTooltip('Log in to boost')
  if (!viewerHasUsername.value) return tinyTooltip('Set a username to boost')
  const text = isBoosted.value ? 'Unboost' : 'Boost'
  return tinyTooltip(text)
})
const shareTooltip = computed(() => tinyTooltip('Share'))
const bookmarkFolderLabel = computed(() => {
  if (!viewerHasBookmarked.value) return null
  const cid = viewerBookmarkCollectionId.value
  if (!cid) return 'Unorganized'
  return bookmarkCollectionNameById.value.get(cid) ?? 'Folder'
})
const bookmarkTooltip = computed(() => {
  if (!isAuthed.value) return tinyTooltip('Log in to save')
  if (viewerHasBookmarked.value) {
    const label = bookmarkFolderLabel.value
    return label ? tinyTooltip(`Bookmarked in '${label}'`) : tinyTooltip('Saved')
  }
  return tinyTooltip('Save')
})
const moreTooltip = computed(() => tinyTooltip('More'))
const commentTooltip = computed(() => {
  if (!viewerCanInteract.value) return tinyTooltip('Comment')
  if (!isAuthed.value) return tinyTooltip('Log in to comment')
  if (!viewerIsVerified.value) return tinyTooltip('Verify to comment')
  return tinyTooltip('Comment')
})

watch(
  [viewerHasBookmarked, viewerBookmarkCollectionId],
  ([saved, cid]) => {
    if (!import.meta.client) return
    if (!saved) return
    if (!cid) return // Unorganized doesn't need folder lookup
    void ensureBookmarkCollectionsLoaded()
  },
  { immediate: true },
)

const boostClickable = computed(() => {
  return viewerCanInteract.value && (!isAuthed.value || viewerHasUsername.value)
})
const commentClickable = computed(() => viewerCanInteract.value)

const authorProfilePath = computed(() => {
  const username = (post.value.author.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const authorAvatarUrl = computed(() => {
  return post.value.author.avatarUrl ?? null
})

const visibilityTag = computed(() => {
  return visibilityTagLabel(post.value.visibility)
})

const visibilityTagClass = computed(() => {
  return visibilityTagClasses(post.value.visibility)
})

const visibilityTooltip = computed(() => {
  if (post.value.visibility === 'verifiedOnly') return tinyTooltip('Visible to verified members')
  if (post.value.visibility === 'premiumOnly') return tinyTooltip('Visible to premium members')
  if (post.value.visibility === 'onlyMe') return tinyTooltip('Visible only to you')
  return null
})

const postPermalink = computed(() => `/p/${encodeURIComponent(post.value.id)}`)
const postShareUrl = computed(() => `${siteConfig.url}${postPermalink.value}`)

type TextSegment = { text: string; href?: string }

const linkify = new LinkifyIt()

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

// Links (capture all, used for previews/embeds).
const capturedLinks = computed(() => extractLinksFromText(post.value.body))

const embeddedPostLink = computed(() => {
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (u && tryExtractLocalPostId(u)) return u
  }
  return null
})

const embeddedPostId = computed(() => (embeddedPostLink.value ? tryExtractLocalPostId(embeddedPostLink.value) : null))

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

const showLinkPreview = computed(() => Boolean(previewLink.value && !post.value.media?.length))

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const tailLinkToStrip = computed(() => {
  const xs = capturedLinks.value
  const last = xs.length ? xs[xs.length - 1] : null
  if (!last) return null
  if (embeddedPostLink.value && last === embeddedPostLink.value) return embeddedPostLink.value
  if (previewLink.value && last === previewLink.value && !post.value.media?.length) return previewLink.value
  return null
})

const displayBody = computed(() => {
  let body = (post.value.body ?? '').toString()

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

const previewLinkHost = computed(() => (previewLink.value ? safeUrlHostname(previewLink.value) : null))
const previewLinkDisplay = computed(() => (previewLink.value ? safeUrlDisplay(previewLink.value) : ''))

const youtubeEmbedUrl = computed(() => (previewLink.value ? getYouTubeEmbedUrl(previewLink.value) : null))
const isPreviewLinkRumble = computed(() => Boolean(showLinkPreview.value && previewLink.value && isRumbleUrl(previewLink.value)))
const rumbleEmbedInfo = ref<RumbleEmbedInfo | null>(null)
const rumbleEmbedUrl = computed(() => rumbleEmbedInfo.value?.src ?? null)
const rumbleAspectRatio = computed(() => {
  const w = rumbleEmbedInfo.value?.width ?? 854
  const h = rumbleEmbedInfo.value?.height ?? 480
  return `${w} / ${h}`
})
const rumblePosterUrl = computed(() => rumbleEmbedInfo.value?.thumbnailUrl ?? null)
const youtubePosterUrl = computed(() => (previewLink.value ? getYouTubePosterUrl(previewLink.value) : null))

const { activePostId, register: registerEmbeddedVideo, unregister: unregisterEmbeddedVideo } = useEmbeddedVideoManager()
const hasEmbeddedVideo = computed(() => Boolean(youtubeEmbedUrl.value || isPreviewLinkRumble.value))
const videoBoxEl = ref<HTMLElement | null>(null)
const videoIframeLoaded = ref(false)
const desiredVideoSrc = computed(() => {
  if (!rowInView.value) return null
  if (!hasEmbeddedVideo.value) return null
  if (activePostId.value !== post.value.id) return null
  if (youtubeEmbedUrl.value) return youtubeEmbedUrl.value
  if (isPreviewLinkRumble.value) return rumbleEmbedUrl.value
  return null
})

const videoIframeSrc = computed(() => desiredVideoSrc.value ?? 'about:blank')

let iframeLoadRaf: number | null = null
function onVideoIframeLoad() {
  if (!import.meta.client) return
  // Ignore load events for about:blank
  if (!desiredVideoSrc.value) return
  if (iframeLoadRaf != null) cancelAnimationFrame(iframeLoadRaf)
  // Wait a beat so the iframe has a chance to paint before we fade the poster out.
  iframeLoadRaf = requestAnimationFrame(() => {
    iframeLoadRaf = requestAnimationFrame(() => {
      iframeLoadRaf = null
      if (!desiredVideoSrc.value) return
      videoIframeLoaded.value = true
    })
  })
}

watch(
  desiredVideoSrc,
  () => {
    // Activation/deactivation should show poster immediately.
    videoIframeLoaded.value = false
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (iframeLoadRaf != null) cancelAnimationFrame(iframeLoadRaf)
  iframeLoadRaf = null
})

watchEffect((onCleanup) => {
  if (!import.meta.client) return
  if (!rowInView.value) return
  if (!hasEmbeddedVideo.value) return
  const el = videoBoxEl.value
  if (!el) return

  registerEmbeddedVideo(post.value.id, el)
  onCleanup(() => unregisterEmbeddedVideo(post.value.id))
})

const linkMeta = ref<LinkMetadata | null>(null)
watch(
  [previewLink, rowInView, showLinkPreview],
  async ([url, inView, canPreview]) => {
    linkMeta.value = null
    rumbleEmbedInfo.value = null
    if (!import.meta.client) return
    if (!canPreview) return
    if (!inView) return
    if (!url) return
    // Special cases (embed) do not need metadata.
    if (getYouTubeEmbedUrl(url)) return
    if (isRumbleUrl(url)) {
      rumbleEmbedInfo.value = await resolveRumbleEmbedInfo(url)
      return
    }
    linkMeta.value = await getLinkMetadata(url)
  },
  { immediate: true },
)

const embeddedPreviewEnabled = computed(() => {
  // Allow SSR to fetch embedded post previews on first paint.
  if (import.meta.server) return true
  return rowInView.value
})

const displayBodySegments = computed<TextSegment[]>(() => {
  const input = (displayBody.value ?? '').toString()
  if (!input) return [{ text: '' }]

  const matches = linkify.match(input) ?? []
  if (!matches.length) return [{ text: input }]

  const out: TextSegment[] = []
  let cursor = 0

  for (const m of matches) {
    const start = typeof (m as any).index === 'number' ? ((m as any).index as number) : -1
    const end = typeof (m as any).lastIndex === 'number' ? ((m as any).lastIndex as number) : -1
    if (start < 0 || end < 0 || end <= start) continue
    if (start > cursor) out.push({ text: input.slice(cursor, start) })

    const text = input.slice(start, end)
    const href = (m.url ?? '').trim()
    if (href && /^https?:\/\//i.test(href)) out.push({ text, href })
    else out.push({ text })

    cursor = end
  }

  if (cursor < input.length) out.push({ text: input.slice(cursor) })
  return out.length ? out : [{ text: input }]
})

function goToPost() {
  return navigateTo(postPermalink.value)
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  // Ignore clicks on any interactive element inside the row.
  return Boolean(
    el.closest(
      [
        'a',
        'button',
        'iframe',
        'input',
        'textarea',
        'select',
        '[role="menu"]',
        '[role="menuitem"]',
        '[data-pc-section]',
      ].join(','),
    ),
  )
}

function onRowClick(e: MouseEvent) {
  if (!clickable.value) return
  if (isInteractiveTarget(e.target)) return
  void goToPost()
}

function noop() {
  // no-op for now (comments not implemented yet)
}

async function toggleBookmark() {
  // Back-compat helper for any callers; saves to Unorganized.
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'boost' })
    return
  }
  if (viewerHasBookmarked.value) return await removeBookmark()
  return await saveBookmarkTo(null)
}

function openBookmarkPopover(event: Event) {
  bookmarkCreateOpen.value = false
  bookmarkCreateName.value = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(bookmarkPopoverRef.value as any)?.toggle(event)
  if (import.meta.client) void ensureBookmarkCollectionsLoaded()
}

async function removeBookmark() {
  if (bookmarkLoading.value) return
  bookmarkLoading.value = true
  const prevHas = viewerHasBookmarked.value
  const prevCid = viewerBookmarkCollectionId.value
  try {
    await apiFetchData('/bookmarks/' + encodeURIComponent(post.value.id), { method: 'DELETE' })
    viewerHasBookmarked.value = false
    viewerBookmarkCollectionId.value = null
    bumpBookmarkCounts({ prevHas, prevCollectionId: prevCid, nextHas: false, nextCollectionId: null })
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to unsave post.', tone: 'error', durationMs: 2000 })
  } finally {
    bookmarkLoading.value = false
  }
}

async function saveBookmarkTo(collectionId: string | null) {
  if (bookmarkLoading.value) return
  if (!isAuthed.value) return
  bookmarkLoading.value = true
  const prevHas = viewerHasBookmarked.value
  const prevCid = viewerBookmarkCollectionId.value
  try {
    const res = await apiFetchData<{ collectionId: string | null }>(
      '/bookmarks/' + encodeURIComponent(post.value.id),
      { method: 'POST', body: { collectionId } },
    )
    viewerHasBookmarked.value = true
    viewerBookmarkCollectionId.value = res?.collectionId ?? null
    bumpBookmarkCounts({
      prevHas,
      prevCollectionId: prevCid,
      nextHas: true,
      nextCollectionId: viewerBookmarkCollectionId.value,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(bookmarkPopoverRef.value as any)?.hide?.()
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to save post.', tone: 'error', durationMs: 2000 })
  } finally {
    bookmarkLoading.value = false
  }
}

async function createFolderAndSave() {
  const name = bookmarkCreateName.value.trim()
  if (!name) return
  if (bookmarkCreating.value || bookmarkLoading.value) return
  bookmarkCreating.value = true
  try {
    const created = await createBookmarkCollection(name)
    if (!created?.id) throw new Error('Failed to create folder.')
    await saveBookmarkTo(created.id)
    bookmarkCreateOpen.value = false
    bookmarkCreateName.value = ''
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to create folder.', tone: 'error', durationMs: 2200 })
  } finally {
    bookmarkCreating.value = false
  }
}

async function onBookmarkClick(event: Event) {
  if (bookmarkLoading.value) return
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'boost' })
    return
  }
  if (viewerHasBookmarked.value) {
    await removeBookmark()
    return
  }
  openBookmarkPopover(event)
}

const createdAtDate = computed(() => new Date(post.value.createdAt))
const createdAtShort = computed(() => formatShortDate(createdAtDate.value))
const createdAtTooltip = computed(() => tinyTooltip(createdAtDate.value.toLocaleString()))

function formatShortDate(d: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`

  const sameYear = now.getFullYear() === d.getFullYear()
  const month = d.toLocaleString(undefined, { month: 'short' })
  const day = d.getDate()
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
}

const moreMenuRef = ref()
const moreMenuMounted = ref(false)
const moreMenuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      label: post.value.author.username ? `View @${post.value.author.username}` : 'View profile',
      icon: 'pi pi-user',
      command: () => {
        if (!authorProfilePath.value) return
        return navigateTo(authorProfilePath.value)
      },
    },
  ]

  if (viewerIsAdmin.value) {
    items.push({ separator: true })
    items.push({
      label: `Boost score: ${adminBoostScoreLabel.value ?? '—'}`,
      icon: 'pi pi-chart-line',
      disabled: true
    })
  }

  if (isAuthed.value && !isSelf.value) {
    items.push({
      label: 'Report post',
      icon: 'pi pi-flag',
      command: () => {
        // no-op for now
      },
    })
  }

  if (isSelf.value) {
    items.push({ separator: true })
    items.push({
      label: 'Delete post',
      icon: 'pi pi-trash',
      class: 'text-red-600 dark:text-red-400',
      command: () => {
        deleteConfirmOpen.value = true
      },
    })
  }

  return items
})

async function toggleMoreMenu(event: Event) {
  moreMenuMounted.value = true
  await nextTick()
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(moreMenuRef.value as any)?.toggle(event)
}

const toast = useAppToast()
const deleteConfirmOpen = ref(false)
const deleting = ref(false)

async function deletePost() {
  if (deleting.value) return
  deleting.value = true
  try {
    await apiFetchData<{ success: true }>('/posts/' + encodeURIComponent(post.value.id), { method: 'DELETE' })
    emit('deleted', post.value.id)
    toast.push({ title: 'Post deleted', tone: 'success', durationMs: 1400 })
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to delete post.', tone: 'error', durationMs: 2200 })
  } finally {
    deleting.value = false
    deleteConfirmOpen.value = false
  }
}

const boostEntry = computed(() => boostState.get(post.value))
const isBoosted = computed(() => boostEntry.value.viewerHasBoosted)
const boostCount = computed(() => boostEntry.value.boostCount)
const boostCountLabel = computed(() => {
  const n = boostCount.value
  if (!n) return null
  return String(n)
})
const adminBoostScoreLabel = computed(() => {
  if (!viewerIsAdmin.value) return null
  const score = post.value.internal?.boostScore
  if (typeof score !== 'number') return '—'
  return score.toFixed(2)
})

async function onBoostClick() {
  if (!viewerCanInteract.value) return
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'boost' })
    return
  }
  if (!viewerHasUsername.value) {
    showAuthActionModal({ kind: 'setUsername', action: 'boost' })
    return
  }
  try {
    await boostState.toggleBoost(post.value)
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to boost.', tone: 'error', durationMs: 2200 })
  }
}

async function onCommentClick() {
  if (!viewerCanInteract.value) return
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'comment' })
    return
  }
  if (!viewerIsVerified.value) {
    showAuthActionModal({ kind: 'verify', action: 'comment' })
    return
  }

  // Comments aren't implemented yet; bring them to the post page as the next best action.
  await navigateTo(postPermalink.value)
}

async function copyToClipboard(text: string) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', 'true')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

const shareMenuRef = ref()
const shareMenuMounted = ref(false)
const shareMenuItems = computed<MenuItem[]>(() => [
  {
    label: 'Copy link',
    icon: 'pi pi-link',
    command: async () => {
      if (!import.meta.client) return
      try {
        await copyToClipboard(postShareUrl.value)
        toast.push({ title: 'Link copied', tone: 'success', durationMs: 1400 })
      } catch {
        toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
      }
    },
  },
])

async function toggleShareMenu(event: Event) {
  shareMenuMounted.value = true
  await nextTick()
  // PrimeVue Menu expects the click event to position the popup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(shareMenuRef.value as any)?.toggle(event)
}
</script>

