<template>
  <AppPageContent bottom="standard">
    <!-- Header -->
    <div class="flex items-center justify-between moh-gutter-x pt-4 pb-3">
      <h1 class="moh-h1">Articles</h1>
      <div class="flex items-center gap-2">
        <button
          v-tooltip.bottom="'Copy RSS feed link'"
          type="button"
          class="moh-tap moh-focus inline-flex items-center justify-center size-11 rounded-full moh-text-muted hover:text-[var(--moh-text)] moh-surface-hover transition-colors"
          aria-label="Copy RSS feed link"
          @click="copyArticlesRss"
        >
          <Icon name="tabler:rss" class="text-base" aria-hidden="true" />
        </button>
        <NuxtLink
          v-if="isVerifiedMember"
          to="/articles/new"
          class="moh-tap moh-focus inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          :style="{ backgroundColor: activeTabColor }"
        >
          <AppIconGlyph name="write" :size="16" />
          Write
        </NuxtLink>
      </div>
    </div>

    <!-- Scope + Filter bar -->
    <div class="flex items-center justify-between gap-2 moh-gutter-x pb-3 border-b moh-border">
      <!-- All / Following scope toggle — always rendered when authed, fades out on drafts tab -->
      <ClientOnly>
        <div
          v-if="isAuthed"
          class="transition-opacity duration-200"
          :class="activeTab === 'drafts' ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          :aria-hidden="activeTab === 'drafts'"
        >
          <AppTabSelector
            :model-value="scope"
            aria-label="Article scope"
            :tabs="scopeTabs"
            @update:model-value="onArticlesScopeChange($event as 'all' | 'following')"
          />
        </div>
        <div v-else class="flex-1" />
        <template #fallback><div class="flex-1" /></template>
      </ClientOnly>

      <AppFeedFiltersBar
        :sort="sort"
        :filter="visibilityFilter"
        :viewer-is-verified="isVerified"
        :viewer-is-premium="isPremium"
        :hide-sort="activeTab === 'drafts'"
        @update:sort="onArticlesSortChange"
        @update:filter="onArticlesFilterChange"
      />
    </div>

    <!-- Active tag filter banner -->
    <Transition name="tag-banner">
      <div
        v-if="activeTag"
        class="flex items-center gap-2 moh-gutter-x py-2 border-b moh-border moh-surface-2"
      >
        <Icon name="tabler:tag" class="text-xs moh-text-soft shrink-0" aria-hidden="true" />
        <span class="text-xs moh-text-muted">Filtered by tag:</span>
        <span class="inline-flex items-center gap-1 rounded-full border moh-border moh-surface pl-2.5 pr-1.5 py-0.5 text-xs font-medium moh-text">
          {{ activeTag }}
          <button
            type="button"
            class="flex h-3.5 w-3.5 items-center justify-center rounded-full moh-text-soft hover:bg-[var(--moh-surface-hover)] hover:text-[var(--moh-text)] transition-colors"
            aria-label="Clear tag filter"
            @click="clearTagFilter"
          >
            <Icon name="tabler:x" class="text-[9px]" aria-hidden="true" />
          </button>
        </span>
      </div>
    </Transition>

    <!-- Content tabs (Published | Drafts) for verified+ users -->
    <div v-if="isVerifiedMember" ref="tabBarEl" role="tablist" class="sticky top-[var(--moh-title-bar-height,0px)] z-10 moh-surface flex gap-0 border-b moh-border">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :ref="(el) => setTabButtonRef(tab.key, el as HTMLElement | null)"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        class="relative cursor-pointer px-5 py-3 text-sm font-semibold transition-colors"
        :class="activeTab === tab.key
          ? 'text-[var(--moh-text)]'
          : 'moh-text-soft hover:text-[var(--moh-text-muted)]'"
        @click="onArticlesTabChange(tab.key)"
      >
        {{ tab.label }}
        <span
          v-if="tab.count != null"
          class="ml-1.5 text-xs font-medium"
          :class="activeTab === tab.key ? 'moh-text-muted' : 'moh-text-soft'"
        >{{ tab.count }}</span>
      </button>
      <!-- Animated sliding underline -->
      <span
        class="absolute bottom-0 h-[2px] rounded-full"
        :style="{
          left: `${underlineLeft}px`,
          width: `${underlineWidth}px`,
          backgroundColor: activeTabColor,
          transition: underlineReady ? 'left 220ms ease-in-out, width 220ms ease-in-out' : 'none',
        }"
        aria-hidden="true"
      />
    </div>
    <div ref="articlesFeedContentEl" class="h-0 overflow-hidden" aria-hidden="true" />

    <!-- Published articles feed -->
    <div v-if="tabActivated.published" v-show="activeTab === 'published'" role="tabpanel">
      <AppSubtleSectionLoader :loading="publishedInitialLoading" min-height-class="min-h-[220px]">
        <div v-if="publishedFeed.error.value" class="py-12 text-center">
          <p class="moh-body">Couldn't load articles.</p>
          <p
            v-if="publishedFeed.error.value !== 'Couldn\'t load articles.'"
            class="mt-1 moh-meta"
          >{{ publishedFeed.error.value }}</p>
          <AppActionButton
            class="mt-3"
            label="Retry"
            kind="secondary"
            @click="publishedFeed.load({ force: true })"
          />
        </div>
        <div v-else>
          <TransitionGroup name="articles-list" tag="div" class="moh-divide">
            <AppArticleListCard
              v-for="article in publishedFeed.articles.value"
              :key="article.id"
              :article="article"
            />
          </TransitionGroup>
          <button
            v-if="publishedFeed.nextCursor.value"
            type="button"
            class="w-full border-t moh-border py-3 text-sm moh-text-muted transition-colors hover:bg-[var(--moh-surface-hover)]"
            :disabled="publishedFeed.loadingMore.value"
            @click="publishedFeed.loadMore()"
          >
            {{ publishedFeed.loadingMore.value ? 'Loading…' : 'Load more' }}
          </button>
          <p v-if="publishedFeed.hasLoadedOnce.value && publishedFeed.articles.value.length === 0" class="py-12 text-center moh-meta">
            No articles found.
            <template v-if="isVerifiedMember">
              <NuxtLink to="/articles/new" class="hover:underline" :style="{ color: activeTabColor }">Write the first one!</NuxtLink>
            </template>
          </p>
        </div>
      </AppSubtleSectionLoader>
    </div>

    <!-- Drafts -->
    <div v-if="tabActivated.drafts" v-show="activeTab === 'drafts'" role="tabpanel">
      <AppSubtleSectionLoader :loading="draftsInitialLoading" min-height-class="min-h-[220px]">
        <div v-if="draftsState.error.value" class="py-12 text-center">
          <p class="moh-body">Couldn't load articles.</p>
          <p
            v-if="draftsState.error.value !== 'Couldn\'t load articles.'"
            class="mt-1 moh-meta"
          >{{ draftsState.error.value }}</p>
          <AppActionButton
            class="mt-3"
            label="Retry"
            kind="secondary"
            @click="draftsState.load()"
          />
        </div>
        <div v-else>
          <TransitionGroup name="articles-list" tag="div" class="moh-divide">
            <AppArticleListCard
              v-for="draft in draftsState.drafts.value"
              :key="draft.id"
              :article="draft"
              @delete="confirmDelete"
            />
          </TransitionGroup>
          <p v-if="draftsState.hasLoadedOnce.value && draftsState.drafts.value.length === 0" class="py-12 text-center moh-meta">
            No drafts found.
            <NuxtLink to="/articles/new" class="hover:underline" :style="{ color: activeTabColor }">Start writing!</NuxtLink>
          </p>
        </div>
      </AppSubtleSectionLoader>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

definePageMeta({ layout: 'app', title: 'Articles', hideTopBar: true })

usePageSeo({
  title: 'Articles',
  description: 'Read and discover articles on Men of Hunger — longform writing on discipline, ambition, growth, and community.',
  jsonLdGraph: computed(() => [
    {
      '@type': 'CollectionPage',
      '@id': 'https://menofhunger.com/articles#webpage',
      url: 'https://menofhunger.com/articles',
      name: 'Articles — Men of Hunger',
      description: 'Longform articles on discipline, ambition, personal growth, and community from the Men of Hunger community.',
      isPartOf: { '@id': 'https://menofhunger.com/#website' },
      inLanguage: 'en-US',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Men of Hunger', item: 'https://menofhunger.com' },
        { '@type': 'ListItem', position: 2, name: 'Articles', item: 'https://menofhunger.com/articles' },
      ],
    },
  ]),
})

const { isPremium, isVerified, isVerifiedMember, isAuthed, user } = useAuth()

const { copyText: copyTextRaw } = useCopyToClipboard()
const articlesToast = useAppToast()
const { origin: siteOrigin } = useRequestURL()

async function copyArticlesRss() {
  try {
    await copyTextRaw(`${siteOrigin}/articles/feed.xml`)
    articlesToast.push({ title: 'RSS feed link copied', tone: 'success', durationMs: 1400 })
  } catch {
    articlesToast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
  }
}

const activeTabColor = computed(() => {
  const tier = userColorTier(user.value)
  return userTierColorVar(tier) ?? '#e4e4e7'
})

// ─── All filters (sort, visibility, scope) — synced to URL query params ──────

const {
  filter: visibilityFilter,
  sort,
  scope,
  isFiltered,
  resetFilters,
} = useUrlFeedFilters()

const scopeTabs = [
  { key: 'all', label: 'All', disabled: false },
  { key: 'following', label: 'Following', disabled: false },
]

const followingOnly = computed(() => isAuthed.value && scope.value === 'following')

// Tag filter — read from ?tag= query param.
const activeTag = computed<string | null>(() => {
  const t = route.query.tag
  return typeof t === 'string' && t.trim() ? t.trim() : null
})

function clearTagFilter() {
  const { tag: _tag, ...rest } = route.query
  void router.replace({ path: route.path, query: rest })
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'published' | 'drafts'
const route = useRoute()
const router = useRouter()

function tabFromQuery(): TabKey {
  return route.query.tab === 'drafts' && isVerifiedMember.value ? 'drafts' : 'published'
}

const activeTab = computed<TabKey>(() => tabFromQuery())
const tabActivated = reactive<Record<TabKey, boolean>>({
  published: true,
  drafts: tabFromQuery() === 'drafts',
})

const tabs = computed<Array<{ key: TabKey; label: string; count?: number }>>(() => {
  const t: Array<{ key: TabKey; label: string; count?: number }> = [
    {
      key: 'published',
      label: 'Published',
      count: publishedFeed.articles.value.length || undefined,
    },
  ]
  if (isVerifiedMember.value) {
    t.push({
      key: 'drafts',
      label: 'Drafts',
      count: draftsState.drafts.value.length || undefined,
    })
  }
  return t
})

// ─── Animated tab underline ───────────────────────────────────────────────────

const tabBarEl = ref<HTMLElement | null>(null)
const tabButtonEls = new Map<TabKey, HTMLElement>()
const underlineLeft = ref(0)
const underlineWidth = ref(0)
const underlineReady = ref(false)
const underlineMounted = ref(false)

function setTabButtonRef(key: TabKey, el: HTMLElement | null) {
  if (el) tabButtonEls.set(key, el)
  else tabButtonEls.delete(key)
}

function updateUnderline(animate = true) {
  if (!import.meta.client) return
  const bar = tabBarEl.value
  const btn = tabButtonEls.get(activeTab.value)
  if (!bar || !btn) return
  const barRect = bar.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  underlineLeft.value = Math.round(btnRect.left - barRect.left)
  underlineWidth.value = Math.round(btnRect.width)
  if (animate) underlineReady.value = true
}

function setTab(key: TabKey) {
  const query = { ...route.query, tab: key === 'drafts' ? 'drafts' : undefined }
  void router.replace({ path: route.path, query })
}

// ─── Feeds ────────────────────────────────────────────────────────────────────

const publishedFeed = useArticleFeed({
  sort,
  visibility: visibilityFilter,
  followingOnly,
  tag: activeTag,
  includeRestricted: isAuthed,
})
const draftsState = useArticleDrafts({ visibility: visibilityFilter, enabled: isVerifiedMember })
const publishedInitialLoading = computed(
  () => (publishedFeed.loading.value || !publishedFeed.hasLoadedOnce.value) && publishedFeed.articles.value.length === 0,
)
const draftsInitialLoading = computed(
  () => draftsState.loading.value && !draftsState.hasLoadedOnce.value && draftsState.drafts.value.length === 0,
)

onMounted(() => {
  if (activeTag.value) {
    void navigateTo(`/topics/${encodeURIComponent(activeTag.value)}`, { replace: true })
    return
  }
  publishedFeed.load()
  if (isVerifiedMember.value) draftsState.load()
})

watch(activeTab, (tab) => {
  if (!tabActivated[tab]) tabActivated[tab] = true
  nextTick(() => updateUnderline(underlineMounted.value))
  if (tab === 'drafts' && draftsState.drafts.value.length === 0 && !draftsState.loading.value) {
    void draftsState.load()
  }
}, { immediate: true })

watch(isVerifiedMember, (member) => {
  if (member) return
  if (route.query.tab === 'drafts') {
    void router.replace({ path: route.path, query: { ...route.query, tab: undefined } })
  }
})

onMounted(() => nextTick(() => {
  updateUnderline(false)
  // Only animate after the initial underline position is measured and painted.
  underlineMounted.value = true
}))

async function confirmDelete(id: string) {
  if (!confirm('Delete this draft? This cannot be undone.')) return
  await draftsState.deleteDraft(id)
}

const articlesFeedContentEl = ref<HTMLElement | null>(null)
const { scrollToTop: scrollFeedToTop } = useFeedScrollToTop(articlesFeedContentEl, tabBarEl)

function onArticlesScopeChange(next: 'all' | 'following') {
  scope.value = next
  scrollFeedToTop()
}

function onArticlesSortChange(next: 'new' | 'trending') {
  sort.value = next
  scrollFeedToTop()
}

function onArticlesFilterChange(next: ProfilePostsFilter) {
  // Articles feed visibility does not support onlyMe.
  visibilityFilter.value = next === 'onlyMe' ? 'all' : next
  scrollFeedToTop()
}

function onArticlesReset() {
  resetFilters()
  scrollFeedToTop()
}

function onArticlesTabChange(key: TabKey) {
  setTab(key)
  scrollFeedToTop()
}
</script>

<style scoped>
.tag-banner-enter-active,
.tag-banner-leave-active {
  transition: opacity 0.15s ease, max-height 0.15s ease;
  max-height: 3rem;
  overflow: hidden;
}
.tag-banner-enter-from,
.tag-banner-leave-to {
  opacity: 0;
  max-height: 0;
}

.articles-list-enter-active,
.articles-list-leave-active {
  transition: opacity 0.2s ease;
}

.articles-list-enter-from,
.articles-list-leave-to {
  opacity: 0;
}

.articles-list-move {
  transition: transform 0.25s ease;
}
</style>
