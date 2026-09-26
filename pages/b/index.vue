<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=890-4573 -->
<template>
  <AppPageContent bottom="standard">
    <div class="flex items-center justify-between moh-gutter-x pt-4 pb-3">
      <h1 class="moh-h1">Board</h1>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="moh-tap moh-focus inline-flex size-11 items-center justify-center rounded-full moh-text-muted moh-surface-hover"
          :aria-expanded="searchOpen"
          aria-label="Search the Board"
          @click="toggleSearch"
        >
          <AppIconGlyph name="search" :size="20" />
        </button>
        <NuxtLink
          to="/b/new"
          class="moh-tap moh-focus inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-opacity hover:opacity-90"
          style="background-color: var(--moh-marv); color: var(--moh-button-brand-label)"
          @click="onPostClick"
        >
          <AppIconGlyph name="write" :size="16" />
          Post
        </NuxtLink>
      </div>
    </div>

    <form v-if="searchOpen" class="moh-gutter-x pb-3" role="search" @submit.prevent="applySearch">
      <input
        ref="searchEl"
        v-model="searchDraft"
        type="search"
        placeholder="Search Board posts"
        class="w-full rounded-full border moh-border bg-transparent px-4 py-2.5 text-sm moh-text outline-none focus:border-[var(--moh-text-muted)]"
        aria-label="Search Board posts"
      >
    </form>

    <div class="flex flex-wrap items-center gap-2 moh-gutter-x pb-3 border-b moh-border">
      <AppTabSelector
        :model-value="view"
        aria-label="Board view"
        :tabs="viewTabs"
        @update:model-value="setView($event as 'top' | 'new' | 'comments')"
      />
      <AppBoardFiltersBar
        v-if="view !== 'comments'"
        :show-range="view === 'top'"
        :range="range"
        :scope="scope"
        :tags="tags"
        :show-hidden="showHidden"
        :is-authed="isAuthed"
        :viewer-is-verified="isVerifiedMember"
        :viewer-is-premium="isPremium"
        @update:range="setQuery({ range: $event ?? undefined })"
        @update:scope="setQuery({ scope: $event === 'all' ? undefined : $event })"
        @update:tags="setTags"
        @update:show-hidden="setQuery({ hidden: $event ? '1' : undefined })"
        @reset="clearFilters"
      />
      <span
        v-if="domain"
        class="inline-flex items-center gap-1 rounded-full border moh-border px-3 py-1 text-xs moh-text-muted"
      >
        from {{ domain }}
        <button type="button" aria-label="Clear site filter" @click="setQuery({ domain: undefined })"><Icon name="tabler:x" class="text-[11px]" aria-hidden="true" /></button>
      </span>
      <span
        v-if="q"
        class="inline-flex items-center gap-1 rounded-full border moh-border px-3 py-1 text-xs moh-text-muted"
      >
        “{{ q }}”
        <button type="button" aria-label="Clear search" @click="setQuery({ q: undefined })"><Icon name="tabler:x" class="text-[11px]" aria-hidden="true" /></button>
      </span>
    </div>

    <div v-if="newThreadCount > 0 && view === 'new'" class="pointer-events-none sticky top-2 z-20 flex h-0 justify-center overflow-visible">
      <AppFeedNewPostsPill
        class="pointer-events-auto"
        :authors="[]"
        :count="newThreadCount"
        :label="`${newThreadCount} new ${newThreadCount === 1 ? 'post' : 'posts'}`"
        @reveal="showNewThreads"
      />
    </div>

    <AppSubtleSectionLoader :loading="initialLoading" :refreshing="refreshing" min-height-class="min-h-[240px]">
      <template v-if="view === 'comments'">
        <TransitionGroup tag="div" name="moh-list" class="relative moh-divide">
          <article v-for="c in latestComments" :key="c.id" class="moh-gutter-x py-3">
            <div class="flex flex-wrap items-center gap-x-1.5 text-xs moh-text-soft">
              <AppBoardBoostButton :post-id="c.id" :points="c.points" :viewer-has-boosted="c.viewerHasBoosted" />
              <NuxtLink
                :to="`/u/${encodeURIComponent(c.author.username ?? '')}`"
                class="font-semibold hover:underline"
                :style="{ color: userActionColor(c.author) }"
                @mouseenter="(e: MouseEvent) => preview.onEnter(c.author.username, e)"
                @mousemove="preview.onMove"
                @mouseleave="preview.onLeave"
              >{{ c.author.username }}</NuxtLink>
              <NuxtLink :to="boardCommentHref(c.threadId, c.id)" class="hover:underline">{{ formatListTime(c.createdAt) }}</NuxtLink>
              <span aria-hidden="true">·</span>
              <span>on:</span>
              <NuxtLink v-if="c.thread" :to="boardThreadHref({ id: c.threadId })" class="truncate hover:underline" style="color: var(--moh-verified)">{{ c.thread.title }}</NuxtLink>
            </div>
            <p class="mt-1 whitespace-pre-wrap break-words text-sm moh-text">{{ c.body }}</p>
          </article>
        </TransitionGroup>
        <p v-if="!loading && !latestComments.length" class="py-12 text-center moh-meta">No comments yet.</p>
      </template>

      <template v-else>
        <!-- Sort and filter changes reorder in place: rows still present glide to their new slot. -->
        <TransitionGroup tag="div" name="moh-list" class="relative moh-divide">
          <AppBoardThreadRow
            v-for="t in visibleThreads"
            :key="t.id"
            :thread="t"
            :show-hide="isAuthed"
            @toggle-hide="onToggleHide"
          />
        </TransitionGroup>
        <div v-if="!loading && !visibleThreads.length" class="py-12 text-center">
          <p class="text-sm font-semibold moh-text">Nothing here yet</p>
          <p class="mt-1 text-sm moh-text-muted">{{ emptyLabel }}</p>
          <button v-if="isFiltered" type="button" class="mt-2 text-sm hover:underline" style="color: var(--moh-verified)" @click="clearFilters">Clear filters</button>
        </div>
      </template>

      <div v-if="loadingMore" class="py-8 text-center moh-meta">Loading…</div>
      <button
        v-else-if="nextCursor && !loading"
        type="button"
        class="w-full border-t moh-border py-3 text-sm moh-text-muted transition-colors hover:bg-[var(--moh-surface-hover)]"
        @click="loadMore"
      >More</button>
    </AppSubtleSectionLoader>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { BoardComment, BoardRange, BoardThread } from '~/types/api'
import { formatListTime } from '~/utils/time-format'
import { userActionColor } from '~/utils/user-tier'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'app', title: 'Board', hideTopBar: true })

usePageSeo({
  title: 'Board',
  description: 'The Men of Hunger Board: links, questions, and show-and-tell from the brotherhood. Plain, tag-based, and ranked by the community.',
})

const route = useRoute()
const router = useRouter()
const api = useBoardApi()
const toast = useAppToast()
const { isAuthed, isPremium, isVerifiedMember } = useAuth()
const { requireMember } = useBoardAccess()
const preview = useUserPreviewMultiTrigger()

const viewTabs = [
  { key: 'top', label: 'Top' },
  { key: 'new', label: 'New' },
  { key: 'comments', label: 'Comments' },
]

const qs = (key: string) => (typeof route.query[key] === 'string' ? String(route.query[key]).trim() : '')
const view = computed<'top' | 'new' | 'comments'>(() => (qs('view') === 'comments' ? 'comments' : qs('sort') === 'new' ? 'new' : 'top'))
const range = computed<BoardRange | null>(() => {
  const r = qs('range')
  return (['day', 'week', 'month', 'year', 'all'] as const).includes(r as BoardRange) ? (r as BoardRange) : null
})
const scope = computed<'all' | 'verifiedOnly' | 'premiumOnly'>(() => {
  const s = qs('scope')
  return s === 'verifiedOnly' || s === 'premiumOnly' ? s : 'all'
})
const tags = computed(() => qs('tags').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3))
const domain = computed(() => qs('domain') || null)
const q = computed(() => qs('q') || null)
const showHidden = computed(() => isAuthed.value && qs('hidden') === '1')
const isFiltered = computed(() => Boolean(tags.value.length || domain.value || q.value || scope.value !== 'all' || range.value || showHidden.value))
const emptyLabel = computed(() => {
  if (showHidden.value) return 'You haven’t hidden any posts.'
  if (tags.value.length) return `No posts match ${tags.value.map((t) => `#${t}`).join(', ')}${range.value ? ' in this range' : ''}.`
  if (q.value) return `No posts match “${q.value}”.`
  return 'Be the first to post.'
})

function setQuery(patch: Record<string, string | undefined>) {
  const next: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...route.query, ...patch })) {
    if (typeof v === 'string' && v) next[k] = v
  }
  void router.replace({ path: '/b', query: next })
}

function setView(next: 'top' | 'new' | 'comments') {
  if (next === 'comments') setQuery({ view: 'comments', sort: undefined, range: undefined })
  else setQuery({ view: undefined, sort: next === 'new' ? 'new' : undefined, range: next === 'new' ? undefined : range.value ?? undefined })
}

function setTags(next: string[]) {
  setQuery({ tags: next.length ? next.join(',') : undefined })
}

function clearFilters() {
  void router.replace({ path: '/b', query: view.value === 'new' ? { sort: 'new' } : {} })
}

const searchOpen = ref(Boolean(q.value))
const searchDraft = ref(q.value ?? '')
const searchEl = ref<HTMLInputElement | null>(null)
function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) nextTick(() => searchEl.value?.focus())
}
function applySearch() {
  setQuery({ q: searchDraft.value.trim() || undefined })
}

function onPostClick(e: MouseEvent) {
  if (!requireMember('post')) e.preventDefault()
}

const threads = ref<BoardThread[]>([])
const postCache = usePostCache()
const visibleThreads = computed(() => threads.value.filter((t) => !postCache.cache.value[t.id]?.deletedAt))
const latestComments = ref<BoardComment[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
/** Content type on screen. First load, or switching threads ↔ comments, shows the loader instead of "empty". */
const loadedKind = ref<'threads' | 'comments' | null>(null)
const contentKind = computed(() => (view.value === 'comments' ? 'comments' as const : 'threads' as const))
const initialLoading = computed(() => loadedKind.value !== contentKind.value)
// Filter/sort changes and pulls keep the current rows visible under the refresh bar.
const refreshing = computed(() => loading.value && !initialLoading.value)
let loadSeq = 0

function listQuery(cursor: string | null) {
  return {
    // Hidden threads list newest first: hot-ranking would drop anything past the front-page window.
    sort: view.value === 'new' || showHidden.value ? 'new' as const : 'top' as const,
    range: view.value === 'top' && !showHidden.value ? range.value : null,
    visibility: scope.value,
    tags: tags.value,
    domain: domain.value,
    q: q.value,
    hidden: showHidden.value ? 'only' as const : null,
    cursor,
  }
}

async function load(reset = true) {
  const seq = ++loadSeq
  const kind = contentKind.value
  if (reset) loading.value = true
  else loadingMore.value = true
  try {
    if (view.value === 'comments') {
      const res = await api.listLatestComments({ cursor: reset ? null : nextCursor.value })
      if (seq !== loadSeq) return
      latestComments.value = reset ? res.comments : [...latestComments.value, ...res.comments]
      nextCursor.value = res.nextCursor
    } else {
      const res = await api.listThreads(listQuery(reset ? null : nextCursor.value))
      if (seq !== loadSeq) return
      postCache.clear(res.threads.map((t) => t.id))
      threads.value = reset ? res.threads : [...threads.value, ...res.threads.filter((t) => !threads.value.some((x) => x.id === t.id))]
      nextCursor.value = res.nextCursor
    }
    if (reset) newThreadCount.value = 0
    loadedKind.value = kind
  } catch (e) {
    if (seq === loadSeq) loadedKind.value = kind
    if (seq === loadSeq) toast.push({ title: getApiErrorMessage(e) || 'Couldn’t load the Board.', tone: 'error', durationMs: 2200 })
  } finally {
    if (seq === loadSeq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

function loadMore() {
  void load(false)
}

watch(() => route.fullPath, () => {
  if (route.path !== '/b') return
  void load(true)
})

async function onToggleHide(thread: BoardThread) {
  const hide = !thread.viewerHidden
  try {
    await api.setHidden(thread.id, hide)
    // Hidden threads leave the main Board; in the Hidden view, unhiding sends them back.
    if (hide !== showHidden.value) threads.value = threads.value.filter((t) => t.id !== thread.id)
    toast.push({ title: hide ? 'Hidden from your Board' : 'Back on your Board', tone: 'success', durationMs: 1400 })
  } catch (e) {
    toast.push({ title: getApiErrorMessage(e) || 'Couldn’t update.', tone: 'error', durationMs: 2000 })
  }
}

// Realtime: new threads in scopes this viewer can read. The pill refetches through HTTP access rules.
const newThreadCount = ref(0)
const { addBoardCallback, removeBoardCallback, subscribeBoard, unsubscribeBoard } = usePresence()
const boardCb = {
  onNewThread: (payload: { threadId: string; tags: string[] }) => {
    if (threads.value.some((t) => t.id === payload.threadId)) return
    if (tags.value.length && !payload.tags.some((t) => tags.value.includes(t))) return
    newThreadCount.value += 1
  },
}
function showNewThreads() {
  void load(true)
}

onMounted(() => {
  void load(true)
  addBoardCallback(boardCb)
  subscribeBoard()
})
let activatedOnce = false
onActivated(() => {
  if (!activatedOnce) {
    activatedOnce = true
    return
  }
  void load(true)
})
onBeforeUnmount(() => {
  removeBoardCallback(boardCb)
  unsubscribeBoard()
})
</script>
