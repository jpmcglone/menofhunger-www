<template>
  <AppPageContent bottom="standard">
    <!-- Reading progress bar (hidden for gated articles) -->
    <ClientOnly>
      <AppArticleProgressBar v-if="article && article.viewerCanAccess !== false" :visibility="article.visibility" />
    </ClientOnly>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-20">
      <Icon name="tabler:loader-2" class="animate-spin text-gray-400 text-2xl" />
    </div>

    <!-- Error / not found -->
    <div v-else-if="!article" class="px-4 py-20 text-center">
      <p class="text-lg font-semibold text-gray-600 dark:text-zinc-400">Article not found.</p>
      <NuxtLink to="/articles" class="mt-3 inline-block text-sm text-orange-500 hover:underline">Browse articles</NuxtLink>
    </div>

    <!-- Article -->
    <article v-else>
      <!-- Centered content column -->
      <div class="mx-auto max-w-3xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
        <!-- Thumbnail hero -->
        <div v-if="article.thumbnailUrl" class="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
          <img
            :src="article.thumbnailUrl"
            :alt="article.title"
            :class="['h-full w-full object-cover', article.viewerCanAccess === false ? 'blur-xl scale-110' : '']"
          />
          <!-- Lock overlay for gated articles -->
          <div
            v-if="article.viewerCanAccess === false"
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40"
          >
            <Icon name="tabler:lock" class="text-white text-4xl drop-shadow-lg" aria-hidden="true" />
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-3xl font-bold leading-snug text-gray-900 dark:text-gray-100 sm:text-4xl">
          {{ article.title }}
        </h1>

        <!-- Meta: author, date, read time -->
        <div class="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-500 dark:text-zinc-400">
          <span>by</span>
          <NuxtLink
            :to="`/u/${article.author.username}`"
            class="font-medium text-gray-900 dark:text-gray-100 hover:underline underline-offset-2"
            @mouseenter="(e) => authorEnter(e)"
            @mousemove="(e) => authorMove(e)"
            @mouseleave="authorLeave"
          >{{ article.author.name || article.author.username }}</NuxtLink>
          <span class="mx-1">·</span>
          <time :datetime="article.publishedAt ?? article.createdAt">{{ publishedLabel }}</time>
          <span v-if="readingTime && article.viewerCanAccess !== false">· {{ readingTime }}</span>
          <span v-if="article.editedAt" class="text-xs text-gray-400 dark:text-zinc-500">· Edited</span>
        </div>

        <!-- Visibility badge -->
        <div v-if="article.visibility !== 'public'" class="mt-3">
          <span
            :class="[
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              article.visibility === 'premiumOnly'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
            ]"
          >
            {{ article.visibility === 'premiumOnly' ? 'Premium only' : 'Verified only' }}
          </span>
        </div>

        <!-- Table of contents (client-only to avoid DOMParser SSR issues, hidden for gated) -->
        <ClientOnly>
          <AppArticleTableOfContents v-if="article.viewerCanAccess !== false" :html="renderedBody" />
        </ClientOnly>

        <!-- Body (rendered Tiptap HTML) — only for accessible articles -->
        <div
          v-if="article.viewerCanAccess !== false"
          class="prose prose-gray mt-8 dark:prose-invert max-w-none article-body"
          v-html="bodyWithHeadingIds"
        />

        <!-- Gated: show faded excerpt teaser then access gate -->
        <template v-else>
          <div
            v-if="article.excerpt"
            class="relative overflow-hidden mt-8"
            style="opacity: 0.75; mask-image: linear-gradient(to bottom, black 30%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 30%, transparent 100%);"
          >
            <p class="text-base leading-relaxed text-gray-700 dark:text-zinc-300">
              {{ article.excerpt }}
            </p>
          </div>

          <!-- Access gate card -->
          <div
            class="mt-6 flex flex-col items-center gap-4 rounded-2xl border px-6 py-10 text-center"
          :class="article.visibility === 'premiumOnly'
            ? 'border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20'
            : 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20'"
        >
          <div
            class="flex h-14 w-14 items-center justify-center rounded-full"
            :class="article.visibility === 'premiumOnly'
              ? 'bg-orange-100 dark:bg-orange-900/40'
              : 'bg-blue-100 dark:bg-blue-900/40'"
          >
            <Icon
              name="tabler:lock"
              class="text-2xl"
              :class="article.visibility === 'premiumOnly' ? 'text-orange-500' : 'text-blue-500'"
              aria-hidden="true"
            />
          </div>
          <div>
            <p class="text-lg font-bold text-gray-900 dark:text-gray-100">
              {{ article.visibility === 'premiumOnly' ? 'Premium members only' : 'Verified members only' }}
            </p>
            <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {{ article.visibility === 'premiumOnly'
                ? 'This article is exclusively for premium members. Upgrade to read the full article.'
                : 'This article is for verified members. Get verified to read the full article.' }}
            </p>
          </div>
          <NuxtLink
            to="/settings/subscription"
            :class="[
              'mt-2 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90',
              article.visibility === 'premiumOnly' ? 'bg-orange-500' : 'bg-blue-500',
            ]"
          >
            <Icon name="tabler:arrow-right" aria-hidden="true" />
            {{ article.visibility === 'premiumOnly' ? 'Upgrade to Premium' : 'Get Verified' }}
          </NuxtLink>
        </div>
        </template>

        <!-- View sentinel: placed immediately after the article body.
             The IntersectionObserver fires when the reader scrolls past the
             end of the article content (≈ read the whole thing).
             Not rendered for gated articles so no view is ever tracked. -->
        <div v-if="article.viewerCanAccess !== false" ref="viewSentinelEl" aria-hidden="true" />

        <!-- Divider -->
        <hr class="my-8 border-gray-200 dark:border-zinc-800" />

        <!-- Engagement bar — same style as PostRow -->
        <div class="flex items-center justify-between moh-text-muted">
          <div class="flex items-center gap-1">
            <!-- Comments -->
            <div class="inline-flex w-14 items-center justify-start">
              <button
                type="button"
                class="moh-tap inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                aria-label="Jump to comments"
                @click="guardedScrollToComments"
              >
                <Icon name="tabler:message-circle" class="text-[18px]" aria-hidden="true" />
              </button>
              <span class="ml-0 inline-block min-w-[1.5rem] select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted">
                {{ displayCommentCount || '' }}
              </span>
            </div>

            <!-- Boost -->
            <div class="inline-flex w-14 items-center justify-start">
              <button
                type="button"
                class="moh-tap inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                :aria-label="isHydrated && boostState.boosted.value ? 'Remove boost' : 'Boost article'"
                @click="guardedBoost"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  aria-hidden="true"
                  :style="isHydrated && boostState.boosted.value ? { color: 'var(--p-primary-color)' } : undefined"
                >
                  <path
                    d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
                    :fill="isHydrated && boostState.boosted.value ? 'currentColor' : 'none'"
                    :stroke="isHydrated && boostState.boosted.value ? undefined : 'currentColor'"
                    stroke-width="1.9"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <span class="ml-0 inline-block w-6 select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted">
                {{ boostCountLabel }}
              </span>
            </div>

            <!-- Reactions -->
            <AppArticleReactionBar
              :reactions="reactionState.reactions.value"
              :readonly="!isAuthed || article?.viewerCanAccess === false"
              @toggle="guardedReact"
            />
          </div>

          <!-- View count + Share menu -->
          <div class="flex items-center gap-2">
            <!-- View count with hover breakdown -->
            <div v-if="displayViewCount > 0" class="relative">
              <button
                type="button"
                class="inline-flex items-center gap-1 text-[11px] sm:text-xs tabular-nums moh-text-muted select-none rounded-full px-1.5 h-9 transition-colors moh-surface-hover cursor-default"
                :aria-label="`${displayViewCount} ${displayViewCount === 1 ? 'person' : 'people'} read this article`"
                @mouseenter="onViewCountHover"
                @focus="onViewCountHover"
                @mouseleave="viewCountBreakdownVisible = false"
                @blur="viewCountBreakdownVisible = false"
              >
                <Icon name="tabler:eye" class="text-[15px]" aria-hidden="true" />
                <span>{{ displayViewCount.toLocaleString() }}</span>
              </button>

              <!-- Breakdown popover -->
              <Transition name="viewer-breakdown">
                <div
                  v-if="viewCountBreakdownVisible"
                  class="absolute top-full mt-1.5 right-0 z-50 min-w-[11rem] rounded-lg border moh-border moh-surface shadow-lg px-3 py-2.5 text-[11px] sm:text-xs"
                  role="tooltip"
                >
                  <p class="mb-1.5 font-semibold moh-text">
                    {{ displayViewCount }} {{ displayViewCount === 1 ? 'person' : 'people' }} read this
                  </p>
                  <template v-if="viewCountBreakdown">
                    <div class="flex flex-col gap-1 moh-text-muted">
                      <div v-if="viewCountBreakdown.premium > 0" class="flex items-center justify-between gap-3">
                        <span class="flex items-center gap-1.5">
                          <span class="inline-block h-2 w-2 rounded-full bg-yellow-400 shrink-0" aria-hidden="true" />
                          Premium
                        </span>
                        <span class="tabular-nums font-medium moh-text">{{ viewCountBreakdown.premium }}</span>
                      </div>
                      <div v-if="viewCountBreakdown.verified > 0" class="flex items-center justify-between gap-3">
                        <span class="flex items-center gap-1.5">
                          <span class="inline-block h-2 w-2 rounded-full bg-blue-400 shrink-0" aria-hidden="true" />
                          Verified
                        </span>
                        <span class="tabular-nums font-medium moh-text">{{ viewCountBreakdown.verified }}</span>
                      </div>
                      <div v-if="viewCountBreakdown.unverified > 0" class="flex items-center justify-between gap-3">
                        <span class="flex items-center gap-1.5">
                          <span class="inline-block h-2 w-2 rounded-full bg-gray-400 shrink-0" aria-hidden="true" />
                          Unverified
                        </span>
                        <span class="tabular-nums font-medium moh-text">{{ viewCountBreakdown.unverified }}</span>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="moh-text-muted animate-pulse">Loading…</div>
                  </template>
                </div>
              </Transition>
            </div>

            <button
              type="button"
              class="moh-tap inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
            aria-label="Share article"
            @click="toggleShareMenu($event)"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
              <path d="M12 3v10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
              <path d="M7.5 7.5L12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            </button>
            <Menu v-if="shareMenuMounted" ref="shareMenuRef" :model="shareMenuItems" popup>
              <template #item="{ item, props: itemProps }">
                <a v-bind="itemProps.action" class="flex items-center gap-2">
                  <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
                  <span v-bind="itemProps.label">{{ item.label }}</span>
                </a>
              </template>
            </Menu>
          </div>
        </div>

        <!-- Follow CTA -->
        <ClientOnly>
          <AppArticleFollowCTA
            :author="article.author"
            :viewer-is-author="viewerIsAuthor"
          />
        </ClientOnly>

        <!-- Author bio section -->
        <div class="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">About the author</p>
          <div class="flex gap-4">
            <NuxtLink
              :to="`/u/${article.author.username}`"
              class="flex-shrink-0"
              @mouseenter="(e) => authorEnter(e)"
              @mousemove="(e) => authorMove(e)"
              @mouseleave="authorLeave"
            >
              <AppUserAvatar :user="article.author" size="lg" />
            </NuxtLink>
            <div class="flex-1 min-w-0">
              <NuxtLink
                :to="`/u/${article.author.username}`"
                @mouseenter="(e) => authorEnter(e)"
                @mousemove="(e) => authorMove(e)"
                @mouseleave="authorLeave"
              >
                <AppUserIdentityLine
                  :user="article.author"
                  name-class="text-base"
                  handle-class="text-xs"
                  badge-size="md"
                />
              </NuxtLink>
              <p v-if="authorBio" class="mt-2 text-sm text-gray-600 dark:text-zinc-400 line-clamp-4">
                {{ authorBio }}
              </p>
            </div>
          </div>
        </div>

        <!-- Comments: only shown when the viewer has full access to the article -->
        <div v-if="article.viewerCanAccess !== false" id="comments">
          <AppArticleComments ref="commentsEl" :article-id="article.id" :total-count="displayCommentCount" :visibility="article.visibility" :author="article.author" :highlighted-comment-id="highlightedCommentId" />
        </div>
      </div>

      <!-- Related articles: edge to edge, outside the content column -->
      <ClientOnly>
        <AppArticleRelatedArticles
          v-if="article.author.username"
          :author-username="article.author.username"
          :current-article-id="article.id"
        />
      </ClientOnly>
    </article>

    <!-- Share with comment modal -->
    <Dialog
      v-model:visible="shareCommentModalOpen"
      modal
      header="Share with comment"
      :style="{ width: '32rem', maxWidth: '95vw' }"
    >
      <div class="space-y-3">
        <AppArticleShareCard v-if="articleSharePreview" :article="articleSharePreview" />
        <textarea
          v-model="shareCommentText"
          class="w-full rounded-xl border moh-border bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--p-primary-color)]/30 resize-none min-h-[80px]"
          placeholder="Add a comment (optional)…"
          rows="3"
        />
        <div class="flex justify-end gap-2">
          <Button label="Cancel" severity="secondary" @click="shareCommentModalOpen = false" />
          <Button label="Share" :loading="sharing" @click="onSubmitShareWithComment" />
        </div>
      </div>
    </Dialog>
  </AppPageContent>
</template>

<script setup lang="ts">
import Menu from 'primevue/menu'
import type { Article, ArticleSharePreview } from '~/types/api'
import { useAutoToggleMenu } from '~/composables/useAutoToggleMenu'
import { siteConfig } from '~/config/site'

definePageMeta({ layout: 'app', hideTopBar: true })

const route = useRoute()
const id = computed(() => route.params.id as string)
const { apiFetchData } = useApiClient()
const { isAuthed, user } = useAuth()
const { show: showAuthActionModal } = useAuthActionModal()

const gateKind = computed(() =>
  article.value?.visibility === 'premiumOnly' ? 'premium' : 'verify',
)

function guardedBoost() {
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'article-boost' })
    return
  }
  if (article.value?.viewerCanAccess === false) {
    showAuthActionModal({ kind: gateKind.value, action: 'article-boost' })
    return
  }
  boostState.toggle()
}

function guardedScrollToComments() {
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'article-comment' })
    return
  }
  if (article.value?.viewerCanAccess === false) {
    showAuthActionModal({ kind: gateKind.value, action: 'article-comment' })
    return
  }
  scrollToComments()
}

function guardedReact(reactionId: string, emoji: string) {
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'article-react' })
    return
  }
  if (article.value?.viewerCanAccess === false) {
    showAuthActionModal({ kind: gateKind.value, action: 'article-react' })
    return
  }
  reactionState.toggle(reactionId, emoji)
}

const { data: article, pending } = useAsyncData<Article>(
  `article-${id.value}`,
  () => apiFetchData<Article>(`/articles/${id.value}`),
)

// SEO / OG
useArticleSeo(article)

// Lazily load Tiptap rendering deps to keep them out of the main page chunk
let _generateHTML: typeof import('@tiptap/html')['generateHTML'] | null = null
let _extensions: any[] | null = null

async function getTiptapRenderer() {
  if (_generateHTML && _extensions) return { generateHTML: _generateHTML, extensions: _extensions }
  const [{ generateHTML }, { default: StarterKit }, { default: Image }, { default: Youtube }, { Callout }] = await Promise.all([
    import('@tiptap/html'),
    import('@tiptap/starter-kit'),
    import('@tiptap/extension-image'),
    import('@tiptap/extension-youtube'),
    import('~/utils/tiptap-callout'),
  ])
  _extensions = [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: { openOnClick: true },
      underline: {},
    }),
    Image,
    Youtube,
    Callout,
  ]
  _generateHTML = generateHTML
  return { generateHTML: _generateHTML, extensions: _extensions }
}

// Rendered HTML from Tiptap JSON (async to support lazy imports)
const renderedBody = ref('')

watchEffect(async () => {
  const bodyJson = article.value?.body
  if (!bodyJson || bodyJson === '{}') { renderedBody.value = ''; return }
  try {
    const { generateHTML, extensions } = await getTiptapRenderer()
    renderedBody.value = generateHTML(JSON.parse(bodyJson), extensions)
  } catch {
    renderedBody.value = article.value?.body ?? ''
  }
})

// Client-side version with proper DOM parsing
const bodyWithHeadingIds = computed(() => {
  const html = renderedBody.value
  if (!html || !import.meta.client) return html
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const seen = new Map<string, number>()
    doc.querySelectorAll('h2, h3').forEach((el) => {
      const text = el.textContent?.trim() ?? ''
      const baseId = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '') || 'heading'
      const count = seen.get(baseId) ?? 0
      el.id = count === 0 ? baseId : `${baseId}-${count}`
      seen.set(baseId, count + 1)
    })
    return doc.body.innerHTML
  } catch {
    return html
  }
})

// Reading time (estimate from word count in body)
const readingTime = computed(() => {
  if (!article.value?.body) return null
  try {
    const json = JSON.parse(article.value.body)
    const texts: string[] = []
    function walk(node: any) {
      if (!node) return
      if (node.type === 'text' && node.text) texts.push(node.text)
      if (Array.isArray(node.content)) node.content.forEach(walk)
    }
    walk(json)
    const words = texts.join(' ').split(/\s+/).filter(Boolean).length
    const minutes = Math.max(1, Math.round(words / 200))
    return `${minutes} min read`
  } catch {
    return null
  }
})

// Published date label
const publishedLabel = computed(() => {
  const dateStr = article.value?.publishedAt ?? article.value?.createdAt
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
})

// Author bio (use articleBio override if set, otherwise regular bio)
const authorBio = computed(() => article.value?.author?.articleBio || article.value?.author?.bio || null)

// Is the current viewer the author
const viewerIsAuthor = computed(() => Boolean(user.value?.id && article.value?.author?.id === user.value.id))

// Hover preview trigger
const { onEnter: authorEnter, onMove: authorMove, onLeave: authorLeave } = useUserPreviewTrigger({
  username: computed(() => article.value?.author?.username ?? ''),
})

const isHydrated = ref(false)

// ─── View tracking (scroll-based) ────────────────────────────────────────────
// A sentinel placed at the article midpoint triggers the view count after the
// reader has kept it visible for 2 s (dwell threshold).
const viewSentinelEl = ref<HTMLElement | null>(null)
const { observe: observeArticleView } = useArticleViewTracker()

// ─── Realtime live updates ────────────────────────────────────────────────────
const presence = usePresence()
const liveCommentCount = ref<number | null>(null)
const liveViewCount = ref<number | null>(null)

const displayCommentCount = computed(() => liveCommentCount.value ?? article.value?.commentCount ?? 0)
const displayViewCount = computed(() => liveViewCount.value ?? article.value?.viewCount ?? 0)

const articlesCallback: import('~/composables/usePresence').ArticlesCallback = {
  onLiveUpdated(payload) {
    if (payload.articleId !== article.value?.id) return
    if (payload.patch.commentCount !== undefined) liveCommentCount.value = payload.patch.commentCount
    if (payload.patch.viewCount !== undefined) liveViewCount.value = payload.patch.viewCount
    if (payload.patch.boostCount !== undefined) boostState.count.value = payload.patch.boostCount
    if (payload.patch.reactions !== undefined) reactionState.reactions.value = payload.patch.reactions
  },
}

// ─── Viewer breakdown (hover) ─────────────────────────────────────────────────
const viewCountBreakdownVisible = ref(false)
const viewCountBreakdown = ref<import('~/types/api').ArticleViewBreakdown | null>(null)
let breakdownFetched = false

async function onViewCountHover() {
  viewCountBreakdownVisible.value = true
  if (breakdownFetched) return
  breakdownFetched = true
  try {
    const result = await apiFetchData<import('~/types/api').ArticleViewBreakdown>(
      `/articles/${article.value?.id}/views/breakdown`,
    )
    viewCountBreakdown.value = result
  } catch {
    breakdownFetched = false
  }
}

let stopObservingView: (() => void) | null = null

// ─── Comment deep-link (hash = #comment-<id>) ────────────────────────────────
const highlightedCommentId = ref<string | null>(null)

function extractCommentIdFromHash(hash: string): string | null {
  const m = hash.match(/^#?comment-(.+)$/)
  return m?.[1] ?? null
}

function scrollToComment(commentId: string) {
  const el = document.getElementById(`comment-${commentId}`)
  if (!el) return
  const scroller = document.getElementById('moh-middle-scroller')
  if (scroller) {
    const scrollerRect = scroller.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const target = scroller.scrollTop + (elRect.top - scrollerRect.top) - 80
    scroller.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  highlightedCommentId.value = commentId
  setTimeout(() => { highlightedCommentId.value = null }, 4000)
}

onMounted(() => {
  isHydrated.value = true
  presence.addArticlesCallback(articlesCallback)

  const commentId = extractCommentIdFromHash(route.hash)
  if (commentId) {
    // Wait for comments to load then scroll
    const stop = watch(
      () => document.getElementById(`comment-${commentId}`),
      (el) => {
        if (el) {
          stop?.()
          setTimeout(() => scrollToComment(commentId), 150)
        }
      },
      { immediate: true },
    )
    // Give up after 5s
    setTimeout(() => stop?.(), 5000)
  }
})

watch(
  () => article.value?.id,
  (articleId, prevId) => {
    if (prevId) presence.unsubscribeArticles([prevId])
    if (articleId) presence.subscribeArticles([articleId])
  },
  { immediate: true },
)

watch(
  () => route.hash,
  (hash) => {
    const commentId = extractCommentIdFromHash(hash)
    if (commentId) scrollToComment(commentId)
  },
)

// Attach scroll observer once the sentinel element is rendered.
// Guard: never track views for articles the viewer cannot access.
watch(viewSentinelEl, (el) => {
  stopObservingView?.()
  stopObservingView = null
  if (el && article.value?.id && article.value.viewerCanAccess !== false) {
    stopObservingView = observeArticleView(article.value.id, el)
  }
})

onUnmounted(() => {
  presence.removeArticlesCallback(articlesCallback)
  if (article.value?.id) presence.unsubscribeArticles([article.value.id])
  stopObservingView?.()
  stopObservingView = null
})

const boostCountLabel = computed(() => {
  const count = isHydrated.value ? boostState.count.value : (article.value?.boostCount ?? 0)
  return count > 0 ? String(count) : ''
})

// Comments ref for scroll + focus
const commentsEl = ref<{ focusCompose: () => void; composeTextareaEl: HTMLTextAreaElement | null } | null>(null)

function scrollToComments() {
  const textarea = commentsEl.value?.composeTextareaEl
  const scroller = document.getElementById('moh-middle-scroller')

  if (textarea && scroller) {
    // Compute scroll position so the textarea aligns near the top of the viewport,
    // leaving a small gap for the sticky title bar.
    const OFFSET = 20
    const scrollerRect = scroller.getBoundingClientRect()
    const textareaRect = textarea.getBoundingClientRect()
    const targetScrollTop = scroller.scrollTop + (textareaRect.top - scrollerRect.top) - OFFSET

    scroller.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' })

    // Focus after the smooth scroll settles, without triggering a second scroll jump.
    setTimeout(() => textarea.focus({ preventScroll: true }), 380)
  } else {
    // Fallback: scroll the comments section into view, then focus.
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => commentsEl.value?.focusCompose(), 400)
  }
}

// Share menu — using the same PrimeVue Menu popup pattern as PostRowShareMenu
const toast = useAppToast()
const sharing = ref(false)
const shareCommentModalOpen = ref(false)
const shareCommentText = ref('')

const { mounted: shareMenuMounted, menuRef: shareMenuRef, toggle: toggleShareMenu } = useAutoToggleMenu()

const shareMenuItems = computed(() => {
  const items: Array<{ label: string; iconName: string; command: () => void }> = [
    {
      label: 'Copy link',
      iconName: 'tabler:link',
      command: () => void onCopyLink(),
    },
  ]
  if (isAuthed.value && article.value?.viewerCanAccess !== false) {
    items.push({
      label: 'Share to feed',
      iconName: 'tabler:repeat',
      command: () => void onShareToFeed(),
    })
    items.push({
      label: 'Share with comment',
      iconName: 'tabler:message-share',
      command: () => onShareWithComment(),
    })
  }
  return items
})

async function onCopyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.push({ title: 'Link copied!', tone: 'success' })
  } catch {
    toast.push({ title: 'Could not copy link', tone: 'error' })
  }
}

async function onShareToFeed() {
  if (!article.value) return
  sharing.value = true
  try {
    const articleUrl = `${siteConfig.url}/a/${article.value.id}`
    await apiFetchData('/posts', {
      method: 'POST',
      body: { body: articleUrl, visibility: 'public' },
    })
    toast.push({ title: 'Shared to your feed!', tone: 'success' })
  } catch {
    toast.push({ title: 'Could not share article.', tone: 'error' })
  } finally {
    sharing.value = false
  }
}

function onShareWithComment() {
  shareCommentText.value = ''
  shareCommentModalOpen.value = true
}

async function onSubmitShareWithComment() {
  if (!article.value) return
  sharing.value = true
  try {
    const articleUrl = `${siteConfig.url}/a/${article.value.id}`
    const comment = shareCommentText.value.trim()
    const body = comment ? `${comment}\n\n${articleUrl}` : articleUrl
    await apiFetchData('/posts', {
      method: 'POST',
      body: { body, visibility: 'public' },
    })
    shareCommentModalOpen.value = false
    toast.push({ title: 'Shared to your feed!', tone: 'success' })
  } catch {
    toast.push({ title: 'Could not share article.', tone: 'error' })
  } finally {
    sharing.value = false
  }
}

// Share preview (for the modal)
const articleSharePreview = computed<ArticleSharePreview | null>(() => {
  const a = article.value
  if (!a) return null
  return {
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    thumbnailUrl: a.thumbnailUrl,
    visibility: a.visibility,
    publishedAt: a.publishedAt,
    author: a.author,
  }
})

// Boost state
const boostState = useArticleBoost(
  computed(() => article.value?.id ?? ''),
  computed(() => article.value?.viewerHasBoosted ?? false),
  computed(() => article.value?.boostCount ?? 0),
)

// Reaction state
const reactionState = useArticleReactions(
  'article',
  computed(() => article.value?.id ?? ''),
  computed(() => article.value?.reactions ?? []),
)
</script>

<style scoped>
.viewer-breakdown-enter-active,
.viewer-breakdown-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.viewer-breakdown-enter-from,
.viewer-breakdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
